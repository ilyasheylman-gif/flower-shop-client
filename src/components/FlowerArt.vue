<script setup>
/**
 * Иллюстрация букета, если фото не загружено: «цветы» рисуются
 * цветами из состава букета (SVG).
 */
import { computed } from 'vue'
import { colorHex } from '@/utils/format'

const props = defineProps({
  colors: { type: Array, default: () => [] },
  seed: { type: Number, default: 1 },
  image: { type: String, default: null },
  alt: { type: String, default: '' },
})

const palette = computed(() => {
  const list = props.colors.filter((c) => c !== 'green')
  return list.length ? list.map(colorHex) : ['#ec8fae', '#f4efe6', '#c8283c']
})

// Псевдослучайные позиции, стабильные для одного букета
const blooms = computed(() => {
  let s = props.seed * 9301 + 49297
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  return Array.from({ length: 9 }, (_, i) => ({
    x: 70 + rnd() * 160,
    y: 55 + rnd() * 90,
    r: 20 + rnd() * 16,
    color: palette.value[i % palette.value.length],
    rot: rnd() * 360,
  }))
})
</script>

<template>
  <img v-if="image" :src="image" :alt="alt" class="art" loading="lazy" />
  <svg v-else class="art" viewBox="0 0 300 240" role="img" :aria-label="alt">
    <rect width="300" height="240" fill="#f3ece2" />
    <g stroke="#5f8f5a" stroke-width="3" stroke-linecap="round">
      <path v-for="(b, i) in blooms" :key="'s' + i" :d="`M150 232 Q ${(b.x + 150) / 2} 180 ${b.x} ${b.y}`" fill="none" />
    </g>
    <g v-for="(b, i) in blooms" :key="i" :transform="`translate(${b.x} ${b.y}) rotate(${b.rot})`">
      <ellipse v-for="k in 5" :key="k" :rx="b.r * 0.55" :ry="b.r * 0.32" :cx="b.r * 0.45" cy="0"
        :transform="`rotate(${k * 72})`" :fill="b.color" stroke="rgba(0,0,0,.08)" />
      <circle :r="b.r * 0.22" fill="#f2c230" opacity=".85" />
    </g>
    <path d="M118 200 L182 200 L170 238 L130 238 Z" fill="#c9a77c" />
  </svg>
</template>

<style scoped>
.art {
  width: 100%;
  aspect-ratio: 5 / 4;
  object-fit: cover;
  display: block;
  border-radius: calc(var(--radius) - 4px);
}
</style>
