import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/app/login' },
    {
      path: '/app/login',
      name: 'AppLogin',
      component: () => import('@/views/app/AppLogin.vue')
    },
    {
      path: '/app/register',
      name: 'AppRegister',
      component: () => import('@/views/app/AppRegister.vue')
    },
    {
      path: '/app/home',
      name: 'AppHome',
      component: () => import('@/views/app/AppHome.vue')
    },
    {
      path: '/app/profile',
      name: 'AppProfile',
      component: () => import('@/views/app/AppProfile.vue')
    }
  ]
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!['/app/login', '/app/register'].includes(to.path) && !auth.token) {
    return '/app/login';
  }
  if (['/app/login', '/app/register'].includes(to.path) && auth.token) {
    return '/app/home';
  }
  return true;
});

export default router;
