<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import FlowerArt from '@/components/FlowerArt.vue'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'
import { colorHex, money, plural } from '@/utils/format'

const props = defineProps({ id: { type: String, required: true } })

const auth = useAuthStore()
const cart = useCartStore()
const toast = useToastStore()
const router = useRouter()

const bouquet = ref(null)
const error = ref('')
const quantity = ref(1)

const colors = computed(() => (bouquet.value?.flowers ?? []).map((f) => f.color))

onMounted(async () => {
  try {
    bouquet.value = (await api.bouquets.get(props.id)).data
  } catch (e) {
    error.value = e.message // например, 404 «Букет не найден»
  }
})

function addToCart() {
  cart.add(
    { type: 'bouquet', id: bouquet.value.id, name: bouquet.value.name, price: bouquet.value.price, colors: colors.value, image: bouquet.value.image_url },
    quantity.value,
  )
  toast.success('Добавлено в корзину')
}

async function remove() {
  if (!confirm(`Удалить букет «${bouquet.value.name}»?`)) return
  try {
    await api.bouquets.remove(bouquet.value.id)
    toast.success('Букет удалён')
    router.push({ name: 'admin-bouquets' })
  } catch (e) {
    toast.error(e.message) // 409 — букет есть в заказах
  }
}
</script>

<template>
  <div class="container page">
    <RouterLink :to="{ name: 'catalog' }" class="small">← Каталог</RouterLink>

    <div v-if="error" class="alert alert-error" style="margin-top: 16px">{{ error }}</div>
    <div v-else-if="!bouquet" class="skeleton" style="margin-top: 16px"></div>

    <div v-else class="two-col detail">
      <div class="card" style="padding: 10px">
        <FlowerArt :colors="colors" :seed="bouquet.id" :image="bouquet.image_url" :alt="bouquet.name" />
      </div>

      <div class="stack">
        <h1>{{ bouquet.name }}</h1>
        <div class="row">
          <span v-for="o in bouquet.occasions" :key="o.id" class="chip">{{ o.name }}</span>
        </div>
        <p>{{ bouquet.description }}</p>
        <div class="price">{{ money(bouquet.price) }}</div>

        <div v-if="!bouquet.is_active" class="alert alert-warn">Букет временно снят с продажи.</div>
        <div v-else class="row">
          <input v-model.number="quantity" type="number" min="1" max="20" class="qty" />
          <button class="btn btn-rose" @click="addToCart">В корзину</button>
        </div>

        <div class="card">
          <h3>Состав · {{ bouquet.stems_count }} {{ plural(bouquet.stems_count, ['цветок', 'цветка', 'цветов']) }}</h3>
          <table>
            <tbody>
              <tr v-for="f in bouquet.flowers" :key="f.id">
                <td><span class="dot" :style="{ background: colorHex(f.color) }"></span> {{ f.name }}</td>
                <td class="num">× {{ f.quantity }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- кнопки администратора; сервер всё равно проверит роль (403) -->
        <div v-if="auth.hasRole('admin')" class="row">
          <RouterLink :to="{ name: 'admin-bouquet-edit', params: { id: bouquet.id } }" class="btn btn-ghost btn-sm">Редактировать</RouterLink>
          <button class="btn btn-danger btn-sm" @click="remove">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail {
  margin-top: 16px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.qty {
  width: 90px;
}
@media (max-width: 900px) {
  .detail {
    grid-template-columns: 1fr;
  }
}
</style>
