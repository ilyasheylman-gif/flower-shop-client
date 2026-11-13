<script setup>
/**
 * Переключение страниц по блоку meta из ответа Laravel
 * (current_page, last_page, total).
 */
import { computed } from 'vue'

const props = defineProps({
  meta: { type: Object, default: null },
})
const emit = defineEmits(['change'])

const pages = computed(() => {
  if (!props.meta) return []
  const { current_page: current, last_page: last } = props.meta
  const set = new Set([1, last, current - 1, current, current + 1])
  return [...set].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b)
})
</script>

<template>
  <div v-if="meta && meta.last_page > 1" class="pagination">
    <button class="btn btn-ghost btn-sm" :disabled="meta.current_page === 1" @click="emit('change', meta.current_page - 1)">←</button>
    <template v-for="(p, i) in pages" :key="p">
      <span v-if="i > 0 && p - pages[i - 1] > 1" class="muted">…</span>
      <button class="btn btn-sm" :class="p === meta.current_page ? '' : 'btn-ghost'" @click="emit('change', p)">{{ p }}</button>
    </template>
    <button class="btn btn-ghost btn-sm" :disabled="meta.current_page === meta.last_page" @click="emit('change', meta.current_page + 1)">→</button>
    <span class="muted small">всего: {{ meta.total }}</span>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 28px;
  flex-wrap: wrap;
}
</style>
