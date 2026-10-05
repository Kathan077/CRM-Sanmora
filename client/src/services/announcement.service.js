import { apiRequest } from './api';

export const announcementService = {
  // Get active non-expired announcements
  getActiveAnnouncements: async () => {
    return apiRequest('/announcements/active', 'GET');
  },

  // Get all announcements for admin management
  getAllAnnouncements: async () => {
    return apiRequest('/announcements', 'GET');
  },

  // Create / Publish new announcement
  createAnnouncement: async (announcementData) => {
    return apiRequest('/announcements', 'POST', announcementData);
  },

  // Update announcement
  updateAnnouncement: async (id, announcementData) => {
    return apiRequest(`/announcements/${id}`, 'PUT', announcementData);
  },

  // Delete / deactivate announcement
  deleteAnnouncement: async (id) => {
    return apiRequest(`/announcements/${id}`, 'DELETE');
  }
};
