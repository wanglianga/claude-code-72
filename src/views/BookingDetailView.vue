<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { useRouter } from '@/router'
import {
  ACTIVITY_RULES,
  CLEAN_REQUIREMENTS,
  INCIDENT_META,
  RESOURCE_META,
  STATUS_META,
  STORAGE_CATEGORY_META,
  STORAGE_OVERTIME_HOURS
} from '@/rules'
import type {
  IncidentOwner,
  IncidentType,
  Photo,
  ResourceType,
  StorageCategory
} from '@/types'
import BaseModal from '@/components/BaseModal.vue'
import TimelineView from '@/components/TimelineView.vue'
import PhotoCapture from '@/components/PhotoCapture.vue'
import PhotoList from '@/components/PhotoList.vue'
import IncidentCard from '@/components/IncidentCard.vue'
import AcceptanceForm from '@/components/AcceptanceForm.vue'
import StorageItemCard from '@/components/StorageItemCard.vue'
import { canViewBooking } from '@/utils/access'
import { storageAlertKind } from '@/utils/storageAlert'

const props = defineProps<{ id: string }>()
const auth = useAuthStore()
const kitchen = useKitchenStore()
const { push } = useRouter()

const b = computed(() => kitchen.bookingById(props.id))
const me = computed(() => auth.currentUser!)
const rule = computed(() => (b.value ? ACTIVITY_RULES[b.value.activityKind] : null))
const incidents = computed(() => (b.value ? kitchen.incidentsOf(b.value.id) : []))
const dispute = computed(() => (b.value ? kitchen.disputes.slice().reverse().find((d) => d.bookingId === b.value!.id) : undefined))

const isApplicant = computed(() => b.value?.applicantId === me.value.id)
const isAdmin = computed(() => me.value.role === 'admin')
const isStaff = computed(() => me.value.role === 'staff')

// 数据隔离：预约人仅可查看本人记录；保洁/维修仅可查看分派给本角色事件的预约；管理员/社区工作人员全量
const canView = computed(() =>
  b.value ? canViewBooking(b.value, me.value.role, me.value.id, kitchen.incidents) : false
)

// 暂存食材按真实超时 / 活动取消滞留分类（取消但取走时间未到不算超时）
const storageSummary = computed(() => {
  const result: { overdue: { name: string }[]; canceled: { name: string }[] } = { overdue: [], canceled: [] }
  if (!b.value) return result
  for (const s of b.value.storageItems) {
    const k = storageAlertKind(s, b.value.status)
    if (k === 'overdue') result.overdue.push({ name: s.name })
    else if (k === 'canceled') result.canceled.push({ name: s.name })
  }
  return result
})

// ---------- 弹窗状态 ----------
const showReject = ref(false)
const rejectComment = ref('')
const approveComment = ref('')
const showApproveTip = ref(false)

const showPreCheck = ref(false)
const pc = reactive({ identityOk: true, healthPromise: true, storageOk: true, equipmentOk: true, note: '' })
const pcPhotos = ref<Photo[]>([])
const selectedRes = ref<string[]>([])

const showReport = ref(false)
const rf = reactive<{ type: IncidentType; title: string; detail: string; level: 'low' | 'mid' | 'high'; owner: IncidentOwner }>({
  type: 'smoke',
  title: '',
  detail: '',
  level: 'mid',
  owner: 'admin'
})
const rfPhotos = ref<Photo[]>([])

const showStorage = ref(false)
const sf = reactive({
  name: '',
  zone: '',
  category: 'vegetable' as StorageCategory,
  label: '',
  ownerName: '',
  ownerPhone: '',
  expectedTakeAt: '20:00'
})
const sfErr = ref('')

function openStorage() {
  if (!b.value) return
  sf.name = ''
  sf.zone = ''
  sf.category = 'vegetable'
  sf.label = ''
  sf.ownerName = b.value.contactName
  sf.ownerPhone = b.value.contactPhone
  sf.expectedTakeAt = b.value.endAt
  sfErr.value = ''
  showStorage.value = true
}

const showAccept = ref(false)
const showDispute = ref(false)
const df = reactive({ reason: '', claim: 0 })
const showMediate = ref(false)
const mf = reactive({ outcome: 'adjusted' as 'upheld' | 'adjusted' | 'rejected', adjustedDeduction: 0, note: '' })

const showPublicity = ref(false)
const pf = reactive({ title: '', summary: '', board: true })
const restrictNote = ref('')

// ---------- 资源分配候选 ----------
const neededResources = computed(() => {
  if (!b.value) return []
  return b.value.equipmentNeeds.map((t: ResourceType) => ({
    type: t,
    meta: RESOURCE_META[t],
    list: kitchen.resources.filter((r) => r.type === t)
  }))
})

function busyText(rid: string): string {
  if (!b.value) return ''
  const busy = kitchen.resourceBusyAt(rid, b.value.date, b.value.startAt, b.value.endAt, b.value.id)
  return busy ? '该时段已被占用' : ''
}

function openPreCheck() {
  pc.identityOk = true
  pc.healthPromise = true
  pc.storageOk = true
  pc.equipmentOk = true
  pc.note = ''
  pcPhotos.value = []
  // 默认勾选：每种需求类型挑第一个不冲突的可用设备
  const pre: string[] = []
  for (const g of neededResources.value) {
    const candidate = g.list.find((r) => r.status === 'ok' && !busyText(r.id))
    if (candidate) pre.push(candidate.id)
  }
  selectedRes.value = b.value!.allocatedResourceIds.length ? [...b.value!.allocatedResourceIds] : pre
  showPreCheck.value = true
}

function doPassPreCheck() {
  if (!b.value) return
  const alloc = kitchen.allocate(b.value, selectedRes.value)
  if (!alloc.ok) {
    alert(alloc.msg)
    return
  }
  const r = kitchen.passPreCheck(b.value, me.value.name, {
    identityOk: pc.identityOk,
    healthPromise: pc.healthPromise,
    storageOk: pc.storageOk,
    equipmentOk: pc.equipmentOk,
    note: pc.note,
    photos: pcPhotos.value
  })
  if (!r.ok) {
    alert(r.msg)
    return
  }
  showPreCheck.value = false
}

// ---------- 审批 ----------
function canApproveNow(): boolean {
  if (!b.value) return false
  if (rule.value!.approveRole !== me.value.role) return false
  return b.value.foodSafetyAck && (b.value.depositFree || b.value.depositPaid)
}
function doApprove() {
  if (!b.value) return
  const r = kitchen.approve(b.value, me.value.role, me.value.name, approveComment.value)
  if (!r.ok) alert(r.msg)
  else showApproveTip.value = false
}
function doReject() {
  if (!b.value || !rejectComment.value.trim()) return
  kitchen.reject(b.value, me.value.name, rejectComment.value.trim())
  showReject.value = false
  rejectComment.value = ''
}

// ---------- 上报事件 ----------
function onTypeChange() {
  const m = INCIDENT_META[rf.type]
  rf.owner = m.defaultOwner
  rf.level = m.level
  rf.title = rf.title || m.label
}
function doReport() {
  if (!b.value || !rf.title.trim() || !rf.detail.trim()) {
    alert('请填写事件标题与详情')
    return
  }
  kitchen.reportIncident(b.value.id, {
    type: rf.type,
    title: rf.title.trim(),
    detail: rf.detail.trim(),
    level: rf.level,
    reportedBy: me.value.name,
    owner: rf.owner,
    photos: rfPhotos.value
  })
  showReport.value = false
  rf.title = ''
  rf.detail = ''
  rfPhotos.value = []
}

// ---------- 食材 ----------
function doPutStorage() {
  if (!b.value) return
  const r = kitchen.putStorage(
    b.value,
    {
      name: sf.name,
      zone: sf.zone,
      category: sf.category,
      label: sf.label,
      ownerName: sf.ownerName,
      ownerPhone: sf.ownerPhone,
      expectedTakeAt: sf.expectedTakeAt
    },
    me.value.name
  )
  if (!r.ok) {
    sfErr.value = r.msg ?? '入库失败'
    return
  }
  showStorage.value = false
}

// ---------- 争议 ----------
function doRaiseDispute() {
  if (!b.value || !df.reason.trim() || df.claim <= 0) {
    alert('请填写争议理由与主张退还金额')
    return
  }
  kitchen.raiseDispute(b.value, df.reason.trim(), Number(df.claim), me.value.name)
  showDispute.value = false
  df.reason = ''
  df.claim = 0
}
function openMediate() {
  if (!dispute.value || !b.value?.depositResult) return
  mf.outcome = 'adjusted'
  mf.adjustedDeduction = b.value.depositResult.deduction
  mf.note = ''
  showMediate.value = true
}
function doMediate() {
  if (!dispute.value || !mf.note.trim()) {
    alert('请填写调解意见')
    return
  }
  kitchen.mediateDispute(dispute.value, mf.outcome, me.value.name, mf.note.trim(), Number(mf.adjustedDeduction))
  showMediate.value = false
}

// ---------- 公示 ----------
function openPublicity() {
  if (!b.value) return
  pf.title = b.value.publicity?.title ?? `${b.value.title} · 活动公示`
  pf.summary = b.value.publicity?.summary ?? ''
  pf.board = b.value.publicity?.board ?? true
  showPublicity.value = true
}
function doPublish() {
  if (!b.value || !pf.title.trim() || !pf.summary.trim()) return
  kitchen.publish(b.value, { title: pf.title.trim(), summary: pf.summary.trim(), board: pf.board }, me.value.name)
  showPublicity.value = false
}

function toggleRestrict() {
  if (!b.value) return
  if (!b.value.restricted) {
    const reason = restrictNote.value.trim() || prompt('请填写限制后续预约的原因（如：多次验收不合格/设备人为损坏）')
    if (!reason) return
    kitchen.setRestriction(b.value, true, reason, me.value.name)
    restrictNote.value = ''
  } else {
    kitchen.setRestriction(b.value, false, '', me.value.name)
  }
}
</script>

<template>
  <div v-if="!b" class="empty">
    预约不存在或已被重置。<a @click="push('/bookings')">返回列表</a>
  </div>
  <div v-else-if="!canView" class="forbidden card">
    <div class="fb-emoji">🚫</div>
    <h2>无权访问该预约记录</h2>
    <p class="muted">
      该预约（<span class="mono">{{ b.code }}</span>）不属于你的账号。为保护负责人电话、食材、押金等敏感资料，
      系统按角色隔离记录：
    </p>
    <ul class="fb-rules">
      <li><b>居民 / 社团账号</b>：只能查看<b>本人发起</b>的预约完整记录，直接输入他人预约编号无法查看；</li>
      <li><b>保洁 / 维修</b>：仅能查看分派给本角色处理的事件所关联的预约；</li>
      <li><b>厨房管理员 / 社区工作人员</b>：因核验、验收、审批与调解职责可查看全部记录。</li>
    </ul>
    <p class="small muted">如确需了解该活动，请联系厨房管理员或在协作任务台中查看分派给你的任务。</p>
    <div style="margin-top: 12px; display: flex; gap: 10px">
      <button class="btn primary" @click="push('/bookings')">返回预约记录</button>
      <button class="btn" @click="push('/dashboard')">返回工作台</button>
    </div>
  </div>
  <div v-else>
    <!-- 头部 -->
    <div class="head-row">
      <div>
        <div class="tiny muted mono">{{ b.code }}</div>
        <h1 style="margin: 2px 0 6px">
          {{ b.title }}
          <span class="tag" :class="rule!.color">{{ rule!.label }}</span>
          <span class="tag" :class="STATUS_META[b.status].color">{{ STATUS_META[b.status].label }}</span>
          <span v-if="b.restricted" class="tag red">已限制后续预约</span>
        </h1>
        <div class="small muted">{{ b.date }} {{ b.startAt }}–{{ b.endAt }} · {{ b.orgName ? b.orgName + ' ·' : '' }} 负责人 {{ b.contactName }} {{ b.contactPhone }}</div>
      </div>
      <div style="display: flex; gap: 8px; flex-shrink: 0">
        <button class="btn" @click="push('/bookings')">返回列表</button>
        <button v-if="['pending', 'approved'].includes(b.status) && (isApplicant || isAdmin)" class="btn danger sm" @click="kitchen.cancel(b, me.name)">取消预约</button>
      </div>
    </div>

    <!-- 活动规则差异 -->
    <div class="card">
      <div class="card-title"><h2>⚖️ 本活动适用规则（{{ rule!.label }}）</h2></div>
      <div class="grid grid-4">
        <div><div class="tiny muted">押金</div><div><b v-if="b.depositFree" class="green">公益免押 ¥0</b><b v-else>¥{{ b.depositRequired }}</b></div></div>
        <div><div class="tiny muted">审批角色</div><div>{{ rule!.approveRole === 'staff' ? '社区工作人员' : '厨房管理员' }}</div></div>
        <div><div class="tiny muted">单次时长上限</div><div>{{ rule!.maxHours }} 小时</div></div>
        <div><div class="tiny muted">当前预约人</div><div>{{ b.peopleCount }} 人</div></div>
      </div>
      <hr class="divider" />
      <div class="kv" style="grid-template-columns: 96px 1fr">
        <div class="k">清洁规则</div><div class="small">{{ rule!.cleaningRule }}</div>
        <div class="k">公示规则</div><div class="small">{{ rule!.publicityRule }}</div>
        <div class="k">食安告知</div><div class="small">{{ rule!.noticeRule }}</div>
      </div>
    </div>

    <div class="detail-grid">
      <div class="col-main">
        <!-- 预约信息 -->
        <div class="card">
          <div class="card-title"><h2>📝 预约登记信息</h2></div>
          <div class="kv">
            <div class="k">预约主体</div><div>{{ b.applicantKind === 'org' ? '社团/公益组织' : '居民' }}<span v-if="b.orgName">：{{ b.orgName }}</span></div>
            <div class="k">使用人数</div><div class="mono">{{ b.peopleCount }} 人</div>
            <div class="k">烹饪类型</div><div>{{ b.cookingTypes.join('、') }}</div>
            <div class="k">是否油炸</div>
            <div><span :class="b.isFrying ? 'tag red' : 'tag green'">{{ b.isFrying ? '是 · 执行油炸专项标准' : '否' }}</span></div>
            <div class="k">食材暂存</div>
            <div>{{ b.storageNeeded ? '需要' : '不需要' }}<span v-if="b.storageNote" class="muted">：{{ b.storageNote }}</span></div>
            <div class="k">设备需求</div><div>{{ b.equipmentNeeds.map((t) => RESOURCE_META[t].label).join('、') }}</div>
            <div class="k">活动性质</div><div class="small">{{ b.natureNote || '—' }}</div>
            <div class="k">食安告知</div>
            <div>
              <span v-if="b.foodSafetyAck" class="tag green">已签署 · {{ b.foodSafetyAckAt }}</span>
              <span v-else class="tag amber">未签署</span>
            </div>
          </div>
        </div>

        <!-- 待审批操作 -->
        <div v-if="b.status === 'pending'" class="card action-card">
          <div class="card-title"><h2>📝 审批</h2></div>
          <template v-if="rule!.approveRole === me.role">
            <div v-if="!b.foodSafetyAck" class="banner warn"><span>⚠️</span><div class="bx">预约人尚未签署食品安全告知书，暂不能批准。</div></div>
            <div v-if="!b.depositFree && !b.depositPaid" class="banner warn"><span>💰</span><div class="bx">押金 ¥{{ b.depositRequired }} 尚未缴纳，暂不能批准。</div></div>
            <div class="field"><label>审批意见</label><input v-model="approveComment" placeholder="同意 / 注意事项" /></div>
            <div style="display: flex; gap: 10px">
              <button class="btn success" :disabled="!canApproveNow()" @click="doApprove">✔ 审批通过</button>
              <button class="btn danger" @click="showReject = true">✕ 驳回</button>
            </div>
            <div v-if="!canApproveNow() && (b.foodSafetyAck && (b.depositFree || b.depositPaid)) === false" class="hint"></div>
          </template>
          <div v-else class="muted small">
            本类型活动由<b>{{ rule!.approveRole === 'staff' ? '社区工作人员' : '厨房管理员' }}</b>审批，请等待处理。
          </div>
          <div v-if="isApplicant" style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap">
            <button v-if="!b.foodSafetyAck" class="btn primary" @click="kitchen.ackFoodSafety(b, me.name)">📄 签署食品安全告知书</button>
            <button v-if="!b.depositFree && !b.depositPaid" class="btn primary" @click="kitchen.payDeposit(b, me.name)">💰 缴纳押金 ¥{{ b.depositRequired }}</button>
          </div>
        </div>

        <!-- 已批准：使用前核验 + 资源 -->
        <div v-if="['approved', 'checked', 'closing', 'completed'].includes(b.status)" class="card">
          <div class="card-title">
            <h2>🍳 分配资源与清洁要求</h2>
            <button v-if="isAdmin && b.status === 'approved'" class="btn primary sm" style="margin-left: auto" @click="openPreCheck">
              🗝️ 使用前核验并分配资源
            </button>
          </div>

          <!-- 使用前核验结果 -->
          <div v-if="b.preCheck" class="precheck-grid">
            <div class="pc-item" :class="b.preCheck.identityOk ? 'ok' : 'bad'"><span>{{ b.preCheck.identityOk ? '✔' : '✕' }}</span> 预约人身份</div>
            <div class="pc-item" :class="b.preCheck.healthPromise ? 'ok' : 'bad'"><span>{{ b.preCheck.healthPromise ? '✔' : '✕' }}</span> 健康承诺</div>
            <div class="pc-item" :class="b.preCheck.storageOk ? 'ok' : 'warn'"><span>{{ b.preCheck.storageOk ? '✔' : '!' }}</span> 食材存放</div>
            <div class="pc-item" :class="b.preCheck.equipmentOk ? 'ok' : 'bad'"><span>{{ b.preCheck.equipmentOk ? '✔' : '✕' }}</span> 设备状态</div>
          </div>
          <div v-if="b.preCheck" class="small muted" style="margin: 6px 0">
            核验人 {{ b.preCheck.checkerId }} · {{ b.preCheck.at }}
            <span v-if="b.preCheck.note">：{{ b.preCheck.note }}</span>
          </div>
          <PhotoList v-if="b.preCheck" :photos="b.preCheck.photos" />

          <!-- 已分配资源（预约成功后展示的灶台/烤箱/冰箱...） -->
          <div v-if="b.allocatedResourceIds.length" style="margin-top: 12px">
            <div class="res-grid">
              <div v-for="rid in b.allocatedResourceIds" :key="rid" class="res-chip">
                <span style="font-size: 17px">{{ RESOURCE_META[kitchen.resources.find((r) => r.id === rid)?.type ?? 'stove'].icon }}</span>
                <div>
                  <b class="small">{{ kitchen.resources.find((r) => r.id === rid)?.name }}</b>
                  <div class="tiny muted">{{ kitchen.resources.find((r) => r.id === rid)?.location }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="b.status === 'approved'" class="small muted" style="margin-top: 8px">尚未分配具体设备，使用前核验时由管理员分配并校验时段冲突。</div>

          <!-- 清洁要求 -->
          <details class="clean-req" :open="b.status === 'approved'">
            <summary class="small" style="cursor: pointer; margin-top: 10px"><b>🧹 使用与清洁要求（7 项，结束逐项验收）</b></summary>
            <ul class="req-list">
              <li v-for="c in CLEAN_REQUIREMENTS" :key="c.key" class="small">{{ c.icon }} {{ c.text }}</li>
            </ul>
          </details>
        </div>

        <!-- 食材暂存 -->
        <div v-if="b.storageNeeded && ['approved', 'checked', 'closing', 'completed', 'canceled'].includes(b.status)" class="card">
          <div class="card-title">
            <h2>🧊 食材暂存与超时处置</h2>
            <button
              v-if="['approved', 'checked'].includes(b.status) && (isAdmin || isApplicant)"
              class="btn sm"
              style="margin-left: auto"
              @click="openStorage"
            >➕ 食材入库</button>
          </div>

          <StorageItemCard
            v-for="s in b.storageItems"
            :key="s.id"
            :item="s"
            :booking="b"
          />
          <div v-if="!b.storageItems.length" class="small muted">暂无暂存记录。入库时必须登记格位、标签、负责人与预计取走时间。</div>

          <!-- 超时/取消滞留汇总提示 -->
          <div
            v-for="kind in ['overdue', 'canceled']"
            :key="kind"
            v-show="storageSummary[kind as 'overdue' | 'canceled'].length"
            class="banner"
            :class="kind === 'overdue' ? 'warn' : 'info'"
            style="margin-top: 12px"
          >
            <span>{{ kind === 'overdue' ? '⏰' : '🚫' }}</span>
            <div class="bx">
              <template v-if="kind === 'overdue'">
                存在真实超时未取食材（{{ storageSummary.overdue.map((s) => s.name).join('、') }}）：管理员请先<b>通知负责人</b>，再转为待处理或完成处置；
                肉类/海鲜必须按食品安全规则<b>报废或取回</b>。处置费计入押金，公益课堂可豁免。验收前所有在库食材必须已取走或处置完毕。
              </template>
              <template v-else>
                活动已取消，下列食材滞留库中（{{ storageSummary.canceled.map((s) => s.name).join('、') }}）：预计取走时间尚未到，<b>不计超时</b>，
                请通知负责人提前取回或完成处置，避免到期后转为真实超时。
              </template>
            </div>
          </div>
        </div>

        <!-- 使用中事件：多角色围绕同一记录协作 -->
        <div v-if="['checked', 'closing', 'completed'].includes(b.status)" class="card">
          <div class="card-title">
            <h2>⚠️ 使用中事件协同</h2>
            <button v-if="b.status === 'checked'" class="btn danger sm" style="margin-left: auto" @click="showReport = true">➕ 上报事件</button>
          </div>
          <div class="small muted" style="margin-bottom: 10px">
            油烟过大 → 管理员；设备损坏 → 维修定损；邻里投诉 → 社区工作人员；食材混放 → 保洁；临时加人 / 超时 → 管理员。所有角色围绕同一次使用记录处理。
          </div>
          <IncidentCard v-for="i in incidents" :key="i.id" :incident="i" />
          <div v-if="!incidents.length" class="small green">✔ 暂无事件，使用过程平稳。</div>

          <div v-if="b.status === 'checked'" style="margin-top: 12px">
            <button v-if="isApplicant || isAdmin" class="btn primary" @click="kitchen.finishUsing(b, me.name)">
              🏁 活动结束，提交验收
            </button>
          </div>
        </div>

        <!-- 逐项验收 -->
        <div v-if="b.status === 'closing' || b.acceptance" class="card">
          <div class="card-title">
            <h2>🧾 结束验收（七项逐项）</h2>
            <button v-if="b.status === 'closing' && isAdmin" class="btn primary sm" style="margin-left: auto" @click="showAccept = true">
              开始逐项验收
            </button>
          </div>

          <AcceptanceForm v-if="showAccept" :booking="b" @done="showAccept = false" @cancel="showAccept = false" />

          <template v-else-if="b.acceptance">
            <div class="small muted" style="margin-bottom: 8px">验收人 {{ b.acceptance.checkerId }} · {{ b.acceptance.at }}</div>
            <table class="data">
              <thead><tr><th>验收项</th><th>结果</th><th>说明 / 照片</th></tr></thead>
              <tbody>
                <tr v-for="it in b.acceptance.items" :key="it.key">
                  <td><b>{{ it.label }}</b></td>
                  <td>
                    <span class="tag" :class="it.result === 'pass' ? 'green' : it.result === 'redirty' ? 'amber' : 'red'">
                      {{ it.result === 'pass' ? '合格' : it.result === 'redirty' ? '需补清洁' : '不合格' }}
                    </span>
                  </td>
                  <td>
                    <span class="small">{{ it.note || '—' }}</span>
                    <PhotoList :photos="it.photos" />
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="grid grid-3" style="margin-top: 10px">
              <div class="mini-stat"><div class="num">{{ b.acceptance.overtimeMinutes }}</div><div class="lbl">超时（分钟）</div></div>
              <div class="mini-stat"><div class="num">{{ b.acceptance.cleaningExtraMinutes }}</div><div class="lbl">补清洁工时（分钟）</div></div>
              <div class="mini-stat">
                <div class="num" :class="b.acceptance.items.some((i) => i.result !== 'pass') ? 'red' : 'green'">
                  {{ b.acceptance.items.filter((i) => i.result === 'pass').length }}/7
                </div>
                <div class="lbl">合格项</div>
              </div>
            </div>
            <div v-if="b.acceptance.overallComment" class="small" style="margin-top: 8px">📝 {{ b.acceptance.overallComment }}</div>
          </template>
        </div>

        <!-- 押金决定与争议 -->
        <div v-if="b.depositResult" class="card">
          <div class="card-title"><h2>💰 押金处理</h2></div>
          <template v-if="b.depositFree">
            <div class="banner ok"><span>💚</span><div class="bx"><b>公益免押活动</b>，无押金结算。{{ b.depositResult.reasons.join('；') }}</div></div>
          </template>
          <template v-else>
            <div class="deposit-line">
              <span class="tag" :class="b.depositResult.decision === 'full-refund' ? 'green' : b.depositResult.decision === 'forfeit' ? 'red' : 'amber'">
                {{ { 'full-refund': '全额退还', partial: '部分扣费', forfeit: '没收押金', none: '免押' }[b.depositResult.decision] }}
              </span>
              <b class="mono">押金 ¥{{ b.depositRequired }} → 扣费 ¥{{ b.depositResult.deduction }}，退还 ¥{{ b.depositRequired - b.depositResult.deduction }}</b>
            </div>
            <ul v-if="b.depositResult.reasons.length" class="reason-list">
              <li v-for="(r, i) in b.depositResult.reasons" :key="i" class="small">{{ r }}</li>
            </ul>
          </template>
          <div class="small muted">决定人 {{ b.depositResult.decidedBy }} · {{ b.depositResult.decidedAt }}</div>

          <!-- 争议 -->
          <div v-if="dispute" class="dispute-box">
            <div class="db-head">
              <span class="tag purple">押金争议</span>
              <span class="tag" :class="dispute.status === 'rejected' ? 'red' : dispute.status === 'adjusted' || dispute.status === 'upheld' ? 'green' : 'amber'">
                {{ { open: '待调解', mediating: '调解中', upheld: '主张成立', adjusted: '已调整扣费', rejected: '维持原决定' }[dispute.status] }}
              </span>
            </div>
            <div class="small"><b>{{ dispute.raisedBy }}</b>（{{ dispute.raisedAt }}）主张退还 ¥{{ dispute.claimAmount }}：{{ dispute.reason }}</div>
            <div v-if="dispute.resultNote" class="small" style="margin-top: 6px">📣 调解人 {{ dispute.mediatorId }} · {{ dispute.resolvedAt }}：{{ dispute.resultNote }}</div>
            <button v-if="['open', 'mediating'].includes(dispute.status) && isStaff" class="btn primary sm" style="margin-top: 8px" @click="openMediate">社区调解</button>
          </div>
          <button
            v-else-if="isApplicant && b.depositResult.deduction > 0 && !b.depositFree"
            class="btn sm"
            style="margin-top: 10px"
            @click="showDispute = true"
          >
            ⚖️ 对扣费有异议，提出押金争议
          </button>

          <!-- 限制后续预约 -->
          <div v-if="b.status === 'completed' && isAdmin" style="margin-top: 12px">
            <button v-if="!b.restricted" class="btn danger sm" @click="toggleRestrict">🚫 限制该负责人后续预约</button>
            <button v-else class="btn sm" @click="toggleRestrict">解除预约限制</button>
            <div v-if="b.restricted" class="tiny red" style="margin-top: 4px">限制原因：{{ b.restrictReason }}</div>
          </div>
        </div>

        <!-- 公示 -->
        <div class="card">
          <div class="card-title">
            <h2>📢 社区公示</h2>
            <button v-if="(isStaff || isAdmin) && b.status !== 'rejected' && b.status !== 'canceled'" class="btn sm" style="margin-left: auto" @click="openPublicity">
              {{ b.publicity?.published ? '更新公示' : '发布公示' }}
            </button>
          </div>
          <div v-if="b.publicity?.published" class="publicity-box">
            <div><b>{{ b.publicity.title }}</b> <span v-if="b.publicity.board" class="tag blue">已上公示栏</span></div>
            <div class="small" style="margin: 6px 0">{{ b.publicity.summary }}</div>
            <div class="tiny muted">发布人 {{ b.publicity.by }} · {{ b.publicity.publishedAt }}</div>
            <div v-if="b.publicity.feedback" class="small" style="margin-top: 6px">💬 邻里反馈：{{ b.publicity.feedback }}</div>
          </div>
          <div v-else class="small muted">
            按本活动规则：{{ rule!.publicityRule }}
          </div>
        </div>
      </div>

      <!-- 右侧时间线 -->
      <div class="col-side">
        <div class="card">
          <div class="card-title"><h3>🕘 使用全过程记录</h3></div>
          <TimelineView :entries="b.timeline" />
        </div>
      </div>
    </div>

    <!-- ======== 弹窗 ======== -->
    <BaseModal v-if="showReject" title="驳回预约" @close="showReject = false">
      <div class="modal-body">
        <div class="field"><label>驳回原因<span class="req">*</span></label><textarea v-model="rejectComment" placeholder="如：材料不齐 / 时段冲突 / 商业资质待补"></textarea></div>
      </div>
      <template #footer>
        <button class="btn" @click="showReject = false">取消</button>
        <button class="btn danger" @click="doReject">确认驳回</button>
      </template>
    </BaseModal>

    <BaseModal v-if="showPreCheck" title="使用前核验 · 资源分配" wide @close="showPreCheck = false">
      <div class="modal-body">
        <div class="banner info"><span>🗝️</span><div class="bx">逐项核验 <b>预约人身份 / 健康承诺 / 食材存放 / 设备状态</b>，并分配本次使用的具体设备（自动校验同时段冲突与维修状态）。</div></div>
        <div class="check-grid">
          <label class="checkbox"><input type="checkbox" v-model="pc.identityOk" /><span>预约人身份与预约信息一致</span></label>
          <label class="checkbox"><input type="checkbox" v-model="pc.healthPromise" /><span>健康承诺已签署（无发热/腹泻等症状）</span></label>
          <label class="checkbox"><input type="checkbox" v-model="pc.storageOk" /><span>食材来源/标签/存放温区符合要求</span></label>
          <label class="checkbox"><input type="checkbox" v-model="pc.equipmentOk" /><span>所需设备状态正常、可安全使用</span></label>
        </div>
        <div class="field" style="margin-top: 6px"><label>核验备注</label><input v-model="pc.note" /></div>

        <h3 style="margin: 14px 0 8px">分配设备</h3>
        <div v-for="g in neededResources" :key="g.type" class="alloc-group">
          <div class="small" style="margin-bottom: 4px"><b>{{ g.meta.icon }} {{ g.meta.label }}</b></div>
          <label v-for="r in g.list" :key="r.id" class="alloc-opt" :class="{ disabled: r.status === 'repairing' || !!busyText(r.id) }">
            <input
              type="checkbox"
              :value="r.id"
              v-model="selectedRes"
              :disabled="r.status === 'repairing' || !!busyText(r.id)"
            />
            <span>
              {{ r.name }}
              <span v-if="r.status === 'repairing'" class="tag red">维修中</span>
              <span v-else-if="busyText(r.id)" class="tag amber">{{ busyText(r.id) }}</span>
              <span v-else class="tag green">可分配</span>
              <span class="tiny muted">损耗 {{ r.wear }}%</span>
            </span>
          </label>
        </div>
        <h3 style="margin: 14px 0 8px">活动前检查拍照</h3>
        <PhotoCapture :by="me.name" @shot="(p) => pcPhotos.push(p)" />
        <div style="margin-top: 8px"><PhotoList :photos="pcPhotos" /></div>
      </div>
      <template #footer>
        <button class="btn" @click="showPreCheck = false">取消</button>
        <button class="btn success" @click="doPassPreCheck">核验通过，开始使用</button>
      </template>
    </BaseModal>

    <BaseModal v-if="showReport" title="上报使用中事件" wide @close="showReport = false">
      <div class="modal-body">
        <div class="form-row">
          <div class="field">
            <label>事件类型<span class="req">*</span></label>
            <select v-model="rf.type" @change="onTypeChange">
              <option v-for="(m, k) in INCIDENT_META" :key="k" :value="k">{{ m.icon }} {{ m.label }}（默认：{{ kitchen.ownerLabel(m.defaultOwner) }}）</option>
            </select>
          </div>
          <div class="field">
            <label>优先级</label>
            <select v-model="rf.level">
              <option value="low">低</option><option value="mid">中</option><option value="high">高</option>
            </select>
          </div>
          <div class="field">
            <label>指派角色</label>
            <select v-model="rf.owner">
              <option value="admin">管理员</option><option value="cleaner">保洁</option>
              <option value="repair">维修</option><option value="staff">社区工作人员</option>
            </select>
          </div>
        </div>
        <div class="field"><label>标题<span class="req">*</span></label><input v-model="rf.title" /></div>
        <div class="field"><label>详情<span class="req">*</span></label><textarea v-model="rf.detail" placeholder="发生时间、现场情况、邻里诉求、是否已临时处置"></textarea></div>
        <h3 style="margin: 10px 0 6px">现场拍照</h3>
        <PhotoCapture :by="me.name" @shot="(p) => rfPhotos.push(p)" />
        <div style="margin-top: 8px"><PhotoList :photos="rfPhotos" /></div>
      </div>
      <template #footer>
        <button class="btn" @click="showReport = false">取消</button>
        <button class="btn danger" @click="doReport">上报并通知处理角色</button>
      </template>
    </BaseModal>

    <BaseModal v-if="showStorage" title="食材入库暂存（登记格位/标签/负责人）" wide @close="showStorage = false">
      <div class="modal-body">
        <div class="banner info"><span>🧊</span><div class="bx">入库即视为开始暂存计时：系统按「预计取走时间」超时 <b>{{ STORAGE_OVERTIME_HOURS }} 小时</b> 提醒管理员通知负责人；肉类/海鲜超时将按食品安全规则报废或取回。</div></div>
        <div class="form-row">
          <div class="field" style="flex: 2"><label>食材名称 / 数量<span class="req">*</span></label><input v-model="sf.name" placeholder="如：冷冻虾仁 1.5kg" /></div>
          <div class="field"><label>食材类别<span class="req">*</span></label>
            <select v-model="sf.category">
              <option v-for="(m, k) in STORAGE_CATEGORY_META" :key="k" :value="k">{{ m.icon }} {{ m.label }}</option>
            </select>
          </div>
        </div>
        <div class="field"><label>存放格位<span class="req">*</span></label><input v-model="sf.zone" placeholder="如：冷冻柜B-2层（生熟分层）" /></div>
        <div class="form-row">
          <div class="field"><label>负责人姓名<span class="req">*</span></label><input v-model="sf.ownerName" /></div>
          <div class="field"><label>负责人电话<span class="req">*</span></label><input v-model="sf.ownerPhone" /></div>
          <div class="field"><label>预计取走时间<span class="req">*</span></label><input type="time" v-model="sf.expectedTakeAt" /></div>
        </div>
        <div class="field"><label>入库标签内容</label>
          <input v-model="sf.label" :placeholder="`留空自动生成：${sf.name || '食材'} / ${sf.ownerName} ${sf.ownerPhone} / ${b.date}`" />
          <div class="hint">标签须含食材、负责人、日期/电话，张贴于包装外部。</div>
        </div>
        <div v-if="sfErr" class="error-text">{{ sfErr }}</div>
      </div>
      <template #footer>
        <button class="btn" @click="showStorage = false">取消</button>
        <button class="btn primary" @click="doPutStorage">登记入库</button>
      </template>
    </BaseModal>

    <BaseModal v-if="showDispute" title="提出押金争议" @close="showDispute = false">
      <div class="modal-body">
        <div class="banner info"><span>⚖️</span><div class="bx">争议将由<b>社区工作人员</b>调解，可结合使用前/验收照片核定责任。</div></div>
        <div class="field"><label>争议理由<span class="req">*</span></label><textarea v-model="df.reason" placeholder="对哪一项扣费不认可、依据是什么"></textarea></div>
        <div class="field"><label>主张退还金额（元）<span class="req">*</span></label><input type="number" min="1" :max="b.depositResult?.deduction" v-model.number="df.claim" /></div>
      </div>
      <template #footer>
        <button class="btn" @click="showDispute = false">取消</button>
        <button class="btn primary" @click="doRaiseDispute">提交争议</button>
      </template>
    </BaseModal>

    <BaseModal v-if="showMediate" title="社区调解押金争议" @close="showMediate = false">
      <div class="modal-body">
        <div class="field">
          <label>调解结果<span class="req">*</span></label>
          <select v-model="mf.outcome">
            <option value="adjusted">调整扣费金额</option>
            <option value="upheld">预约人主张成立（全额退还扣费）</option>
            <option value="rejected">维持原扣费</option>
          </select>
        </div>
        <div v-if="mf.outcome === 'adjusted'" class="field">
          <label>调整后扣费金额（元，原 ¥{{ b.depositResult?.deduction }}）</label>
          <input type="number" min="0" :max="b.depositResult?.deduction" v-model.number="mf.adjustedDeduction" />
        </div>
        <div class="field"><label>调解意见<span class="req">*</span></label><textarea v-model="mf.note" placeholder="责任划分依据、照片佐证、协商结果"></textarea></div>
      </div>
      <template #footer>
        <button class="btn" @click="showMediate = false">取消</button>
        <button class="btn primary" @click="doMediate">出具调解结果</button>
      </template>
    </BaseModal>

    <BaseModal v-if="showPublicity" title="发布社区公示" @close="showPublicity = false">
      <div class="modal-body">
        <div class="field"><label>公示标题<span class="req">*</span></label><input v-model="pf.title" /></div>
        <div class="field"><label>公示摘要<span class="req">*</span></label><textarea v-model="pf.summary" placeholder="活动内容、参与人数、卫生验收结果、（商业活动）收费性质"></textarea></div>
        <label class="checkbox"><input type="checkbox" v-model="pf.board" /><span>同步到线下社区公示栏</span></label>
      </div>
      <template #footer>
        <button class="btn" @click="showPublicity = false">取消</button>
        <button class="btn primary" @click="doPublish">发布</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
.detail-grid { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; }
.col-side { position: sticky; top: 76px; }
@media (max-width: 980px) { .detail-grid { grid-template-columns: 1fr; } .col-side { position: static; } }
.precheck-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.pc-item { border: 1px solid var(--c-border); border-radius: 7px; padding: 8px 10px; font-size: 12.5px; text-align: center; }
.pc-item.ok { background: var(--c-green-soft); border-color: #bfe0ca; }
.pc-item.bad { background: var(--c-red-soft); border-color: #f0c2bc; }
.pc-item.warn { background: var(--c-amber-soft); border-color: #ecd9ae; }
.res-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
.res-chip { display: flex; gap: 8px; align-items: center; border: 1px solid var(--c-border); border-radius: 8px; padding: 8px 10px; background: var(--c-surface-2); }
.req-list { margin: 8px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.mini-stat { text-align: center; border: 1px solid var(--c-border); border-radius: 8px; padding: 10px; background: var(--c-surface-2); }
.mini-stat .num { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.mini-stat .lbl { font-size: 11.5px; color: var(--c-text-2); }
.deposit-line { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
.reason-list { margin: 6px 0; padding-left: 18px; }
.dispute-box { margin-top: 12px; border: 1px solid #d4c4e6; background: var(--c-purple-soft); border-radius: 8px; padding: 10px 12px; }
.db-head { display: flex; gap: 8px; margin-bottom: 6px; }
.publicity-box { border: 1px solid #b9d3e5; background: var(--c-blue-soft); border-radius: 8px; padding: 10px 12px; }
.check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
.alloc-group { margin-bottom: 10px; }
.alloc-opt { display: flex; gap: 8px; align-items: center; padding: 5px 8px; border: 1px solid var(--c-border); border-radius: 6px; margin-bottom: 4px; cursor: pointer; }
.alloc-opt.disabled { opacity: .45; cursor: not-allowed; }
.alloc-opt input { width: auto; }
.action-card { border-left: 4px solid var(--c-brand); }
.forbidden {
  max-width: 620px; margin: 40px auto; text-align: center; padding: 36px 28px;
}
.forbidden .fb-emoji { font-size: 44px; margin-bottom: 8px; }
.forbidden .fb-rules {
  text-align: left; display: inline-block; margin: 8px auto 12px; padding-left: 20px;
  color: var(--c-text-2); font-size: 13px;
}
.forbidden .fb-rules li { margin-bottom: 6px; }
</style>
