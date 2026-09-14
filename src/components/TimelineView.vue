<script setup lang="ts">
import type { TimelineEntry } from '@/types'
defineProps<{ entries: TimelineEntry[] }>()
</script>

<template>
  <div class="timeline">
    <div v-for="(e, i) in entries" :key="i" class="tl-item" :class="e.tone ?? 'brand'">
      <div class="tl-time">{{ e.at }} · {{ e.actor }}</div>
      <div class="tl-title">{{ e.action }}</div>
    </div>
  </div>
</template>
