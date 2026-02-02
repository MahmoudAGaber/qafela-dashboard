'use client';

import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Page() {
  return (
    <Layout>
      <div className="card">
        <h1 style={{ marginBottom: 12 }}>Dashboard</h1>
        <p style={{ marginBottom: 16 }}>Welcome to Qafela Admin.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn-primary" href="/items">Items</Link>
          <Link className="btn-secondary" href="/recipes">Recipes</Link>
          <Link className="btn-secondary" href="/qafalas">Qafalas</Link>
        </div>
      </div>
    </Layout>
  );
}
