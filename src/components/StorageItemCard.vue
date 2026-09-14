<script setup lang="ts">
import { computed } from 'vue'
import type { Booking, StorageCategory, StorageItem } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { STORAGE_CATEGORY_META, STORAGE_FEES } from '@/rules'
import { overtimeHours, storageAlertKind, storageTimeText } from '@/utils/storageAlert'
import PhotoList from '@/components/PhotoList.vue'
import StorageActions from '@/components/StorageActions.vue'

const props = defineProps<{ item: StorageItem; booking: Booking }>()
const auth = useAuthStore()
const kitchen = useKitchenStore()

const cat = computed(() => STORAGE_CATEGORY_META[props.item.category])
const meat = computed(() => props.item.category === ('meat-seafood' as StorageCategory))
const isAdmin = computed(() => auth.currentUser!.role === 'admin')
const isStaff = computed(() => auth.currentUser!.role === 'staff')
const canManage = computed(() => isAdmin.value || isStaff.value)
const alertKind = computed(() => storageAlertKind(props.item, props.booking.status))
const overdueH = computed(() => overtimeHours(props.item))
const overdue = computed(() => alertKind.value === 'overdue')
const canceledPending = computed(() => alertKind.value === 'canceled')

const stateMeta: Record<string, { label: string; cls: string }> = {
  stored: { label: '在库', cls: 'green' },
  notified: { label: '已通知负责人', cls: 'amber' },
  pending: { label: '待处理食材', cls: 'red' },
  taken: { label: '已取走', cls: 'gray' },
  disposed: { label: '已报废', cls: 'red' },
  cleared: { label: '已清空', cls: 'gray' }
}

const pendingDays = computed(() => kitchen.pendingDays(props.item))
const feeText = computed(() => {
  if (props.item.disposal) {
    if (props.item.disposal.feeWaived) return '处置费公益豁免（¥0）'
    return props.item.disposal.fee > 0 ? `处置费 ¥${props.item.disposal.fee}` : '无费用'
  }
  if (props.item.state === 'pending') {
    return props.booking.activityKind === 'charity-class'
      ? `占位 ${pendingDays.value} 天（公益免占位费）`
      : `占位 ${pendingDays.value} 天，约 ¥${pendingDays.value * STORAGE_FEES.pendingPerDay}`
  }
  return ''
})
</script>

<template>
  <div class="st-card" :class="{ overdue, canceled: canceledPending, pending: item.state === 'pending' }">
    <div class="st-head">
      <span style="font-size: 20px">{{ cat.icon }}</span>
      <div style="flex: 1">
        <b>{{ item.name }}</b>
        <span class="tag" :class="stateMeta[item.state].cls" style="margin-left: 8px">{{ stateMeta[item.state].label }}</span>
        <span v-if="meat" class="tag red" style="margin-left: 4px">肉类/海鲜</span>
      </div>
      <span v-if="overdue" class="tag red">⏰ 超时 {{ overdueH?.toFixed(1) }} 小时</span>
      <span v-else-if="canceledPending" class="tag amber">🚫 活动取消待处置</span>
    </div>
    <div v-if="overdue || canceledPending" class="time-hint small" :class="overdue ? 'red' : 'amber'">
      {{ storageTimeText(item) }}
    </div>

    <div class="st-grid small">
      <div><span class="muted">格位：</span>{{ item.zone }}</div>
      <div><span class="muted">类别：</span>{{ cat.label }}（{{ cat.temp }}）</div>
      <div><span class="muted">标签：</span>“{{ item.label }}”</div>
      <div><span class="muted">负责人：</span>{{ item.ownerName }} {{ item.ownerPhone }}</div>
      <div><span class="muted">入库：</span>{{ item.putAt }}（{{ item.putBy }}）</div>
      <div><span class="muted">预计取走：</span>{{ item.expectedTakeAt }}</div>
      <div v-if="item.takeAt"><span class="muted">实际取走：</span>{{ item.takeAt }}</div>
    </div>

    <!-- 通知记录 -->
    <div v-if="item.notifications.length" class="st-notes">
      <div v-for="(n, i) in item.notifications" :key="i" class="small">
        📞 {{ n.at }} {{ n.by }} 通过<b>{{ n.channel }}</b>通知<span v-if="n.note">：{{ n.note }}</span>
      </div>
    </div>

    <!-- 处置结果 -->
    <div v-if="item.disposal" class="st-disposal">
      <div class="small">
        <b>{{ item.disposal.action === 'discard' ? '♻️ 依规报废' : item.disposal.action === 'retrieve' ? '✅ 负责人取回' : '🧹 清空格位' }}</b>
        · {{ item.disposal.at }} · {{ item.disposal.by }}
        <span class="tag" :class="item.disposal.feeWaived ? 'green' : item.disposal.fee ? 'amber' : ''">{{ feeText }}</span>
      </div>
      <div class="small muted">原因：{{ item.disposal.reason }}</div>
      <PhotoList :photos="item.disposal.photos" />
      <div v-if="item.disposal.liabilityAck" class="tiny green">✔ 已向预约人提示责任承担并记录</div>
    </div>

    <!-- 操作 -->
    <div v-if="['stored', 'notified', 'pending'].includes(item.state)" class="st-actions">
      <slot name="actions" :item="item" :can-manage="canManage" :meat="meat">
        <StorageActions v-if="canManage" :item="item" :booking="booking" />
        <button
          v-else-if="booking.applicantId === auth.currentUser!.id"
          class="btn sm"
          @click="kitchen.takeStorage(booking, item.id, auth.currentUser!.name)"
        >
          我已取走
        </button>
      </slot>
    </div>

    <!-- 过程留痕 -->
    <details class="st-history">
      <summary class="tiny muted" style="cursor: pointer">过程记录（{{ item.history.length }}）</summary>
      <div v-for="(h, i) in item.history" :key="i" class="tiny muted">· {{ h.at }} {{ h.by }}：{{ h.action }}</div>
    </details>
  </div>
</template>

<style scoped>
.st-card {
  border: 1px solid var(--c-border); border-radius: 8px; padding: 12px 14px;
  margin-bottom: 10px; background: var(--c-surface-2);
}
.st-card.overdue { border-color: #e8a097; background: var(--c-red-soft); }
.st-card.pending { border-color: #f0c2bc; background: var(--c-red-soft); }
.st-card.canceled { border-color: #ecd9ae; background: var(--c-amber-soft); }
.time-hint { margin-bottom: 8px; font-weight: 500; }
.time-hint.red { color: var(--c-red); }
.time-hint.amber { color: var(--c-amber); }
.st-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.st-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px; }
.st-notes { margin-top: 8px; padding: 6px 10px; background: #fff; border-radius: 6px; border: 1px solid var(--c-border); display: flex; flex-direction: column; gap: 2px; }
.st-disposal { margin-top: 8px; padding: 8px 10px; background: #fff; border-radius: 6px; border: 1px solid var(--c-border); display: flex; flex-direction: column; gap: 5px; }
.st-actions { margin-top: 10px; }
.st-history { margin-top: 8px; }
</style>
