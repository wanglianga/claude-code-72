<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import type { AcceptanceItem, AcceptItemKey, Booking, Photo } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { CLEAN_REQUIREMENTS } from '@/rules'
import PhotoCapture from '@/components/PhotoCapture.vue'

const props = defineProps<{ booking: Booking }>()
const emit = defineEmits<{ done: []; cancel: [] }>()

const auth = useAuthStore()
const kitchen = useKitchenStore()

const KEYS: AcceptItemKey[] = ['stove', 'counter', 'fridge', 'trash', 'floor', 'tableware', 'equipment']

const items = reactive<AcceptanceItem[]>(
  KEYS.map((k) => ({
    key: k,
    label: CLEAN_REQUIREMENTS.find((c) => c.key === k)!.text.split('：')[0],
    result: 'pass' as AcceptanceItem['result'],
    note: '',
    photos: [] as Photo[]
  }))
)
const overtimeMinutes = reactive({ v: 0 })
const cleaningExtraMinutes = reactive({ v: 0 })
const overallComment = ref('')

// 用已解决超时事件预填超时分钟
const overtimeFromIncidents = kitchen
  .incidentsOf(props.booking.id)
  .filter((i) => i.type === 'overtime')
  .reduce((s, i) => s + (i.overtimeMinutes ?? 0), 0)
overtimeMinutes.v = overtimeFromIncidents
cleaningExtraMinutes.v = props.booking.acceptance?.cleaningExtraMinutes ?? 0

// 有未解决的混放/油烟事件时默认建议补清洁 30 分钟
const cleaningHint = kitchen
  .incidentsOf(props.booking.id)
  .some((i) => i.cleaningExtra && i.status === 'resolved')
if (cleaningHint && cleaningExtraMinutes.v === 0) cleaningExtraMinutes.v = 30

const preview = computed(() => {
  const acc = {
    checkerId: '',
    at: '',
    overtimeMinutes: overtimeMinutes.v,
    cleaningExtraMinutes: cleaningExtraMinutes.v,
    items
  }
  return kitchen.computeDeposit(props.booking, acc)
})

const photosFor = (k: AcceptItemKey) => items.find((i) => i.key === k)!
function addPhoto(k: AcceptItemKey, p: Photo) {
  photosFor(k).photos.push(p)
}

const resultMeta: Record<AcceptanceItem['result'], { label: string; cls: string }> = {
  pass: { label: '合格', cls: 'green' },
  redirty: { label: '需补清洁', cls: 'amber' },
  fail: { label: '不合格', cls: 'red' }
}

watch(
  () => items.map((i) => i.result).join(','),
  () => {
    const redirty = items.filter((i) => i.result === 'redirty').length
    if (redirty > 0 && cleaningExtraMinutes.v === 0) cleaningExtraMinutes.v = redirty * 20
  }
)

function submit() {
  kitchen.submitAcceptance(props.booking, auth.currentUser!.name, {
    items: JSON.parse(JSON.stringify(items)),
    overtimeMinutes: overtimeMinutes.v,
    cleaningExtraMinutes: cleaningExtraMinutes.v,
    overallComment: overallComment.value
  })
  emit('done')
}
</script>

<template>
  <div>
    <div class="banner warn">
      <span>🧾</span>
      <div class="bx">
        逐项验收 <b>灶台 / 台面 / 冰箱 / 垃圾 / 地面 / 餐具 / 设备</b>。不合格项与补清洁工时将按
        <b>{{ booking.activityKind === 'commercial' ? '商业试吃' : booking.activityKind === 'neighbor-feast' ? '邻里宴' : '居民自用' }}</b>
        规则自动试算押金扣费；公益免押活动也会记录损耗，由社区保洁承担返工。
      </div>
    </div>

    <table class="data">
      <thead>
        <tr><th style="width: 230px">验收项与清洁要求</th><th style="width: 260px">结果</th><th>备注 / 现场拍照</th></tr>
      </thead>
      <tbody>
        <tr v-for="it in items" :key="it.key">
          <td>
            <strong>{{ CLEAN_REQUIREMENTS.find((c) => c.key === it.key)?.icon }} {{ it.label }}</strong>
            <div class="tiny muted">{{ CLEAN_REQUIREMENTS.find((c) => c.key === it.key)?.text.split('：')[1] }}</div>
          </td>
          <td>
            <div class="seg">
              <button
                v-for="(m, rk) in resultMeta"
                :key="rk"
                :class="{ on: it.result === rk }"
                @click="it.result = rk as AcceptanceItem['result']"
              >
                {{ m.label }}
              </button>
            </div>
          </td>
          <td>
            <input v-model="it.note" placeholder="问题描述（不合格时必填）" style="margin-bottom: 6px" />
            <details>
              <summary class="small muted" style="cursor: pointer">现场拍照（{{ it.photos.length }}）</summary>
              <div style="margin-top: 6px">
                <PhotoCapture :by="auth.currentUser!.name" @shot="(p) => addPhoto(it.key, p)" />
              </div>
            </details>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="form-row" style="margin-top: 14px">
      <div class="field">
        <label>实际超时（分钟）</label>
        <input type="number" min="0" v-model.number="overtimeMinutes.v" />
        <div class="hint">由「活动超时」事件核定，自动带入。</div>
      </div>
      <div class="field">
        <label>补清洁工时（分钟）</label>
        <input type="number" min="0" v-model.number="cleaningExtraMinutes.v" />
        <div class="hint">需补清洁项按每项约 20 分钟预估，可修改。</div>
      </div>
      <div class="field" style="flex: 2">
        <label>总评</label>
        <input v-model="overallComment" placeholder="对本次使用卫生、配合度的总体评价" />
      </div>
    </div>

    <!-- 押金试算 -->
    <div class="deposit-preview">
      <div class="dp-title">💰 押金处理试算</div>
      <template v-if="booking.depositFree">
        <div class="tag green" style="margin-bottom: 6px">公益免押活动</div>
        <div class="small muted">无押金可退；以下问题将记录归档，损坏赔偿另行追偿，补清洁由社区保洁承担。</div>
      </template>
      <template v-else>
        <div class="small">押金余额：<b class="mono">¥{{ booking.depositRequired }}</b></div>
      </template>
      <div v-if="preview.reasons.length" style="margin: 8px 0">
        <div v-for="(r, i) in preview.reasons" :key="i" class="small">· {{ r }}</div>
      </div>
      <div v-else-if="!booking.depositFree" class="small green">七项全合格，无额外工时 → 建议<b>全额退还 ¥{{ booking.depositRequired }}</b></div>
      <div v-if="!booking.depositFree" class="dp-result">
        <span v-if="preview.deduction === 0" class="tag green">全额退还 ¥{{ booking.depositRequired }}</span>
        <span v-else-if="preview.deduction >= booking.depositRequired" class="tag red">没收全部押金 ¥{{ booking.depositRequired }}（超出部分追偿）</span>
        <span v-else class="tag amber">扣费 ¥{{ preview.deduction }}，退还 ¥{{ booking.depositRequired - preview.deduction }}</span>
      </div>
    </div>

    <div style="display: flex; gap: 10px; margin-top: 14px">
      <button class="btn primary" @click="submit">提交验收并生成押金决定</button>
      <button class="btn" @click="emit('cancel')">取消</button>
    </div>
  </div>
</template>

<style scoped>
.deposit-preview {
  margin-top: 14px; border: 1px solid #ecd9ae; background: var(--c-amber-soft);
  border-radius: 8px; padding: 12px 14px;
}
.dp-title { font-weight: 600; margin-bottom: 6px; }
.dp-result { margin-top: 8px; }
</style>
