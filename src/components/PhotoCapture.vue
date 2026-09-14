<script setup lang="ts">
import { ref } from 'vue'
import type { Photo } from '@/types'
import { nowStr, uid } from '@/utils/format'

const props = defineProps<{ by: string }>()
const emit = defineEmits<{ shot: [photo: Photo] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const label = ref('')
const lastError = ref('')

const EMOJIS = ['🔥', '🧊', '🧽', '♻️', '🧴', '🍽️', '🔧', '💨', '📞', '👥', '⏰', '🥩', '✅', '📋']
const emoji = ref(EMOJIS[0])

function snap() {
  fileInput.value?.click()
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  lastError.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      // 压缩到最大边 900，jpeg 0.72，保证 localStorage 存得下
      const max = 900
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
      push(dataUrl)
    }
    img.onerror = () => {
      lastError.value = '图片读取失败'
    }
    img.src = String(reader.result)
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function push(dataUrl?: string) {
  const text = label.value.trim() || (dataUrl ? '现场拍照' : '现场记录')
  emit('shot', {
    id: uid('p'),
    emoji: emoji.value,
    label: text,
    takenAt: nowStr(),
    by: props.by,
    dataUrl
  })
  label.value = ''
}
</script>

<template>
  <div>
    <div class="photo-capture">
      <div class="emoji-row">
        <button
          v-for="e in EMOJIS"
          :key="e"
          type="button"
          class="emoji-btn"
          :class="{ on: emoji === e }"
          @click="emoji = e"
        >
          {{ e }}
        </button>
      </div>
      <div class="capture-row">
        <input v-model="label" placeholder="照片说明（如：灶台油污、设备铭牌）" />
        <button type="button" class="btn" @click="snap">📷 现场拍照</button>
        <button type="button" class="btn ghost" @click="push()">仅记录占位图</button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        style="display: none"
        @change="onFile"
      />
      <div v-if="lastError" class="error-text">{{ lastError }}</div>
      <div class="hint">手机端会调起摄像头；无摄像头环境可用「占位图」完成流程演示。照片本地压缩存储，不上传外部服务。</div>
    </div>
  </div>
</template>

<style scoped>
.emoji-row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.emoji-btn {
  width: 32px; height: 32px; border: 1px solid var(--c-border); background: #fff;
  border-radius: 6px; cursor: pointer; font-size: 16px; line-height: 1;
}
.emoji-btn.on { border-color: var(--c-brand); background: var(--c-brand-soft); box-shadow: 0 0 0 2px rgba(210, 105, 30, .15); }
.capture-row { display: flex; gap: 8px; }
.capture-row input { flex: 1; }
</style>
