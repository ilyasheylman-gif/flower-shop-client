<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'
import { ROLE_LABELS } from '@/utils/format'

const auth = useAuthStore()
const cart = useCartStore()
const toast = useToastStore()
const router = useRouter()
const menuOpen = ref(false)

// Пункты меню зависят от роли — недоступные разделы не показываются
const links = computed(() => {
  const list = [
    { to: { name: 'catalog' }, label: 'Каталог' },
    { to: { name: 'constructor' }, label: 'Конструктор' },
  ]
  if (!auth.isAuthenticated) return list

  if (auth.hasRole('customer', 'admin')) list.push({ to: { name: 'my-bouquets' }, label: 'Мои букеты' })

  const ordersLabel = { florist: 'Очередь сборки', courier: 'Доставки', admin: 'Заказы' }[auth.role] ?? 'Мои заказы'
  list.push({ to: { name: 'orders' }, label: ordersLabel })

  if (auth.hasRole('florist', 'admin')) list.push({ to: { name: 'stock' }, label: 'Склад' })
  if (auth.hasRole('admin')) list.push({ to: { name: 'admin-bouquets' }, label: 'Управление' })
  return list
})

async function logout() {
  await auth.logout()
  toast.info('Вы вышли из системы')
  router.push({ name: 'catalog' })
}
</script>

<template>
  <header class="header">
    <div class="container bar">
      <RouterLink :to="{ name: 'catalog' }" class="logo">
        <span class="logo-mark">❀</span>
        <span>Лепесток</span>
      </RouterLink>

      <button class="burger" @click="menuOpen = !menuOpen" aria-label="Меню">☰</button>

      <nav :class="{ open: menuOpen }" @click="menuOpen = false">
        <RouterLink v-for="link in links" :key="link.label" :to="link.to">{{ link.label }}</RouterLink>
      </nav>

      <div class="right">
        <RouterLink :to="{ name: 'cart' }" class="cart">
          Корзина
          <span v-if="cart.count" class="cart-count">{{ cart.count }}</span>
        </RouterLink>

        <template v-if="auth.isAuthenticated">
          <div class="user">
            <strong>{{ auth.user.name }}</strong>
            <span class="muted small">{{ ROLE_LABELS[auth.role] }}</span>
          </div>
          <button class="btn btn-ghost btn-sm" @click="logout">Выйти</button>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'login' }" class="btn btn-sm">Войти</RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(250, 246, 240, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}
.bar {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 68px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--serif);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--moss);
}
.logo-mark {
  color: var(--rose);
}
nav {
  display: flex;
  gap: 4px;
  flex: 1;
}
nav a {
  padding: 8px 12px;
  border-radius: 999px;
  color: var(--ink);
  font-weight: 500;
}
nav a.router-link-exact-active,
nav a.router-link-active:not([href='/']) {
  background: var(--paper-2);
  color: var(--moss);
}
.right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.cart {
  position: relative;
  font-weight: 550;
  color: var(--ink);
}
.cart-count {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--rose);
  color: #fff;
  font-size: 0.75rem;
  margin-left: 4px;
}
.user {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  text-align: right;
}
.burger {
  display: none;
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
}
@media (max-width: 980px) {
  .burger {
    display: block;
    order: 3;
  }
  nav {
    display: none;
    position: absolute;
    top: 68px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: var(--paper);
    border-bottom: 1px solid var(--line);
    padding: 12px 16px;
  }
  nav.open {
    display: flex;
  }
  .right {
    margin-left: auto;
  }
  .user {
    display: none;
  }
}
</style>
