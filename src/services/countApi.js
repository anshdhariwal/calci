const KEY = 'calciapppagelikes';
const BASE = 'https://countapi.mileshilliard.com/api/v1';
const STORAGE_KEY = 'liked_calciapp_pagelikes';

export const getlikes = async () => {
  try {
    const res = await fetch(`${BASE}/get/${KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.value !== undefined ? data.value : null;
  } catch {
    return null;
  }
};

export const uplike = async () => {
  const res = await fetch(`${BASE}/hit/${KEY}`);
  if (!res.ok) throw new Error('failed');
  const data = await res.json();
  return data.value;
};

export const hasliked = () => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const setliked = () => {
  localStorage.setItem(STORAGE_KEY, 'true');
};

