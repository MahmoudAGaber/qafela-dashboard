'use client';

import Layout from '@/components/Layout';
import { useEffect, useMemo, useState } from 'react';
import { leaderboardApi } from '@/lib/api';

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [numberOfWinners, setNumberOfWinners] = useState<number>(50);
  const [pointsToDinarRate, setPointsToDinarRate] = useState<number>(1);
  const [active, setActive] = useState<boolean>(true);

  const [finalizeForce, setFinalizeForce] = useState(false);
  const [finalizeLimit, setFinalizeLimit] = useState<number>(50);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [c, w] = await Promise.all([
        leaderboardApi.getConfig(),
        leaderboardApi.getWeekly(50),
      ]);
      setConfig(c?.config ?? c?.data?.config ?? c);
      setWeekly(w?.weekly ?? w?.winners ?? w?.data?.weekly ?? w?.data?.winners ?? w?.rows ?? []);

      const cfg = c?.config ?? c?.data?.config ?? c;
      if (cfg) {
        if (typeof cfg.numberOfWinners === 'number') setNumberOfWinners(cfg.numberOfWinners);
        if (typeof cfg.pointsToDinarRate === 'number') setPointsToDinarRate(cfg.pointsToDinarRate);
        if (typeof cfg.active === 'boolean') setActive(cfg.active);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => (Array.isArray(weekly) ? weekly : []), [weekly]);

  const updateConfig = async () => {
    try {
      setSaving(true);
      await leaderboardApi.updateConfig({ numberOfWinners, pointsToDinarRate, active });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Failed to update config');
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    try {
      setSaving(true);
      await leaderboardApi.finalizeWeekly(finalizeForce, finalizeLimit);
      await load();
      alert('Finalize triggered.');
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Failed to finalize');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h1 style={{ fontSize: 32 }}>Leaderboard</h1>
          <button className="btn-secondary" onClick={load}>Refresh</button>
        </div>

        {error && (
          <div className="card" style={{ borderLeft: '6px solid var(--error)' }}>
            {error}
          </div>
        )}

        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Config</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Number of winners</label>
              <input type="number" value={numberOfWinners} onChange={(e) => setNumberOfWinners(Number(e.target.value))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Points to dinar rate</label>
              <input type="number" step="0.01" value={pointsToDinarRate} onChange={(e) => setPointsToDinarRate(Number(e.target.value))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Active</label>
              <select value={active ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>
          <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
            <button className="btn-primary" onClick={updateConfig} disabled={saving}>
              {saving ? 'Saving...' : 'Save Config'}
            </button>
          </div>
          {config && (
            <div style={{ marginTop: 12, color: 'var(--text-light)', fontSize: 12 }}>
              Loaded config: {JSON.stringify(config)}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Finalize Weekly</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={finalizeForce} onChange={(e) => setFinalizeForce(e.target.checked)} />
              Force
            </label>
            <div style={{ minWidth: 220 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Limit</label>
              <input type="number" value={finalizeLimit} onChange={(e) => setFinalizeLimit(Number(e.target.value))} />
            </div>
            <button className="btn-danger" onClick={finalize} disabled={saving}>
              {saving ? 'Working...' : 'Finalize'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 12 }}>This Week</h2>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Rank</th>
                  <th>User</th>
                  <th style={{ width: 140 }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, idx: number) => (
                  <tr key={String(r.userId || r._id || r.username || idx)}>
                    <td>{r.rank ?? (idx + 1)}</td>
                    <td>{r.fullName || r.username || String(r.userId || '')}</td>
                    <td>{r.points ?? r.score ?? '-'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>
                      No weekly rows returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
