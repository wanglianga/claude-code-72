<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Incident } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { INCIDENT_META } from '@/rules'
import PhotoList from '@/components/PhotoList.vue'
import PhotoCapture from '@/components/PhotoCapture.vue'

const props = defineProps<{ incident: Incident }>()
const auth = useAuthStore()
const kitchen = useKitchenStore()

const meta = computed(() => INCIDENT_META[props.incident.type])
const myRole = computed(() => auth.currentUser!.role)
const canHandle = computed(() => myRole.value === props.incident.owner || myRole.value === 'admin')

const showAssign = ref(false)
const assignOwner = ref(props.incident.owner)
const showResolve = ref(false)

const form = reactive({
  note: '',
  wearImpact: 10,
  compensation: 0,
  sendToRepair: false,
  extraPeople: 0,
  overtimeMinutes: 0,
  cleaningExtra: false,
  resourceId: ''
})

const resources = computed(() => kitchen.resources)
const statusLabel = { open: '待处理', processing: '处理中', resolved: '已闭环' }
const levelTag = { high: 'red', mid: 'amber', low: '' }

function doResolve() {
  if (!form.note.trim()) return
  kitchen.resolveIncident(props.incident, {
    handlerName: auth.currentUser!.name,
    note: form.note.trim(),
    wearImpact: props.incident.type === 'damage' ? Number(form.wearImpact) : undefined,
    compensation: props.incident.type === 'damage' && form.compensation > 0 ? Number(form.compensation) : undefined,
    extraPeople: props.incident.type === 'extra-people' && form.extraPeople > 0 ? Number(form.extraPeople) : undefined,
    overtimeMinutes: props.incident.type === 'overtime' && form.overtimeMinutes > 0 ? Number(form.overtimeMinutes) : undefined,
    cleaningExtra: form.cleaningExtra || undefined,
    sendToRepair: props.incident.type === 'damage' ? form.sendToRepair : undefined,
    resourceId: form.resourceId || props.incident.resourceId
  })
  showResolve.value = false
}

function doAssign() {
  kitchen.assignIncident(props.incident, assignOwner.value, auth.currentUser!.name)
  showAssign.value = false
}

function addPhoto(p: import('@/types').Photo) {
  props.incident.photos.push(p)
  kitchen.persist()
}
</script>

<template>
  <div class="inc-card" :class="incident.status">
    <div class="inc-head">
      <span style="font-size: 18px">{{ meta.icon }}</span>
      <div style="flex: 1">
        <strong>{{ incident.title }}</strong>
        <div class="tiny muted">
          {{ meta.label }} · {{ incident.reportedBy }} 上报于 {{ incident.reportedAt }}
          · 指派：{{ kitchen.ownerLabel(incident.owner) }}
        </div>
      </div>
      <span class="tag" :class="levelTag[incident.level]">{{ incident.level === 'high' ? '高优先级' : incident.level === 'mid' ? '中' : '低' }}</span>
      <span class="tag" :class="incident.status === 'resolved' ? 'green' : 'amber'">{{ statusLabel[incident.status] }}</span>
    </div>
    <div class="small" style="margin: 6px 0">{{ incident.detail }}</div>
    <PhotoList :photos="incident.photos" />

    <div v-if="incident.handleNote" class="handle-note small">
      <b>处理记录（{{ incident.handlerId }} · {{ incident.resolvedAt }}）：</b><br />
      {{ incident.handleNote }}
      <span v-if="incident.compensation" class="tag red" style="margin-left: 6px">赔 ¥{{ incident.compensation }}</span>
      <span v-if="incident.overtimeMinutes" class="tag amber" style="margin-left: 6px">超时 {{ incident.overtimeMinutes }} 分</span>
      <span v-if="incident.extraPeople" class="tag amber" style="margin-left: 6px">加 {{ incident.extraPeople }} 人</span>
      <span v-if="incident.cleaningExtra" class="tag blue" style="margin-left: 6px">需补清洁</span>
    </div>

    <!-- 处理操作 -->
    <div v-if="incident.status !== 'resolved'" class="inc-actions">
      <div v-if="canHandle" class="resolve-box">
        <template v-if="!showResolve">
          <button class="btn success sm" @click="showResolve = true">✔ 处理并闭环</button>
        </template>
        <template v-else>
          <!-- 类型特定字段 -->
          <div v-if="incident.type === 'damage'" class="form-row" style="margin-bottom: 8px">
            <div class="field">
              <label>关联设备</label>
              <select v-model="form.resourceId">
                <option value="">请选择受损设备</option>
                <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.name }}（当前损耗 {{ r.wear }}%）</option>
              </select>
            </div>
            <div class="field"><label>损耗增量（%）</label><input type="number" v-model.number="form.wearImpact" min="0" max="60" /></div>
            <div class="field"><label>赔偿金额（元）</label><input type="number" v-model.number="form.compensation" min="0" /></div>
          </div>
          <label v-if="incident.type === 'damage'" class="checkbox" style="padding: 2px 0">
            <input type="checkbox" v-model="form.sendToRepair" />
            <span class="small">将设备置为「维修中」，暂停后续预约分配</span>
          </label>
          <div v-if="incident.type === 'overtime'" class="field" style="max-width: 240px">
            <label>核定超时分钟数（计入验收超时费）</label>
            <input type="number" v-model.number="form.overtimeMinutes" min="0" />
          </div>
          <div v-if="incident.type === 'extra-people'" class="field" style="max-width: 240px">
            <label>临时增加人数</label>
            <input type="number" v-model.number="form.extraPeople" min="1" />
          </div>
          <label v-if="['smoke', 'mixing', 'complaint'].includes(incident.type)" class="checkbox" style="padding: 2px 0">
            <input type="checkbox" v-model="form.cleaningExtra" />
            <span class="small">需要保洁追加清洁</span>
          </label>
          <div class="field" style="margin-top: 6px"><label>处理说明<span class="req">*</span></label><textarea v-model="form.note" placeholder="处置过程、与邻里沟通结果、返工安排等"></textarea></div>
          <PhotoCapture :by="auth.currentUser!.name" @shot="addPhoto" />
          <div style="margin-top: 8px; display: flex; gap: 8px">
            <button class="btn success sm" @click="doResolve">确认闭环</button>
            <button class="btn sm" @click="showResolve = false">取消</button>
          </div>
        </template>
      </div>
      <div v-if="myRole === 'admin' || myRole === 'staff'">
        <button v-if="!showAssign" class="btn sm" @click="showAssign = true">↔ 改派</button>
        <select v-else v-model="assignOwner" @change="doAssign" style="width: 160px">
          <option value="admin">管理员</option>
          <option value="cleaner">保洁</option>
          <option value="repair">维修</option>
          <option value="staff">社区工作人员</option>
        </select>
      </div>
      <div v-if="!canHandle" class="tiny muted">该事件由「{{ kitchen.ownerLabel(incident.owner) }}」处理中</div>
    </div>
  </div>
</template>

<style scoped>
.inc-card {
  border: 1px solid var(--c-border); border-left: 4px solid var(--c-amber);
  border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; background: var(--c-surface);
}
.inc-card.resolved { border-left-color: var(--c-green); background: var(--c-surface-2); }
.inc-head { display: flex; align-items: center; gap: 10px; }
.handle-note {
  margin-top: 8px; padding: 8px 10px; background: var(--c-green-soft);
  border-radius: 6px; border: 1px solid #bfe0ca;
}
.inc-actions { margin-top: 10px; display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
.resolve-box { flex: 1; min-width: 260px; }
</style>
