import { Counter } from 'counterapi';

const WORKSPACE = import.meta.env.VITE_COUNTERAPI_WORKSPACE || 'calci-app';
const TOKEN = import.meta.env.VITE_COUNTERAPI_TOKEN;
const KEY = 'page-likes';
const STORAGE_KEY = `liked_${WORKSPACE}_${KEY}`;

const counter = new Counter({
  workspace: WORKSPACE,
  accessToken: TOKEN,
  timeout: 5000,
  debug: false
});

export const getCurrentCount = async () => {
  try {
    const result = await counter.get(KEY);
    return result.value || 0;
  } catch (error) {
    if (error.code === 'ERR_NETWORK' || error.message?.includes('blocked')) {
      return 0;
    }
    console.error('error fetching like count:', error);
    return 0;
  }
};

export const incrementCount = async () => {
  try {
    const result = await counter.up(KEY);
    return result.value;
  } catch (error) {
    if (error.code === 'ERR_NETWORK' || error.message?.includes('blocked')) {
      return 0;
    }
    console.error('error incrementing like count:', error);
    throw error;
  }
};

export const hasUserLiked = () => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const markAsLiked = () => {
  localStorage.setItem(STORAGE_KEY, 'true');
};
