<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/api'
import FormField from '@/components/FormField.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { date, dateTime, money, POSTCARD_DESIGNS, STATUS_LABELS } from '@/utils/format'

const props = defineProps({ id: { type: String, required: true } })

const auth = useAuthStore()
const toast = useToastStore()

const order = ref(null)
const error = ref('')
const busy = ref(false)
const couriers = ref([])
const courierId = ref('')

const isOwner = computed(() => order.value && order.value.customer?.id === auth.user?.id)
const canEditPostcard = computed(() => isOwner.value && order.value.status === 'new')

const steps = ['new', 'assembling', 'ready', 'delivering', 'delivered']
const stepIndex = computed(() => steps.indexOf(order.value?.status))

async function load() {
  try {
    order.value = (await api.orders.get(props.id)).data
    courierId.value = order.value.delivery.courier_id ?? ''
  } catch (e) {
    error.value = e.message // 403 — чужой заказ, 404 — не найден
  }
}

async function run(action, successText) {
  busy.value = true
  try {
    order.value = (await action()).data
    toast.success(successText)
  } catch (e) {
    toast.error(e.message)
  } finally {
    busy.value = false
  }
}

function cancel() {
  if (!confirm('Отменить заказ? Цветы вернутся на склад.')) return
  run(() => api.orders.cancel(order.value.id), 'Заказ отменён')
}

function changeStatus(status) {
  let comment = null
  if (status === 'delivered') comment = prompt('Комментарий к доставке (необязательно):') || null
  if (status === 'cancelled' && !confirm('Отменить заказ?')) return
  run(() => api.orders.changeStatus(order.value.id, status, comment), `Статус: ${STATUS_LABELS[status]}`)
}

function assignCourier() {
  if (!courierId.value) return
  run(() => api.orders.assignCourier(order.value.id, Number(courierId.value)), 'Курьер назначен')
}

// ---------- Открытка ----------
const postcardForm = reactive({ editing: false, text: '', design: 'classic', signature: '', errors: {} })

function editPostcard() {
  Object.assign(postcardForm, {
    editing: true,
    text: order.value.postcard?.text ?? '',
    design: order.value.postcard?.design ?? 'classic',
    signature: order.value.postcard?.signature ?? '',
    errors: {},
  })
}

async function savePostcard() {
  if (!postcardForm.text.trim()) {
    postcardForm.errors = { text: 'Напишите текст открытки' }
    return
  }
  busy.value = true
  try {
    order.value = (
      await api.orders.updatePostcard(order.value.id, {
        text: postcardForm.text.trim(),
        design: postcardForm.design,
        signature: postcardForm.signature || null,
      })
    ).data
    postcardForm.editing = false
    toast.success('Открытка сохранена')
  } catch (e) {
    if (e.status === 422) postcardForm.errors = { text: e.field('text'), signature: e.field('signature') }
    else toast.error(e.message)
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await load()
  if (auth.hasRole('admin')) {
    try {
      couriers.value = (await api.users.list({ role: 'courier', per_page: 100 })).data
    } catch {
      couriers.value = []
    }
  }
})
</script>

<template>
  <div class="container page">
    <RouterLink :to="{ name: 'orders' }" class="small">← К заказам</RouterLink>

    <div v-if="error" class="alert alert-error" style="margin-top: 16px">{{ error }}</div>
    <div v-else-if="!order" class="skeleton" style="margin-top: 16px"></div>

    <template v-else>
      <div class="page-head" style="margin-top: 12px">
        <div>
          <h1>Заказ №{{ order.id }}</h1>
          <p>Оформлен {{ dateTime(order.created_at) }}</p>
        </div>
        <StatusBadge :status="order.status" />
      </div>

      <ol v-if="order.status !== 'cancelled'" class="progress">
        <li v-for="(s, i) in steps" :key="s" :class="{ done: i <= stepIndex }">{{ STATUS_LABELS[s] }}</li>
      </ol>
      <div v-else class="alert alert-warn">Заказ отменён {{ dateTime(order.cancelled_at) }}.</div>

      <div class="two-col">
        <section class="stack">
          <div class="card">
            <h3>Состав заказа</h3>
            <table>
              <tbody>
                <tr v-for="item in order.items" :key="item.id">
                  <td>
                    <strong>{{ item.name }}</strong>
                    <div class="muted small">
                      {{ item.type === 'custom' ? 'Индивидуальный букет' : 'Готовый букет' }}
                    </div>
                    <ul v-if="item.custom_bouquet" class="small muted composition">
                      <li v-for="ci in item.custom_bouquet.items" :key="ci.id">{{ ci.flower.name }} × {{ ci.quantity }}</li>
                      <li>Упаковка: {{ item.custom_bouquet.packaging.name }}</li>
                      <li v-if="item.custom_bouquet.comment">Пожелание: {{ item.custom_bouquet.comment }}</li>
                    </ul>
                  </td>
                  <td class="num">{{ money(item.unit_price) }} × {{ item.quantity }}</td>
                  <td class="num"><strong>{{ money(item.subtotal) }}</strong></td>
                </tr>
              </tbody>
            </table>
            <hr />
            <div class="spread"><span>Букеты</span><span>{{ money(order.items_total) }}</span></div>
            <div class="spread"><span>Доставка</span><span>{{ order.delivery_price ? money(order.delivery_price) : 'бесплатно' }}</span></div>
            <div v-if="order.postcard_price" class="spread"><span>Открытка</span><span>{{ money(order.postcard_price) }}</span></div>
            <div class="spread"><strong>Итого</strong><span class="price">{{ money(order.total_price) }}</span></div>
          </div>

          <div class="card stack">
            <div class="spread">
              <h3>Открытка</h3>
              <button v-if="canEditPostcard && !postcardForm.editing" class="btn btn-ghost btn-sm" @click="editPostcard">
                {{ order.postcard ? 'Изменить' : 'Добавить (+500 ₸)' }}
              </button>
            </div>
            <template v-if="postcardForm.editing">
              <FormField label="Оформление">
                <select v-model="postcardForm.design">
                  <option v-for="(label, key) in POSTCARD_DESIGNS" :key="key" :value="key">{{ label }}</option>
                </select>
              </FormField>
              <FormField label="Текст" :error="postcardForm.errors.text">
                <textarea v-model="postcardForm.text" rows="3" maxlength="500"></textarea>
              </FormField>
              <FormField label="Подпись" :error="postcardForm.errors.signature">
                <input v-model="postcardForm.signature" maxlength="100" />
              </FormField>
              <div class="row">
                <button class="btn btn-sm" :disabled="busy" @click="savePostcard">Сохранить</button>
                <button class="btn btn-ghost btn-sm" @click="postcardForm.editing = false">Отмена</button>
              </div>
            </template>
            <blockquote v-else-if="order.postcard" class="postcard">
              «{{ order.postcard.text }}»
              <footer v-if="order.postcard.signature">— {{ order.postcard.signature }}</footer>
              <span class="chip">{{ order.postcard.design_label }}</span>
            </blockquote>
            <p v-else class="muted">Без открытки</p>
          </div>
        </section>

        <aside class="stack sticky">
          <div class="card stack">
            <h3>Доставка</h3>
            <div><strong>{{ date(order.delivery.delivery_date) }}</strong>, {{ order.delivery.time_from }}–{{ order.delivery.time_to }}</div>
            <div>{{ order.delivery.address }}</div>
            <div>{{ order.delivery.recipient_name }} · <a :href="`tel:${order.delivery.recipient_phone}`">{{ order.delivery.recipient_phone }}</a></div>
            <div v-if="order.comment" class="muted small">Комментарий: {{ order.comment }}</div>
            <div v-if="order.customer && !isOwner" class="muted small">Заказчик: {{ order.customer.name }}, {{ order.customer.email }}</div>
            <div class="muted small">Курьер: {{ order.delivery.courier?.name ?? 'не назначен' }}</div>
            <div v-if="order.delivery.delivered_at" class="alert alert-ok small">
              Доставлено {{ dateTime(order.delivery.delivered_at) }}
              <span v-if="order.delivery.courier_comment">· {{ order.delivery.courier_comment }}</span>
            </div>
          </div>

          <!-- действия зависят от роли; сервер проверяет права повторно -->
          <div v-if="order.next_statuses.length || order.can_cancel || auth.hasRole('admin')" class="card stack">
            <h3>Действия</h3>
            <button
              v-for="s in order.next_statuses"
              :key="s.value"
              class="btn btn-block"
              :class="{ 'btn-danger': s.value === 'cancelled' }"
              :disabled="busy"
              @click="changeStatus(s.value)"
            >
              {{ s.value === 'delivering' && auth.hasRole('courier') ? 'Взять в доставку' : s.label }}
            </button>
            <button v-if="order.can_cancel" class="btn btn-danger btn-block" :disabled="busy" @click="cancel">Отменить заказ</button>

            <div v-if="auth.hasRole('admin') && !['delivered', 'cancelled'].includes(order.status)" class="row">
              <select v-model="courierId" class="grow">
                <option value="">Выберите курьера</option>
                <option v-for="c in couriers" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <button class="btn btn-ghost btn-sm" :disabled="busy || !courierId" @click="assignCourier">Назначить</button>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.progress {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  gap: 4px;
  counter-reset: step;
}
.progress li {
  flex: 1;
  padding: 10px;
  text-align: center;
  background: var(--paper-2);
  color: var(--ink-soft);
  font-size: 0.85rem;
  font-weight: 550;
}
.progress li:first-child {
  border-radius: 999px 0 0 999px;
}
.progress li:last-child {
  border-radius: 0 999px 999px 0;
}
.progress li.done {
  background: var(--moss);
  color: #fff;
}
.composition {
  margin: 4px 0 0;
  padding-left: 18px;
}
.postcard {
  margin: 0;
  padding: 16px 20px;
  border-left: 3px solid var(--rose);
  background: var(--rose-soft);
  border-radius: 0 12px 12px 0;
  font-family: var(--serif);
  font-size: 1.2rem;
}
.postcard footer {
  font-size: 1rem;
  margin: 6px 0;
}
.grow {
  flex: 1;
}
@media (max-width: 700px) {
  .progress {
    flex-direction: column;
  }
  .progress li {
    border-radius: 8px !important;
  }
}
</style>
