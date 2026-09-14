<script setup lang="ts">
import type { Photo } from '@/types'
defineProps<{ photo: Photo }>()
</script>

<template>
  <div class="photo-thumb" :title="`${photo.label} · ${photo.by} · ${photo.takenAt}`">
    <img v-if="photo.dataUrl" :src="photo.dataUrl" :alt="photo.label" />
    <span v-else class="ph-emoji">{{ photo.emoji }}</span>
  </div>
</template>

<style scoped>
.photo-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 5px; }
</style>
