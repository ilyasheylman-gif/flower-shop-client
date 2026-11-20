<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import BouquetCard from '@/components/BouquetCard.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { useAuthStore } from '@/stores/auth'
import { useDictionariesStore } from '@/stores/dictionaries'
import { COLORS, debounce, money } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const dict = useDictionariesStore()

const SORTS = {
  'created_at:desc': 'Сначала новые',
  'price:asc': 'Сначала дешевле',
  'price:desc': 'Сначала дороже',
  'name:asc': 'По названию',
}

// Фильтры синхронизированы со строкой адреса — их можно сохранить в закладки
const filters = reactive({
  search: route.query.search ?? '',
  occasion_id: route.query.occasion_id ?? '',
  flower_id: route.query.flower_id ?? '',
  color: route.query.color ?? '',
  price_min: route.query.price_min ?? '',
  price_max: route.query.price_max ?? '',
  sort: route.query.sort ?? 'created_at:desc',
})
const page = ref(Number(route.query.page) || 1)

const bouquets = ref([])
const meta = ref(null)
const loading = ref(false)
const error = ref('')
const fieldErrors = ref({})

async function load() {
  loading.value = true
  error.value = ''
  fieldErrors.value = {}
  const [sort, order] = filters.sort.split(':')
  try {
    // параметры фильтрации передаются серверу в строке запроса
    const res = await api.bouquets.list({
      search: filters.search.trim(),
      occasion_id: filters.occasion_id,
      flower_ids: filters.flower_id ? [filters.flower_id] : undefined,
      color: filters.color,
      price_min: filters.price_min,
      price_max: filters.price_max,
      sort,
      order,
      page: page.value,
      per_page: 9,
    })
    bouquets.value = res.data
    meta.value = res.meta
  } catch (e) {
    error.value = e.message
    if (e.status === 422) fieldErrors.value = e.errors
  } finally {
    loading.value = false
  }
}

function syncQuery() {
  const query = Object.fromEntries(Object.entries({ ...filters, page: page.value > 1 ? page.value : '' }).filter(([, v]) => v !== ''))
  router.replace({ query })
}

const reloadDebounced = debounce(() => {
  page.value = 1
  syncQuery()
  load()
})

watch(() => ({ ...filters }), reloadDebounced, { deep: true })

function goToPage(p) {
  page.value = p
  syncQuery()
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function reset() {
  Object.assign(filters, { search: '', occasion_id: '', flower_id: '', color: '', price_min: '', price_max: '', sort: 'created_at:desc' })
}

// ---------- ИИ-подбор букета ----------
const aiQuery = ref('')
const aiLoading = ref(false)
const aiResult = ref(null)
const aiError = ref('')

async function suggest() {
  aiError.value = ''
  if (aiQuery.value.trim().length < 5) {
    aiError.value = 'Опишите, для кого и по какому поводу нужен букет'
    return
  }
  aiLoading.value = true
  try {
    aiResult.value = (await api.ai.suggestBouquets(aiQuery.value.trim())).data
  } catch (e) {
    aiError.value = e.message
  } finally {
    aiLoading.value = false
  }
}

onMounted(() => {
  dict.load()
  load()
})
</script>

<template>
  <div class="container page">
    <section class="hero">
      <div>
        <h1>Букеты, которые говорят за вас</h1>
        <p class="muted">Выберите готовый букет или соберите свой в конструкторе — доставим по городу с открыткой.</p>
      </div>
      <RouterLink :to="{ name: 'constructor' }" class="btn btn-rose">Собрать свой букет →</RouterLink>
    </section>

    <section v-if="auth.isAuthenticated" class="card ai">
      <div class="spread">
        <h3>Подобрать букет</h3>
        <span class="chip">ИИ-помощник</span>
      </div>
      <form class="row" @submit.prevent="suggest">
        <input v-model="aiQuery" placeholder="Например: на юбилей маме, любит пастельные тона, до 30 000 тенге" class="grow" />
        <button class="btn" :disabled="aiLoading">{{ aiLoading ? 'Подбираем…' : 'Подобрать' }}</button>
      </form>
      <p v-if="aiError" class="alert alert-error small">{{ aiError }}</p>
      <div v-if="aiResult" class="stack">
        <p class="muted small">{{ aiResult.explanation }}</p>
        <div v-if="aiResult.bouquets.length" class="grid grid-3">
          <BouquetCard v-for="b in aiResult.bouquets" :key="b.id" :bouquet="b" />
        </div>
        <p v-else class="muted">Подходящих букетов не нашлось — попробуйте увеличить бюджет или соберите букет в конструкторе.</p>
      </div>
    </section>

    <div class="layout">
      <aside class="card filters stack">
        <div class="spread">
          <h3>Фильтры</h3>
          <button class="btn btn-ghost btn-sm" @click="reset">Сбросить</button>
        </div>
        <label class="field">
          <span>Поиск</span>
          <input v-model="filters.search" placeholder="Название или описание" />
        </label>
        <label class="field">
          <span>Повод</span>
          <select v-model="filters.occasion_id">
            <option value="">Любой</option>
            <option v-for="o in dict.occasions" :key="o.id" :value="String(o.id)">{{ o.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>Цветок в составе</span>
          <select v-model="filters.flower_id">
            <option value="">Любой</option>
            <option v-for="f in dict.flowers" :key="f.id" :value="String(f.id)">{{ f.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>Цвет</span>
          <select v-model="filters.color">
            <option value="">Любой</option>
            <option v-for="(c, key) in COLORS" :key="key" :value="key">{{ c.label }}</option>
          </select>
        </label>
        <div class="field">
          <span>Цена, ₸</span>
          <div class="row nowrap">
            <input v-model="filters.price_min" type="number" min="0" step="100" placeholder="от" />
            <input v-model="filters.price_max" type="number" min="0" step="100" placeholder="до" :class="{ invalid: fieldErrors.price_max }" />
          </div>
          <small v-if="fieldErrors.price_max" class="error">{{ fieldErrors.price_max[0] }}</small>
        </div>
      </aside>

      <section>
        <div class="spread toolbar">
          <span class="muted">{{ meta ? `Найдено: ${meta.total}` : '' }}</span>
          <select v-model="filters.sort" class="sort">
            <option v-for="(label, key) in SORTS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>

        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <div v-if="loading && !bouquets.length" class="grid grid-3">
          <div v-for="i in 6" :key="i" class="skeleton"></div>
        </div>
        <div v-else-if="bouquets.length" class="grid grid-3" :class="{ dim: loading }">
          <BouquetCard v-for="b in bouquets" :key="b.id" :bouquet="b" />
        </div>
        <div v-else-if="!loading" class="empty card">
          Ничего не найдено. Измените фильтры или
          <RouterLink :to="{ name: 'constructor' }">соберите свой букет</RouterLink>.
        </div>

        <PaginationBar :meta="meta" @change="goToPage" />
        <p v-if="meta" class="muted small center">Доставка — {{ money(2000) }}, бесплатно от {{ money(30000) }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}
.hero h1 {
  max-width: 640px;
}
.ai {
  margin-bottom: 28px;
  background: linear-gradient(135deg, #fffdf9, var(--rose-soft));
}
.ai .grow {
  flex: 1;
  min-width: 240px;
}
.layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.filters {
  position: sticky;
  top: 88px;
}
.nowrap {
  flex-wrap: nowrap;
}
.toolbar {
  margin-bottom: 16px;
}
.sort {
  width: auto;
}
.dim {
  opacity: 0.55;
  transition: opacity 0.2s;
}
.center {
  text-align: center;
}
@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .filters {
    position: static;
  }
}
</style>
