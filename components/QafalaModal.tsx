'use client';

import { useState, useEffect } from 'react';
import { dropsApi, itemsApi, qafalasApi, type CaravanSchedule, type Drop, type DropItem } from '@/lib/api';
import SimpleImagePicker from './SimpleImagePicker';
import styles from './QafalaModal.module.css';

interface Props {
  schedule: CaravanSchedule;
  onClose: () => void;
  onSave: () => void;
}

export default function QafalaModal({ schedule, onClose, onSave }: Props) {
  const [formData, setFormData] = useState({
    startAt: '',
    endAt: '',
    name: '',
    nameAr: '',
    items: [] as Array<{ key?: string; [key: string]: any }>,
    backgroundImage: '',
  });
  const [saving, setSaving] = useState(false);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [availableItems, setAvailableItems] = useState<DropItem[]>([]);
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  
  // Extract Qafala type from slotKey (e.g., "qafala_morning" -> "morning")
  const getQafalaType = (slotKey: string): string => {
    if (slotKey.includes('morning')) return 'morning';
    if (slotKey.includes('afternoon')) return 'afternoon';
    if (slotKey.includes('night')) return 'night';
    if (slotKey.includes('random')) return 'random';
    return slotKey.replace('qafala_', '');
  };
  
  const qafalaType = getQafalaType(schedule.slotKey);

  const loadTemplate = async () => {
    try {
      const response = await qafalasApi.getTemplate(qafalaType);
      const template = response.template || response.data?.template;
      if (template) {
        setCurrentTemplate(template);
        setFormData(prev => ({
          ...prev,
          backgroundImage: template.imageUrl || '',
        }));
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  useEffect(() => {
    loadItems();
    loadTemplate();
    if (schedule.drop || (schedule as any).dropId) {
      const dropData = schedule.drop || (schedule as any).dropId;
      if (typeof dropData === 'object') {
        setDrop(dropData as Drop);
        setFormData(prev => ({
          ...prev,
          startAt: formatDateTime(schedule.startAt),
          endAt: formatDateTime(schedule.endAt),
          name: dropData.name || '',
          nameAr: dropData.nameAr || '',
          items: dropData.items || [],
        }));
        setSelectedItemKeys(dropData.items?.map((i: any) => i.key || i._id).filter(Boolean) || []);
      } else if (typeof dropData === 'string') {
        dropsApi.getById(dropData).then((response) => {
          const loadedDrop = response.data?.drop || response.drop;
          setDrop(loadedDrop);
          setFormData(prev => ({
            ...prev,
            startAt: formatDateTime(schedule.startAt),
            endAt: formatDateTime(schedule.endAt),
            name: loadedDrop?.name || '',
            nameAr: loadedDrop?.nameAr || '',
            items: loadedDrop?.items || [],
          }));
          setSelectedItemKeys(loadedDrop?.items?.map((i: any) => i.key || i._id).filter(Boolean) || []);
        });
      }
    } else {
      setFormData(prev => ({
        ...prev,
        startAt: formatDateTime(schedule.startAt),
        endAt: formatDateTime(schedule.endAt),
        name: '',
        items: [],
      }));
    }
  }, [schedule, qafalaType]);

  const loadItems = async () => {
    try {
      const response = await itemsApi.getAll();
      console.log('QafalaModal - Items response:', response);
      let itemsData = [];
      if (response.ok && response.items) {
        itemsData = response.items;
      } else if (response.data?.items) {
        itemsData = response.data.items;
      } else if (response.items) {
        itemsData = response.items;
      } else if (Array.isArray(response)) {
        itemsData = response;
      } else if (response.data && Array.isArray(response.data)) {
        itemsData = response.data;
      }
      setAvailableItems(itemsData);
    } catch (error: any) {
      console.error('Error loading items:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
  };

  const formatDateTime = (date: string | Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to map rarity to folder name
  const getRarityFolder = (rarity: string): string => {
    const rarityMap: { [key: string]: string } = {
      'legendary': 'legandry',
      'rare': 'rar',
      'common': 'common',
      'barter': 'barter',
      'epic': 'epic',
    };
    return rarityMap[rarity] || rarity;
  };

  // Get item image URL
  const getItemImageUrl = (item: DropItem): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    if (item.imageUrl) {
      return item.imageUrl.startsWith('http') ? item.imageUrl : `${apiUrl}${item.imageUrl}`;
    }
    const rarityFolder = getRarityFolder(item.rarity || 'common');
    const iconKey = item.icon || item.key || '';
    return `${apiUrl}/assets/${rarityFolder}/${iconKey}.png`;
  };

  const handleItemSelection = (itemKey: string, checked: boolean) => {
    if (checked) {
      setSelectedItemKeys([...selectedItemKeys, itemKey]);
      const item = availableItems.find(i => i.key === itemKey);
      if (item) {
        // Ensure imageUrl is present and include titleAr
        const itemWithImageUrl = { 
          ...item, 
          imageUrl: item.imageUrl || getItemImageUrl(item),
          titleAr: item.title || item.titleAr || '', // Use Arabic title if available
        };
        setFormData({
          ...formData,
          items: [...formData.items, { key: itemKey, ...itemWithImageUrl }],
        });
      }
    } else {
      setSelectedItemKeys(selectedItemKeys.filter(k => k !== itemKey));
      setFormData({
        ...formData,
        items: formData.items.filter(i => (i.key || i._id) !== itemKey),
      });
    }
  };

  const updateItemStock = (itemKey: string, stock: number) => {
    const items = formData.items.map(item => 
      (item.key || item._id) === itemKey ? { ...item, stock } : item
    );
    setFormData({ ...formData, items });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const slotKey = schedule.slotKey;
      
      // Update template background image if changed
      if (currentTemplate && formData.backgroundImage !== currentTemplate.imageUrl) {
        try {
          await qafalasApi.createOrUpdateTemplate({
            type: qafalaType as 'morning' | 'afternoon' | 'night' | 'random',
            name: currentTemplate.name || formData.name || `Qafala ${qafalaType}`,
            imageUrl: formData.backgroundImage,
            items: currentTemplate.items || [],
            active: currentTemplate.active !== false,
            startHour: currentTemplate.startHour,
            endHour: currentTemplate.endHour,
            durationMinutes: currentTemplate.durationMinutes,
          });
        } catch (error) {
          console.error('Error updating template image:', error);
          // Continue even if template update fails
        }
      }
      
      // Update items using the Qafala API (also send name and nameAr)
      const startAtIso = formData.startAt ? new Date(formData.startAt).toISOString() : undefined;
      const endAtIso = formData.endAt ? new Date(formData.endAt).toISOString() : undefined;

      await qafalasApi.updateItems(
        slotKey, 
        formData.items.map(item => {
          // Generate imageUrl if missing (same logic as backend)
          let imageUrl = item.imageUrl;
          if (!imageUrl) {
            const rarityFolder = getRarityFolder(item.rarity || 'common');
            const icon = item.icon || item.key || '';
            imageUrl = `/assets/${rarityFolder}/${icon}.png`;
          }
          
          return {
            key: item.key,
            title: item.title || '',
            titleAr: item.titleAr || item.title || '', // Arabic title
            priceDinar: item.priceDinar || 0,
            givesPoints: item.givesPoints || 0,
            barter: item.barter || false,
            stock: item.stock || 10,
            initialStock: item.initialStock || item.stock || 10,
            maxPerUser: item.maxPerUser,
            rarity: item.rarity || 'common',
            description: item.description,
            visualId: item.visualId || item.icon || item.key,
            imageUrl: imageUrl,
          };
        }),
        { 
          name: formData.name, 
          nameAr: formData.nameAr,
          startAt: startAtIso,
          endAt: endAtIso,
        }
      );
      
      onSave();
    } catch (error: any) {
      console.error('Error saving:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      const statusCode = error.response?.status;
      if (statusCode === 403) {
        alert(`Failed to save qafala: Unauthorized (403). Please check that NEXT_PUBLIC_ADMIN_SECRET is set in your .env.local file and matches the backend ADMIN_SECRET.`);
      } else {
        alert(`Failed to save qafala: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', maxHeight: '95vh', height: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <h2>Edit Qafala - {schedule.slotKey}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time *</label>
              <input
                type="datetime-local"
                value={formData.endAt}
                onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                required
              />
            </div>

          <div className="form-group">
            <label>Name (English)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Name (Arabic)</label>
            <input
              type="text"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              placeholder="اسم القافلة"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '14px' }}>Background Image</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith('image/')) {
                    alert('Please select an image file');
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    alert('File size must be less than 5MB');
                    return;
	                  }
	                  try {
	                    const uploadData = new FormData();
	                    uploadData.append('file', file);
	                    const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
	                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
	                    const response = await fetch(`${apiUrl}/api/media/upload`, {
	                      method: 'POST',
	                      headers: { 'x-admin-key': adminSecret },
	                      body: uploadData,
	                    });
	                    const data = await response.json();
	                    if (data.ok && data.url) {
	                      setFormData({ ...formData, backgroundImage: data.url });
	                    } else {
	                      alert(data.error || 'Failed to upload image');
                    }
                  } catch (error: any) {
                    alert('Failed to upload image: ' + error.message);
                  }
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
                id="background-image-upload"
              />
              <label
                htmlFor="background-image-upload"
                style={{
                  padding: '6px 12px',
                  background: '#8B4513',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-block',
                  fontSize: '13px',
                }}
              >
                Pick Image
              </label>
              <input
                type="text"
                value={formData.backgroundImage || ''}
                onChange={(e) => setFormData({ ...formData, backgroundImage: e.target.value })}
                placeholder="Or enter image path"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
              {formData.backgroundImage && (
                <img
                  src={formData.backgroundImage.startsWith('http') 
                    ? formData.backgroundImage 
                    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${formData.backgroundImage}`}
                  alt="Background preview"
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                    border: '1px solid #ddd',
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          </div>
          </div>

          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <label style={{ marginBottom: '12px', fontWeight: 600, fontSize: '16px' }}>
              Select Items from Library ({selectedItemKeys.length} selected)
            </label>
            <div className={styles.itemsList}>
              {availableItems.map((item) => {
                const isSelected = selectedItemKeys.includes(item.key);
                const imageUrl = getItemImageUrl(item);
                const currentStock = formData.items.find(i => (i.key || i._id) === item.key)?.stock || item.stock || 10;
                
                return (
                  <div
                    key={item.key}
                    className={`${styles.itemCard} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleItemSelection(item.key, !isSelected)}
                  >
                    <input
                      type="checkbox"
                      className={styles.itemCheckbox}
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleItemSelection(item.key, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className={styles.itemImageContainer}>
                      <img
                        src={imageUrl}
                        alt={item.title || item.titleEn || item.key || 'Item'}
                        className={styles.itemImage}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.classList.remove(styles.hidden);
                        }}
                        onLoad={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'block';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.classList.add(styles.hidden);
                        }}
                      />
                      <div className={`${styles.imagePlaceholder} ${styles.hidden}`}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor" opacity="0.3"/>
                        </svg>
                      </div>
                    </div>
                    
                    <div className={styles.itemInfo}>
                      <div className={styles.itemTitle}>{item.title || item.titleEn || item.key}</div>
                      <span className={`${styles.itemRarity} ${styles[item.rarity || 'common']}`}>
                        {item.rarity || 'common'}
                      </span>
                      
                      <div className={styles.itemDetails}>
                        <div className={styles.itemDetailRow}>
                          <span className={styles.itemDetailLabel}>Price:</span>
                          <span className={styles.itemDetailValue}>{item.priceDinar} Dinar</span>
                        </div>
                        <div className={styles.itemDetailRow}>
                          <span className={styles.itemDetailLabel}>Points:</span>
                          <span className={styles.itemDetailValue}>{item.givesPoints}</span>
                        </div>
                        {item.givesXp && (
                          <div className={styles.itemDetailRow}>
                            <span className={styles.itemDetailLabel}>XP:</span>
                            <span className={styles.itemDetailValue}>{item.givesXp}</span>
                          </div>
                        )}
                      </div>
                      
                      {isSelected && (
                        <div className={styles.stockInputContainer}>
                          <label className={styles.stockInputLabel}>Stock for this Qafala:</label>
                          <input
                            type="number"
                            className={styles.itemStockInput}
                            value={currentStock}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateItemStock(item.key, parseInt(e.target.value) || 0);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid var(--border-light)' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Qafala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
