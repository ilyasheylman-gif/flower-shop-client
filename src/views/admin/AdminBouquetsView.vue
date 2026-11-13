<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { api } from '@/api'
import PaginationBar from '@/components/PaginationBar.vue'
import { useToastStore } from '@/stores/toast'
import { debounce, money } from '@/utils/format'

const toast = useToastStore()

const filters = reactive({ search: '', sort: 'created_at:desc' })
const page = ref(1)
const bouquets = ref([])
const meta = ref(null)

async function load() {
  const [sort, order] = filters.sort.split(':')
  try {
    const res = await api.bouquets.list({ search: filters.search, sort, order, include_inactive: true, page: page.value, per_page: 15 })
    bouquets.value = res.data
    meta.value = res.meta
  } catch (e) {
    toast.error(e.message)
  }
}
watch(() => ({ ...filters }), debounce(() => ((page.value = 1), load())))

async function toggleActive(b) {
  try {
    const updated = (await api.bouquets.update(b.id, { is_active: !b.is_active })).data
    b.is_active = updated.is_active
    toast.success(updated.is_active ? 'Букет снова в продаже' : 'Букет снят с продажи')
  } catch (e) {
    toast.error(e.message)
  }
}

async function remove(b) {
  if (!confirm(`Удалить букет «${b.name}»?`)) return
  try {
    await api.bouquets.remove(b.id)
    toast.success('Букет удалён')
    await load()
  } catch (e) {
    toast.error(e.message) // 409: букет есть в заказах — предлагаем снять с продажи
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="spread toolbar">
      <div class="row">
        <input v-model="filters.search" placeholder="Поиск" class="search" />
        <select v-model="filters.sort" class="auto">
          <option value="created_at:desc">Новые</option>
          <option value="name:asc">По названию</option>
          <option value="price:asc">Дешевле</option>
          <option value="price:desc">Дороже</option>
        </select>
      </div>
      <RouterLink :to="{ name: 'admin-bouquet-new' }" class="btn">+ Новый букет</RouterLink>
    </div>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Букет</th>
            <th>Поводы</th>
            <th class="num">Стеблей</th>
            <th class="num">Цена</th>
            <th>В продаже</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in bouquets" :key="b.id">
            <td>
              <RouterLink :to="{ name: 'bouquet', params: { id: b.id } }"><strong>{{ b.name }}</strong></RouterLink>
              <div v-if="!b.image_url" class="muted small">без фото</div>
            </td>
            <td class="small">{{ b.occasions.map((o) => o.name).join(', ') }}</td>
            <td class="num">{{ b.stems_count }}</td>
            <td class="num">{{ money(b.price) }}</td>
            <td><input type="checkbox" :checked="b.is_active" @change="toggleActive(b)" /></td>
            <td>
              <div class="row nowrap">
                <RouterLink :to="{ name: 'admin-bouquet-edit', params: { id: b.id } }" class="btn btn-ghost btn-sm">Изменить</RouterLink>
                <button class="btn btn-danger btn-sm" @click="remove(b)">Удалить</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <PaginationBar :meta="meta" @change="(p) => { page = p; load() }" />
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 16px;
}
.search {
  max-width: 260px;
}
.auto {
  width: auto;
}
.nowrap {
  flex-wrap: nowrap;
}
</style>
