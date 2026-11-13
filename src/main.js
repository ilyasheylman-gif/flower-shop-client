import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { onUnauthorized } from './api/http'
import { useAuthStore } from './stores/auth'
import { useToastStore } from './stores/toast'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Ответ 401 от API: токен уже удалён в http.js — сбрасываем пользователя и ведём на вход
onUnauthorized(() => {
  useAuthStore().reset()
  useToastStore().info('Сессия истекла. Войдите снова.')
  const current = router.currentRoute.value
  if (current.name !== 'login') {
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
})

app.mount('#app')
