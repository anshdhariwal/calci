const NAMESPACE = 'calci-app';
const KEY = 'page-likes';
const STORAGE_KEY = `liked_${NAMESPACE}_${KEY}`;

export const getCurrentCount = async () => {
  try {
    const response = await fetch(`https://api.countapi.xyz/get/${NAMESPACE}/${KEY}`);
    const data = await response.json();
    return data.value || 0;
  } catch (error) {
    console.error('Error fetching like count:', error);
    return 0;
  }
};

export const incrementCount = async () => {
  try {
    const response = await fetch(`https://api.countapi.xyz/hit/${NAMESPACE}/${KEY}`);
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Error incrementing like count:', error);
    throw error;
  }
};

export const hasUserLiked = () => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const markAsLiked = () => {
  localStorage.setItem(STORAGE_KEY, 'true');
};
