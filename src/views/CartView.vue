<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import FlowerArt from '@/components/FlowerArt.vue'
import FormField from '@/components/FormField.vue'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'
import { isoDate, money, POSTCARD_DESIGNS } from '@/utils/format'

const DELIVERY_PRICE = 2000
const FREE_DELIVERY_FROM = 30000
const POSTCARD_PRICE = 500

// Интервалы доставки (рабочее время 09:00–21:00)
const SLOTS = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00']

const auth = useAuthStore()
const cart = useCartStore()
const toast = useToastStore()
const router = useRouter()

const form = reactive({
  address: '',
  recipient_name: '',
  recipient_phone: '',
  delivery_date: isoDate(1),
  slot: '13:00-15:00',
  comment: '',
})
const withPostcard = ref(false)
const postcard = reactive({ text: '', design: 'classic', signature: auth.user?.name ?? '' })

const errors = ref({})
const errorMessage = ref('')
const shortages = ref([])
const submitting = ref(false)

// Предварительный расчёт (окончательную сумму считает сервер)
const deliveryPrice = computed(() => (cart.total >= FREE_DELIVERY_FROM ? 0 : DELIVERY_PRICE))
const postcardPrice = computed(() => (withPostcard.value ? POSTCARD_PRICE : 0))
const grandTotal = computed(() => cart.total + deliveryPrice.value + postcardPrice.value)

function validate() {
  const e = {}
  if (form.address.trim().length < 10) e['delivery.address'] = 'Укажите полный адрес (город, улица, дом)'
  if (!form.recipient_name.trim()) e['delivery.recipient_name'] = 'Укажите имя получателя'
  if (!/^\+?[0-9\s\-()]{10,20}$/.test(form.recipient_phone)) e['delivery.recipient_phone'] = 'Телефон в формате +7 900 000-00-00'
  if (!form.delivery_date || form.delivery_date < isoDate(0)) e['delivery.delivery_date'] = 'Дата не может быть в прошлом'
  if (withPostcard.value && !postcard.text.trim()) e['postcard.text'] = 'Напишите текст открытки'
  errors.value = e
  return Object.keys(e).length === 0
}

async function checkout() {
  errorMessage.value = ''
  shortages.value = []
  if (!validate()) return

  const [time_from, time_to] = form.slot.split('-')
  const body = {
    items: cart.payload,
    delivery: {
      address: form.address.trim(),
      recipient_name: form.recipient_name.trim(),
      recipient_phone: form.recipient_phone.trim(),
      delivery_date: form.delivery_date,
      time_from,
      time_to,
    },
    postcard: withPostcard.value ? { ...postcard, signature: postcard.signature || null } : null,
    comment: form.comment || null,
  }

  submitting.value = true
  try {
    const order = (await api.orders.create(body)).data
    cart.clear()
    toast.success(`Заказ №${order.id} оформлен!`)
    router.push({ name: 'order', params: { id: order.id } })
  } catch (e) {
    if (e.status === 422 && Object.keys(e.errors).length) {
      // ошибки валидации — рядом с полями
      errors.value = Object.fromEntries(Object.keys(e.errors).map((k) => [k, e.field(k)]))
      errorMessage.value = 'Проверьте правильность заполнения формы'
    } else {
      // 409 (нет цветов на складе, букет снят с продажи), 422 (время доставки), 403
      errorMessage.value = e.message
      shortages.value = e.details?.shortages ?? []
    }
  } finally {
    submitting.value = false
  }
}

// ---------- ИИ: текст открытки ----------
const ai = reactive({ open: false, occasion: 'День рождения', recipient: '', tone: 'warm', loading: false, variants: [], error: '' })

async function generatePostcard() {
  ai.error = ''
  if (ai.recipient.trim().length < 3) {
    ai.error = 'Опишите получателя: кто он вам, что любит'
    return
  }
  ai.loading = true
  try {
    const res = await api.ai.postcardText({ occasion: ai.occasion, recipient: ai.recipient, tone: ai.tone })
    ai.variants = res.data.variants
  } catch (e) {
    ai.error = e.message
  } finally {
    ai.loading = false
  }
}
</script>

<template>
  <div class="container page">
    <h1>Корзина</h1>

    <div v-if="!cart.items.length" class="card empty">
      Корзина пуста. <RouterLink :to="{ name: 'catalog' }">Перейти в каталог</RouterLink> или
      <RouterLink :to="{ name: 'constructor' }">собрать букет</RouterLink>.
    </div>

    <div v-else class="two-col">
      <section class="stack">
        <div class="card">
          <div v-for="item in cart.items" :key="item.key" class="line">
            <div class="thumb"><FlowerArt :colors="item.colors ?? []" :seed="item.id" :image="item.image" :packaging="item.packaging" /></div>
            <div class="grow">
              <strong>{{ item.name }}</strong>
              <div class="muted small">{{ item.type === 'custom' ? 'Индивидуальный букет' : 'Готовый букет' }} · {{ money(item.price) }}</div>
            </div>
            <div class="row nowrap">
              <button class="icon-btn" @click="cart.setQuantity(item.key, item.quantity - 1)">−</button>
              <span class="qty">{{ item.quantity }}</span>
              <button class="icon-btn" @click="cart.setQuantity(item.key, item.quantity + 1)">+</button>
            </div>
            <span class="num sum">{{ money(item.price * item.quantity) }}</span>
            <button class="icon-btn" title="Удалить" @click="cart.remove(item.key)">×</button>
          </div>
        </div>

        <form v-if="auth.isAuthenticated" class="card stack" novalidate @submit.prevent="checkout">
          <h2>Доставка</h2>
          <FormField label="Адрес" :error="errors['delivery.address']">
            <input v-model="form.address" placeholder="г. Екатеринбург, ул. Ленина, д. 10, кв. 5" :class="{ invalid: errors['delivery.address'] }" />
          </FormField>
          <div class="form-grid">
            <FormField label="Получатель" :error="errors['delivery.recipient_name']">
              <input v-model="form.recipient_name" :class="{ invalid: errors['delivery.recipient_name'] }" />
            </FormField>
            <FormField label="Телефон получателя" :error="errors['delivery.recipient_phone']">
              <input v-model="form.recipient_phone" type="tel" placeholder="+7 900 000-00-00" :class="{ invalid: errors['delivery.recipient_phone'] }" />
            </FormField>
            <FormField label="Дата" :error="errors['delivery.delivery_date']">
              <input v-model="form.delivery_date" type="date" :min="isoDate(0)" :max="isoDate(30)" :class="{ invalid: errors['delivery.delivery_date'] }" />
            </FormField>
            <FormField label="Интервал" :error="errors['delivery.time_from'] || errors['delivery.time_to']">
              <select v-model="form.slot">
                <option v-for="s in SLOTS" :key="s" :value="s">{{ s.replace('-', ' – ') }}</option>
              </select>
            </FormField>
          </div>
          <FormField label="Комментарий к заказу" :error="errors.comment">
            <textarea v-model="form.comment" rows="2" maxlength="500" placeholder="Например: позвонить за 30 минут"></textarea>
          </FormField>

          <label class="checkbox"><input v-model="withPostcard" type="checkbox" /> Добавить открытку (+{{ money(POSTCARD_PRICE) }})</label>

          <div v-if="withPostcard" class="postcard stack">
            <div class="form-grid">
              <FormField label="Оформление">
                <select v-model="postcard.design">
                  <option v-for="(label, key) in POSTCARD_DESIGNS" :key="key" :value="key">{{ label }}</option>
                </select>
              </FormField>
              <FormField label="Подпись" :error="errors['postcard.signature']">
                <input v-model="postcard.signature" maxlength="100" />
              </FormField>
            </div>
            <FormField label="Текст открытки" :error="errors['postcard.text']">
              <textarea v-model="postcard.text" rows="3" maxlength="500" :class="{ invalid: errors['postcard.text'] }"></textarea>
            </FormField>
            <button type="button" class="btn btn-ghost btn-sm" @click="ai.open = !ai.open">✨ Придумать текст</button>

            <div v-if="ai.open" class="card ai stack">
              <div class="form-grid">
                <FormField label="Повод"><input v-model="ai.occasion" /></FormField>
                <FormField label="Тон">
                  <select v-model="ai.tone">
                    <option value="warm">Тёплый</option>
                    <option value="romantic">Романтичный</option>
                    <option value="funny">Весёлый</option>
                    <option value="formal">Официальный</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Кому (без имён и контактов)">
                <input v-model="ai.recipient" placeholder="маме, 60 лет, любит сад и книги" />
              </FormField>
              <button type="button" class="btn btn-sm" :disabled="ai.loading" @click="generatePostcard">
                {{ ai.loading ? 'Сочиняем…' : 'Предложить варианты' }}
              </button>
              <p v-if="ai.error" class="alert alert-error small">{{ ai.error }}</p>
              <button v-for="v in ai.variants" :key="v" type="button" class="variant" @click="postcard.text = v">{{ v }}</button>
              <p v-if="ai.variants.length" class="muted small">Нажмите на вариант, чтобы вставить его. Текст можно отредактировать.</p>
            </div>
          </div>

          <div v-if="errorMessage" class="alert alert-error">
            {{ errorMessage }}
            <ul v-if="shortages.length">
              <li v-for="s in shortages" :key="s.flower_id">{{ s.name }}: нужно {{ s.required }}, в наличии {{ s.available }}</li>
            </ul>
          </div>

          <button class="btn btn-rose btn-block" :disabled="submitting">
            {{ submitting ? 'Оформляем…' : `Оформить заказ на ${money(grandTotal)}` }}
          </button>
        </form>

        <div v-else class="card">
          Чтобы оформить заказ, <RouterLink :to="{ name: 'login', query: { redirect: '/cart' } }">войдите</RouterLink> или
          <RouterLink :to="{ name: 'register', query: { redirect: '/cart' } }">зарегистрируйтесь</RouterLink>. Корзина сохранится.
        </div>
      </section>

      <aside class="card sticky stack">
        <h3>Итого</h3>
        <div class="spread"><span>Букеты</span><span>{{ money(cart.total) }}</span></div>
        <div class="spread">
          <span>Доставка</span>
          <span>{{ deliveryPrice ? money(deliveryPrice) : 'бесплатно' }}</span>
        </div>
        <div v-if="withPostcard" class="spread"><span>Открытка</span><span>{{ money(postcardPrice) }}</span></div>
        <hr />
        <div class="spread"><strong>К оплате</strong><span class="price">{{ money(grandTotal) }}</span></div>
        <p v-if="deliveryPrice" class="muted small">До бесплатной доставки: {{ money(FREE_DELIVERY_FROM - cart.total) }}</p>
        <p class="muted small">Ближайшая доставка — не раньше чем через 3 часа после оформления. Наличие цветов проверяется при оформлении.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.line {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.line:last-child {
  border-bottom: none;
}
.thumb {
  width: 72px;
  flex: none;
}
.grow {
  flex: 1;
  min-width: 0;
}
.nowrap {
  flex-wrap: nowrap;
}
.qty {
  min-width: 22px;
  text-align: center;
}
.sum {
  min-width: 90px;
  font-weight: 600;
}
.postcard {
  padding: 14px;
  border: 1px dashed var(--line);
  border-radius: 12px;
}
.ai {
  background: var(--rose-soft);
  box-shadow: none;
}
.variant {
  text-align: left;
  font: inherit;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
}
.variant:hover {
  border-color: var(--rose);
}
</style>
