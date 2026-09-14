<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { useRouter } from '@/router'
import { RESOURCE_META } from '@/rules'
import type { ResourceType } from '@/types'

const auth = useAuthStore()
const kitchen = useKitchenStore()
const { push } = useRouter()
const isAdmin = computed(() => auth.currentUser!.role === 'admin' || auth.currentUser!.role === 'repair')

const filter = ref<ResourceType | 'all'>('all')
const groups = computed(() =>
  (Object.keys(RESOURCE_META) as ResourceType[])
    .filter((t) => filter.value === 'all' || t === filter.value)
    .map((t) => ({
      type: t,
      meta: RESOURCE_META[t],
      list: kitchen.resources.filter((r) => r.type === t)
    }))
)

function wearColor(w: number) {
  if (w >= 75) return 'var(--c-red)'
  if (w >= 50) return 'var(--c-amber)'
  return 'var(--c-green)'
}

function usageOf(rid: string) {
  return kitchen.bookings.filter(
    (bk) => ['approved', 'checked', 'closing'].includes(bk.status) && bk.allocatedResourceIds.includes(rid)
  )
}

function toggleStatus(rid: string) {
  const r = kitchen.resources.find((x) => x.id === rid)!
  if (r.status === 'ok') {
    const note = prompt('置为维修中的原因：', r.note ?? '')
    if (note === null) return
    kitchen.setResourceStatus(r, 'repairing', note || '待维修')
  } else {
    kitchen.setResourceStatus(r, 'ok', (r.note ?? '') + '（已修复）')
  }
}
</script>

<template>
  <div>
    <h1>厨房设备资源与可用性</h1>
    <div class="banner info">
      <span>🍳</span>
      <div class="bx">
        预约成功后，管理员在使用前核验时从下列资源中分配<b>具体设备</b>；系统自动校验同时段冲突。
        维修中的设备不可被分配，损耗度来自日常使用与设备损坏事件定损。
      </div>
    </div>

    <div class="seg" style="margin-bottom: 14px">
      <button :class="{ on: filter === 'all' }" @click="filter = 'all'">全部</button>
      <button v-for="(m, t) in RESOURCE_META" :key="t" :class="{ on: filter === t }" @click="filter = t as ResourceType">
        {{ m.icon }} {{ m.label }}
      </button>
    </div>

    <div v-for="g in groups" :key="g.type" class="card">
      <div class="card-title"><h2>{{ g.meta.icon }} {{ g.meta.label }}</h2></div>
      <div class="grid grid-3">
        <div v-for="r in g.list" :key="r.id" class="res-card" :class="{ repairing: r.status === 'repairing' }">
          <div class="rc-head">
            <b>{{ r.name }}</b>
            <span class="tag" :class="r.status === 'ok' ? 'green' : 'red'">{{ r.status === 'ok' ? '可用' : '维修中' }}</span>
          </div>
          <div class="small muted">📍 {{ r.location }}</div>
          <div v-if="r.note" class="tiny" style="color: var(--c-amber)">备注：{{ r.note }}</div>
          <div class="wear-row">
            <span class="tiny muted">累计损耗</span>
            <div class="bar-track" style="flex: 1"><div class="bar-fill" :style="{ width: r.wear + '%', background: wearColor(r.wear) }"></div></div>
            <span class="tiny mono" :style="{ color: wearColor(r.wear) }">{{ r.wear }}%</span>
          </div>
          <div class="rc-usage">
            <template v-if="usageOf(r.id).length">
              <span class="tiny muted">当前/待开始占用：</span>
              <a v-for="bk in usageOf(r.id)" :key="bk.id" class="tiny" @click="push(`/booking/${bk.id}`)">
                {{ bk.date }} {{ bk.startAt }} {{ bk.title }}；
              </a>
            </template>
            <span v-else class="tiny muted">近期无占用</span>
          </div>
          <button v-if="isAdmin" class="btn sm" style="margin-top: 8px" @click="toggleStatus(r.id)">
            {{ r.status === 'ok' ? '🔧 报维修' : '✔ 修复完成' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.res-card { border: 1px solid var(--c-border); border-radius: 8px; padding: 12px; background: var(--c-surface-2); }
.res-card.repairing { border-color: #f0c2bc; background: var(--c-red-soft); }
.rc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.wear-row { display: flex; align-items: center; gap: 8px; margin: 8px 0 4px; }
.rc-usage { min-height: 18px; }
</style>
