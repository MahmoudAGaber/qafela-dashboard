'use client';

import Layout from '@/components/Layout';
import { useEffect, useMemo, useState } from 'react';
import { levelsApi, type Level } from '@/lib/api';

type LevelForm = {
  level: number;
  title: string;
  titleEn?: string;
  description: string;
  xpRequired: number;
  badgeKey: string;
  badgeName: string;
  badgeIcon: string;
  rewardsJson: string; // JSON array
  isActive: boolean;
};

function toForm(level?: Level | null): LevelForm {
  return {
    level: level?.level ?? 1,
    title: level?.title ?? '',
    titleEn: level?.titleEn ?? '',
    description: level?.description ?? '',
    xpRequired: level?.xpRequired ?? 0,
    badgeKey: level?.badge?.key ?? '',
    badgeName: level?.badge?.name ?? '',
    badgeIcon: level?.badge?.icon ?? '',
    rewardsJson: JSON.stringify(level?.rewards ?? [], null, 2),
    isActive: level?.isActive ?? true,
  };
}

export default function Page() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Level | null>(null);
  const [form, setForm] = useState<LevelForm>(() => toForm(null));
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...levels].sort((a, b) => (a.level ?? 0) - (b.level ?? 0)), [levels]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await levelsApi.getAll();
      const list: Level[] = res?.levels ?? res?.data?.levels ?? res ?? [];
      setLevels(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load levels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(toForm(null));
    setShowModal(true);
  };

  const openEdit = (lvl: Level) => {
    setEditing(lvl);
    setForm(toForm(lvl));
    setShowModal(true);
  };

  const remove = async (lvl: Level) => {
    if (!lvl._id) return;
    if (!confirm(`Delete level ${lvl.level}?`)) return;
    try {
      await levelsApi.delete(lvl._id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Failed to delete level');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      let rewards: any[] = [];
      try {
        rewards = JSON.parse(form.rewardsJson || '[]');
        if (!Array.isArray(rewards)) throw new Error('rewards must be an array');
      } catch {
        alert('Rewards JSON must be a valid JSON array (example: [])');
        return;
      }

      const payload: Level = {
        level: Number(form.level),
        title: form.title,
        titleEn: form.titleEn || undefined,
        description: form.description,
        xpRequired: Number(form.xpRequired),
        badge: {
          key: form.badgeKey,
          name: form.badgeName,
          icon: form.badgeIcon,
        },
        rewards,
        isActive: Boolean(form.isActive),
      };

      if (editing?._id) {
        await levelsApi.update(editing._id, payload);
      } else {
        await levelsApi.create(payload);
      }

      setShowModal(false);
      await load();
    } catch (e2: any) {
      alert(e2?.response?.data?.error || e2?.message || 'Failed to save level');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h1 style={{ fontSize: 32 }}>Levels</h1>
          <button className="btn-primary" onClick={openCreate}>Add Level</button>
        </div>

        {error && (
          <div className="card" style={{ borderLeft: '6px solid var(--error)' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="card">Loading...</div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Title</th>
                  <th>XP</th>
                  <th>Active</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((lvl) => (
                  <tr key={lvl._id || String(lvl.level)}>
                    <td>{lvl.level}</td>
                    <td>{lvl.title}</td>
                    <td>{lvl.xpRequired}</td>
                    <td>{lvl.isActive ? 'Yes' : 'No'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn-secondary" onClick={() => openEdit(lvl)}>Edit</button>
                        <button className="btn-danger" onClick={() => remove(lvl)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>
                      No levels found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(ev) => ev.stopPropagation()}>
              <h2 style={{ marginBottom: 12 }}>{editing ? `Edit Level ${editing.level}` : 'Create Level'}</h2>
              <form onSubmit={save}>
                <div className="form-group">
                  <label>Level *</label>
                  <input type="number" value={form.level} onChange={(ev) => setForm({ ...form, level: Number(ev.target.value) })} required />
                </div>
                <div className="form-group">
                  <label>Title (Arabic) *</label>
                  <input value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Title (English)</label>
                  <input value={form.titleEn || ''} onChange={(ev) => setForm({ ...form, titleEn: ev.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea rows={3} value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} required />
                </div>
                <div className="form-group">
                  <label>XP Required *</label>
                  <input type="number" value={form.xpRequired} onChange={(ev) => setForm({ ...form, xpRequired: Number(ev.target.value) })} required />
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>Badge</div>
                  <div className="form-group">
                    <label>Badge Key *</label>
                    <input value={form.badgeKey} onChange={(ev) => setForm({ ...form, badgeKey: ev.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Badge Name *</label>
                    <input value={form.badgeName} onChange={(ev) => setForm({ ...form, badgeName: ev.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Badge Icon *</label>
                    <input value={form.badgeIcon} onChange={(ev) => setForm({ ...form, badgeIcon: ev.target.value })} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Rewards JSON</label>
                  <textarea rows={6} value={form.rewardsJson} onChange={(ev) => setForm({ ...form, rewardsJson: ev.target.value })} />
                </div>

                <div className="form-group">
                  <label>
                    <input type="checkbox" checked={form.isActive} onChange={(ev) => setForm({ ...form, isActive: ev.target.checked })} /> Active
                  </label>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
