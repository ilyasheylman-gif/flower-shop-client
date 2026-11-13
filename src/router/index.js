import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

/*
 * meta.auth  — только для авторизованных
 * meta.guest — только для гостей (вход, регистрация)
 * meta.roles — список допустимых ролей
 */
const routes = [
  { path: '/', name: 'catalog', component: () => import('@/views/CatalogView.vue') },
  { path: '/bouquets/:id', name: 'bouquet', component: () => import('@/views/BouquetView.vue'), props: true },
  { path: '/constructor', name: 'constructor', component: () => import('@/views/ConstructorView.vue') },
  { path: '/cart', name: 'cart', component: () => import('@/views/CartView.vue') },

  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
  { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { guest: true } },

  { path: '/my-bouquets', name: 'my-bouquets', component: () => import('@/views/MyBouquetsView.vue'), meta: { auth: true } },
  { path: '/orders', name: 'orders', component: () => import('@/views/OrdersView.vue'), meta: { auth: true } },
  { path: '/orders/:id', name: 'order', component: () => import('@/views/OrderView.vue'), props: true, meta: { auth: true } },
  {
    path: '/stock',
    name: 'stock',
    component: () => import('@/views/StockView.vue'),
    meta: { auth: true, roles: ['admin', 'florist'] },
  },

  {
    path: '/admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { auth: true, roles: ['admin'] },
    children: [
      { path: '', redirect: { name: 'admin-bouquets' } },
      { path: 'bouquets', name: 'admin-bouquets', component: () => import('@/views/admin/AdminBouquetsView.vue') },
      { path: 'bouquets/new', name: 'admin-bouquet-new', component: () => import('@/views/admin/BouquetFormView.vue') },
      { path: 'bouquets/:id', name: 'admin-bouquet-edit', component: () => import('@/views/admin/BouquetFormView.vue'), props: true },
      {
        path: 'packagings',
        name: 'admin-packagings',
        component: () => import('@/views/admin/DictionaryView.vue'),
        props: { kind: 'packagings' },
      },
      {
        path: 'occasions',
        name: 'admin-occasions',
        component: () => import('@/views/admin/DictionaryView.vue'),
        props: { kind: 'occasions' },
      },
      { path: 'users', name: 'admin-users', component: () => import('@/views/admin/AdminUsersView.vue') },
      { path: 'stats', name: 'admin-stats', component: () => import('@/views/admin/AdminStatsView.vue') },
    ],
  },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved ?? (to.path !== from.path ? { top: 0 } : undefined),
})

// Защищённые маршруты
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.auth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'catalog' }
  }
  const roles = to.matched.flatMap((r) => r.meta.roles ?? [])
  if (roles.length && !roles.includes(auth.role)) {
    useToastStore().error('Недостаточно прав для этого раздела')
    return { name: 'catalog' }
  }
  return true
})

export default router
