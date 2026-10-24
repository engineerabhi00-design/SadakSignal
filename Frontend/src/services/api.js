import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const getPotholes = async (filters = {}) => {
  const params = {
    limit: filters.limit ?? 100,
  };
  ['status', 'severity', 'authority_id', 'zone', 'search'].forEach((key) => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params[key] = filters[key];
    }
  });

  const response = await api.get('/api/potholes', { params });
  return response.data;
};

export const getPotholeById = async (id) => {
  const response = await api.get(`/api/potholes/${id}`);
  return response.data;
};

export const getPotholeStats = async () => {
  const response = await api.get('/api/potholes/stats/summary');
  return response.data;
};

export const detectImage = async (formData) => {
  const response = await api.post('/api/detect/image', formData);
  return response.data;
};

export const detectVideo = async (formData) => {
  const response = await api.post('/api/detect/video', formData, { timeout: 120000 });
  return response.data;
};

export const updatePotholeStatus = async (id, status, notes = '', resolutionImageUrl = '') => {
  const response = await api.patch(`/api/potholes/${id}/status`, {
    status,
    resolution_notes: notes,
    resolution_image_url: resolutionImageUrl,
  });
  return response.data;
};

export const uploadResolutionProof = async (id, formData) => {
  const response = await api.post(`/api/potholes/${id}/resolution-proof`, formData);
  return response.data;
};

export const deletePothole = async (id) => {
  const response = await api.delete(`/api/potholes/${id}`);
  return response.data;
};

export const getAuthorities = async () => {
  const response = await api.get('/api/authorities');
  return response.data;
};

export const lookupAuthority = async (lat, lng, roadType = 'URBAN_ROAD') => {
  const response = await api.post(`/api/authorities/lookup?lat=${lat}&lng=${lng}&road_type=${roadType}`);
  return response.data;
};

export const getTickets = async () => {
  const response = await api.get('/api/tickets');
  return response.data;
};

export const getPdfReportUrl = (ticketCode) => {
  return `${API_BASE}/api/tickets/${encodeURIComponent(ticketCode)}/download-pdf`;
};

export const getConfigStatus = async () => {
  const response = await api.get('/api/config/status');
  return response.data;
};

export const FALLBACK_ROAD_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="%230f172a"/><line x1="320" y1="0" x2="320" y2="480" stroke="%23334155" stroke-width="4" stroke-dasharray="20 15"/><ellipse cx="320" cy="240" rx="100" ry="50" fill="%231e293b" stroke="%23f59e0b" stroke-width="3" stroke-dasharray="6 4"/><ellipse cx="320" cy="240" rx="70" ry="30" fill="%23090d16"/><text x="320" y="330" text-anchor="middle" fill="%2394a3b8" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">ROAD DEFECT CAPTURE</text><text x="320" y="355" text-anchor="middle" fill="%2364748b" font-family="system-ui, sans-serif" font-size="11">Municipal Evidence Archive</text></svg>`;

export const getMediaUrl = (url) => {
  if (!url) return FALLBACK_ROAD_IMAGE;
  // Preserve blob: and data: URLs (used by file upload preview, presets, webcam capture)
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  
  // Absolute HTTP/HTTPS URLs
  if (/^(https?:)?\/\//i.test(url)) {
    return url;
  }

  // Relative paths: ensure correct leading slash
  return `${API_BASE}${url.startsWith('/') ? url : '/' + url}`;
};

export default api;
