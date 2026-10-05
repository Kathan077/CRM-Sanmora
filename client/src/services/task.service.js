import { apiRequest } from './api';

export const taskService = {
  getAllTasks: async (params = {}) => {
    let url = '/tasks';
    if (params) {
      if (typeof params === 'string') {
        url += params.startsWith('?') ? params : `?${params}`;
      } else if (typeof params === 'object') {
        const query = new URLSearchParams(params).toString();
        if (query) url += `?${query}`;
      }
    }
    return apiRequest(url, 'GET');
  },

  createTask: async (data) => {
    return apiRequest('/tasks', 'POST', data);
  },

  updateTask: async (id, data) => {
    return apiRequest(`/tasks/${id}`, 'PUT', data);
  },

  deleteTask: async (id) => {
    return apiRequest(`/tasks/${id}`, 'DELETE');
  }
};
