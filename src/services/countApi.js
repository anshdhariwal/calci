const WORKSPACE = 'calci-app';
const KEY = 'page-likes';
const BASE = `https://api.counterapi.dev/v1/${WORKSPACE}/${KEY}`;
const STORAGE_KEY = `liked_${WORKSPACE}_${KEY}`;

export const getlikes = async () => {
  try {
    const res = await fetch(BASE);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count || 0;
  } catch {
    return 0;
  }
};

export const uplike = async () => {
  try {
    const res = await fetch(`${BASE}/up`);
    if (!res.ok) throw new Error('failed');
    const data = await res.json();
    return data.count;
  } catch (err) {
    throw err;
  }
};

export const hasliked = () => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const setliked = () => {
  localStorage.setItem(STORAGE_KEY, 'true');
};

