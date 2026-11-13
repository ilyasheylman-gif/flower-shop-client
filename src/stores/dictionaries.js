import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

/**
 * Справочники для фильтров и выпадающих списков (загружаются один раз).
 */
export const useDictionariesStore = defineStore('dictionaries', () => {
  const occasions = ref([])
  const flowers = ref([])
  const packagings = ref([])
  const loaded = ref(false)
  let pending = null

  function load(force = false) {
    if (loaded.value && !force) return Promise.resolve()
    if (pending && !force) return pending

    pending = Promise.all([
      api.occasions.list(),
      api.flowers.list({ per_page: 100, sort: 'name' }),
      api.packagings.list(),
    ])
      .then(([o, f, p]) => {
        occasions.value = o.data
        flowers.value = f.data
        packagings.value = p.data
        loaded.value = true
      })
      .finally(() => (pending = null))

    return pending
  }

  return { occasions, flowers, packagings, loaded, load }
})
