<script setup>
import { computed } from 'vue'
import FlowerArt from './FlowerArt.vue'
import { money } from '@/utils/format'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  bouquet: { type: Object, required: true },
})

const cart = useCartStore()
const toast = useToastStore()
const colors = computed(() => (props.bouquet.flowers ?? []).map((f) => f.color))

function addToCart() {
  cart.add({
    type: 'bouquet',
    id: props.bouquet.id,
    name: props.bouquet.name,
    price: props.bouquet.price,
    colors: colors.value,
    image: props.bouquet.image_url,
  })
  toast.success(`«${props.bouquet.name}» добавлен в корзину`)
}
</script>

<template>
  <article class="card bouquet">
    <RouterLink :to="{ name: 'bouquet', params: { id: bouquet.id } }">
      <FlowerArt :colors="colors" :seed="bouquet.id" :image="bouquet.image_url" :alt="bouquet.name" />
    </RouterLink>
    <div class="body">
      <RouterLink :to="{ name: 'bouquet', params: { id: bouquet.id } }" class="name">{{ bouquet.name }}</RouterLink>
      <div class="row chips">
        <span v-for="o in (bouquet.occasions ?? []).slice(0, 3)" :key="o.id" class="chip">{{ o.name }}</span>
      </div>
      <p class="muted small desc">{{ bouquet.description }}</p>
      <div class="spread">
        <span class="price">{{ money(bouquet.price) }}</span>
        <button class="btn btn-sm" :disabled="!bouquet.is_active" @click="addToCart">В корзину</button>
      </div>
      <span v-if="!bouquet.is_active" class="badge status-cancelled">Снят с продажи</span>
    </div>
  </article>
</template>

<style scoped>
.bouquet {
  padding: 10px;
  display: flex;
  flex-direction: column;
}
.body {
  padding: 12px 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.name {
  font-family: var(--serif);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--ink);
}
.chips {
  gap: 4px;
}
.desc {
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
