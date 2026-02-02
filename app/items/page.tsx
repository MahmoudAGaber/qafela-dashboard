'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { itemsApi, type DropItem } from '@/lib/api';
import ItemModal from '@/components/ItemModal';
import ActionsMenu from '@/components/ActionsMenu';
import styles from './page.module.css';

// Helper function to map rarity to folder name
function getRarityFolder(rarity: string): string {
  const rarityMap: { [key: string]: string } = {
    'legendary': 'legandry',
    'rare': 'rar',
    'common': 'common',
    'barter': 'barter',
    'epic': 'epic',
    'barter_result': 'barter%20result',
  };
  return rarityMap[rarity] || rarity;
}

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedRarity, setSelectedRarity] = useState<string>('all');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await itemsApi.getAll();
      console.log('Items API response:', response);
      
      // Handle different response formats
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
      
      console.log('Parsed items:', itemsData);
      setItems(itemsData);
      setFilteredItems(itemsData); // Initialize filtered items
      
      if (itemsData.length === 0) {
        console.warn('No items found. Check if items.json exists and has data.');
      }
    } catch (error: any) {
      console.error('Error loading items:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to load items: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await itemsApi.delete(key);
      loadItems();
    } catch (error) {
      alert('Failed to delete item');
    }
  };

  const handleSave = () => {
    setShowModal(false);
    loadItems();
  };

  // Filter items by rarity
  useEffect(() => {
    if (selectedRarity === 'all') {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter(item => item.rarity === selectedRarity));
    }
  }, [selectedRarity, items]);

  if (loading) {
    return (
      <Layout>
        <div className={styles.container}>Loading...</div>
      </Layout>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Items Management</h1>
          <div>
            <button className="btn-primary" onClick={handleCreate}>
              Add New Item
            </button>
          </div>
        </div>

        {/* Rarity Filter */}
        <div className={styles.filters}>
          <label>Filter by Rarity:</label>
          <div className={styles.rarityFilters}>
            <button
              className={`${styles.rarityFilterBtn} ${selectedRarity === 'all' ? styles.active : ''}`}
              onClick={() => setSelectedRarity('all')}
            >
              All ({items.length})
            </button>
            <button
              className={`${styles.rarityFilterBtn} ${selectedRarity === 'common' ? styles.active : ''}`}
              onClick={() => setSelectedRarity('common')}
            >
              Common ({items.filter(i => i.rarity === 'common').length})
            </button>
            <button
              className={`${styles.rarityFilterBtn} ${selectedRarity === 'rare' ? styles.active : ''}`}
              onClick={() => setSelectedRarity('rare')}
            >
              Rare ({items.filter(i => i.rarity === 'rare').length})
            </button>
            <button
              className={`${styles.rarityFilterBtn} ${selectedRarity === 'legendary' ? styles.active : ''}`}
              onClick={() => setSelectedRarity('legendary')}
            >
              Legendary ({items.filter(i => i.rarity === 'legendary').length})
            </button>
            <button
              className={`${styles.rarityFilterBtn} ${selectedRarity === 'barter' ? styles.active : ''}`}
              onClick={() => setSelectedRarity('barter')}
            >
              Barter ({items.filter(i => i.rarity === 'barter').length})
            </button>
            <button
              className={`${styles.rarityFilterBtn} ${selectedRarity === 'barter_result' ? styles.active : ''}`}
              onClick={() => setSelectedRarity('barter_result')}
            >
              Barter Result ({items.filter(i => i.rarity === 'barter_result').length})
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              {items.length === 0 
                ? 'No items found. Make sure the items.json file exists in the backend assets folder.'
                : `No items found for rarity: ${selectedRarity}`
              }
            </p>
          </div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Image</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Points</th>
                  <th>XP</th>
                  <th>Level</th>
                  <th>Type</th>
                  <th>Rarity</th>
                  <th>Enabled</th>
                  <th style={{ width: '50px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  // Use imageUrl if available, otherwise construct from icon/key
                  let imageUrl = item.imageUrl;
                  if (!imageUrl) {
                    const rarityFolder = getRarityFolder(item.rarity);
                    const iconKey = item.icon || item.key || '';
                    imageUrl = `${apiUrl}/assets/${rarityFolder}/${iconKey}.png`;
                  } else if (!imageUrl.startsWith('http')) {
                    // If imageUrl is relative, make it absolute
                    imageUrl = imageUrl.startsWith('/') 
                      ? `${apiUrl}${imageUrl}` 
                      : `${apiUrl}/${imageUrl}`;
                  }
                  
                  return (
                    <tr key={item.key}>
                      <td>
                        <div className={styles.imageCell}>
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
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor" opacity="0.3"/>
                            </svg>
                          </div>
                        </div>
                      </td>
                      <td>{item.title || item.titleEn}</td>
                      <td>{item.priceDinar}</td>
                      <td>{item.givesPoints || 0}</td>
                      <td>{item.givesXp || '-'}</td>
                      <td>{item.requiredLevel || '-'}</td>
                      <td>{item.type || '-'}</td>
                      <td>
                        <span className={`${styles.rarity} ${styles[item.rarity]}`}>
                          {item.rarity}
                        </span>
                      </td>
                      <td>
                        <span className={item.enabled !== false ? styles.active : styles.inactive}>
                          {item.enabled !== false ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <ActionsMenu
                          onEdit={() => handleEdit(item)}
                          onDelete={() => handleDelete(item.key)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <ItemModal
            item={editingItem}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  );
}
