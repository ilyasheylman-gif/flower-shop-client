<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import FlowerArt from '@/components/FlowerArt.vue'
import FormField from '@/components/FormField.vue'
import { useDictionariesStore } from '@/stores/dictionaries'
import { useToastStore } from '@/stores/toast'
import { money } from '@/utils/format'

const props = defineProps({ id: { type: String, default: null } })

const router = useRouter()
const dict = useDictionariesStore()
const toast = useToastStore()

const form = reactive({
  name: '',
  description: '',
  price: '',
  is_active: true,
  flowers: [{ flower_id: '', quantity: 5 }],
  occasion_ids: [],
})
const imageUrl = ref(null)
const errors = ref({})
const message = ref('')
const saving = ref(false)
const uploading = ref(false)

const isEdit = computed(() => !!props.id)

// Себестоимость цветов — подсказка для назначения цены
const flowersCost = computed(() =>
  form.flowers.reduce((sum, row) => {
    const f = dict.flowers.find((x) => x.id === Number(row.flower_id))
    return sum + (f ? f.price * (Number(row.quantity) || 0) : 0)
  }, 0),
)
const colors = computed(() =>
  form.flowers.map((r) => dict.flowers.find((x) => x.id === Number(r.flower_id))?.color).filter(Boolean),
)

// ошибки бывают клиентские (строка) и серверные из ответа 422 (массив строк)
const err = (key) => {
  const value = errors.value[key]
  return Array.isArray(value) ? value[0] : (value ?? '')
}

function validate() {
  const e = {}
  if (!form.name.trim()) e.name = 'Введите название'
  if (!(Number(form.price) > 0)) e.price = 'Цена должна быть больше нуля'
  if (!form.flowers.some((r) => r.flower_id)) e.flowers = 'Добавьте хотя бы один цветок'
  errors.value = e
  return Object.keys(e).length === 0
}

async function save() {
  message.value = ''
  if (!validate()) return

  const body = {
    name: form.name.trim(),
    description: form.description || null,
    price: Number(form.price),
    is_active: form.is_active,
    flowers: form.flowers.filter((r) => r.flower_id).map((r) => ({ flower_id: Number(r.flower_id), quantity: Number(r.quantity) })),
    occasion_ids: form.occasion_ids,
  }
  saving.value = true
  try {
    const saved = isEdit.value ? (await api.bouquets.update(props.id, body)).data : (await api.bouquets.create(body)).data
    toast.success('Букет сохранён')
    if (!isEdit.value) router.replace({ name: 'admin-bouquet-edit', params: { id: saved.id } })
  } catch (e) {
    if (e.status === 422) {
      errors.value = e.errors // ключи вида "flowers.0.quantity"
      message.value = e.message
    } else {
      message.value = e.message
    }
  } finally {
    saving.value = false
  }
}

// Загрузка фото: FormData, без заголовка Content-Type: application/json
async function upload(event) {
  const file = event.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Файл больше 2 МБ')
    return
  }
  uploading.value = true
  try {
    imageUrl.value = (await api.bouquets.uploadImage(props.id, file)).data.image_url
    toast.success('Фото загружено')
  } catch (e) {
    toast.error(e.status === 422 ? e.field('image') : e.message)
  } finally {
    uploading.value = false
    event.target.value = ''
  }
}

onMounted(async () => {
  await dict.load()
  if (!isEdit.value) return
  try {
    const b = (await api.bouquets.get(props.id)).data
    Object.assign(form, {
      name: b.name,
      description: b.description ?? '',
      price: b.price,
      is_active: b.is_active,
      flowers: b.flowers.map((f) => ({ flower_id: f.id, quantity: f.quantity })),
      occasion_ids: b.occasions.map((o) => o.id),
    })
    imageUrl.value = b.image_url
  } catch (e) {
    message.value = e.message
  }
})
</script>

<template>
  <div class="two-col">
    <form class="card stack" novalidate @submit.prevent="save">
      <h2>{{ isEdit ? 'Редактирование букета' : 'Новый букет' }}</h2>
      <div v-if="message" class="alert alert-error">{{ message }}</div>

      <FormField label="Название" :error="err('name')">
        <input v-model="form.name" maxlength="150" :class="{ invalid: err('name') }" />
      </FormField>
      <FormField label="Описание" :error="err('description')">
        <textarea v-model="form.description" rows="3"></textarea>
      </FormField>

      <div class="field">
        <span>Состав</span>
        <div v-for="(row, i) in form.flowers" :key="i" class="row nowrap">
          <select v-model="row.flower_id" :class="{ invalid: err(`flowers.${i}.flower_id`) }">
            <option value="">— цветок —</option>
            <option v-for="f in dict.flowers" :key="f.id" :value="f.id">{{ f.name }} ({{ money(f.price) }})</option>
          </select>
          <input v-model="row.quantity" type="number" min="1" max="201" class="qty" :class="{ invalid: err(`flowers.${i}.quantity`) }" />
          <button type="button" class="icon-btn" :disabled="form.flowers.length === 1" @click="form.flowers.splice(i, 1)">×</button>
        </div>
        <small v-if="err('flowers')" class="error">{{ err('flowers') }}</small>
        <small v-for="(row, i) in form.flowers" :key="'e' + i" class="error">{{ err(`flowers.${i}.flower_id`) || err(`flowers.${i}.quantity`) }}</small>
        <button type="button" class="btn btn-ghost btn-sm" @click="form.flowers.push({ flower_id: '', quantity: 5 })">+ Добавить цветок</button>
      </div>

      <div class="field">
        <span>Поводы</span>
        <div class="row">
          <label v-for="o in dict.occasions" :key="o.id" class="checkbox chip">
            <input v-model="form.occasion_ids" type="checkbox" :value="o.id" /> {{ o.name }}
          </label>
        </div>
      </div>

      <div class="form-grid">
        <FormField label="Цена, ₸" :error="err('price')">
          <input v-model="form.price" type="number" min="1" :class="{ invalid: err('price') }" />
        </FormField>
        <div class="field">
          <span>Себестоимость цветов</span>
          <div class="muted" style="padding: 9px 0">{{ money(flowersCost) }}</div>
        </div>
      </div>
      <label class="checkbox"><input v-model="form.is_active" type="checkbox" /> В продаже</label>

      <div class="row">
        <button class="btn" :disabled="saving">{{ saving ? 'Сохраняем…' : 'Сохранить' }}</button>
        <RouterLink :to="{ name: 'admin-bouquets' }" class="btn btn-ghost">К списку</RouterLink>
      </div>
    </form>

    <aside class="card stack sticky">
      <FlowerArt :colors="colors" :seed="Number(id) || 1" :image="imageUrl" />
      <template v-if="isEdit">
        <label class="btn btn-ghost btn-block">
          {{ uploading ? 'Загрузка…' : imageUrl ? 'Заменить фото' : 'Загрузить фото' }}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden @change="upload" />
        </label>
        <p class="muted small">JPG, PNG или WEBP, до 2 МБ</p>
      </template>
      <p v-else class="muted small">Фото можно загрузить после сохранения букета.</p>
    </aside>
  </div>
</template>

<style scoped>
.qty {
  width: 90px;
}
.nowrap {
  flex-wrap: nowrap;
  margin-bottom: 6px;
}
</style>
