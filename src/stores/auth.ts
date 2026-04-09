import { defineStore } from 'pinia';

export interface AppUser {
  id?: number;
  account?: string;
  nickName?: string;
  avatar?: string;
  phone?: string;
  email?: string;
}

export const useAuthStore = defineStore('app-auth', {
  state: () => ({
    token: localStorage.getItem('app_token') || '',
    clientId: localStorage.getItem('app_clientid') || '',
    user: JSON.parse(localStorage.getItem('app_user') || '{}') as AppUser
  }),
  actions: {
    setLogin(payload: { token: string; clientId: string; user: AppUser }) {
      this.token = payload.token;
      this.clientId = payload.clientId;
      this.user = payload.user;
      localStorage.setItem('app_token', payload.token);
      localStorage.setItem('app_clientid', payload.clientId);
      localStorage.setItem('app_user', JSON.stringify(payload.user || {}));
    },
    logout() {
      this.token = '';
      this.clientId = '';
      this.user = {};
      localStorage.removeItem('app_token');
      localStorage.removeItem('app_clientid');
      localStorage.removeItem('app_user');
    },
    updateUser(partial: AppUser & Record<string, any>) {
      this.user = { ...this.user, ...partial };
      localStorage.setItem('app_user', JSON.stringify(this.user || {}));
    }
  }
});
