<script setup>
/**
 * Иллюстрация букета, если фото не загружено: «цветы» рисуются
 * цветами из состава букета (SVG), упаковка — по её типу и цвету.
 */
import { computed } from 'vue'
import { colorHex } from '@/utils/format'

const props = defineProps({
  colors: { type: Array, default: () => [] },
  seed: { type: Number, default: 1 },
  image: { type: String, default: null },
  alt: { type: String, default: '' },
  // { type: 'paper' | 'film' | 'box' | 'basket', color: 'бежевый' } — из API упаковки
  packaging: { type: Object, default: null },
})

// Цвет упаковки хранится в БД словом — переводим в оттенок
const WRAP_COLORS = {
  бежевый: '#c9a77c',
  крафт: '#c9a77c',
  пудровый: '#e9c3c6',
  розовый: '#f0b3c4',
  белый: '#f7f5f0',
  чёрный: '#2b2b2e',
  черный: '#2b2b2e',
  серый: '#9a9a9f',
  синий: '#5577aa',
  голубой: '#a9cbe6',
  зелёный: '#7fa77a',
  зеленый: '#7fa77a',
  красный: '#c8283c',
  жёлтый: '#f2d16b',
  желтый: '#f2d16b',
  фиолетовый: '#9a7cc1',
  натуральный: '#b98a52',
  прозрачный: '#dfeef2',
}
const TYPE_DEFAULT = { paper: '#c9a77c', film: '#dfeef2', box: '#f7f5f0', basket: '#b98a52' }

const wrapType = computed(() => props.packaging?.type ?? 'paper')
const wrapColor = computed(() => {
  const key = String(props.packaging?.color ?? '').trim().toLowerCase()
  return WRAP_COLORS[key] ?? TYPE_DEFAULT[wrapType.value] ?? '#c9a77c'
})
const isDark = computed(() => {
  const hex = wrapColor.value.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return r * 0.299 + g * 0.587 + b * 0.114 < 110
})
const ribbon = computed(() => (isDark.value ? '#d9b46a' : '#c8283c'))

const palette = computed(() => {
  const list = props.colors.filter((c) => c !== 'green')
  return list.length ? list.map(colorHex) : ['#ec8fae', '#f4efe6', '#c8283c']
})

// В коробке и корзине цветы ниже и плотнее, в бумаге и плёнке — пышнее
const layout = computed(() =>
  wrapType.value === 'box' || wrapType.value === 'basket'
    ? { x0: 80, w: 140, y0: 80, h: 70, r0: 20, rr: 14 }
    : { x0: 70, w: 160, y0: 55, h: 90, r0: 20, rr: 16 },
)

// Псевдослучайные позиции, стабильные для одного букета
const blooms = computed(() => {
  let s = props.seed * 9301 + 49297
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const l = layout.value
  return Array.from({ length: 9 }, (_, i) => ({
    x: l.x0 + rnd() * l.w,
    y: l.y0 + rnd() * l.h,
    r: l.r0 + rnd() * l.rr,
    color: palette.value[i % palette.value.length],
    rot: rnd() * 360,
  }))
})
</script>

<template>
  <img v-if="image" :src="image" :alt="alt" class="art" loading="lazy" />
  <svg v-else class="art" viewBox="0 0 300 240" role="img" :aria-label="alt">
    <rect width="300" height="240" fill="#f3ece2" />

    <!-- Задняя часть упаковки -->
    <template v-if="wrapType === 'paper'">
      <path d="M150 236 L58 92 Q150 60 242 92 Z" :fill="wrapColor" />
      <path d="M150 236 L58 92 Q150 60 242 92 Z" fill="#000" opacity=".12" />
    </template>
    <template v-else-if="wrapType === 'film'">
      <path d="M150 236 L52 70 Q150 30 248 70 Z" :fill="wrapColor" opacity=".45" stroke="#9bb9c2" stroke-width="1.5" />
    </template>
    <template v-else-if="wrapType === 'basket'">
      <path d="M72 168 Q150 10 228 168" fill="none" :stroke="wrapColor" stroke-width="10" stroke-linecap="round" />
      <path d="M72 168 Q150 10 228 168" fill="none" stroke="#000" stroke-width="10" opacity=".12" stroke-dasharray="4 8" />
    </template>

    <!-- Стебли (в коробке и корзине их не видно) -->
    <g v-if="wrapType === 'paper' || wrapType === 'film'" stroke="#5f8f5a" stroke-width="3" stroke-linecap="round">
      <path v-for="(b, i) in blooms" :key="'s' + i" :d="`M150 232 Q ${(b.x + 150) / 2} 180 ${b.x} ${b.y}`" fill="none" />
    </g>

    <!-- Цветы -->
    <g v-for="(b, i) in blooms" :key="i" :transform="`translate(${b.x} ${b.y}) rotate(${b.rot})`">
      <ellipse v-for="k in 5" :key="k" :rx="b.r * 0.55" :ry="b.r * 0.32" :cx="b.r * 0.45" cy="0"
        :transform="`rotate(${k * 72})`" :fill="b.color" stroke="rgba(0,0,0,.08)" />
      <circle :r="b.r * 0.22" fill="#f2c230" opacity=".85" />
    </g>

    <!-- Передняя часть упаковки -->
    <template v-if="wrapType === 'paper'">
      <path d="M150 236 L72 128 Q112 150 150 140 Z" :fill="wrapColor" />
      <path d="M150 236 L228 128 Q188 150 150 140 Z" :fill="wrapColor" />
      <path d="M150 236 L228 128 Q188 150 150 140 Z" fill="#000" opacity=".08" />
      <path d="M134 196 Q150 204 166 196" fill="none" :stroke="ribbon" stroke-width="5" stroke-linecap="round" />
      <path d="M150 200 l-14 16 M150 200 l12 18" :stroke="ribbon" stroke-width="3" stroke-linecap="round" />
    </template>
    <template v-else-if="wrapType === 'film'">
      <path d="M150 236 L62 104 Q150 132 238 104 Z" :fill="wrapColor" opacity=".35" stroke="#9bb9c2" stroke-width="1.5" />
      <path d="M96 120 L140 200" stroke="#fff" stroke-width="4" opacity=".7" stroke-linecap="round" />
      <path d="M134 196 Q150 204 166 196" fill="none" :stroke="ribbon" stroke-width="5" stroke-linecap="round" />
    </template>
    <template v-else-if="wrapType === 'box'">
      <path d="M78 150 L78 222 Q150 246 222 222 L222 150 Z" :fill="wrapColor" stroke="rgba(0,0,0,.15)" />
      <path d="M78 150 L78 222 Q150 246 222 222 L222 150 Z" fill="#000" opacity=".06" />
      <ellipse cx="150" cy="150" rx="72" ry="10" :fill="wrapColor" stroke="rgba(0,0,0,.18)" />
      <path d="M78 186 Q150 208 222 186" fill="none" :stroke="ribbon" stroke-width="7" />
      <circle cx="150" cy="196" r="6" :fill="ribbon" />
    </template>
    <template v-else-if="wrapType === 'basket'">
      <path d="M66 160 L84 226 Q150 240 216 226 L234 160 Z" :fill="wrapColor" />
      <g stroke="#000" opacity=".18" stroke-width="2">
        <path d="M70 176 Q150 190 230 176" fill="none" />
        <path d="M74 192 Q150 206 226 192" fill="none" />
        <path d="M79 208 Q150 222 221 208" fill="none" />
        <path v-for="x in [96, 120, 144, 168, 192]" :key="x" :d="`M${x} 164 L${x + (x - 150) * 0.12} 230`" />
      </g>
      <path d="M62 160 Q150 176 238 160" fill="none" :stroke="wrapColor" stroke-width="9" stroke-linecap="round" />
      <path d="M62 160 Q150 176 238 160" fill="none" stroke="#000" opacity=".15" stroke-width="9" stroke-dasharray="6 6" />
    </template>
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
