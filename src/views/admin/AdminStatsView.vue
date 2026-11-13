<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/api'
import StatusBadge from '@/components/StatusBadge.vue'
import { useToastStore } from '@/stores/toast'
import { date, isoDate, money } from '@/utils/format'

const toast = useToastStore()
const period = reactive({ date_from: isoDate(-30), date_to: isoDate(0) })
const stats = ref(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    stats.value = (await api.stats(period)).data
  } catch (e) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

const maxDay = computed(() => Math.max(1, ...(stats.value?.revenue_by_day ?? []).map((d) => d.amount)))
const maxStatus = computed(() => Math.max(1, ...(stats.value?.by_status ?? []).map((s) => s.orders_count)))

onMounted(load)
</script>

<template>
  <div class="stack">
    <form class="row" @submit.prevent="load">
      <label class="field"><span>С</span><input v-model="period.date_from" type="date" /></label>
      <label class="field"><span>По</span><input v-model="period.date_to" type="date" /></label>
      <button class="btn" style="align-self: flex-end" :disabled="loading">Показать</button>
    </form>

    <template v-if="stats">
      <div class="grid grid-4">
        <div class="card kpi"><span class="muted small">Заказов (без отменённых)</span><strong>{{ stats.orders_count }}</strong></div>
        <div class="card kpi"><span class="muted small">Выручка (доставленные)</span><strong>{{ money(stats.revenue) }}</strong></div>
        <div class="card kpi"><span class="muted small">Средний чек</span><strong>{{ money(stats.average_check) }}</strong></div>
        <div class="card kpi"><span class="muted small">Заканчиваются</span><strong>{{ stats.low_stock.length }}</strong></div>
      </div>

      <div class="grid stats-grid">
        <div class="card stack">
          <h3>Заказы по статусам</h3>
          <div v-for="s in stats.by_status" :key="s.status" class="bar-row">
            <StatusBadge :status="s.status" />
            <div class="bar"><div :style="{ width: (s.orders_count / maxStatus) * 100 + '%' }"></div></div>
            <span class="num">{{ s.orders_count }}</span>
          </div>
          <p v-if="!stats.by_status.length" class="muted">Нет заказов за период</p>
        </div>

        <div class="card stack">
          <h3>Выручка по дням</h3>
          <div v-if="stats.revenue_by_day.length" class="columns">
            <div v-for="d in stats.revenue_by_day" :key="d.day" class="col" :title="`${date(d.day)}: ${money(d.amount)}`">
              <div class="col-bar" :style="{ height: (d.amount / maxDay) * 100 + '%' }"></div>
              <span class="small muted">{{ d.day.slice(8, 10) }}.{{ d.day.slice(5, 7) }}</span>
            </div>
          </div>
          <p v-else class="muted">Нет доставленных заказов за период</p>
        </div>

        <div class="card">
          <h3>Популярные букеты</h3>
          <table>
            <tbody>
              <tr v-for="b in stats.top_bouquets" :key="b.id">
                <td>{{ b.name }}</td>
                <td class="num">{{ b.sold }} шт.</td>
                <td class="num">{{ money(b.revenue) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <h3>Цветы в конструкторе</h3>
          <table>
            <tbody>
              <tr v-for="f in stats.popular_constructor_flowers" :key="f.id">
                <td>{{ f.name }}</td>
                <td class="num">{{ f.used }} шт.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <h3>Заканчиваются на складе</h3>
          <table>
            <tbody>
              <tr v-for="f in stats.low_stock" :key="f.id">
                <td>{{ f.name }}</td>
                <td class="num"><strong class="low">{{ f.stock_quantity }} шт.</strong></td>
              </tr>
            </tbody>
          </table>
          <p v-if="!stats.low_stock.length" class="muted">Запасов достаточно</p>
          <RouterLink :to="{ name: 'stock' }" class="small">Перейти на склад →</RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kpi strong {
  font-family: var(--serif);
  font-size: 1.9rem;
}
.stats-grid {
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}
.bar-row {
  display: grid;
  grid-template-columns: 140px 1fr 40px;
  align-items: center;
  gap: 10px;
}
.bar {
  height: 10px;
  background: var(--paper-2);
  border-radius: 999px;
  overflow: hidden;
}
.bar div {
  height: 100%;
  background: var(--moss);
}
.columns {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 180px;
  overflow-x: auto;
}
.col {
  flex: 1;
  min-width: 34px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
}
.col-bar {
  width: 100%;
  background: var(--rose);
  border-radius: 6px 6px 0 0;
  min-height: 2px;
}
.low {
  color: var(--danger);
}
</style>
