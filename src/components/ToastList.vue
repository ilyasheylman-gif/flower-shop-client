<script setup>
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="m in toast.messages" :key="m.id" class="toast" :class="m.type" @click="toast.dismiss(m.id)">
        {{ m.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(420px, calc(100vw - 32px));
}
.toast {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--moss);
  color: #fff;
  box-shadow: var(--shadow);
  cursor: pointer;
}
.toast.error {
  background: var(--danger);
}
.toast.info {
  background: var(--ink);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
