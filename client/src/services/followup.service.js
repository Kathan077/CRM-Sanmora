import { apiRequest } from './api';

export const followupService = {
  getAllFollowups: async (params = {}) => {
    let url = '/followups';
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

  createFollowup: async (data) => {
    return apiRequest('/followups', 'POST', data);
  },

  updateFollowup: async (id, data) => {
    return apiRequest(`/followups/${id}`, 'PUT', data);
  },

  deleteFollowup: async (id) => {
    return apiRequest(`/followups/${id}`, 'DELETE');
  }
};
