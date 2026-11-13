<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api } from '@/api'
import PaginationBar from '@/components/PaginationBar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { date, dateTime, debounce, money, STATUS_LABELS } from '@/utils/format'

const auth = useAuthStore()
const toast = useToastStore()

const titles = {
  customer: ['Мои заказы', 'История и статус ваших заказов'],
  florist: ['Очередь сборки', 'Новые и собираемые заказы, отсортированные по времени доставки'],
  courier: ['Доставки', 'Готовые заказы без курьера и ваши текущие доставки'],
  admin: ['Все заказы', 'Управление заказами магазина'],
}
const title = computed(() => titles[auth.role] ?? titles.customer)

const isStaff = computed(() => auth.hasRole('florist', 'courier'))
const filters = reactive({
  status: '',
  date_from: '',
  date_to: '',
  search: '',
  sort: isStaff.value ? 'delivery_date:asc' : 'created_at:desc',
})
const page = ref(1)
const orders = ref([])
const meta = ref(null)
const loading = ref(false)
const error = ref('')
const busy = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  const [sort, order] = filters.sort.split(':')
  try {
    const res = await api.orders.list({ ...filters, sort, order, page: page.value, per_page: 10 })
    orders.value = res.data
    meta.value = res.meta
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(
  () => ({ ...filters }),
  debounce(() => {
    page.value = 1
    load()
  }),
)

// Смена статуса прямо из списка (кнопки показываются по next_statuses из API)
async function changeStatus(order, status) {
  let comment = null
  if (status === 'delivered') comment = prompt('Комментарий к доставке (необязательно):') || null
  busy.value = order.id
  try {
    await api.orders.changeStatus(order.id, status, comment)
    toast.success(`Заказ №${order.id}: ${STATUS_LABELS[status].toLowerCase()}`)
    await load()
  } catch (e) {
    toast.error(e.message) // 403 — нет прав, 409 — недопустимый переход
  } finally {
    busy.value = null
  }
}

const itemsSummary = (o) => o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')

onMounted(load)
</script>

<template>
  <div class="container page">
    <div class="page-head">
      <div>
        <h1>{{ title[0] }}</h1>
        <p>{{ title[1] }}</p>
      </div>
    </div>

    <div class="card filters">
      <label class="field">
        <span>Статус</span>
        <select v-model="filters.status">
          <option value="">Все</option>
          <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </label>
      <label class="field">
        <span>Доставка с</span>
        <input v-model="filters.date_from" type="date" />
      </label>
      <label class="field">
        <span>по</span>
        <input v-model="filters.date_to" type="date" />
      </label>
      <label class="field">
        <span>Поиск</span>
        <input v-model="filters.search" placeholder="№ заказа, получатель, адрес" />
      </label>
      <label class="field">
        <span>Сортировка</span>
        <select v-model="filters.sort">
          <option value="created_at:desc">Новые сначала</option>
          <option value="delivery_date:asc">По дате доставки</option>
          <option value="total_price:desc">По сумме</option>
        </select>
      </label>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-else-if="!loading && !orders.length" class="card empty">
      Заказов нет.
      <RouterLink v-if="auth.hasRole('customer')" :to="{ name: 'catalog' }">Выбрать букет</RouterLink>
    </div>

    <div v-else class="card table-wrap" :class="{ dim: loading }">
      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Доставка</th>
            <th>Состав</th>
            <th v-if="!auth.hasRole('customer')">Получатель</th>
            <th class="num">Сумма</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td>
              <RouterLink :to="{ name: 'order', params: { id: o.id } }"><strong>№{{ o.id }}</strong></RouterLink>
              <div class="muted small">{{ dateTime(o.created_at) }}</div>
            </td>
            <td>
              {{ date(o.delivery.delivery_date) }}
              <div class="muted small">{{ o.delivery.time_from }}–{{ o.delivery.time_to }}</div>
            </td>
            <td class="small items">{{ itemsSummary(o) }}</td>
            <td v-if="!auth.hasRole('customer')" class="small">
              {{ o.delivery.recipient_name }}
              <div class="muted">{{ o.delivery.address }}</div>
            </td>
            <td class="num">{{ money(o.total_price) }}</td>
            <td><StatusBadge :status="o.status" /></td>
            <td>
              <div class="row actions">
                <button
                  v-for="s in o.next_statuses"
                  :key="s.value"
                  class="btn btn-sm"
                  :class="s.value === 'cancelled' ? 'btn-danger' : ''"
                  :disabled="busy === o.id"
                  @click="changeStatus(o, s.value)"
                >
                  {{ s.label }}
                </button>
                <RouterLink :to="{ name: 'order', params: { id: o.id } }" class="btn btn-ghost btn-sm">Открыть</RouterLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar :meta="meta" @change="(p) => { page = p; load() }" />
  </div>
</template>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.items {
  max-width: 260px;
}
.actions {
  justify-content: flex-end;
  flex-wrap: nowrap;
}
.dim {
  opacity: 0.6;
}
</style>
