<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import FlowerArt from '@/components/FlowerArt.vue'
import FormField from '@/components/FormField.vue'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useDictionariesStore } from '@/stores/dictionaries'
import { useToastStore } from '@/stores/toast'
import { COLORS, colorHex, debounce, money, plural } from '@/utils/format'

const DRAFT_KEY = 'flower_shop_constructor_draft'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const dict = useDictionariesStore()
const toast = useToastStore()

const editId = computed(() => route.query.edit ?? null)

const quantities = reactive({}) // flower_id → количество
const packagingId = ref(null)
const name = ref('Мой букет')
const comment = ref('')
const colorFilter = ref('')
const search = ref('')

const calc = ref(null) // ответ POST /custom-bouquets/calculate
const calcLoading = ref(false)
const calcError = ref('') // ошибка расчёта цены — показывается в панели
const saving = ref(false)
const errorMessage = ref('')
const problems = ref([])
const fieldErrors = ref({})

const items = computed(() =>
  Object.entries(quantities)
    .filter(([, q]) => q > 0)
    .map(([flowerId, quantity]) => ({ flower_id: Number(flowerId), quantity })),
)
const MAX_KINDS = 15 // столько разных цветов принимает API (items max:15)
const kindsLimitReached = computed(() => items.value.length >= MAX_KINDS)
const totalStems = computed(() => items.value.reduce((s, i) => s + i.quantity, 0))

const visibleFlowers = computed(() =>
  dict.flowers.filter(
    (f) =>
      (!colorFilter.value || f.color === colorFilter.value) &&
      (!search.value || f.name.toLowerCase().includes(search.value.toLowerCase())),
  ),
)
const selectedColors = computed(() =>
  items.value.flatMap((i) => {
    const f = dict.flowers.find((x) => x.id === i.flower_id)
    return f ? Array(Math.min(i.quantity, 3)).fill(f.color) : []
  }),
)
const packaging = computed(() => dict.packagings.find((p) => p.id === packagingId.value))

function change(flower, delta) {
  if (delta > 0 && !quantities[flower.id] && kindsLimitReached.value) {
    toast.info(`В букете может быть не больше ${MAX_KINDS} разных цветов`)
    return
  }
  const next = Math.max(0, Math.min(flower.stock_quantity, (quantities[flower.id] || 0) + delta))
  quantities[flower.id] = next
}

function setQty(flower, value) {
  if (!quantities[flower.id] && kindsLimitReached.value) {
    toast.info(`В букете может быть не больше ${MAX_KINDS} разных цветов`)
    quantities[flower.id] = 0
    return
  }
  const n = Math.max(0, Math.min(flower.stock_quantity, Math.floor(Number(value) || 0)))
  quantities[flower.id] = n
}

// Расчёт цены на сервере (единственный источник истины по ценам и правилам)
const recalc = debounce(async () => {
  if (!items.value.length || !packagingId.value) {
    calc.value = null
    calcError.value = ''
    return
  }
  calcLoading.value = true
  try {
    calc.value = (await api.customBouquets.calculate({ packaging_id: packagingId.value, items: items.value })).data
    calcError.value = ''
  } catch (e) {
    calc.value = null
    calcError.value = e.message
  } finally {
    calcLoading.value = false
  }
}, 300)

watch([items, packagingId], () => {
  recalc()
  if (!editId.value) {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ quantities: { ...quantities }, packagingId: packagingId.value, name: name.value }))
  }
}, { deep: true })

async function save(thenToCart = false) {
  errorMessage.value = ''
  problems.value = []
  fieldErrors.value = {}

  if (!auth.isAuthenticated) {
    toast.info('Войдите, чтобы сохранить букет — собранный состав сохранится')
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (!name.value.trim()) {
    fieldErrors.value = { name: 'Введите название букета' }
    return
  }
  if (!items.value.length) {
    errorMessage.value = 'Добавьте в букет хотя бы один цветок'
    return
  }

  const body = { name: name.value.trim(), comment: comment.value || null, packaging_id: packagingId.value, items: items.value }
  saving.value = true
  try {
    const res = editId.value
      ? await api.customBouquets.update(editId.value, body)
      : await api.customBouquets.create(body)
    const saved = res.data
    sessionStorage.removeItem(DRAFT_KEY)

    if (thenToCart) {
      cart.add({ type: 'custom', id: saved.id, name: saved.name, price: saved.price, colors: selectedColors.value, packaging: packaging.value ? { type: packaging.value.type, color: packaging.value.color } : null })
      toast.success('Букет сохранён и добавлен в корзину')
      router.push({ name: 'cart' })
    } else {
      toast.success('Букет сохранён')
      router.push({ name: 'my-bouquets' })
    }
  } catch (e) {
    if (e.status === 422) {
      fieldErrors.value = Object.fromEntries(Object.keys(e.errors).map((k) => [k, e.field(k)]))
      errorMessage.value = e.message
    } else {
      // 409 — нарушены правила сборки (чётное количество, вместимость упаковки и т. д.)
      errorMessage.value = e.message
      problems.value = e.details?.problems ?? []
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await dict.load()

  if (editId.value) {
    try {
      const b = (await api.customBouquets.get(editId.value)).data
      if (b.is_ordered) toast.info('Этот букет уже заказан — изменения сохранить не получится')
      name.value = b.name
      comment.value = b.comment ?? ''
      packagingId.value = b.packaging_id
      b.items.forEach((i) => (quantities[i.flower_id] = i.quantity))
    } catch (e) {
      toast.error(e.message)
      router.replace({ name: 'constructor' })
    }
    return
  }

  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY))
    if (draft) {
      Object.assign(quantities, draft.quantities)
      packagingId.value = draft.packagingId
      name.value = draft.name || name.value
    }
  } catch {
    /* черновика нет */
  }
  packagingId.value ??= dict.packagings[0]?.id ?? null
})
</script>

<template>
  <div class="container page">
    <div class="page-head">
      <div>
        <h1>{{ editId ? 'Редактирование букета' : 'Конструктор букета' }}</h1>
        <p>Выберите цветы и упаковку — стоимость пересчитывается сразу. По традиции дарят нечётное число цветов.</p>
      </div>
    </div>

    <div class="two-col">
      <section class="stack">
        <div class="card stack">
          <div class="spread">
            <h3>1. Цветы</h3>
            <div class="row">
              <input v-model="search" placeholder="Поиск" class="mini" />
              <select v-model="colorFilter" class="mini">
                <option value="">Все цвета</option>
                <option v-for="(c, key) in COLORS" :key="key" :value="key">{{ c.label }}</option>
              </select>
            </div>
          </div>

          <p class="muted small">Разных цветов в букете: {{ items.length }} / {{ MAX_KINDS }}</p>
          <div class="flowers">
            <div v-for="f in visibleFlowers" :key="f.id" class="flower" :class="{ picked: quantities[f.id] > 0, out: f.stock_quantity === 0 }">
              <span class="swatch" :style="{ background: colorHex(f.color) }"></span>
              <div class="info">
                <strong>{{ f.name }}</strong>
                <span class="muted small">{{ money(f.price) }} / шт · в наличии {{ f.stock_quantity }}</span>
              </div>
              <div class="counter">
                <button type="button" class="icon-btn" :disabled="!quantities[f.id]" @click="change(f, -1)">−</button>
                <input :value="quantities[f.id] || 0" type="number" min="0" :max="f.stock_quantity" @change="setQty(f, $event.target.value)" />
                <button type="button" class="icon-btn" :disabled="f.stock_quantity === 0 || quantities[f.id] >= f.stock_quantity || (!quantities[f.id] && kindsLimitReached)" @click="change(f, 1)">+</button>
              </div>
            </div>
            <p v-if="!visibleFlowers.length" class="muted">Нет цветов по выбранным условиям.</p>
          </div>
        </div>

        <div class="card stack">
          <h3>2. Упаковка</h3>
          <div class="packs">
            <label v-for="p in dict.packagings" :key="p.id" class="pack" :class="{ active: packagingId === p.id }">
              <input v-model="packagingId" type="radio" :value="p.id" />
              <strong>{{ p.name }}</strong>
              <span class="muted small">{{ p.type_label }} · до {{ p.max_flowers }} цветов</span>
              <span>{{ money(p.price) }}</span>
            </label>
          </div>
        </div>
      </section>

      <aside class="card sticky stack summary">
        <FlowerArt :colors="selectedColors" :seed="totalStems + 7" :packaging="packaging" />
        <FormField label="Название" :error="fieldErrors.name">
          <input v-model="name" maxlength="100" :class="{ invalid: fieldErrors.name }" />
        </FormField>
        <FormField label="Пожелания флористу" :error="fieldErrors.comment">
          <textarea v-model="comment" rows="2" maxlength="500" placeholder="Например: без ленты"></textarea>
        </FormField>

        <div v-if="!items.length" class="muted">Добавьте цветы, чтобы увидеть стоимость.</div>
        <div v-else-if="calcError" class="alert alert-error small">{{ calcError }}</div>
        <template v-else-if="calc">
          <table class="small">
            <tbody>
              <tr v-for="l in calc.items" :key="l.flower_id">
                <td>{{ l.name }} × {{ l.quantity }}</td>
                <td class="num">{{ money(l.subtotal) }}</td>
              </tr>
              <tr>
                <td>Упаковка «{{ calc.packaging.name }}»</td>
                <td class="num">{{ money(calc.packaging.price) }}</td>
              </tr>
              <tr>
                <td>Работа флориста</td>
                <td class="num">{{ money(calc.assembly_fee) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="spread">
            <span>{{ calc.flowers_count }} {{ plural(calc.flowers_count, ['цветок', 'цветка', 'цветов']) }}</span>
            <span class="price" :class="{ dim: calcLoading }">{{ money(calc.total) }}</span>
          </div>
          <div v-if="calc.warnings.length" class="alert alert-warn small">
            <ul>
              <li v-for="w in calc.warnings" :key="w">{{ w }}</li>
            </ul>
          </div>
          <div v-else class="alert alert-ok small">Букет можно собрать ✓</div>
        </template>

        <div v-if="errorMessage" class="alert alert-error small">
          {{ errorMessage }}
          <ul v-if="problems.length > 1">
            <li v-for="p in problems" :key="p">{{ p }}</li>
          </ul>
        </div>

        <button class="btn btn-rose btn-block" :disabled="saving || !items.length" @click="save(true)">
          {{ editId ? 'Сохранить и в корзину' : 'В корзину' }}
        </button>
        <button class="btn btn-ghost btn-block" :disabled="saving || !items.length" @click="save(false)">Сохранить в «Мои букеты»</button>
        <p v-if="!auth.isAuthenticated" class="muted small">Чтобы сохранить букет, нужно войти — состав не потеряется.</p>
        <p v-if="packaging" class="muted small">Вместимость упаковки: {{ totalStems }} / {{ packaging.max_flowers }}</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.mini {
  width: auto;
  padding: 6px 10px;
}
.flowers {
  display: grid;
  gap: 8px;
}
.flower {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  transition: border-color 0.15s;
}
.flower.picked {
  border-color: var(--rose);
  background: #fff8f9;
}
.flower.out {
  opacity: 0.5;
}
.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex: none;
}
.info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.counter {
  display: flex;
  align-items: center;
  gap: 6px;
}
.counter input {
  width: 58px;
  text-align: center;
  padding: 6px;
}
.packs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.pack {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  background: #fff;
}
.pack input {
  display: none;
}
.pack.active {
  border-color: var(--moss);
  box-shadow: 0 0 0 2px rgba(47, 74, 58, 0.15);
}
.summary table td {
  padding: 6px 0;
}
.dim {
  opacity: 0.5;
}
</style>
