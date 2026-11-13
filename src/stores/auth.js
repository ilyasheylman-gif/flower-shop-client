import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/api'
import { tokenStorage } from '@/api/http'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(tokenStorage.get())
  const user = ref(null)
  let initPromise = null

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const role = computed(() => user.value?.role ?? null)
  const hasRole = (...roles) => roles.includes(role.value)

  function setSession(data) {
    token.value = data.token
    user.value = data.user
    tokenStorage.set(data.token)
  }

  /** При запуске приложения: если токен сохранён — загрузить профиль (GET /api/user). */
  function init() {
    if (!initPromise) {
      initPromise = token.value
        ? api.auth
            .me()
            .then((res) => (user.value = res.data))
            .catch(() => reset())
        : Promise.resolve()
    }
    return initPromise
  }

  async function login(email, password) {
    const res = await api.auth.login(email, password)
    setSession(res.data)
  }

  async function register(payload) {
    const res = await api.auth.register(payload)
    setSession(res.data)
  }

  async function logout() {
    try {
      await api.auth.logout()
    } finally {
      reset()
    }
  }

  /** Удаление токена на клиенте (выход или ответ 401). */
  function reset() {
    tokenStorage.clear()
    token.value = null
    user.value = null
  }

  return { token, user, isAuthenticated, role, hasRole, init, login, register, logout, reset }
})
