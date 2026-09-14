<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { useRouter } from '@/router'
import { ACTIVITY_RULES, ROLE_META, STATUS_META } from '@/rules'

const auth = useAuthStore()
const kitchen = useKitchenStore()
const { push } = useRouter()
const user = computed(() => auth.currentUser!)
const role = computed(() => user.value.role)

const myBookings = computed(() =>
  kitchen.bookings.filter((b) => b.applicantId === user.value.id).slice(0, 5)
)
const toApprove = computed(() =>
  kitchen.bookings.filter(
    (b) => b.status === 'pending' && ACTIVITY_RULES[b.activityKind].approveRole === role.value
  )
)
const toCheck = computed(() => kitchen.bookings.filter((b) => b.status === 'approved' && role.value === 'admin'))
const toAccept = computed(() => kitchen.bookings.filter((b) => b.status === 'closing' && role.value === 'admin'))
const myIncidents = computed(() =>
  kitchen.openIncidents.filter((i) => i.owner === role.value)
)
const myDisputes = computed(() =>
  role.value === 'staff' ? kitchen.openDisputes : []
)

const stats = computed(() => [
  { num: kitchen.activeBookings.length, lbl: '进行中/待验收预约', icon: '🍲' },
  { num: kitchen.pendingBookings.length, lbl: '待审批申请', icon: '📝' },
  { num: kitchen.openIncidents.length, lbl: '未闭环事件', icon: '⚠️' },
  { num: kitchen.repairingResources.length, lbl: '维修中设备', icon: '🔧' }
])

const greetings: Record<string, string> = {
  resident: '欢迎回来，负责人。这里可以发起预约、跟进使用中的问题与押金退还。',
  admin: '管理员视角：核预约、看现场、关事件、做验收，一次使用对卫生/邻里/设备的影响都在这里。',
  cleaner: '保洁视角：处理食材混放、补清洁任务，并参与结束验收的清洁项确认。',
  repair: '维修视角：接收设备损坏工单、核定损耗与赔偿、更新设备状态。',
  staff: '社区工作人员视角：审批公益与商业活动、调解押金争议、发布公示、复盘运营效果。'
}
</script>

<template>
  <div>
    <div class="banner info">
      <span>👋</span>
      <div class="bx">
        <strong>{{ user.name }}（{{ ROLE_META[role].label }}）</strong>
        <div>{{ greetings[role] }}</div>
      </div>
    </div>

    <div class="grid grid-4" style="margin-bottom: 16px">
      <div v-for="s in stats" :key="s.lbl" class="card tight stat">
        <div class="num">{{ s.num }} <span style="font-size: 18px">{{ s.icon }}</span></div>
        <div class="lbl">{{ s.lbl }}</div>
      </div>
    </div>

    <!-- 待办区 -->
    <div v-if="toApprove.length" class="card">
      <div class="card-title"><h2>📝 待我审批</h2></div>
      <table class="data">
        <tbody>
          <tr
            v-for="b in toApprove"
            :key="b.id"
            class="clickable"
            @click="push(`/booking/${b.id}`)"
          >
            <td><strong>{{ b.title }}</strong></td>
            <td><span class="tag" :class="ACTIVITY_RULES[b.activityKind].color">{{ ACTIVITY_RULES[b.activityKind].label }}</span></td>
            <td>{{ b.date }} {{ b.startAt }}-{{ b.endAt }}</td>
            <td class="muted">{{ b.orgName ?? b.contactName }} · {{ b.peopleCount }}人</td>
            <td><span class="tag amber">押金 {{ b.depositFree ? '免押' : '¥' + b.depositRequired }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="toCheck.length" class="card">
      <div class="card-title"><h2>🗝️ 待使用前核验</h2></div>
      <table class="data">
        <tbody>
          <tr v-for="b in toCheck" :key="b.id" class="clickable" @click="push(`/booking/${b.id}`)">
            <td><strong>{{ b.title }}</strong></td>
            <td>{{ b.date }} {{ b.startAt }}</td>
            <td class="muted">负责人 {{ b.contactName }}</td>
            <td><span class="tag blue">身份 / 健康承诺 / 食材 / 设备 四项核验</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="toAccept.length" class="card">
      <div class="card-title"><h2>🧾 待逐项验收</h2></div>
      <table class="data">
        <tbody>
          <tr v-for="b in toAccept" :key="b.id" class="clickable" @click="push(`/booking/${b.id}`)">
            <td><strong>{{ b.title }}</strong></td>
            <td>{{ b.date }}</td>
            <td class="muted">负责人 {{ b.contactName }}</td>
            <td><span class="tag amber">灶台/台面/冰箱/垃圾/地面/餐具/设备 七项验收</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="myIncidents.length || myDisputes.length" class="card">
      <div class="card-title"><h2>🧰 我的协作任务</h2></div>
      <table class="data">
        <thead>
          <tr><th>类型</th><th>事项</th><th>关联预约</th><th>状态</th><th></th></tr>
        </thead>
        <tbody>
          <tr
            v-for="i in myIncidents"
            :key="i.id"
            class="clickable"
            @click="push(`/booking/${i.bookingId}`)"
          >
            <td><span class="tag" :class="i.level === 'high' ? 'red' : i.level === 'mid' ? 'amber' : ''">使用中事件</span></td>
            <td>{{ i.title }}</td>
            <td class="muted">{{ kitchen.bookingById(i.bookingId)?.title }}</td>
            <td>{{ i.status === 'open' ? '待处理' : '处理中' }}</td>
            <td><a>去处理 →</a></td>
          </tr>
          <tr
            v-for="d in myDisputes"
            :key="d.id"
            class="clickable"
            @click="push(`/booking/${d.bookingId}`)"
          >
            <td><span class="tag purple">押金争议</span></td>
            <td>主张退还 ¥{{ d.claimAmount }}：{{ d.reason.slice(0, 24) }}…</td>
            <td class="muted">{{ kitchen.bookingById(d.bookingId)?.title }}</td>
            <td>{{ d.status === 'open' ? '待调解' : '调解中' }}</td>
            <td><a>去调解 →</a></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 居民：我的预约 -->
    <div v-if="role === 'resident'" class="card">
      <div class="card-title">
        <h2>📒 我的预约</h2>
        <button class="btn primary sm" style="margin-left: auto" @click="push('/create')">➕ 新建预约</button>
      </div>
      <table class="data" v-if="myBookings.length">
        <thead><tr><th>编号</th><th>活动</th><th>时间</th><th>状态</th><th>押金</th></tr></thead>
        <tbody>
          <tr v-for="b in myBookings" :key="b.id" class="clickable" @click="push(`/booking/${b.id}`)">
            <td class="mono small">{{ b.code }}</td>
            <td>
              <strong>{{ b.title }}</strong>
              <div><span class="tag" :class="ACTIVITY_RULES[b.activityKind].color">{{ ACTIVITY_RULES[b.activityKind].label }}</span></div>
            </td>
            <td class="small">{{ b.date }}<br />{{ b.startAt }}-{{ b.endAt }}</td>
            <td><span class="tag" :class="STATUS_META[b.status].color">{{ STATUS_META[b.status].label }}</span></td>
            <td class="small">
              <span v-if="b.depositFree" class="tag green">公益免押</span>
              <span v-else-if="b.depositResult" class="tag" :class="b.depositResult.deduction ? 'amber' : 'green'">
                {{ b.depositResult.decision === 'full-refund' ? '已全退' : '扣费 ¥' + b.depositResult.deduction }}
              </span>
              <span v-else class="tag">{{ b.depositPaid ? '已缴 ¥' + b.depositRequired : '待缴 ¥' + b.depositRequired }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">还没有预约，点击右上角「新建预约」使用共享厨房。</div>
    </div>

    <!-- 规则差异速览 -->
    <div class="card">
      <div class="card-title"><h2>⚖️ 三类活动的差异化规则（审批时可见）</h2></div>
      <div class="grid grid-3">
        <div v-for="key in ['charity-class', 'neighbor-feast', 'commercial']" :key="key" class="rule-box">
          <div class="rb-head">
            <span class="tag" :class="ACTIVITY_RULES[key].color">{{ ACTIVITY_RULES[key].label }}</span>
            <strong>{{ key === 'charity-class' ? '¥0 免押' : '押金 ¥' + ACTIVITY_RULES[key].deposit }}</strong>
          </div>
          <div class="small"><span class="muted">清洁：</span>{{ ACTIVITY_RULES[key].cleaningRule }}</div>
          <div class="small"><span class="muted">公示：</span>{{ ACTIVITY_RULES[key].publicityRule }}</div>
          <div class="small"><span class="muted">告知：</span>{{ ACTIVITY_RULES[key].noticeRule }}</div>
          <div class="small"><span class="muted">审批：</span>{{ ACTIVITY_RULES[key].approveRole === 'staff' ? '社区工作人员' : '厨房管理员' }} · 最长 {{ ACTIVITY_RULES[key].maxHours }} 小时</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rule-box {
  border: 1px solid var(--c-border); border-radius: 8px; padding: 12px;
  background: var(--c-surface-2); display: flex; flex-direction: column; gap: 7px;
}
.rb-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
</style>
