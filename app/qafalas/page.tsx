'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { qafalasApi, type QafalaSchedule } from '@/lib/api';
import QafalaModal from '@/components/QafalaModal';
import styles from './page.module.css';
import { format } from 'date-fns';

export default function QafalasPage() {
  const [qafalas, setQafalas] = useState<QafalaSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQafala, setEditingQafala] = useState<QafalaSchedule | null>(null);
  const [todayDateId, setTodayDateId] = useState('');
  const [qafalaImages, setQafalaImages] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTodayQafalas();
    loadQafalaImages();
  }, []);

  const loadQafalaImages = async () => {
    try {
      const response = await qafalasApi.getTemplates();
      const templates = response.templates || response.data?.templates || [];
      const imagesMap: Record<string, string> = {};
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      templates.forEach((template: any) => {
        const slotKey = `qafala_${template.type}`;
        if (template.imageUrl) {
          // URL encode the image path to handle spaces and special characters
          let imageUrl = template.imageUrl;
          if (!imageUrl.startsWith('http')) {
            // For paths like /assets/Qafala/filename.png, we need to encode the filename
            // Split by / and encode only the filename (last part)
            const pathParts = imageUrl.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart) {
              pathParts[pathParts.length - 1] = encodeURIComponent(lastPart);
            }
            imageUrl = `${apiUrl}${pathParts.join('/')}`;
          }
          imagesMap[slotKey] = imageUrl;
        }
      });
      
      console.log('Loaded Qafala images:', imagesMap);
      setQafalaImages(imagesMap);
    } catch (error) {
      console.error('Error loading Qafala images:', error);
    }
  };

  const loadTodayQafalas = async () => {
    try {
      setLoading(true);
      const response = await qafalasApi.getToday();
      setQafalas(response.qafalas || []);
      setTodayDateId(response.dateId || '');
    } catch (error) {
      console.error('Error loading today\'s qafalas:', error);
      alert('Failed to load today\'s qafalas');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToday = async () => {
    try {
      setLoading(true);
      const response = await qafalasApi.syncToday();
      setQafalas(response.qafalas || []);
      setTodayDateId(response.dateId || '');
    } catch (error) {
      console.error('Error syncing today\'s qafalas:', error);
      alert('Failed to sync today\'s qafalas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (qafala: QafalaSchedule) => {
    setEditingQafala(qafala);
    setShowModal(true);
  };

  const handleSave = () => {
    setShowModal(false);
    loadTodayQafalas();
  };

  const getQafalaType = (slotKey: string): string => {
    if (slotKey.includes('morning')) return 'morning';
    if (slotKey.includes('afternoon')) return 'afternoon';
    if (slotKey.includes('night')) return 'night';
    if (slotKey.includes('random')) return 'random';
    return slotKey;
  };

  const getQafalaLabel = (slotKey: string) => {
    const type = getQafalaType(slotKey);
    const labels: Record<string, string> = {
      'morning': '🌅 Morning Qafala',
      'afternoon': '☀️ Afternoon Qafala',
      'night': '🌆 Night Qafala',
      'random': '🎲 Random Qafala',
    };
    return labels[type] || slotKey;
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Today's Qafalas</h1>
            <p className={styles.date}>Date: {todayDateId}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={loadTodayQafalas}>
              Refresh
            </button>
            <button className="btn-primary" onClick={handleSyncToday}>
              Sync Today
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          {qafalas.map((qafala) => {
            const drop = qafala.drop;
            const backgroundImage = qafalaImages[qafala.slotKey];
            return (
              <div 
                key={qafala._id} 
                className={`card ${styles.qafalaCard}`}
                style={backgroundImage ? {
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url(${backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  color: 'white',
                } : {}}
              >
                <div className={styles.cardHeader}>
                  <h3 style={backgroundImage ? { color: 'white' } : {}}>{getQafalaLabel(qafala.slotKey)}</h3>
                  <span className={`${styles.status} ${styles[qafala.status]}`}>
                    {qafala.status}
                  </span>
                </div>
                
                {drop && (
                  <>
                    <div className={styles.info} style={backgroundImage ? { color: 'rgba(255, 255, 255, 0.95)' } : {}}>
                      <div>
                        <strong>Name:</strong> {drop.name || 'Unnamed Qafala'}
                      </div>
                      <div>
                        <strong>Start:</strong> {format(new Date(qafala.startAt), 'HH:mm')}
                      </div>
                      <div>
                        <strong>End:</strong> {format(new Date(qafala.endAt), 'HH:mm')}
                      </div>
                      <div>
                        <strong>Items:</strong> {drop.items?.length || 0}
                      </div>
                    </div>
                    <div className={styles.itemsPreview}>
                      {drop.items?.slice(0, 3).map((item: any, idx: number) => (
                        <span 
                          key={idx} 
                          className={styles.itemTag}
                          style={backgroundImage ? {
                            background: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(10px)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                          } : {}}
                        >
                          {item.title}
                        </span>
                      ))}
                      {drop.items?.length > 3 && (
                        <span 
                          className={styles.moreItems}
                          style={backgroundImage ? { color: 'rgba(255, 255, 255, 0.9)' } : {}}
                        >
                          +{drop.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
                
                <button
                  className="btn-secondary"
                  onClick={() => handleEdit(qafala)}
                  style={{ marginTop: '16px', width: '100%' }}
                >
                  Edit Qafala
                </button>
              </div>
            );
          })}
        </div>

        {qafalas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>No Qafalas found for today.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Qafalas will be generated automatically or you can generate them manually.
            </p>
          </div>
        )}

        {showModal && editingQafala && (
          <QafalaModal
            schedule={editingQafala as any}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  );
}
