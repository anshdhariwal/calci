const BASE_URL = '/api';

const getToken = () => localStorage.getItem('calci_token');

const request = async (method, path, body = null, isFormData = false) => {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// Auth
export const registerUser = (payload) => request('POST', '/auth/register', payload);
export const loginUser = (payload) => request('POST', '/auth/login', payload);
export const getMe = () => request('GET', '/auth/me');

// SGPA
export const saveSgpa = (payload) => request('POST', '/sgpa', payload);
export const getSgpaHistory = () => request('GET', '/sgpa');
export const updateSgpa = (id, payload) => request('PUT', `/sgpa/${id}`, payload);
export const deleteSgpa = (id) => request('DELETE', `/sgpa/${id}`);
export const getAnalytics = () => request('GET', '/sgpa/analytics');

// OCR
export const uploadImageForOCR = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return request('POST', '/ocr', formData, true);
};
