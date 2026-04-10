import axios from 'axios';
import { API_BASE_URL } from '@/api/apiBase';
import { useAuthStore } from '@/stores/auth';
import JSONbig from 'json-bigint';

const jsonBig = JSONbig({ storeAsString: true });

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  transformResponse: [
    (data) => {
      if (typeof data !== 'string') return data;
      const text = data.trim();
      if (!text) return data;
      try {
        return jsonBig.parse(text);
      } catch {
        return data;
      }
    }
  ]
});

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  config.headers = config.headers || {};
  const skipAuth = Boolean((config as any).skipAuth);
  if (!skipAuth && auth.token) {
    config.headers.Authorization = auth.token;
  }
  if (!config.headers.clientid) {
    config.headers.clientid = auth.clientId || import.meta.env.VITE_APP_CLIENT_ID || 'web_app';
  }
  return config;
});

export default http;
