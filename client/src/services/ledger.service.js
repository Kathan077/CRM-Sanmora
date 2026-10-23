import { apiRequest } from './api';

export const ledgerService = {
  getAllLedgers: async () => {
    return apiRequest('/ledger', 'GET');
  },

  getLedgerByClientId: async (clientId) => {
    return apiRequest(`/ledger/${clientId}`, 'GET');
  },

  saveLedgerAccount: async (clientId, data) => {
    return apiRequest(`/ledger/${clientId}`, 'POST', data);
  },

  deleteInstalment: async (clientId, instId) => {
    return apiRequest(`/ledger/${clientId}/instalment/${instId}`, 'DELETE');
  }
};
