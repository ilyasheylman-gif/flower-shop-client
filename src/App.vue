<script setup>
import AppHeader from '@/components/AppHeader.vue'
import ToastList from '@/components/ToastList.vue'
</script>

<template>
  <AppHeader />
  <main>
    <RouterView />
  </main>
  <footer class="footer">
    <div class="container spread">
      <span>«Лепесток» — цветочный магазин с конструктором букетов</span>
      <span class="muted small">Курсовой проект · вариант 28</span>
    </div>
  </footer>
  <ToastList />
</template>

<style scoped>
main {
  min-height: calc(100vh - 140px);
}
.footer {
  border-top: 1px solid var(--line);
  padding: 22px 0;
  font-size: 0.86rem;
  color: var(--ink-soft);
}
</style>
