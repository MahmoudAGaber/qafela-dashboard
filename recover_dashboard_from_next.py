#!/usr/bin/env python3
"""
Recover the missing Next.js dashboard source from the existing .next build artifacts.

Why this exists:
- This repo currently contains only .next output (compiled JS/CSS), but the original
  source files (app/, components/, lib/, package.json, etc.) were not committed.
- Next dev server cannot run without the source tree.

What this script does:
1) Extract TS/TSX sources from sourcemaps embedded in:
   .next/server/app/**/page.js
2) Recreate CSS modules by splitting:
   .next/static/css/app/**/page.css
   and de-hashing class names (e.g. .Layout_container__abc -> .container)
3) Recreate app/globals.css from:
   .next/static/css/app/layout.css

Run:
  cd qafela-dashboard
  python3 recover_dashboard_from_next.py --force
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import subprocess
from pathlib import Path
from typing import Iterable, Optional, Tuple


SOURCEMAP_PREFIX = "sourceMappingURL=data:application/json;charset=utf-8;base64,"
SOURCEURL_MARKER = "//# sourceURL=webpack-internal:///"


def _safe_write(path: Path, content: str, *, force: bool) -> bool:
    if path.exists() and not force:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


def _iter_next_page_js_files(dashboard_dir: Path) -> Iterable[Path]:
    base = dashboard_dir / ".next" / "server" / "app"
    if not base.exists():
        return []
    return base.glob("**/page.js")


def _extract_relpath_from_webpack_source(source: str) -> Optional[str]:
    # Example: webpack://qafela-dashboard/./components/Layout.tsx?3c8f
    if "/./" not in source:
        return None
    rel = source.split("/./", 1)[1]
    rel = rel.split("?", 1)[0]
    return rel


def _decode_nearest_sourcemap(text: str, *, end: int) -> Optional[dict]:
    start = text.rfind(SOURCEMAP_PREFIX, 0, end)
    if start < 0:
        return None
    start += len(SOURCEMAP_PREFIX)
    # In these bundles the sourcemap data ends right before a literal "\n"
    # sequence inside the eval string.
    chunk = text[start:end]
    b64 = chunk.split("\\n", 1)[0]
    try:
        raw = base64.b64decode(b64)
        return json.loads(raw)
    except Exception:
        return None


def recover_ts_sources_from_page_js(
    page_js: Path,
    *,
    dashboard_dir: Path,
    force: bool,
) -> Tuple[int, int]:
    text = page_js.read_text(encoding="utf-8", errors="ignore")

    wrote = 0
    seen = 0

    # Find each embedded webpack-internal sourceURL and map it back to its sourcemap.
    for m in re.finditer(re.escape(SOURCEURL_MARKER), text):
        end = m.start()
        line_end = text.find("\\n", end)
        if line_end < 0:
            continue

        sourceurl_line = text[end:line_end]
        if "webpack-internal:///(ssr)/./" not in sourceurl_line and "webpack-internal:///(rsc)/./" not in sourceurl_line:
            continue

        url = sourceurl_line.split("sourceURL=", 1)[1]
        if "/./" not in url:
            continue
        rel = url.split("/./", 1)[1]
        if not rel:
            continue

        # Only recover the project files we care about.
        if not (
            rel.startswith("app/")
            or rel.startswith("components/")
            or rel.startswith("lib/")
            or rel == "next-env.d.ts"
        ):
            continue

        # Skip CSS (we reconstruct CSS separately from .next/static/css).
        if rel.endswith(".css"):
            continue

        if not any(rel.endswith(ext) for ext in (".ts", ".tsx", ".js", ".jsx", ".d.ts", ".json")):
            continue

        sm = _decode_nearest_sourcemap(text, end=end)
        if not sm:
            continue

        sources = sm.get("sources") or []
        sources_content = sm.get("sourcesContent") or []
        if not sources or not sources_content:
            continue

        rel_from_sources = _extract_relpath_from_webpack_source(str(sources[0]))
        if rel_from_sources:
            rel = rel_from_sources

        content = str(sources_content[0])
        out_path = dashboard_dir / rel
        seen += 1
        if _safe_write(out_path, content, force=force):
            wrote += 1

    return wrote, seen


def _unhash_css_module(css: str, module_prefix: str) -> str:
    # Convert ".Layout_container__m5jTj" -> ".container" and so on.
    # Works for compound selectors too: ".Layout_navItem__x.Layout_active___y" -> ".navItem.active"
    pat = re.compile(rf"\\.{re.escape(module_prefix)}_([A-Za-z0-9_-]+?)__([A-Za-z0-9_-]+)")
    return pat.sub(lambda m: f".{m.group(1)}", css)


def recover_css_from_static_css(
    dashboard_dir: Path,
    *,
    force: bool,
) -> Tuple[int, int]:
    css_root = dashboard_dir / ".next" / "static" / "css" / "app"
    css_blobs: list[tuple[str, str]] = []

    def _git_show(path_in_repo: str) -> Optional[str]:
        # Prefer git show so the recovery still works even if .next gets overwritten by a new dev run.
        repo_root = dashboard_dir.parent
        if not (repo_root / ".git").exists():
            return None
        try:
            out = subprocess.check_output(
                ["git", "show", f"HEAD:{path_in_repo}"],
                cwd=str(repo_root),
                stderr=subprocess.DEVNULL,
            )
            return out.decode("utf-8", errors="ignore")
        except Exception:
            return None

    if css_root.exists():
        # Local artifacts available.
        for p in css_root.glob("**/*.css"):
            css_blobs.append((str(p.relative_to(dashboard_dir)), p.read_text(encoding="utf-8", errors="ignore")))
    else:
        # Fallback to the committed artifacts in the monorepo.
        for rel in (
            "qafela-dashboard/.next/static/css/app/layout.css",
            "qafela-dashboard/.next/static/css/app/items/page.css",
            "qafela-dashboard/.next/static/css/app/qafalas/page.css",
            "qafela-dashboard/.next/static/css/app/recipes/page.css",
        ):
            content = _git_show(rel)
            if content:
                css_blobs.append((rel, content))

    if not css_blobs:
        return 0, 0

    wrote = 0
    seen = 0

    # 1) globals.css from layout.css
    layout = next((c for (p, c) in css_blobs if p.endswith("/layout.css") or p.endswith("layout.css")), None)
    if layout:
        text = layout
        # Drop the leading /*! ... */ banner.
        idx = text.find("*/")
        if idx >= 0:
            globals_css = text[idx + 2 :].lstrip()
            out = dashboard_dir / "app" / "globals.css"
            if _safe_write(out, globals_css, force=force):
                wrote += 1
            seen += 1

            # Add aliases used by some module css files (safe no-op if already present).
            cur = out.read_text(encoding="utf-8", errors="ignore") if out.exists() else ""
            if out.exists() and "--color-primary" not in cur:
                alias = (
                    "\n\n/* Aliases for older CSS vars used in some modules */\n"
                    ":root {\n"
                    "  --color-primary: var(--primary);\n"
                    "  --color-primary-light: var(--primary-light);\n"
                    "  --color-background: var(--background);\n"
                    "  --color-card-background-light: var(--surface-light);\n"
                    "  --color-white: var(--card-background);\n"
                    "  --color-light-grey: var(--border-light);\n"
                    "  --color-text-primary-light: var(--text-primary);\n"
                    "  --color-text-secondary-light: var(--text-secondary);\n"
                    "}\n"
                )
                out.write_text(cur.rstrip() + alias, encoding="utf-8")

    # 2) CSS Modules from page.css bundles
    for path_str, text in css_blobs:
        if not path_str.endswith("page.css"):
            continue
        # Identify section boundaries by the /*!...*/ banners.
        starts = [m.start() for m in re.finditer(r"/\\*!", text)]
        if not starts:
            continue
        starts.append(len(text))

        for i in range(len(starts) - 1):
            s = starts[i]
            e = starts[i + 1]
            banner_end = text.find("*/", s)
            if banner_end < 0 or banner_end > e:
                continue
            banner = text[s : banner_end + 2]
            body = text[banner_end + 2 : e]

            m = re.search(r"!\\./([^!]+?\\.module\\.css)", banner)
            if not m:
                continue
            rel_path = m.group(1)
            module_file = Path(rel_path)
            module_prefix = module_file.name.replace(".module.css", "")
            css = _unhash_css_module(body, module_prefix).strip() + "\n"

            out = dashboard_dir / rel_path
            seen += 1
            if _safe_write(out, css, force=force):
                wrote += 1

    return wrote, seen


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dashboard-dir",
        default=None,
        help="Path to qafela-dashboard (defaults to script location).",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing recovered files.",
    )
    args = ap.parse_args()

    dashboard_dir = Path(args.dashboard_dir).resolve() if args.dashboard_dir else Path(__file__).resolve().parent

    if not (dashboard_dir / ".next").exists():
        print(f"ERROR: {dashboard_dir}/.next not found. Nothing to recover.")
        return 2

    js_files = list(_iter_next_page_js_files(dashboard_dir))
    total_written = 0
    total_seen = 0

    if js_files:
        for page_js in js_files:
            w, s = recover_ts_sources_from_page_js(page_js, dashboard_dir=dashboard_dir, force=args.force)
            total_written += w
            total_seen += s
    else:
        # This happens if a new Next dev session overwrote .next. We can still recover CSS from git.
        print("WARN: No .next/server/app/**/page.js found; skipping TS/TSX recovery.")

    w, s = recover_css_from_static_css(dashboard_dir, force=args.force)
    total_written += w
    total_seen += s

    # A few small files were referenced by TS sources but not present in the extracted CSS bundles.
    # Create them as empty placeholders so the build doesn't fail on missing imports.
    _safe_write(dashboard_dir / "components" / "Modal.module.css", "/* recovered placeholder */\n", force=False)

    # Create basic placeholder pages for routes shown in the sidebar if they weren't compiled
    # during the original Next dev session (only visited routes exist under .next/server/app).
    def _write_page(rel: str, title: str, body: str) -> None:
        out = dashboard_dir / rel
        if out.exists() and not args.force:
            return
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            "'use client';\n\n"
            "import Link from 'next/link';\n"
            "import Layout from '@/components/Layout';\n\n"
            "export default function Page() {\n"
            "  return (\n"
            "    <Layout>\n"
            "      <div className=\"card\">\n"
            "        <h1 style={{ marginBottom: 12 }}>" + json.dumps(title) + "</h1>\n"
            "        <p style={{ marginBottom: 16 }}>" + json.dumps(body) + "</p>\n"
            "        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>\n"
            "          <Link className=\"btn-primary\" href=\"/items\">Items</Link>\n"
            "          <Link className=\"btn-secondary\" href=\"/recipes\">Recipes</Link>\n"
            "          <Link className=\"btn-secondary\" href=\"/qafalas\">Qafalas</Link>\n"
            "        </div>\n"
            "      </div>\n"
            "    </Layout>\n"
            "  );\n"
            "}\n",
            encoding="utf-8",
        )

    _write_page("app/page.tsx", "Dashboard", "Recovered dashboard home. Use the sidebar to navigate.")
    _write_page("app/levels/page.tsx", "Levels", "This page wasn't recovered from the .next artifacts. Rebuild it if needed.")
    _write_page("app/leaderboard/page.tsx", "Leaderboard", "This page wasn't recovered from the .next artifacts. Rebuild it if needed.")

    print(f"Recovered files written: {total_written} (seen candidates: {total_seen})")
    print("Next steps:")
    print("  1) Ensure package.json exists (added by Codex or create it).")
    print("  2) npm install && npm run dev")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
