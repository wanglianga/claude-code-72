<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Booking, Photo } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { CLEAN_REQUIREMENTS } from '@/rules'
import PhotoCapture from '@/components/PhotoCapture.vue'
import PhotoList from '@/components/PhotoList.vue'
import {
  acceptanceProgress,
  emptyAcceptanceItems,
  validateAcceptance,
  type AcceptFormItem
} from '@/utils/access'

const props = defineProps<{ booking: Booking }>()
const emit = defineEmits<{ done: []; cancel: [] }>()

const auth = useAuthStore()
const kitchen = useKitchenStore()

const items = ref<AcceptFormItem[]>(emptyAcceptanceItems())
const overtimeMinutes = ref(0)
const cleaningExtraMinutes = ref(0)
const overallComment = ref('')
const submitError = ref('')

// 用已解决超时事件预填超时分钟
overtimeMinutes.value = kitchen
  .incidentsOf(props.booking.id)
  .filter((i) => i.type === 'overtime')
  .reduce((s, i) => s + (i.overtimeMinutes ?? 0), 0)

// 已核定需补清洁的事件给出工时建议
const cleaningHint = kitchen
  .incidentsOf(props.booking.id)
  .some((i) => i.cleaningExtra && i.status === 'resolved')
if (cleaningHint) cleaningExtraMinutes.value = 30

const progress = computed(() => acceptanceProgress(items.value))

const resultMeta: Record<string, { label: string; cls: string }> = {
  unchecked: { label: '未检查', cls: 'gray' },
  pass: { label: '合格', cls: 'green' },
  redirty: { label: '需补清洁', cls: 'amber' },
  fail: { label: '不合格', cls: 'red' }
}

function reqText(it: AcceptFormItem): string {
  const reqs: string[] = []
  if (it.result === 'unchecked') return '待检查'
  if (it.result !== 'pass' && !it.note?.trim()) reqs.push('需填写问题描述')
  if (it.result === 'fail' && it.photos.length === 0) reqs.push('不合格必须拍照留证')
  return reqs.length ? reqs.join('；') : '已完成确认'
}
function rowStateCls(it: AcceptFormItem): string {
  if (it.result === 'unchecked') return 'wait'
  if (it.result === 'pass') return 'ok'
  return !it.note?.trim() || (it.result === 'fail' && it.photos.length === 0) ? 'incomplete' : 'ok'
}

const preview = computed(() => {
  if (progress.value !== 7) return null
  return kitchen.computeDeposit(props.booking, {
    checkerId: '',
    at: '',
    overtimeMinutes: overtimeMinutes.value,
    cleaningExtraMinutes: cleaningExtraMinutes.value,
    items: items.value
  })
})

const firstBlocker = computed(() => {
  const v = validateAcceptance(
    items.value,
    overallComment.value,
    overtimeMinutes.value,
    cleaningExtraMinutes.value
  )
  return v.ok ? '' : v.msg
})
const canSubmit = computed(() => !firstBlocker.value)

function addPhoto(it: AcceptFormItem, p: Photo) {
  it.photos.push(p)
}

function submit() {
  submitError.value = ''
  const r = kitchen.submitAcceptance(
    props.booking,
    auth.currentUser!.name,
    auth.currentUser!.role,
    {
      items: items.value,
      overtimeMinutes: overtimeMinutes.value,
      cleaningExtraMinutes: cleaningExtraMinutes.value,
      overallComment: overallComment.value
    }
  )
  if (!r.ok) {
    submitError.value = r.msg ?? '验收提交失败'
    return
  }
  emit('done')
}
</script>

<template>
  <div>
    <div class="banner warn">
      <span>🧾</span>
      <div class="bx">
        请逐项验收 <b>灶台 / 台面 / 冰箱 / 垃圾 / 地面 / 餐具 / 设备</b>，每项必须显式选择结论；
        初始状态为「未检查」，<b>七项全部确认、问题项填写描述、不合格项拍照留证、总评填写后</b>才能提交并生成押金决定。
      </div>
    </div>

    <!-- 进度 -->
    <div class="progress-box">
      <div class="pb-top">
        <b>验收进度：{{ progress }}/7</b>
        <span class="tag" :class="progress === 7 ? 'green' : 'amber'">
          {{ progress === 7 ? '七项均已确认' : `还有 ${7 - progress} 项未检查` }}
        </span>
      </div>
      <div class="bar-track" style="height: 10px">
        <div class="bar-fill" :style="{ width: (progress / 7) * 100 + '%' }"></div>
      </div>
    </div>

    <table class="data accept-table">
      <thead>
        <tr><th style="width: 210px">验收项与清洁要求</th><th style="width: 300px">检查结论（必选）</th><th>问题描述 / 现场留证</th></tr>
      </thead>
      <tbody>
        <tr v-for="it in items" :key="it.key" :class="['row-' + rowStateCls(it)]">
          <td>
            <strong>{{ CLEAN_REQUIREMENTS.find((c) => c.key === it.key)?.icon }} {{ it.label }}</strong>
            <div class="tiny muted">{{ CLEAN_REQUIREMENTS.find((c) => c.key === it.key)?.text.split('：')[1] }}</div>
          </td>
          <td>
            <div class="seg">
              <button class="unchecked-btn" disabled :class="{ on: it.result === 'unchecked' }">
                {{ resultMeta.unchecked.label }}
              </button>
              <button :class="{ on: it.result === 'pass' }" @click="it.result = 'pass'">合格</button>
              <button :class="{ on: it.result === 'redirty' }" @click="it.result = 'redirty'">需补清洁</button>
              <button :class="{ on: it.result === 'fail' }" @click="it.result = 'fail'">不合格</button>
            </div>
            <div class="tiny" :class="rowStateCls(it) === 'ok' ? 'green' : 'amber'" style="margin-top: 4px">
              {{ rowStateCls(it) === 'ok' ? '✔ ' + reqText(it) : '○ ' + reqText(it) }}
            </div>
          </td>
          <td>
            <template v-if="it.result === 'unchecked'">
              <div class="tiny muted">请先选择检查结论。合格项无需填写；需补清洁 / 不合格项必须描述问题，不合格还须拍照。</div>
            </template>
            <template v-else-if="it.result === 'pass'">
              <div class="tiny green">已确认合格，无需补充材料。</div>
            </template>
            <template v-else>
              <textarea
                v-model="it.note"
                :placeholder="it.result === 'fail' ? '不合格情况描述（必填）' : '需要补清洁的具体问题（必填）'"
                style="margin-bottom: 6px"
              ></textarea>
              <PhotoList :photos="it.photos" />
              <details>
                <summary class="small muted" style="cursor: pointer">
                  📷 现场拍照 / 上传（{{ it.photos.length }}）<span v-if="it.result === 'fail' && it.photos.length === 0" class="red">· 不合格项至少 1 张</span>
                </summary>
                <div style="margin-top: 6px">
                  <PhotoCapture :by="auth.currentUser!.name" @shot="(p) => addPhoto(it, p)" />
                </div>
              </details>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="form-row" style="margin-top: 14px">
      <div class="field">
        <label>实际超时（分钟）</label>
        <input type="number" min="0" v-model.number="overtimeMinutes" />
        <div class="hint">由「活动超时」事件核定，自动带入。</div>
      </div>
      <div class="field">
        <label>补清洁工时（分钟）</label>
        <input type="number" min="0" v-model.number="cleaningExtraMinutes" />
        <div class="hint">需补清洁项按每项约 20 分钟预估，可修改。</div>
      </div>
      <div class="field" style="flex: 2">
        <label>验收总评<span class="req">*</span></label>
        <textarea
          v-model="overallComment"
          placeholder="必填：对本次使用卫生状况、配合度、邻里影响的总体评价（将随验收记录归档）"
        ></textarea>
      </div>
    </div>

    <!-- 押金试算：七项完成后才显示，避免诱导空提交 -->
    <div v-if="preview" class="deposit-preview">
      <div class="dp-title">💰 押金处理试算（七项确认完成）</div>
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
      <div v-else-if="!booking.depositFree" class="small green">
        七项全部合格，无额外工时 → 建议<b>全额退还 ¥{{ booking.depositRequired }}</b>
      </div>
      <div v-if="!booking.depositFree" class="dp-result">
        <span v-if="preview.deduction === 0" class="tag green">全额退还 ¥{{ booking.depositRequired }}</span>
        <span v-else-if="preview.deduction >= booking.depositRequired" class="tag red">没收全部押金 ¥{{ booking.depositRequired }}（超出部分追偿）</span>
        <span v-else class="tag amber">扣费 ¥{{ preview.deduction }}，退还 ¥{{ booking.depositRequired - preview.deduction }}</span>
      </div>
    </div>
    <div v-else class="deposit-preview pending">
      完成全部七项检查后，这里才会显示押金处理试算结果。
    </div>

    <div v-if="submitError" class="error-text" style="margin-top: 10px">{{ submitError }}</div>
    <div v-else-if="firstBlocker" class="blocker-hint">🚧 {{ firstBlocker }}</div>

    <div style="display: flex; gap: 10px; margin-top: 14px">
      <button class="btn primary" :disabled="!canSubmit" @click="submit">
        提交验收并生成押金决定
      </button>
      <button class="btn" @click="emit('cancel')">取消</button>
    </div>
  </div>
</template>

<style scoped>
.progress-box {
  border: 1px solid var(--c-border); border-radius: 8px; padding: 10px 12px;
  margin-bottom: 12px; background: var(--c-surface-2);
}
.pb-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13px; }
.accept-table tr.row-incomplete td { background: #fff8ef; }
.unchecked-btn[disabled] { opacity: .75; color: var(--c-text-3); }
.unchecked-btn.on { background: #e8e2d8; color: var(--c-text-2); }
.deposit-preview {
  margin-top: 14px; border: 1px solid #ecd9ae; background: var(--c-amber-soft);
  border-radius: 8px; padding: 12px 14px;
}
.deposit-preview.pending {
  border-style: dashed; background: var(--c-surface-2); color: var(--c-text-3);
  border-color: var(--c-border);
}
.dp-title { font-weight: 600; margin-bottom: 6px; }
.dp-result { margin-top: 8px; }
.blocker-hint {
  margin-top: 10px; font-size: 12.5px; color: var(--c-amber);
  background: var(--c-amber-soft); border: 1px solid #ecd9ae;
  border-radius: 6px; padding: 7px 10px;
}
</style>
