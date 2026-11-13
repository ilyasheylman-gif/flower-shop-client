<script setup>
/** Обёртка поля формы: подпись + ошибка (клиентская или из ответа 422). */
defineProps({
  label: { type: String, default: '' },
  error: { type: String, default: '' },
})
</script>

<template>
  <label class="field">
    <span v-if="label">{{ label }}</span>
    <slot />
    <small v-if="error" class="error">{{ error }}</small>
  </label>
</template>
