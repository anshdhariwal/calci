const WORKSPACE = 'calci-app';
const KEY = 'page-likes';
const BASE = `https://api.counterapi.dev/v2/${WORKSPACE}/${KEY}`;
const STORAGE_KEY = `liked_${WORKSPACE}_${KEY}`;

export const getCurrentCount = async () => {
  try {
    const res = await fetch(BASE);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.value || 0;
  } catch {
    return 0;
  }
};

export const incrementCount = async () => {
  try {
    const res = await fetch(`${BASE}/up`, { method: 'PUT' });
    if (!res.ok) throw new Error('failed');
    const data = await res.json();
    return data.value;
  } catch (err) {
    throw err;
  }
};

export const hasUserLiked = () => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const markAsLiked = () => {
  localStorage.setItem(STORAGE_KEY, 'true');
};

