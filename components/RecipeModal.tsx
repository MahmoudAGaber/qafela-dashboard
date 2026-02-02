'use client';

import { useState, useEffect } from 'react';
import { recipesApi, itemsApi } from '@/lib/api';
import styles from './Modal.module.css';

interface Props {
  recipe: any | null;
  onClose: () => void;
  onSave: () => void;
}

export default function RecipeModal({ recipe, onClose, onSave }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [barterResults, setBarterResults] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    input1: '',
    input2: '',
    outputKey: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
    loadBarterResults();
    if (recipe) {
      setFormData({
        input1: recipe.input1 || recipe.inputs?.[0] || '',
        input2: recipe.input2 || recipe.inputs?.[1] || '',
        outputKey: recipe.outputKey || '',
        description: recipe.description || '',
      });
    }
  }, [recipe]);

  const loadItems = async () => {
    try {
      const response = await itemsApi.getAll();
      const itemsData = response.ok && response.items ? response.items : response.data?.items || response.items || [];
      setItems(itemsData.filter((item: any) => item.barter === true || item.rarity === 'barter'));
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadBarterResults = async () => {
    try {
      const response = await itemsApi.getAll();
      const itemsData = response.ok && response.items ? response.items : response.data?.items || response.items || [];
      setBarterResults(itemsData.filter((item: any) => item.rarity === 'barter_result'));
    } catch (error) {
      console.error('Error loading barter types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.input1 === formData.input2) {
      alert('Input items must be different');
      return;
    }
    if (!formData.input1 || !formData.input2 || !formData.outputKey) {
      alert('All fields are required');
      return;
    }
    try {
      setSaving(true);
      await recipesApi.create({
        input1: formData.input1,
        input2: formData.input2,
        outputKey: formData.outputKey,
        description: formData.description,
      });
      onSave();
    } catch (error: any) {
      console.error('Error saving recipe:', error);
      alert(`Failed to save recipe: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{recipe ? 'Edit Recipe' : 'Create Recipe'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Input Item 1 *</label>
            <select
              value={formData.input1}
              onChange={(e) => setFormData({ ...formData, input1: e.target.value })}
              required
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.title || item.titleEn || item.key} ({item.rarity})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Input Item 2 *</label>
            <select
              value={formData.input2}
              onChange={(e) => setFormData({ ...formData, input2: e.target.value })}
              required
            >
              <option value="">Select item</option>
              {items
                .filter((item) => item.key !== formData.input1)
                .map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.title || item.titleEn || item.key} ({item.rarity})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Result Item *</label>
            <select
              value={formData.outputKey}
              onChange={(e) => setFormData({ ...formData, outputKey: e.target.value })}
              required
            >
              <option value="">Select result item</option>
              {barterResults.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.title || item.titleEn || item.key} ({item.rarity})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Optional description of the recipe"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
