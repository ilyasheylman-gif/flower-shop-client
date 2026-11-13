<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { api } from '@/api'
import PaginationBar from '@/components/PaginationBar.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { debounce, ROLE_LABELS } from '@/utils/format'

const auth = useAuthStore()
const toast = useToastStore()

const filters = reactive({ role: '', search: '' })
const page = ref(1)
const users = ref([])
const meta = ref(null)

async function load() {
  try {
    const res = await api.users.list({ ...filters, page: page.value, per_page: 20 })
    users.value = res.data
    meta.value = res.meta
  } catch (e) {
    toast.error(e.message)
  }
}
watch(() => ({ ...filters }), debounce(() => ((page.value = 1), load())))

async function changeRole(user, role) {
  if (!confirm(`Назначить пользователю ${user.name} роль «${ROLE_LABELS[role]}»?`)) {
    await load()
    return
  }
  try {
    const updated = (await api.users.changeRole(user.id, role)).data
    Object.assign(user, updated)
    toast.success('Роль изменена')
  } catch (e) {
    toast.error(e.message)
    await load()
  }
}

onMounted(load)
</script>

<template>
  <div class="stack">
    <div class="row">
      <input v-model="filters.search" placeholder="Имя или email" class="search" />
      <select v-model="filters.role" class="auto">
        <option value="">Все роли</option>
        <option v-for="(label, key) in ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Телефон</th>
            <th class="num">Заказов</th>
            <th>Роль</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>
              <strong>{{ u.name }}</strong>
              <div class="muted small">{{ u.email }}</div>
            </td>
            <td class="small">{{ u.phone || '—' }}</td>
            <td class="num">{{ u.orders_count }}</td>
            <td>
              <select :value="u.role" class="auto" :disabled="u.id === auth.user.id" @change="changeRole(u, $event.target.value)">
                <option v-for="(label, key) in ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar :meta="meta" @change="(p) => { page = p; load() }" />
  </div>
</template>

<style scoped>
.search {
  max-width: 280px;
}
.auto {
  width: auto;
}
</style>
