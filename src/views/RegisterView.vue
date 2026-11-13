<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormField from '@/components/FormField.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ name: '', email: '', phone: '', password: '', password_confirmation: '' })
const errors = ref({})
const message = ref('')
const loading = ref(false)

// Предварительная проверка на клиенте; окончательная — на сервере (Form Request)
function validate() {
  const e = {}
  if (!form.name.trim()) e.name = 'Введите имя'
  if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Некорректный email'
  if (form.phone && !/^\+?[0-9\s\-()]{10,20}$/.test(form.phone)) e.phone = 'Телефон в формате +7 900 000-00-00'
  if (form.password.length < 8) e.password = 'Не менее 8 символов'
  else if (!/[A-Za-zА-Яа-я]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Пароль должен содержать буквы и цифры'
  if (form.password !== form.password_confirmation) e.password_confirmation = 'Пароли не совпадают'
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  message.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await auth.register({ ...form, phone: form.phone || null })
    toast.success('Регистрация прошла успешно')
    router.push(route.query.redirect || { name: 'catalog' })
  } catch (e) {
    if (e.status === 422) {
      // ошибки валидации сервера — рядом с полями
      errors.value = Object.fromEntries(Object.keys(e.errors).map((k) => [k, e.field(k)]))
    } else {
      message.value = e.message
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container page auth-page">
    <form class="card auth-card stack" novalidate @submit.prevent="submit">
      <h1>Регистрация</h1>
      <div v-if="message" class="alert alert-error">{{ message }}</div>

      <FormField label="Имя" :error="errors.name">
        <input v-model="form.name" autocomplete="name" :class="{ invalid: errors.name }" />
      </FormField>
      <FormField label="Email" :error="errors.email">
        <input v-model="form.email" type="email" autocomplete="email" :class="{ invalid: errors.email }" />
      </FormField>
      <FormField label="Телефон (необязательно)" :error="errors.phone">
        <input v-model="form.phone" type="tel" placeholder="+7 900 000-00-00" :class="{ invalid: errors.phone }" />
      </FormField>
      <FormField label="Пароль" :error="errors.password">
        <input v-model="form.password" type="password" autocomplete="new-password" :class="{ invalid: errors.password }" />
      </FormField>
      <FormField label="Повторите пароль" :error="errors.password_confirmation">
        <input v-model="form.password_confirmation" type="password" autocomplete="new-password" :class="{ invalid: errors.password_confirmation }" />
      </FormField>

      <button class="btn btn-block" :disabled="loading">{{ loading ? 'Создаём аккаунт…' : 'Зарегистрироваться' }}</button>
      <p class="muted small">Уже есть аккаунт? <RouterLink :to="{ name: 'login', query: route.query }">Войти</RouterLink></p>
    </form>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  place-items: center;
}
.auth-card {
  width: min(440px, 100%);
  padding: 32px;
}
</style>
