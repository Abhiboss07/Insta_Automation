import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getStats = () => api.get('/stats').then(r => r.data);
export const getActivity = (limit = 50) => api.get(`/activity?limit=${limit}`).then(r => r.data);

export const getTemplates = () => api.get('/templates').then(r => r.data);
export const createTemplate = (data) => api.post('/templates', data).then(r => r.data);
export const updateTemplate = (id, data) => api.put(`/templates/${id}`, data).then(r => r.data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`).then(r => r.data);

export const getTriggers = () => api.get('/triggers').then(r => r.data);
export const createTrigger = (data) => api.post('/triggers', data).then(r => r.data);
export const updateTrigger = (id, data) => api.put(`/triggers/${id}`, data).then(r => r.data);
export const deleteTrigger = (id) => api.delete(`/triggers/${id}`).then(r => r.data);
export const toggleTrigger = (id) => api.patch(`/triggers/${id}/toggle`).then(r => r.data);

export const testComment = (data) => api.post('/test/comment', data).then(r => r.data);
