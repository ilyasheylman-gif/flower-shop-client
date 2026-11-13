import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Всплывающие уведомления. */
export const useToastStore = defineStore('toast', () => {
  const messages = ref([])
  let id = 0

  function push(text, type = 'success', timeout = 4500) {
    const message = { id: ++id, text, type }
    messages.value.push(message)
    setTimeout(() => dismiss(message.id), timeout)
  }

  function dismiss(messageId) {
    messages.value = messages.value.filter((m) => m.id !== messageId)
  }

  return {
    messages,
    dismiss,
    success: (text) => push(text, 'success'),
    error: (text) => push(text, 'error', 7000),
    info: (text) => push(text, 'info'),
  }
})
