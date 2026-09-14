<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { useRouter } from '@/router'
import { ACTIVITY_RULES, INCIDENT_META } from '@/rules'
import type { IncidentOwner } from '@/types'

const auth = useAuthStore()
const kitchen = useKitchenStore()
const { push } = useRouter()
const role = computed(() => auth.currentUser!.role)

const tab = ref<'mine' | 'all' | 'disputes' | 'approvals'>('mine')

const ownerName: Record<IncidentOwner, string> = {
  admin: '管理员',
  cleaner: '保洁',
  repair: '维修',
  staff: '社区工作人员'
}

const myIncidents = computed(() => kitchen.openIncidents.filter((i) => i.owner === role.value))
const allOpen = computed(() =>
  [...kitchen.openIncidents].sort((a, b) => (a.reportedAt < b.reportedAt ? 1 : -1))
)
const myDisputes = computed(() =>
  role.value === 'staff'
    ? kitchen.disputes.filter((d) => ['open', 'mediating'].includes(d.status))
    : []
)
const myApprovals = computed(() =>
  kitchen.pendingBookings.filter((b) => ACTIVITY_RULES[b.activityKind].approveRole === role.value)
)

const resolvedHistory = computed(() =>
  kitchen.incidents
    .filter((i) => i.status === 'resolved')
    // 保洁/维修只看本角色历史；居民只看自己预约的事件，避免跨预约信息泄露
    .filter((i) => {
      if (role.value === 'cleaner' || role.value === 'repair') return i.owner === role.value
      if (role.value === 'resident') {
        return kitchen.bookingById(i.bookingId)?.applicantId === auth.currentUser!.id
      }
      return true
    })
    .sort((a, b) => ((a.resolvedAt ?? '') < (b.resolvedAt ?? '') ? 1 : -1))
    .slice(0, 15)
)
// 跨角色看板仅管理员/社区工作人员可见
const canSeeAll = computed(() => role.value === 'admin' || role.value === 'staff')
if (!canSeeAll.value && tab.value === 'all') tab.value = 'mine'
</script>

<template>
  <div>
    <h1>协作任务台</h1>
    <div class="banner info">
      <span>🧰</span>
      <div class="bx">
        预约人、管理员、保洁、维修、社区工作人员围绕<b>同一次使用记录</b>协同：事件按角色指派、可改派、闭环留痕；
        争议由社区工作人员调解。当前身份：<b>{{ ownerName[role as IncidentOwner] ?? '预约人' }}</b>。
      </div>
    </div>

    <div class="seg" style="margin-bottom: 14px">
      <button :class="{ on: tab === 'mine' }" @click="tab = 'mine'">我的待办（{{ myIncidents.length }}）</button>
      <button v-if="role !== 'resident'" :class="{ on: tab === 'approvals' }" @click="tab = 'approvals'">待我审批（{{ myApprovals.length }}）</button>
      <button v-if="role === 'staff'" :class="{ on: tab === 'disputes' }" @click="tab = 'disputes'">
        押金争议（{{ myDisputes.length }}）
      </button>
      <button v-if="canSeeAll" :class="{ on: tab === 'all' }" @click="tab = 'all'">全部未闭环事件（{{ allOpen.length }}）</button>
    </div>

    <div v-if="role === 'resident'" class="banner ok">
      <span>🏠</span>
      <div class="bx">你是预约人：可以在「预约记录」中查看<b>仅属于自己</b>的完整记录并跟进押金；使用中发现问题可在自己的预约详情页上报事件。</div>
    </div>

    <!-- 我的事件 -->
    <div v-if="tab === 'mine'" class="card">
      <div class="card-title"><h2>指派给我的事件</h2></div>
      <table class="data" v-if="myIncidents.length">
        <thead><tr><th>类型</th><th>事项</th><th>关联预约</th><th>上报人/时间</th><th>状态</th><th></th></tr></thead>
        <tbody>
          <tr v-for="i in myIncidents" :key="i.id" class="clickable" @click="push(`/booking/${i.bookingId}`)">
            <td>{{ INCIDENT_META[i.type].icon }} {{ INCIDENT_META[i.type].label }}</td>
            <td><strong>{{ i.title }}</strong><div class="tiny muted">{{ i.detail.slice(0, 40) }}…</div></td>
            <td class="small">{{ kitchen.bookingById(i.bookingId)?.title }}</td>
            <td class="small">{{ i.reportedBy }}<br />{{ i.reportedAt }}</td>
            <td><span class="tag" :class="i.status === 'open' ? 'red' : 'amber'">{{ i.status === 'open' ? '待处理' : '处理中' }}</span></td>
            <td><a>去处理 →</a></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">🎉 当前没有指派给你的待办事件。</div>

      <hr class="divider" />
      <h3>近期已闭环</h3>
      <table class="data" v-if="resolvedHistory.length">
        <tbody>
          <tr v-for="i in resolvedHistory" :key="i.id" class="clickable" @click="push(`/booking/${i.bookingId}`)">
            <td style="width: 110px">{{ INCIDENT_META[i.type].icon }} {{ INCIDENT_META[i.type].label }}</td>
            <td>{{ i.title }}</td>
            <td class="small muted" style="width: 160px">{{ i.handlerId }} · {{ i.resolvedAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 待审批 -->
    <div v-if="tab === 'approvals'" class="card">
      <div class="card-title"><h2>待我审批的预约</h2></div>
      <table class="data" v-if="myApprovals.length">
        <thead><tr><th>活动</th><th>类型 / 规则</th><th>时间</th><th>押金</th><th>前置条件</th><th></th></tr></thead>
        <tbody>
          <tr v-for="bk in myApprovals" :key="bk.id" class="clickable" @click="push(`/booking/${bk.id}`)">
            <td><strong>{{ bk.title }}</strong><div class="tiny muted">{{ bk.orgName ?? bk.contactName }}</div></td>
            <td><span class="tag" :class="ACTIVITY_RULES[bk.activityKind].color">{{ ACTIVITY_RULES[bk.activityKind].label }}</span></td>
            <td class="small">{{ bk.date }} {{ bk.startAt }}-{{ bk.endAt }}</td>
            <td>{{ bk.depositFree ? '免押' : '¥' + bk.depositRequired }}</td>
            <td class="small">
              <span :class="bk.foodSafetyAck ? 'green' : 'red'">{{ bk.foodSafetyAck ? '✔ 告知已签' : '✕ 告知未签' }}</span>
              <span v-if="!bk.depositFree"> · <span :class="bk.depositPaid ? 'green' : 'red'">{{ bk.depositPaid ? '✔ 押金已缴' : '✕ 押金未缴' }}</span></span>
            </td>
            <td><a>去审批 →</a></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">没有待你审批的预约。</div>
    </div>

    <!-- 争议 -->
    <div v-if="tab === 'disputes'" class="card">
      <div class="card-title"><h2>押金争议调解</h2></div>
      <table class="data" v-if="myDisputes.length">
        <thead><tr><th>预约</th><th>提出人</th><th>主张</th><th>理由</th><th></th></tr></thead>
        <tbody>
          <tr v-for="d in myDisputes" :key="d.id" class="clickable" @click="push(`/booking/${d.bookingId}`)">
            <td class="small">{{ kitchen.bookingById(d.bookingId)?.title }}</td>
            <td>{{ d.raisedBy }}</td>
            <td class="mono">退 ¥{{ d.claimAmount }}</td>
            <td class="small muted">{{ d.reason.slice(0, 40) }}…</td>
            <td><a>去调解 →</a></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">没有待调解的押金争议。</div>
    </div>

    <!-- 全部事件 -->
    <div v-if="tab === 'all'" class="card">
      <div class="card-title"><h2>全部未闭环事件（跨角色看板）</h2></div>
      <div class="kanban">
        <div v-for="ow in ['admin', 'cleaner', 'repair', 'staff']" :key="ow" class="kan-col">
          <div class="kc-head">{{ ownerName[ow as IncidentOwner] }}（{{ allOpen.filter((i) => i.owner === ow).length }}）</div>
          <div
            v-for="i in allOpen.filter((i) => i.owner === ow)"
            :key="i.id"
            class="kc-item"
            @click="push(`/booking/${i.bookingId}`)"
          >
            <div class="small"><b>{{ INCIDENT_META[i.type].icon }} {{ i.title }}</b></div>
            <div class="tiny muted">{{ kitchen.bookingById(i.bookingId)?.title }}</div>
            <span class="tag" :class="i.level === 'high' ? 'red' : i.level === 'mid' ? 'amber' : ''" style="margin-top: 4px">
              {{ i.level === 'high' ? '高' : i.level === 'mid' ? '中' : '低' }}优先级
            </span>
          </div>
          <div v-if="!allOpen.filter((i) => i.owner === ow).length" class="tiny muted" style="padding: 8px 4px">无</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (max-width: 900px) { .kanban { grid-template-columns: 1fr 1fr; } }
.kan-col { border: 1px solid var(--c-border); border-radius: 8px; padding: 8px; background: var(--c-surface-2); min-height: 120px; }
.kc-head { font-weight: 600; font-size: 13px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--c-border); }
.kc-item { background: #fff; border: 1px solid var(--c-border); border-radius: 6px; padding: 8px; margin-bottom: 8px; cursor: pointer; }
.kc-item:hover { border-color: var(--c-brand); }
</style>
