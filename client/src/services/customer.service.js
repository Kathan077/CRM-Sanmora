import { apiRequest } from './api';

export const customerService = {
  getAllCustomers: async (params = {}) => {
    let url = '/customers';
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

  getAllCustomersUnfiltered: async () => {
    return apiRequest('/customers/all-records', 'GET');
  },

  createCustomer: async (data) => {
    return apiRequest('/customers', 'POST', data);
  },

  updateCustomer: async (id, data) => {
    return apiRequest(`/customers/${id}`, 'PUT', data);
  },

  deleteCustomer: async (id) => {
    return apiRequest(`/customers/${id}`, 'DELETE');
  },

  transferCustomer: async (id, data) => {
    return apiRequest(`/customers/${id}/transfer`, 'POST', data);
  },

  bulkTransferCustomers: async (data) => {
    return apiRequest('/customers/bulk-transfer', 'POST', data);
  }
};
