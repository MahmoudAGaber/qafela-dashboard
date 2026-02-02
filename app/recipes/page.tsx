'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { recipesApi, barterTypesApi, type BarterRecipe, type BarterType } from '@/lib/api';
import RecipeModal from '@/components/RecipeModal';
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

// Helper function to get image path
function getItemImagePath(item: any, apiUrl: string): string {
  if (item?.input1ImagePath || item?.input2ImagePath || item?.outputImagePath) {
    return `${apiUrl}${item.input1ImagePath || item.input2ImagePath || item.outputImagePath}`;
  }
  if (item?.rarity && item?.icon) {
    return `${apiUrl}/assets/${getRarityFolder(item.rarity)}/${item.icon}.png`;
  }
  if (item?.key) {
    return `${apiUrl}/assets/${getRarityFolder(item.rarity || 'common')}/${item.key}.png`;
  }
  return '';
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await recipesApi.getAll();
      console.log('Recipes API response:', response);
      
      // Handle different response formats
      let recipesData = [];
      if (response.ok && response.recipes) {
        recipesData = response.recipes;
      } else if (response.data?.recipes) {
        recipesData = response.data.recipes;
      } else if (response.recipes) {
        recipesData = response.recipes;
      } else if (Array.isArray(response)) {
        recipesData = response;
      } else if (response.data && Array.isArray(response.data)) {
        recipesData = response.data;
      }
      
      console.log('Parsed recipes:', recipesData);
      setRecipes(recipesData);
      
      if (recipesData.length === 0) {
        console.warn('No recipes found. Check if recipes.json exists and has data.');
      }
    } catch (error: any) {
      console.error('Error loading recipes:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to load recipes: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRecipe(null);
    setShowModal(true);
  };

  const handleEdit = (recipe: any) => {
    setEditingRecipe(recipe);
    setShowModal(true);
  };

  const handleDelete = async (recipe: any) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      const input1 = recipe.input1 || recipe.inputs?.[0];
      const input2 = recipe.input2 || recipe.inputs?.[1];
      await recipesApi.delete(input1, input2);
      loadRecipes();
    } catch (error) {
      alert('Failed to delete recipe');
    }
  };

  const handleSave = () => {
    setShowModal(false);
    loadRecipes();
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
          <h1>Recipes Management</h1>
          <button className="btn-primary" onClick={handleCreate}>
            Add New Recipe
          </button>
        </div>

        {recipes.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No recipes found. Click "Add New Recipe" to create one.
            </p>
          </div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Input 1</th>
                  <th style={{ width: '50px' }}>+</th>
                  <th style={{ width: '100px' }}>Input 2</th>
                  <th style={{ width: '50px' }}>=</th>
                  <th style={{ width: '100px' }}>Result</th>
                  <th>Description</th>
                  <th style={{ width: '50px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
              {recipes.map((recipe, index) => {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                
                // Get item details or fallback
                const input1Item = recipe.input1Item || { 
                  key: recipe.input1, 
                  title: recipe.input1, 
                  titleEn: recipe.input1,
                  rarity: 'common', 
                  icon: recipe.input1 
                };
                const input2Item = recipe.input2Item || { 
                  key: recipe.input2, 
                  title: recipe.input2,
                  titleEn: recipe.input2,
                  rarity: 'common', 
                  icon: recipe.input2 
                };
                const outputItem = recipe.outputItem || { 
                  key: recipe.outputKey, 
                  title: recipe.outputKey,
                  titleEn: recipe.outputKey,
                  rarity: 'common', 
                  icon: recipe.outputKey 
                };
                
                // Build image URLs
                const input1Url = recipe.input1ImagePath 
                  ? `${apiUrl}${recipe.input1ImagePath}`
                  : `${apiUrl}/assets/${getRarityFolder(input1Item.rarity)}/${input1Item.icon || input1Item.key}.png`;
                const input2Url = recipe.input2ImagePath 
                  ? `${apiUrl}${recipe.input2ImagePath}`
                  : `${apiUrl}/assets/${getRarityFolder(input2Item.rarity)}/${input2Item.icon || input2Item.key}.png`;
                const outputUrl = recipe.outputImagePath 
                  ? `${apiUrl}${recipe.outputImagePath}`
                  : `${apiUrl}/assets/${getRarityFolder(outputItem.rarity)}/${outputItem.icon || outputItem.key}.png`;
                
                return (
                  <tr key={recipe._id || `${recipe.input1}-${recipe.input2}-${index}`}>
                    <td>
                      <div className={styles.recipeItem}>
                        <img
                          src={input1Url}
                          alt={input1Item.title || input1Item.titleEn || input1Item.key}
                          className={styles.recipeImage}
                          onError={(e) => {
                            console.error(`Failed to load image: ${input1Url}`);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className={styles.recipeItemName}>
                          {input1Item.title || input1Item.titleEn || input1Item.key}
                        </div>
                      </div>
                    </td>
                    <td className={styles.plusSign}>+</td>
                    <td>
                      <div className={styles.recipeItem}>
                        <img
                          src={input2Url}
                          alt={input2Item.title || input2Item.titleEn || input2Item.key}
                          className={styles.recipeImage}
                          onError={(e) => {
                            console.error(`Failed to load image: ${input2Url}`);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className={styles.recipeItemName}>
                          {input2Item.title || input2Item.titleEn || input2Item.key}
                        </div>
                      </div>
                    </td>
                    <td className={styles.equalsSign}>=</td>
                    <td>
                      <div className={styles.recipeItem}>
                        <img
                          src={outputUrl}
                          alt={outputItem.title || outputItem.titleEn || outputItem.key}
                          className={styles.recipeImage}
                          onError={(e) => {
                            console.error(`Failed to load image: ${outputUrl}`);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className={styles.recipeItemName}>
                          {outputItem.title || outputItem.titleEn || outputItem.key}
                        </div>
                      </div>
                    </td>
                    <td>{recipe.description || '-'}</td>
                    <td>
                      <ActionsMenu
                        onEdit={() => handleEdit(recipe)}
                        onDelete={() => handleDelete(recipe)}
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
          <RecipeModal
            recipe={editingRecipe}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </Layout>
  );
}
