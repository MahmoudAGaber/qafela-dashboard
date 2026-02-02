import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Get admin secret from environment (client-side accessible)
const getAdminSecret = () => {
  if (typeof window === 'undefined') {
    // Server-side: not accessible, would need API route proxy
    return '';
  }
  // Client-side: accessible from NEXT_PUBLIC_ variables
  return process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add admin secret to requests
api.interceptors.request.use((config) => {
  const adminSecret = getAdminSecret();
  if (adminSecret) {
    config.headers['x-admin-key'] = adminSecret;
  } else {
    console.warn('⚠️ NEXT_PUBLIC_ADMIN_SECRET is not set. Admin requests will fail.');
  }
  return config;
});

// Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      console.error('❌ Unauthorized error:', error.response?.data);
    }
    return Promise.reject(error);
  }
);

// Types
export interface Level {
  _id?: string;
  level: number;
  title: string;
  titleEn?: string;
  description: string;
  xpRequired: number;
  badge: {
    key: string;
    name: string;
    icon: string;
  };
  rewards: Array<{
    type: 'badge' | 'item' | 'dinar' | 'points';
    value: string;
    name: string;
    icon?: string;
  }>;
  isActive: boolean;
}

export interface DropItem {
  _id?: string;
  key: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  priceDinar: number;
  givesPoints: number;
  givesXp?: number;
  requiredLevel?: number;
  barter: boolean;
  stock?: number;
  initialStock?: number;
  maxPerUser?: number | null;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'barter' | 'barter_result';
  visualId?: string;
  imageUrl?: string;
  type?: string;
  icon?: string;
  enabled?: boolean;
}

export interface Drop {
  _id?: string;
  name: string;
  slot: 'morning' | 'noon' | 'evening' | 'random';
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  items: DropItem[];
  category?: string;
  durationMinutes?: number;
  scheduleId?: string;
}

export interface CaravanSchedule {
  _id?: string;
  dateId: string;
  slotKey: string;
  category: string;
  startAt: string;
  endAt: string;
  dropId?: string;
  status: 'scheduled' | 'published' | 'cancelled';
  drop?: Drop;
}

export interface BarterType {
  _id?: string;
  key: string;
  name: string;
  icon?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  source?: string;
  enabled: boolean;
}

export interface BarterRecipe {
  _id?: string;
  inputs: [string, string];
  outputKey: string;
}

// Levels API
export const levelsApi = {
  getAll: () => api.get('/api/levels').then(res => res.data),
  getByNumber: (number: number) => api.get(`/api/levels/${number}`).then(res => res.data),
  create: (level: Level) => api.post('/api/admin/levels', level).then(res => res.data),
  update: (id: string, level: Partial<Level>) => api.put(`/api/admin/levels/${id}`, level).then(res => res.data),
  delete: (id: string) => api.delete(`/api/admin/levels/${id}`).then(res => res.data),
};

// Drops/Qafalas API
export const dropsApi = {
  getActive: () => api.get('/api/drops/active').then(res => res.data),
  getTodaySchedule: () => api.get('/api/schedule/today').then(res => res.data),
  getById: (id: string) => api.get(`/api/admin/drops/${id}`).then(res => res.data),
  update: (id: string, drop: Partial<Drop>) => api.put(`/api/admin/drops/${id}`, drop).then(res => res.data),
  create: (drop: Drop) => api.post('/api/admin/drops', drop).then(res => res.data),
};

// Items API (from JSON file)
export const itemsApi = {
  getAll: async () => {
    try {
      const res = await api.get('/api/admin/items');
      console.log('Items API getAll response:', res.data);
      return res.data;
    } catch (error: any) {
      console.error('Items API getAll error:', error.response?.data || error.message);
      throw error;
    }
  },
  getByKey: (key: string) => api.get(`/api/admin/items/${key}`).then(res => res.data),
  create: (item: DropItem) => api.post('/api/admin/items', item).then(res => res.data),
  update: (key: string, item: Partial<DropItem>) => api.put(`/api/admin/items/${key}`, item).then(res => res.data),
  delete: (key: string) => api.delete(`/api/admin/items/${key}`).then(res => res.data),
};

// Barter Types API
export const barterTypesApi = {
  getAll: () => api.get('/api/admin/barter/types').then(res => res.data),
  getByKey: (key: string) => api.get(`/api/admin/barter/types/${key}`).then(res => res.data),
  create: (type: BarterType) => api.post('/api/admin/barter/types', type).then(res => res.data),
  update: (key: string, type: Partial<BarterType>) => api.put(`/api/admin/barter/types/${key}`, type).then(res => res.data),
  delete: (key: string) => api.delete(`/api/admin/barter/types/${key}`).then(res => res.data),
};

// Recipes API (from JSON file)
export const recipesApi = {
  getAll: () => api.get('/api/admin/recipes').then(res => res.data),
  create: (recipe: { input1: string; input2: string; outputKey: string; description?: string }) => 
    api.post('/api/admin/recipes', recipe).then(res => res.data),
  delete: (input1: string, input2: string) => 
    api.delete(`/api/admin/recipes/${input1}/${input2}`).then(res => res.data),
};

// Qafala Templates API
export interface QafalaTemplate {
  _id?: string;
  type: 'morning' | 'afternoon' | 'night' | 'random';
  name: string;
  imageUrl: string;
  items: DropItem[];
  active: boolean;
  startHour?: number;
  endHour?: number;
  durationMinutes?: number;
}

export interface QafalaSchedule {
  _id?: string;
  dateId: string;
  slotKey: string;
  category: string;
  startAt: string;
  endAt: string;
  dropId?: string;
  status: string;
  drop?: Drop;
}

export const qafalasApi = {
  getTemplates: () => api.get('/api/qafalas/templates').then(res => res.data),
  getTemplate: (type: string) => api.get(`/api/qafalas/templates/${type}`).then(res => res.data),
  createOrUpdateTemplate: (template: QafalaTemplate) => api.post('/api/qafalas/templates', template).then(res => res.data),
  deleteTemplate: (type: string) => api.delete(`/api/qafalas/templates/${type}`).then(res => res.data),
  getToday: () => api.get('/api/qafalas/today').then(res => res.data),
  syncToday: () => api.post('/api/qafalas/today/sync').then(res => res.data),
  updateItems: (slotKey: string, items: DropItem[], options?: { name?: string; nameAr?: string; startAt?: string; endAt?: string }) => 
    api.put(`/api/qafalas/today/${slotKey}/items`, { items, name: options?.name, nameAr: options?.nameAr, startAt: options?.startAt, endAt: options?.endAt }).then(res => res.data),
  addItem: (slotKey: string, item: DropItem) => 
    api.post(`/api/qafalas/today/${slotKey}/items`, { item }).then(res => res.data),
  removeItem: (slotKey: string, itemId: string) => 
    api.delete(`/api/qafalas/today/${slotKey}/items/${itemId}`).then(res => res.data),
  generate: (date?: string) => 
    api.post(`/api/qafalas/generate${date ? `?date=${date}` : ''}`).then(res => res.data),
};

// Leaderboard API
export const leaderboardApi = {
  getWeekly: (limit?: number) => 
    api.get(`/api/leaderboard/weekly${limit ? `?limit=${limit}` : ''}`).then(res => res.data),
  getConfig: () => api.get('/api/leaderboard/config').then(res => res.data),
  updateConfig: (config: { numberOfWinners?: number; pointsToDinarRate?: number; active?: boolean }) => 
    api.post('/api/leaderboard/config', config).then(res => res.data),
  finalizeWeekly: (force?: boolean, limit?: number) => 
    api.post(`/api/leaderboard/weekly/finalize${force ? '?force=true' : ''}${limit ? `${force ? '&' : '?'}limit=${limit}` : ''}`).then(res => res.data),
  getSeason: () => api.get('/api/leaderboard/season').then(res => res.data),
  getSeasons: () => api.get('/api/leaderboard/seasons').then(res => res.data),
  getSeasonWinners: (seasonId: string) => 
    api.get(`/api/leaderboard/season/${seasonId}/winners`).then(res => res.data),
};

export default api;
