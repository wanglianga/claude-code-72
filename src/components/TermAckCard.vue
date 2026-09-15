<script setup lang="ts">
import { computed } from 'vue'
import type { Booking } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'

const props = defineProps<{ booking: Booking }>()
const auth = useAuthStore()
const kitchen = useKitchenStore()

const isApplicant = computed(() => props.booking.applicantId === auth.currentUser!.id)
const isAdmin = computed(() => auth.currentUser!.role === 'admin')
const acks = computed(() => props.booking.termAcks ?? [])
const surchargeTotal = computed(() => acks.value.reduce((s, a) => s + a.surcharge, 0))
const penaltyTotal = computed(() => acks.value.reduce((s, a) => s + (a.violated ? a.penalty : 0), 0))
const allAcked = computed(() => acks.value.length > 0 && acks.value.every((a) => a.acked))

const catIcon: Record<string, string> = {
  ventilation: '💨',
  cleaning: '🧹',
  people: '👥',
  frying: '🍳',
  hours: '⏰',
  patrol: '🗝️'
}

function confirmAll() {
  // 先确保每条都已勾选
  for (const a of acks.value) {
    if (!a.acked) kitchen.toggleTermAck(props.booking, a.termId, true)
  }
  const r = kitchen.ackBookingTerms(props.booking, auth.currentUser!.name)
  if (!r.ok) alert(r.msg)
}

function markViolation(termId: string) {
  const note = window.prompt('违约情况说明：', '违反投诉整改要求') ?? '违反投诉整改要求'
  kitchen.markTermViolated(props.booking, termId, true, note, auth.currentUser!.name)
}
</script>

<template>
  <div class="ta-card" :class="{ pending: !allAcked }">
    <div class="ta-head">
      <h3 style="margin: 0">📌 上一次邻里投诉整改要求（下一次预约确认）</h3>
      <span class="tag" :class="allAcked ? 'green' : 'red'">{{ allAcked ? '已逐条确认' : `${acks.filter((a) => !a.acked).length} 条待负责人确认` }}</span>
    </div>
    <div class="small muted" style="margin: 4px 0 10px">
      依据社区投诉回溯结论，本次预约须再次确认下列排风 / 清洁 / 人数等要求；确认记录进入押金规则：加收 ¥{{ surchargeTotal }}，
      验收时若认定违约，将按条款扣除违约金（当前合计 ¥{{ penaltyTotal }}）。
    </div>

    <div v-for="a in acks" :key="a.termId" class="ta-row">
      <div class="ta-main">
        <label v-if="isApplicant && ['pending', 'approved'].includes(booking.status)" class="switch">
          <input
            type="checkbox"
            :checked="a.acked"
            @change="kitchen.toggleTermAck(booking, a.termId, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ catIcon[booking.boundTerms?.find((t) => t.id === a.termId)?.category ?? ''] ?? '📌' }} {{ a.label }}</span>
        </label>
        <div v-else>
          {{ catIcon[booking.boundTerms?.find((t) => t.id === a.termId)?.category ?? ''] ?? '📌' }} {{ a.label }}
        </div>
        <div class="tiny muted">来源 {{ a.sourceReviewCode }}
          <span v-if="a.surcharge" class="tag amber" style="margin-left: 4px">押金加收 ¥{{ a.surcharge }}</span>
          <span v-if="a.penalty" class="tag red" style="margin-left: 4px">违约扣 ¥{{ a.penalty }}</span>
        </div>
        <div v-if="a.ackedAt" class="tiny green">负责人已确认 · {{ a.ackedAt }}</div>
        <div v-if="a.violated" class="vio-note tiny">⚠ 已认定违约：{{ a.violateNote }}</div>
      </div>

      <!-- 验收阶段：管理员认定违约 -->
      <div v-if="isAdmin && (booking.status === 'closing' || booking.status === 'completed')" class="ta-ops">
        <button v-if="!a.violated" class="btn danger sm" @click="markViolation(a.termId)">认定违约</button>
        <button v-else class="btn sm" @click="kitchen.markTermViolated(booking, a.termId, false, '', auth.currentUser!.name)">撤销违约</button>
      </div>
    </div>

    <div v-if="isApplicant && ['pending', 'approved'].includes(booking.status) && !allAcked" class="ta-action">
      <button class="btn primary sm" @click="confirmAll">全部勾选后点此确认</button>
      <span class="tiny muted">未逐条确认前，社区/管理员无法审批通过</span>
    </div>
  </div>
</template>

<style scoped>
.ta-card { border: 1px solid var(--c-border); border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; background: var(--c-surface-2); }
.ta-card.pending { border-left: 4px solid var(--c-red); }
.ta-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.ta-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px dashed var(--c-border); align-items: flex-start; }
.ta-main { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.ta-ops { flex-shrink: 0; }
.ta-action { margin-top: 8px; display: flex; gap: 10px; align-items: center; }
.vio-note { color: var(--c-red); }
</style>
