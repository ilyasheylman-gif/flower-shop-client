const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

export const money = (value) => `${moneyFormatter.format(Number(value || 0))} ₸`

export const date = (value) =>
  value ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—'

export const dateTime = (value) =>
  value ? new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

/** Сегодняшняя дата + n дней в формате YYYY-MM-DD (локальное время). */
export function isoDate(daysFromToday = 0) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const ROLE_LABELS = {
  customer: 'Покупатель',
  florist: 'Флорист',
  courier: 'Курьер',
  admin: 'Администратор',
}

export const STATUS_LABELS = {
  new: 'Новый',
  assembling: 'Собирается',
  ready: 'Готов к доставке',
  delivering: 'Доставляется',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

export const COLORS = {
  red: { label: 'Красный', hex: '#c8283c' },
  white: { label: 'Белый', hex: '#f4efe6' },
  pink: { label: 'Розовый', hex: '#ec8fae' },
  yellow: { label: 'Жёлтый', hex: '#f2c230' },
  orange: { label: 'Оранжевый', hex: '#ef7d34' },
  purple: { label: 'Фиолетовый', hex: '#8e5bb5' },
  blue: { label: 'Синий', hex: '#4c6fd1' },
  green: { label: 'Зелёный', hex: '#5f8f5a' },
  mixed: { label: 'Разноцветный', hex: '#d3a1c7' },
}

export const colorHex = (color) => COLORS[color]?.hex ?? '#ccc'

export const PACKAGING_TYPES = {
  paper: 'Крафт-бумага',
  film: 'Плёнка',
  box: 'Шляпная коробка',
  basket: 'Корзина',
}

export const POSTCARD_DESIGNS = {
  classic: 'Классическая',
  romantic: 'Романтическая',
  birthday: 'Праздничная',
  minimal: 'Минималистичная',
}

/** Склонение: plural(5, ['цветок', 'цветка', 'цветов']) */
export function plural(n, forms) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b > 1 && b < 5) return forms[1]
  if (b === 1) return forms[0]
  return forms[2]
}

/** Простейший debounce для полей поиска. */
export function debounce(fn, ms = 350) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
