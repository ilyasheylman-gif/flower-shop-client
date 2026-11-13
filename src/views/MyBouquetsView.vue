<script setup>
import { onMounted, ref } from 'vue'
import { api } from '@/api'
import FlowerArt from '@/components/FlowerArt.vue'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'
import { money, plural } from '@/utils/format'

const cart = useCartStore()
const toast = useToastStore()

const bouquets = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  try {
    bouquets.value = (await api.customBouquets.list()).data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const colorsOf = (b) => b.items.flatMap((i) => Array(Math.min(i.quantity, 3)).fill(i.flower.color))

function addToCart(b) {
  cart.add({ type: 'custom', id: b.id, name: b.name, price: b.price, colors: colorsOf(b) })
  toast.success(`«${b.name}» в корзине`)
}

async function remove(b) {
  if (!confirm(`Удалить букет «${b.name}»?`)) return
  try {
    await api.customBouquets.remove(b.id)
    cart.remove(`custom-${b.id}`)
    toast.success('Букет удалён')
    await load()
  } catch (e) {
    toast.error(e.message) // 409 — букет уже заказан
  }
}

onMounted(load)
</script>

<template>
  <div class="container page">
    <div class="page-head">
      <div>
        <h1>Мои букеты</h1>
        <p>Букеты, собранные в конструкторе. Цена пересчитывается по текущим ценам цветов.</p>
      </div>
      <RouterLink :to="{ name: 'constructor' }" class="btn btn-rose">Собрать новый</RouterLink>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-else-if="loading" class="grid grid-3"><div v-for="i in 3" :key="i" class="skeleton"></div></div>
    <div v-else-if="!bouquets.length" class="card empty">
      Пока пусто. <RouterLink :to="{ name: 'constructor' }">Соберите первый букет</RouterLink>.
    </div>

    <div v-else class="grid grid-3">
      <article v-for="b in bouquets" :key="b.id" class="card stack">
        <FlowerArt :colors="colorsOf(b)" :seed="b.id + 100" />
        <div class="spread">
          <h3>{{ b.name }}</h3>
          <span v-if="b.is_ordered" class="badge status-delivered">Заказан</span>
        </div>
        <p class="muted small">
          {{ b.flowers_count }} {{ plural(b.flowers_count, ['цветок', 'цветка', 'цветов']) }} · {{ b.packaging.name }}
        </p>
        <ul class="small composition">
          <li v-for="i in b.items" :key="i.id">{{ i.flower.name }} × {{ i.quantity }}</li>
        </ul>
        <div class="spread">
          <span class="price">{{ money(b.price) }}</span>
          <button class="btn btn-sm" @click="addToCart(b)">В корзину</button>
        </div>
        <div class="row">
          <RouterLink v-if="!b.is_ordered" :to="{ name: 'constructor', query: { edit: b.id } }" class="btn btn-ghost btn-sm">Изменить</RouterLink>
          <button v-if="!b.is_ordered" class="btn btn-danger btn-sm" @click="remove(b)">Удалить</button>
          <span v-else class="muted small">Заказанный букет нельзя менять</span>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.composition {
  margin: 0;
  padding-left: 18px;
  color: var(--ink-soft);
}
</style>
