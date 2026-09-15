<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Booking, DamageReport, Photo } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { DAMAGE_KIND_META, DAMAGE_VERDICT_META } from '@/rules'
import BaseModal from '@/components/BaseModal.vue'
import PhotoList from '@/components/PhotoList.vue'
import PhotoCapture from '@/components/PhotoCapture.vue'
import WorkOrderPanel from '@/components/WorkOrderPanel.vue'

const props = defineProps<{ report: DamageReport; booking: Booking }>()
const auth = useAuthStore()
const kitchen = useKitchenStore()

const isAdmin = computed(() => auth.currentUser!.role === 'admin')
const wo = computed(() => kitchen.workOrderById(props.report.workOrderId))
const vmeta = computed(() => DAMAGE_VERDICT_META[props.report.verdict])

const showDecide = ref(false)
const verdict = ref<'charge' | 'wear' | 'investigating'>('charge')
const note = ref('')
const chargeAmount = ref(0)
const err = ref('')

const onsiteComplete = computed(
  () =>
    props.report.onSite.userIdMatch &&
    props.report.onSite.beforeNormal &&
    props.report.onSite.onSiteConfirmed
)

function openDecide(v: 'charge' | 'wear' | 'investigating') {
  verdict.value = v
  note.value = props.report.decisionNote ?? ''
  chargeAmount.value = props.report.chargeAmount || wo.value?.repairCost || 0
  err.value = ''
  showDecide.value = true
}

function doDecide() {
  err.value = ''
  const r = kitchen.decideDamage(
    props.report.id,
    verdict.value,
    { note: note.value, chargeAmount: Number(chargeAmount.value) },
    auth.currentUser!.name,
    auth.currentUser!.role
  )
  if (!r.ok) {
    err.value = r.msg ?? '操作失败'
    return
  }
  showDecide.value = false
}

function addPhoto(p: Photo) {
  props.report.photos.push(p)
  kitchen.persist()
}
</script>

<template>
  <div class="dr-card">
    <div class="dr-head">
      <span style="font-size: 18px">{{ DAMAGE_KIND_META[report.kind].icon }}</span>
      <div style="flex: 1">
        <b>{{ report.title }}</b>
        <span class="tag" :class="vmeta.cls" style="margin-left: 8px">{{ vmeta.label }}</span>
        <span class="tag gray mono" style="margin-left: 4px">{{ report.code }}</span>
      </div>
      <div v-if="report.verdict === 'charge'" class="tag red">扣费 ¥{{ report.chargeAmount }}</div>
    </div>
    <div class="small" style="margin: 6px 0">{{ report.detail }}</div>

    <!-- 使用人 / 设备 / 巡检关联信息 -->
    <div class="dr-meta small">
      <div><span class="muted">关联使用人：</span>{{ booking.contactName }} {{ booking.contactPhone }}（{{ booking.title }}）</div>
      <div><span class="muted">设备：</span>{{ report.resourceName }}</div>
      <div><span class="muted">登记：</span>{{ report.reportedBy }} · {{ report.reportedAt }}</div>
      <div v-if="report.lastInspectionAt">
        <span class="muted">上次巡检：</span>{{ report.lastInspectionAt }}
        <span class="tiny muted">（{{ report.lastInspectionResult }}）</span>
      </div>
    </div>

    <!-- 现场确认三项 -->
    <div class="onsite">
      <div class="os-title tiny muted">现场确认：</div>
      <span class="tag" :class="report.onSite.userIdMatch ? 'green' : 'red'">
        {{ report.onSite.userIdMatch ? '✔' : '○' }} 本次使用人在场认可
      </span>
      <span class="tag" :class="report.onSite.beforeNormal ? 'green' : 'red'">
        {{ report.onSite.beforeNormal ? '✔' : '○' }} 上次巡检/用前设备正常
      </span>
      <span class="tag" :class="report.onSite.onSiteConfirmed ? 'green' : 'red'">
        {{ report.onSite.onSiteConfirmed ? '✔' : '○' }} 确认发生于本次使用
      </span>
      <div v-if="report.onSite.note" class="tiny muted" style="width: 100%">备注：{{ report.onSite.note }}</div>
    </div>

    <PhotoList :photos="report.photos" />
    <details>
      <summary class="small muted" style="cursor: pointer; margin-top: 4px">补充设备照片（{{ report.photos.length }}）</summary>
      <div style="margin-top: 6px"><PhotoCapture :by="auth.currentUser!.name" @shot="addPhoto" /></div>
    </details>

    <!-- 定性结论 -->
    <div v-if="report.decidedBy" class="dr-decision small">
      <b>责任定性（{{ report.decidedBy }} · {{ report.decidedAt }}）：</b>{{ report.decisionNote }}
    </div>

    <!-- 管理员操作 -->
    <div v-if="isAdmin && report.verdict !== 'resolved'" class="dr-actions">
      <button class="btn danger sm" @click="openDecide('charge')">🔧 维修扣费</button>
      <button class="btn success sm" @click="openDecide('wear')">🌿 自然损耗</button>
      <button class="btn sm" @click="openDecide('investigating')">🔍 继续调查</button>
      <span v-if="!onsiteComplete" class="tiny red">现场确认三项未全部勾选，仅可「继续调查」</span>
    </div>

    <!-- 维修工单 -->
    <WorkOrderPanel v-if="wo" :work-order="wo" />

    <!-- 定性弹窗 -->
    <BaseModal v-if="showDecide" :title="`损坏验收定性 · ${DAMAGE_VERDICT_META[verdict].label}`" wide @close="showDecide = false">
      <div class="modal-body">
        <div class="banner" :class="verdict === 'charge' ? 'warn' : verdict === 'wear' ? 'ok' : 'info'">
          <span>{{ verdict === 'charge' ? '🔧' : verdict === 'wear' ? '🌿' : '🔍' }}</span>
          <div class="bx">{{ DAMAGE_VERDICT_META[verdict].desc }}</div>
        </div>

        <template v-if="verdict !== 'investigating'">
          <div class="os-check">
            <label class="checkbox"><input type="checkbox" v-model="props.report.onSite.userIdMatch" /><span>确认本次使用人在场并认可</span></label>
            <label class="checkbox"><input type="checkbox" v-model="props.report.onSite.beforeNormal" /><span>上次巡检/使用前核验时该设备正常</span></label>
            <label class="checkbox"><input type="checkbox" v-model="props.report.onSite.onSiteConfirmed" /><span>现场确认损坏/遗失发生于本次使用</span></label>
          </div>
        </template>

        <div v-if="verdict === 'charge'" class="field">
          <label>维修 / 重置扣费金额（元）<span class="req">*</span></label>
          <input type="number" min="1" v-model.number="chargeAmount" />
          <div class="hint">默认取工单核定成本 {{ wo?.repairCost ?? 0 }} 元，可调整；费用将同步计入押金与工单。</div>
        </div>
        <div class="field">
          <label>{{ verdict === 'investigating' ? '调查说明' : '定性依据' }}<span class="req">*</span></label>
          <textarea v-model="note" placeholder="对照巡检记录、现场照片、使用人陈述给出结论"></textarea>
        </div>
        <div v-if="err" class="error-text">{{ err }}</div>
      </div>
      <template #footer>
        <button class="btn" @click="showDecide = false">取消</button>
        <button class="btn primary" @click="doDecide">确认结论并同步押金/工单</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.dr-card { border: 1px solid var(--c-border); border-left: 4px solid var(--c-red); border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; background: var(--c-surface-2); }
.dr-head { display: flex; align-items: center; gap: 10px; }
.dr-meta { display: flex; flex-direction: column; gap: 2px; margin: 6px 0; }
.onsite { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; background: #fff; border: 1px solid var(--c-border); border-radius: 6px; padding: 8px 10px; margin: 6px 0; }
.os-title { width: 100%; }
.dr-decision { margin-top: 8px; padding: 8px 10px; background: var(--c-surface); border-radius: 6px; border: 1px solid var(--c-border); }
.dr-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
</style>
