/**
 * 与部署约定一致：
 * - 生产：Nginx `location /api/` 反代到后端，前端使用相对路径 `/api`
 * - 开发：`.env.development` 一般为 `VITE_API_BASE_URL=/api`，由 Vite proxy 转发
 * - 若未配置 env：生产默认 `/api`，开发默认直连本机后端
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:8080');
