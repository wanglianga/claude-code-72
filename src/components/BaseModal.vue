<script setup lang="ts">
defineProps<{ title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="modal-mask" @click.self="emit('close')">
      <div class="modal" :class="{ wide }">
        <div class="modal-head">
          <h3 style="margin: 0">{{ title }}</h3>
          <button class="btn ghost sm" @click="emit('close')">✕</button>
        </div>
        <slot />
        <div v-if="$slots.footer" class="modal-foot">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
