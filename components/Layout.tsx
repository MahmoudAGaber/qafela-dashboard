'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Layout.module.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/levels', label: 'Levels' },
    { href: '/qafalas', label: 'Qafalas' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/items', label: 'Items' },
    { href: '/recipes', label: 'Recipes' },
  ];

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <h2>Qafela Admin</h2>
        </div>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}


