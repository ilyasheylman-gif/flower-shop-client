import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'flower_shop_cart'

/**
 * Корзина хранится на клиенте (localStorage). Окончательные цены и наличие
 * проверяет сервер при оформлении заказа.
 */
export const useCartStore = defineStore('cart', () => {
  const items = ref(load())

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
    } catch {
      return []
    }
  }

  watch(items, (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })

  const count = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
  const total = computed(() => items.value.reduce((sum, i) => sum + i.price * i.quantity, 0))

  /** @param {{type: 'bouquet'|'custom', id: number, name: string, price: number, colors?: string[], image?: string, packaging?: {type: string, color: string}|null}} product */
  function add(product, quantity = 1) {
    const key = `${product.type}-${product.id}`
    const existing = items.value.find((i) => i.key === key)
    if (existing) {
      // букет могли пересобрать (другая упаковка, состав, цена) — обновляем данные позиции
      Object.assign(existing, { ...product, key, quantity: existing.quantity })
      existing.quantity = Math.min(20, existing.quantity + quantity)
    } else {
      items.value.push({ ...product, key, quantity })
    }
  }

  function setQuantity(key, quantity) {
    const item = items.value.find((i) => i.key === key)
    if (item) item.quantity = Math.max(1, Math.min(20, Number(quantity) || 1))
  }

  function remove(key) {
    items.value = items.value.filter((i) => i.key !== key)
  }

  function clear() {
    items.value = []
  }

  /** Позиции в формате API: [{bouquet_id, quantity}] / [{custom_bouquet_id, quantity}] */
  const payload = computed(() =>
    items.value.map((i) =>
      i.type === 'bouquet' ? { bouquet_id: i.id, quantity: i.quantity } : { custom_bouquet_id: i.id, quantity: i.quantity },
    ),
  )

  return { items, count, total, payload, add, setQuantity, remove, clear }
})
