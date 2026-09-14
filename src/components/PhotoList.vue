<script setup lang="ts">
import type { Photo } from '@/types'
import PhotoThumb from './PhotoThumb.vue'
defineProps<{ photos: Photo[] }>()
</script>

<template>
  <div v-if="photos.length" class="photo-list">
    <PhotoThumb v-for="p in photos" :key="p.id" :photo="p" />
  </div>
  <div v-else class="small muted">暂无照片</div>
</template>

<style scoped>
.photo-list { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
