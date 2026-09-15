<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Booking, ComplaintReview } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { COMPLAINT_MEASURE_META, COMPLAINT_TYPE_META, RESOURCE_META } from '@/rules'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps<{ review: ComplaintReview; booking: Booking }>()
const auth = useAuthStore()
const kitchen = useKitchenStore()

const isStaff = computed(() => auth.currentUser!.role === 'staff')
const tmeta = computed(() => COMPLAINT_TYPE_META[props.review.complaintType])
const showReview = ref(false)
const err = ref('')

// 结论表单：措施多选 + 写入下次预约的条件
const selectedMeasures = reactive<Record<string, boolean>>({})
const conclusion = ref('')
// 每条措施对应的“下次条件”可编辑（默认带押金加收与违约金）
const termRows = ref<
  { measureType: string; label: string; surcharge: number; penalty: number; enabled: boolean; requiredPatrols?: number }[]
>([])

function openReview() {
  conclusion.value = ''
  err.value = ''
  Object.keys(selectedMeasures).forEach((k) => (selectedMeasures[k] = false))
  termRows.value = Object.keys(COMPLAINT_MEASURE_META).map((k) => {
    const m = COMPLAINT_MEASURE_META[k]
    return {
      measureType: k,
      label: m.defaultTerm,
      surcharge: m.defaultSurcharge,
      penalty: m.defaultPenalty,
      enabled: false,
      requiredPatrols: m.termCategory === 'patrol' ? 2 : undefined
    }
  })
  showReview.value = true
}

function submitReview() {
  err.value = ''
  const measures = Object.keys(selectedMeasures)
    .filter((k) => selectedMeasures[k])
    .map((k) => ({ type: k as never, detail: COMPLAINT_MEASURE_META[k].label }))
  const terms = termRows.value
    .filter((t) => t.enabled && t.label.trim())
    .map((t) => ({
      category: COMPLAINT_MEASURE_META[t.measureType].termCategory,
      label: t.label.trim(),
      surcharge: Number(t.surcharge) || 0,
      penalty: Number(t.penalty) || 0,
      requiredPatrols: t.requiredPatrols
    }))
  const r = kitchen.reviewComplaint(
    props.review.id,
    { conclusion: conclusion.value, measures, terms },
    auth.currentUser!.name,
    auth.currentUser!.role
  )
  if (!r.ok) {
    err.value = r.msg ?? '提交失败'
    return
  }
  showReview.value = false
}

const resourceName = (rid: string) => {
  const r = kitchen.resources.find((x) => x.id === rid)
  return r ? `${RESOURCE_META[r.type].icon}${r.name}` : rid
}
</script>

<template>
  <div class="cr-card" :class="review.status">
    <div class="cr-head">
      <span style="font-size: 18px">{{ tmeta.icon }}</span>
      <div style="flex: 1">
        <b>投诉回溯 {{ review.code }}</b>
        <span class="tag" :class="review.status === 'open' ? 'red' : 'green'" style="margin-left: 8px">
          {{ review.status === 'open' ? '待回溯' : '已回溯' }}
        </span>
      </div>
      <button v-if="isStaff && review.status === 'open'" class="btn primary sm" @click="openReview">社区回溯处理</button>
    </div>

    <div class="small" style="margin: 6px 0">{{ review.summary }}</div>
    <div class="tiny muted">投诉来源：{{ review.neighborFrom ?? '—' }} · {{ review.reportedAt }}</div>

    <!-- 投诉当时的运行上下文 -->
    <div class="ctx-box">
      <div class="ctx-title tiny muted">投诉当时回溯信息</div>
      <div class="ctx-grid small">
        <div><span class="muted">预约：</span>{{ booking.title }}（{{ review.context.timeRange }}）</div>
        <div><span class="muted">烹饪类型：</span>{{ review.context.cookingTypes.join('、') }}<span v-if="review.context.isFrying" class="tag red" style="margin-left: 4px">含油炸</span></div>
        <div><span class="muted">活动人数：</span>{{ review.context.peopleCount }} 人</div>
        <div><span class="muted">在用设备：</span>{{ review.context.allocatedResourceIds.map(resourceName).join('、') }}</div>
      </div>
      <div class="ctx-sub tiny muted">💨 排风开启记录（{{ review.context.ventilation.length }}）</div>
      <div v-for="v in review.context.ventilation" :key="v.id" class="tiny">
        · {{ v.at }} {{ v.by }} 开启 <b>{{ v.level }} 档</b><span v-if="v.note">（{{ v.note }}）</span>
      </div>
      <div v-if="!review.context.ventilation.length" class="tiny red">无排风开启记录</div>
      <div class="ctx-sub tiny muted">🗝️ 管理员巡查记录（{{ review.context.patrols.length }}）</div>
      <div v-for="p in review.context.patrols" :key="p.id" class="tiny">
        · {{ p.at }} {{ p.by }}：{{ p.finding }}<span v-if="p.action">；处置：{{ p.action }}</span>
      </div>
      <div v-if="!review.context.patrols.length" class="tiny muted">无巡查记录</div>
    </div>

    <!-- 回溯结论 -->
    <template v-if="review.status === 'reviewed'">
      <div class="cr-result small">
        <div><b>回溯结论（{{ review.reviewedBy }} · {{ review.reviewedAt }}）：</b>{{ review.conclusion }}</div>
        <div class="measures">
          <b class="tiny muted">后续措施：</b>
          <span v-for="m in review.measures" :key="m.type" class="tag amber">{{ COMPLAINT_MEASURE_META[m.type]?.icon }} {{ COMPLAINT_MEASURE_META[m.type]?.label }}</span>
        </div>
        <div class="terms">
          <b class="tiny muted">写入下一次预约确认：</b>
          <div v-for="t in review.nextBookingTerms" :key="t.id" class="term-line tiny">
            ☑ {{ t.label }}
            <span v-if="t.surcharge" class="tag amber">押金加收 ¥{{ t.surcharge }}</span>
            <span v-if="t.penalty" class="tag red">违约扣 ¥{{ t.penalty }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 回溯弹窗 -->
    <BaseModal v-if="showReview" title="邻里投诉回溯处理" wide @close="showReview = false">
      <div class="modal-body">
        <div class="banner info"><span>🌀</span><div class="bx">
          依据左侧当时的预约、烹饪类型、排风开启、活动人数与管理员巡查记录出具结论；选择后续措施并把<b>排风 / 清洁 / 人数</b>等要求写入该负责人下一次预约确认（可设押金加收与违约金）。
        </div></div>
        <div class="field"><label>回溯结论<span class="req">*</span></label>
          <textarea v-model="conclusion" placeholder="对油烟/噪声成因、管理与使用双方责任的认定"></textarea>
        </div>
        <label class="small muted" style="display: block; margin: 6px 0">后续措施（至少一项）</label>
        <div class="measure-grid">
          <label v-for="(m, k) in COMPLAINT_MEASURE_META" :key="k" class="measure-opt" :class="{ on: selectedMeasures[k] }">
            <input type="checkbox" v-model="selectedMeasures[k]" @change="(e) => { const en = (e.target as HTMLInputElement).checked; const row = termRows.find((t) => t.measureType === k); if (row) row.enabled = en }" />
            <span>{{ m.icon }} {{ m.label }}</span>
          </label>
        </div>

        <label class="small muted" style="display: block; margin: 10px 0 6px">写入下一次预约确认的条件（勾选启用，文案与金额可调）</label>
        <div v-for="t in termRows" :key="t.measureType" class="term-edit" :class="{ disabled: !selectedMeasures[t.measureType] }">
          <label class="switch"><input type="checkbox" v-model="t.enabled" :disabled="!selectedMeasures[t.measureType]" /><span>{{ COMPLAINT_MEASURE_META[t.measureType].label }}</span></label>
          <input v-model="t.label" :disabled="!t.enabled" placeholder="确认条款" />
          <div class="term-fee">
            加收 <input type="number" min="0" v-model.number="t.surcharge" :disabled="!t.enabled" />
            违约 <input type="number" min="0" v-model.number="t.penalty" :disabled="!t.enabled" />
          </div>
        </div>
        <div v-if="err" class="error-text">{{ err }}</div>
      </div>
      <template #footer>
        <button class="btn" @click="showReview = false">取消</button>
        <button class="btn primary" @click="submitReview">出具结论并写入下一次预约确认</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.cr-card { border: 1px solid var(--c-border); border-left: 4px solid var(--c-red); border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; background: var(--c-surface-2); }
.cr-card.reviewed { border-left-color: var(--c-green); }
.cr-head { display: flex; align-items: center; gap: 10px; }
.ctx-box { margin-top: 8px; background: #fff; border: 1px solid var(--c-border); border-radius: 7px; padding: 9px 11px; display: flex; flex-direction: column; gap: 3px; }
.ctx-title { margin-bottom: 3px; font-weight: 600; }
.ctx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 12px; margin-bottom: 6px; }
.ctx-sub { margin-top: 5px; font-weight: 600; }
.cr-result { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.measures { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.term-line { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 2px; }
.measure-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.measure-opt { display: flex; gap: 6px; align-items: center; border: 1px solid var(--c-border); border-radius: 7px; padding: 8px 10px; cursor: pointer; font-size: 13px; }
.measure-opt.on { border-color: var(--c-brand); background: var(--c-brand-soft); }
.measure-opt input { width: auto; }
.term-edit { display: grid; grid-template-columns: 200px 1fr 230px; gap: 8px; align-items: center; padding: 7px 0; border-bottom: 1px dashed var(--c-border); }
.term-edit.disabled { opacity: .45; }
.term-fee { display: flex; gap: 6px; align-items: center; font-size: 12px; color: var(--c-text-2); }
.term-fee input { width: 70px; }
</style>
