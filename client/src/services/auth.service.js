import { apiRequest } from './api';

export const authService = {
  async login(email, password) {
    const res = await apiRequest('/auth/login', 'POST', { email, password });
    if (res.success && res.data?.token) {
      localStorage.setItem('crm_token', res.data.token);
      localStorage.setItem('crm_user', JSON.stringify(res.data.user));
      localStorage.setItem('crm_last_activity', Date.now().toString());
      sessionStorage.setItem('crm_session_active', 'true');
      sessionStorage.setItem('crm_token', res.data.token);
      if (res.data.sessionId) {
        localStorage.setItem('crm_session_id', res.data.sessionId);
      }
    }
    return res;
  },

  async getMe() {
    return await apiRequest('/auth/me', 'GET');
  },

  async updateProfile(data) {
    return await apiRequest('/auth/profile', 'PUT', data);
  },

  async changePassword(currentPassword, newPassword) {
    return await apiRequest('/auth/change-password', 'PUT', { currentPassword, newPassword });
  },

  async logout(logoutType = 'manual') {
    if (typeof window !== 'undefined') {
      const sessionId = localStorage.getItem('crm_session_id');
      const crmUserRaw = localStorage.getItem('crm_user');
      let userId = null;
      if (crmUserRaw) {
        try {
          const parsed = JSON.parse(crmUserRaw);
          userId = parsed.id || parsed._id;
        } catch (e) {
          // ignore
        }
      }

      try {
        await apiRequest('/auth/logout', 'POST', { logoutType, sessionId, userId });
      } catch (err) {
        console.warn('[Logout Sync Warning]:', err.message);
      }
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      localStorage.removeItem('crm_session_id');
      localStorage.removeItem('crm_last_activity');
      sessionStorage.removeItem('crm_session_active');
      sessionStorage.removeItem('crm_token');
    }
  }
};
