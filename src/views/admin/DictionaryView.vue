<script setup>
/**
 * Универсальная страница справочника: упаковка или поводы.
 */
import { computed, reactive, ref, watch } from 'vue'
import { api } from '@/api'
import FormField from '@/components/FormField.vue'
import { useDictionariesStore } from '@/stores/dictionaries'
import { useToastStore } from '@/stores/toast'
import { money, PACKAGING_TYPES } from '@/utils/format'

const props = defineProps({ kind: { type: String, required: true } })

const toast = useToastStore()
const dict = useDictionariesStore()

const CONFIG = {
  packagings: {
    title: 'Упаковка',
    api: api.packagings,
    query: { include_inactive: true },
    empty: () => ({ name: '', type: 'paper', color: '', price: 0, max_flowers: 51, is_active: true }),
    fields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'type', label: 'Тип', type: 'select', options: PACKAGING_TYPES },
      { key: 'color', label: 'Цвет', type: 'text' },
      { key: 'price', label: 'Цена, ₽', type: 'number' },
      { key: 'max_flowers', label: 'Вместимость, цветов', type: 'number' },
      { key: 'is_active', label: 'Доступна', type: 'checkbox' },
    ],
    columns: [
      { key: 'name', label: 'Название' },
      { key: 'type_label', label: 'Тип' },
      { key: 'max_flowers', label: 'Вместимость', num: true },
      { key: 'price', label: 'Цена', num: true, format: money },
      { key: 'is_active', label: 'Доступна', format: (v) => (v ? 'да' : 'нет') },
    ],
  },
  occasions: {
    title: 'Поводы',
    api: api.occasions,
    query: {},
    empty: () => ({ name: '', slug: '' }),
    fields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'slug', label: 'Код (латиница)', type: 'text', required: true },
    ],
    columns: [
      { key: 'name', label: 'Название' },
      { key: 'slug', label: 'Код' },
      { key: 'bouquets_count', label: 'Букетов', num: true },
    ],
  },
}

const config = computed(() => CONFIG[props.kind])
const items = ref([])
const form = reactive({})
const editingId = ref(null)
const formOpen = ref(false)
const errors = ref({})
const saving = ref(false)

async function load() {
  try {
    items.value = (await config.value.api.list(config.value.query)).data
  } catch (e) {
    toast.error(e.message)
  }
}

function open(item = null) {
  Object.keys(form).forEach((k) => delete form[k])
  Object.assign(form, config.value.empty(), item ?? {})
  editingId.value = item?.id ?? null
  errors.value = {}
  formOpen.value = true
}

async function save() {
  const e = {}
  config.value.fields.filter((f) => f.required).forEach((f) => {
    if (!String(form[f.key] ?? '').trim()) e[f.key] = 'Обязательное поле'
  })
  errors.value = e
  if (Object.keys(e).length) return

  const body = Object.fromEntries(config.value.fields.map((f) => [f.key, f.type === 'number' ? Number(form[f.key]) : form[f.key]]))
  saving.value = true
  try {
    if (editingId.value) await config.value.api.update(editingId.value, body)
    else await config.value.api.create(body)
    toast.success('Сохранено')
    formOpen.value = false
    await load()
    dict.load(true)
  } catch (err) {
    if (err.status === 422) errors.value = Object.fromEntries(Object.keys(err.errors).map((k) => [k, err.field(k)]))
    else toast.error(err.message)
  } finally {
    saving.value = false
  }
}

async function remove(item) {
  if (!confirm(`Удалить «${item.name}»?`)) return
  try {
    await config.value.api.remove(item.id)
    toast.success('Удалено')
    await load()
    dict.load(true)
  } catch (e) {
    toast.error(e.message) // 409 — запись используется
  }
}

watch(
  () => props.kind,
  () => {
    formOpen.value = false
    load()
  },
  { immediate: true },
)
</script>

<template>
  <div class="stack">
    <div class="spread">
      <h2>{{ config.title }}</h2>
      <button class="btn" @click="open()">+ Добавить</button>
    </div>

    <form v-if="formOpen" class="card stack" novalidate @submit.prevent="save">
      <div class="form-grid">
        <template v-for="f in config.fields" :key="f.key">
          <label v-if="f.type === 'checkbox'" class="checkbox"><input v-model="form[f.key]" type="checkbox" /> {{ f.label }}</label>
          <FormField v-else :label="f.label" :error="errors[f.key]">
            <select v-if="f.type === 'select'" v-model="form[f.key]">
              <option v-for="(label, value) in f.options" :key="value" :value="value">{{ label }}</option>
            </select>
            <input v-else v-model="form[f.key]" :type="f.type" :class="{ invalid: errors[f.key] }" />
          </FormField>
        </template>
      </div>
      <div class="row">
        <button class="btn" :disabled="saving">Сохранить</button>
        <button type="button" class="btn btn-ghost" @click="formOpen = false">Отмена</button>
      </div>
    </form>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th v-for="c in config.columns" :key="c.key" :class="{ num: c.num }">{{ c.label }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td v-for="c in config.columns" :key="c.key" :class="{ num: c.num }">
              {{ c.format ? c.format(item[c.key]) : item[c.key] }}
            </td>
            <td>
              <div class="row actions">
                <button class="btn btn-ghost btn-sm" @click="open(item)">Изменить</button>
                <button class="btn btn-danger btn-sm" @click="remove(item)">Удалить</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.actions {
  justify-content: flex-end;
  flex-wrap: nowrap;
}
</style>
