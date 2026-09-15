<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RepairWorkOrder } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import TimelineView from '@/components/TimelineView.vue'

const props = defineProps<{ workOrder: RepairWorkOrder }>()
const auth = useAuthStore()
const kitchen = useKitchenStore()

const isRepair = computed(() => auth.currentUser!.role === 'repair')
const isAdmin = computed(() => auth.currentUser!.role === 'admin')
const canEdit = computed(() => isRepair.value || isAdmin.value)

const editing = ref(false)
const affects = ref(props.workOrder.affectsBookings)
const days = ref(props.workOrder.estimatedRepairDays)
const cost = ref(props.workOrder.repairCost)
const note = ref('')
const closeWO = ref(false)
const err = ref('')

const statusMeta: Record<string, { label: string; cls: string }> = {
  open: { label: '待处理', cls: 'red' },
  repairing: { label: '维修中', cls: 'amber' },
  closed: { label: '已关闭', cls: 'green' }
}

function save() {
  err.value = ''
  const r = kitchen.updateWorkOrder(
    props.workOrder.id,
    {
      affectsBookings: affects.value,
      estimatedRepairDays: Number(days.value),
      repairCost: Number(cost.value),
      status: closeWO.value ? 'closed' : props.workOrder.status === 'open' ? 'repairing' : props.workOrder.status,
      handleNote: note.value || undefined
    },
    auth.currentUser!.name,
    auth.currentUser!.role
  )
  if (!r.ok) {
    err.value = r.msg ?? '保存失败'
    return
  }
  editing.value = false
  note.value = ''
}
</script>

<template>
  <div class="wo-box">
    <div class="wo-head">
      <b>🛠️ 维修工单 {{ workOrder.code }}</b>
      <span class="tag" :class="statusMeta[workOrder.status].cls">{{ statusMeta[workOrder.status].label }}</span>
      <span v-if="workOrder.affectsBookings" class="tag red">影响后续预约</span>
      <span v-if="workOrder.blockSameKind" class="tag red">已自动限制同类活动预约</span>
      <button v-if="canEdit && workOrder.status !== 'closed' && !editing" class="btn sm" style="margin-left: auto" @click="editing = true">更新工单</button>
    </div>

    <div class="wo-grid small">
      <div><span class="muted">设备：</span>{{ workOrder.resourceName }}</div>
      <div><span class="muted">维修/重置成本：</span><b class="mono">¥{{ workOrder.repairCost }}</b></div>
      <div><span class="muted">预计工期：</span>{{ workOrder.estimatedRepairDays }} 天</div>
      <div><span class="muted">建单：</span>{{ workOrder.createdBy }} · {{ workOrder.createdAt }}</div>
    </div>
    <div v-if="workOrder.affectsBookings && workOrder.blockReason" class="tiny" style="color: var(--c-red)">停用原因：{{ workOrder.blockReason }}</div>
    <div v-if="workOrder.handleNote" class="small" style="margin-top: 4px">处理记录：{{ workOrder.handleNote }}（{{ workOrder.handlerId }}）</div>

    <!-- 编辑 -->
    <div v-if="editing" class="wo-edit">
      <label class="checkbox"><input type="checkbox" v-model="affects" /><span>设备停用，<b>影响后续预约</b>（将自动通知下一位预约人改期/换设备）</span></label>
      <div class="form-row" style="margin: 6px 0">
        <div class="field"><label>预计工期（天）</label><input type="number" min="0" v-model.number="days" /></div>
        <div class="field"><label>维修/重置成本（元）</label><input type="number" min="0" v-model.number="cost" /></div>
      </div>
      <div class="field"><label>处理说明</label><input v-model="note" placeholder="如：配件已订，预计周三到货" /></div>
      <label class="checkbox"><input type="checkbox" v-model="closeWO" /><span>设备已修复/完成重置，关闭工单并恢复设备可用</span></label>
      <div v-if="err" class="error-text">{{ err }}</div>
      <div style="display: flex; gap: 8px; margin-top: 6px">
        <button class="btn primary sm" @click="save">保存（影响后续预约时自动通知）</button>
        <button class="btn sm" @click="editing = false">取消</button>
      </div>
    </div>

    <details>
      <summary class="tiny muted" style="cursor: pointer; margin-top: 6px">工单过程（{{ workOrder.timeline.length }}）</summary>
      <TimelineView :entries="workOrder.timeline" />
    </details>
  </div>
</template>

<style scoped>
.wo-box { margin-top: 10px; border: 1px solid var(--c-border); border-radius: 7px; padding: 10px 12px; background: #fff; }
.wo-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.wo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px; }
.wo-edit { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--c-border); }
</style>
