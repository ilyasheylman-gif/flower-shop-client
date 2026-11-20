<script setup>
/**
 * Цветы и склад. Флорист: поступление и списание. Администратор: дополнительно
 * создание, изменение и удаление цветов.
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api } from '@/api'
import FormField from '@/components/FormField.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { useAuthStore } from '@/stores/auth'
import { useDictionariesStore } from '@/stores/dictionaries'
import { useToastStore } from '@/stores/toast'
import { COLORS, colorHex, debounce, money } from '@/utils/format'

const auth = useAuthStore()
const dict = useDictionariesStore()
const toast = useToastStore()
const isAdmin = computed(() => auth.hasRole('admin'))

const filters = reactive({ search: '', color: '', sort: 'stock_quantity:asc' })
const page = ref(1)
const flowers = ref([])
const meta = ref(null)
const error = ref('')
const stockInput = reactive({}) // flower_id → изменение остатка

async function load() {
  const [sort, order] = filters.sort.split(':')
  try {
    const res = await api.flowers.list({ ...filters, sort, order, include_inactive: true, page: page.value, per_page: 20 })
    flowers.value = res.data
    meta.value = res.meta
  } catch (e) {
    error.value = e.message
  }
}
watch(() => ({ ...filters }), debounce(() => ((page.value = 1), load())))

async function changeStock(flower, sign) {
  const delta = sign * Math.abs(Number(stockInput[flower.id]) || 0)
  if (!delta) {
    toast.error('Укажите количество')
    return
  }
  try {
    const updated = (await api.flowers.changeStock(flower.id, delta, sign > 0 ? 'Поступление' : 'Списание')).data
    Object.assign(flower, updated)
    stockInput[flower.id] = ''
    toast.success(`${flower.name}: остаток ${updated.stock_quantity} шт.`)
    dict.load(true)
  } catch (e) {
    toast.error(e.message) // 409 — нельзя списать больше остатка
  }
}

// ---------- Администратор: форма цветка ----------
const emptyForm = () => ({ id: null, name: '', color: 'red', price: '', stock_quantity: 0, description: '', is_active: true })
const form = reactive(emptyForm())
const formOpen = ref(false)
const formErrors = ref({})
const saving = ref(false)

function openForm(flower = null) {
  Object.assign(form, emptyForm(), flower ? { ...flower, description: flower.description ?? '' } : {})
  formErrors.value = {}
  formOpen.value = true
}

async function saveFlower() {
  const e = {}
  if (!form.name.trim()) e.name = 'Введите название'
  if (!(Number(form.price) > 0)) e.price = 'Цена должна быть больше нуля'
  formErrors.value = e
  if (Object.keys(e).length) return

  const body = {
    name: form.name.trim(),
    color: form.color,
    price: Number(form.price),
    stock_quantity: Number(form.stock_quantity),
    description: form.description || null,
    is_active: form.is_active,
  }
  saving.value = true
  try {
    if (form.id) await api.flowers.update(form.id, body)
    else await api.flowers.create(body)
    toast.success('Цветок сохранён')
    formOpen.value = false
    await load()
    dict.load(true)
  } catch (err) {
    if (err.status === 422) formErrors.value = Object.fromEntries(Object.keys(err.errors).map((k) => [k, err.field(k)]))
    else toast.error(err.message)
  } finally {
    saving.value = false
  }
}

async function removeFlower(flower) {
  if (!confirm(`Удалить «${flower.name}»?`)) return
  try {
    await api.flowers.remove(flower.id)
    toast.success('Цветок удалён')
    await load()
  } catch (e) {
    toast.error(e.message) // 409 — цветок входит в букеты
  }
}

onMounted(load)
</script>

<template>
  <div class="container page">
    <div class="page-head">
      <div>
        <h1>Цветы и склад</h1>
        <p>Остатки списываются автоматически при оформлении заказа и возвращаются при отмене.</p>
      </div>
      <button v-if="isAdmin" class="btn" @click="openForm()">+ Новый цветок</button>
    </div>

    <form v-if="formOpen" class="card stack" style="margin-bottom: 20px" novalidate @submit.prevent="saveFlower">
      <h3>{{ form.id ? 'Изменить цветок' : 'Новый цветок' }}</h3>
      <div class="form-grid">
        <FormField label="Название" :error="formErrors.name"><input v-model="form.name" :class="{ invalid: formErrors.name }" /></FormField>
        <FormField label="Цвет" :error="formErrors.color">
          <select v-model="form.color">
            <option v-for="(c, key) in COLORS" :key="key" :value="key">{{ c.label }}</option>
          </select>
        </FormField>
        <FormField label="Цена за шт., ₸" :error="formErrors.price"><input v-model="form.price" type="number" min="1" :class="{ invalid: formErrors.price }" /></FormField>
        <FormField v-if="!form.id" label="Начальный остаток" :error="formErrors.stock_quantity"><input v-model="form.stock_quantity" type="number" min="0" /></FormField>
      </div>
      <FormField label="Описание" :error="formErrors.description"><textarea v-model="form.description" rows="2"></textarea></FormField>
      <label class="checkbox"><input v-model="form.is_active" type="checkbox" /> В продаже</label>
      <div class="row">
        <button class="btn" :disabled="saving">Сохранить</button>
        <button type="button" class="btn btn-ghost" @click="formOpen = false">Отмена</button>
      </div>
    </form>

    <div class="row toolbar">
      <input v-model="filters.search" placeholder="Поиск по названию" class="search" />
      <select v-model="filters.color" class="auto">
        <option value="">Все цвета</option>
        <option v-for="(c, key) in COLORS" :key="key" :value="key">{{ c.label }}</option>
      </select>
      <select v-model="filters.sort" class="auto">
        <option value="stock_quantity:asc">Меньше всего на складе</option>
        <option value="name:asc">По названию</option>
        <option value="price:desc">По цене</option>
      </select>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Цветок</th>
            <th class="num">Цена</th>
            <th class="num">Остаток</th>
            <th>Поступление / списание</th>
            <th v-if="isAdmin"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in flowers" :key="f.id" :class="{ inactive: !f.is_active }">
            <td>
              <span class="dot" :style="{ background: colorHex(f.color) }"></span>
              {{ f.name }}
              <span v-if="!f.is_active" class="badge status-cancelled">не в продаже</span>
            </td>
            <td class="num">{{ money(f.price) }}</td>
            <td class="num">
              <strong :class="{ low: f.stock_quantity < 20 }">{{ f.stock_quantity }}</strong>
            </td>
            <td>
              <div class="row nowrap">
                <input v-model="stockInput[f.id]" type="number" min="1" placeholder="шт." class="qty" />
                <button class="btn btn-sm" @click="changeStock(f, 1)">+ Приход</button>
                <button class="btn btn-danger btn-sm" @click="changeStock(f, -1)">− Списать</button>
              </div>
            </td>
            <td v-if="isAdmin">
              <div class="row nowrap">
                <button class="btn btn-ghost btn-sm" @click="openForm(f)">Изменить</button>
                <button class="btn btn-danger btn-sm" @click="removeFlower(f)">Удалить</button>
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
.toolbar {
  margin-bottom: 16px;
}
.search {
  max-width: 280px;
}
.auto {
  width: auto;
}
.nowrap {
  flex-wrap: nowrap;
}
.qty {
  width: 80px;
}
.low {
  color: var(--danger);
}
.inactive td {
  opacity: 0.6;
}
</style>
