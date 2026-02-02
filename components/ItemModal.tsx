'use client';

import { useState, useEffect } from 'react';
import { itemsApi, type DropItem } from '@/lib/api';
import ImageUpload from './ImageUpload';
import styles from './Modal.module.css';

interface Props {
  item: any | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ItemModal({ item, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<Partial<DropItem>>({
    key: '',
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    priceDinar: 0,
    givesPoints: 0,
    givesXp: 0,
    requiredLevel: undefined,
    barter: false,
    stock: 0,
    maxPerUser: null,
    rarity: 'common',
    type: '',
    icon: '',
    imageUrl: '',
    visualId: '',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        key: item.key || '',
        title: item.title || '',
        titleEn: item.titleEn || '',
        description: item.description || '',
        descriptionEn: item.descriptionEn || '',
        priceDinar: item.priceDinar || 0,
        givesPoints: item.givesPoints || 0,
        givesXp: item.givesXp || 0,
        requiredLevel: item.requiredLevel,
        barter: item.barter || false,
        stock: item.stock || 0,
        maxPerUser: item.maxPerUser ?? null,
        rarity: item.rarity || 'common',
        type: item.type || '',
        icon: item.icon || '',
        imageUrl: item.imageUrl || '',
        visualId: item.visualId || '',
        enabled: item.enabled !== undefined ? item.enabled : true,
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key) {
      alert('Item key is required');
      return;
    }
    try {
      setSaving(true);
      // Ensure both icon and imageUrl are included in the update
      const dataToSave = {
        ...formData,
        icon: formData.icon || formData.key, // Default to key if icon not set
        imageUrl: formData.imageUrl || undefined, // Only include if set
      };
      
      if (item?.key) {
        await itemsApi.update(item.key, dataToSave);
      } else {
        if (!formData.key) {
          alert('Key is required for new items');
          return;
        }
        await itemsApi.create(dataToSave as DropItem);
      }
      onSave();
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert(error.response?.data?.error || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{item ? 'Edit Item' : 'Create Item'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Item Key *</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              required
              disabled={!!item}
              placeholder="e.g., soap_olive"
            />
          </div>

          <div className="form-group">
            <label>Title (Arabic) *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Title (English)</label>
            <input
              type="text"
              value={formData.titleEn || ''}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Price (Dinar) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.priceDinar}
              onChange={(e) => setFormData({ ...formData, priceDinar: parseFloat(e.target.value) })}
              required
            />
          </div>

          <div className="form-group">
            <label>Points (when bought) *</label>
            <input
              type="number"
              value={formData.givesPoints}
              onChange={(e) => setFormData({ ...formData, givesPoints: parseInt(e.target.value) })}
              required
            />
          </div>

          <div className="form-group">
            <label>XP (when bought)</label>
            <input
              type="number"
              value={formData.givesXp || 0}
              onChange={(e) => setFormData({ ...formData, givesXp: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>Required Level</label>
            <input
              type="number"
              value={formData.requiredLevel || ''}
              onChange={(e) => setFormData({ ...formData, requiredLevel: parseInt(e.target.value) || undefined })}
            />
          </div>

          <div className="form-group">
            <label>Type</label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="Item type/category"
            />
          </div>

          <div className="form-group">
            <label>Rarity *</label>
            <select
              value={formData.rarity}
              onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
              required
            >
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
              <option value="barter">Barter</option>
              <option value="barter_result">Barter Result</option>
            </select>
          </div>

          <div className="form-group">
            <label>Stock *</label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description (Arabic)</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Description (English)</label>
            <textarea
              value={formData.descriptionEn || ''}
              onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Icon Key</label>
            <input
              type="text"
              value={formData.icon || ''}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="Icon filename (e.g., soap_olive) - used if image not uploaded"
            />
            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              This is the filename/key used to construct the image path if no image is uploaded
            </small>
          </div>

          <div className="form-group">
            <label>Item Image</label>
            <ImageUpload
              value={formData.imageUrl || ''}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              label="Upload Item Image"
            />
            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              Upload an image file. If uploaded, this will be used instead of the icon-based path.
            </small>
          </div>

          <div className="form-group">
            <label>Max Per User</label>
            <input
              type="number"
              value={formData.maxPerUser === null ? '' : formData.maxPerUser || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                maxPerUser: e.target.value === '' ? null : parseInt(e.target.value) || null 
              })}
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.barter || false}
                onChange={(e) => setFormData({ ...formData, barter: e.target.checked })}
              />
              {' '}Barter Only
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.enabled !== undefined ? formData.enabled : true}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              {' '}Enabled
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
