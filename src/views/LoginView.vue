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

const form = reactive({ email: '', password: '' })
const errors = ref({})
const message = ref('')
const loading = ref(false)

const demo = [
  ['Покупатель', 'customer@flowers.test'],
  ['Флорист', 'florist@flowers.test'],
  ['Курьер', 'courier@flowers.test'],
  ['Администратор', 'admin@flowers.test'],
]

function validate() {
  errors.value = {}
  if (!form.email.trim()) errors.value.email = 'Введите email'
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.value.email = 'Некорректный email'
  if (!form.password) errors.value.password = 'Введите пароль'
  return Object.keys(errors.value).length === 0
}

async function submit() {
  message.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await auth.login(form.email.trim(), form.password)
    toast.success(`Добро пожаловать, ${auth.user.name}!`)
    router.push(route.query.redirect || { name: 'catalog' })
  } catch (e) {
    if (e.status === 422) errors.value = { email: e.field('email'), password: e.field('password') }
    message.value = e.message
  } finally {
    loading.value = false
  }
}

function fillDemo(email) {
  form.email = email
  form.password = 'password'
}
</script>

<template>
  <div class="container page auth-page">
    <form class="card auth-card stack" novalidate @submit.prevent="submit">
      <h1>Вход</h1>
      <div v-if="message" class="alert alert-error">{{ message }}</div>

      <FormField label="Email" :error="errors.email">
        <input v-model="form.email" type="email" autocomplete="email" :class="{ invalid: errors.email }" />
      </FormField>
      <FormField label="Пароль" :error="errors.password">
        <input v-model="form.password" type="password" autocomplete="current-password" :class="{ invalid: errors.password }" />
      </FormField>

      <button class="btn btn-block" :disabled="loading">{{ loading ? 'Входим…' : 'Войти' }}</button>
      <p class="muted small">Нет аккаунта? <RouterLink :to="{ name: 'register', query: route.query }">Зарегистрируйтесь</RouterLink></p>

      <hr />
      <p class="muted small">Тестовые учётные записи (пароль <code>password</code>):</p>
      <div class="row">
        <button v-for="[label, email] in demo" :key="email" type="button" class="btn btn-ghost btn-sm" @click="fillDemo(email)">
          {{ label }}
        </button>
      </div>
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
