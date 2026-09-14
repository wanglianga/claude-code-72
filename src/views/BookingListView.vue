<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { useRouter } from '@/router'
import { ACTIVITY_RULES, STATUS_META } from '@/rules'
import type { BookingStatus } from '@/types'
import { canViewBooking } from '@/utils/access'

const auth = useAuthStore()
const kitchen = useKitchenStore()
const { push } = useRouter()

const role = computed(() => auth.currentUser!.role)

const statusFilter = ref<'all' | BookingStatus>('all')
const kindFilter = ref('all')
// 居民默认且只能看「我发起的」；管理员/社区工作人员可切换全部
const scope = ref<'all' | 'mine'>(role.value === 'resident' ? 'mine' : 'all')
const keyword = ref('')

// 居民只能看到本人记录；保洁/维修只能看到分派给本角色事件关联的记录（数据隔离）
const list = computed(() => {
  return kitchen.bookings
    .filter((b) => {
      if (role.value === 'resident') return b.applicantId === auth.currentUser!.id
      if (role.value === 'cleaner' || role.value === 'repair') {
        return canViewBooking(b, role.value, auth.currentUser!.id, kitchen.incidents)
      }
      return scope.value === 'mine' ? b.applicantId === auth.currentUser!.id : true
    })
    .filter((b) => (statusFilter.value === 'all' ? true : b.status === statusFilter.value))
    .filter((b) => (kindFilter.value === 'all' ? true : b.activityKind === kindFilter.value))
    .filter((b) =>
      keyword.value.trim()
        ? (b.title + b.code + b.contactName + (b.orgName ?? '')).includes(keyword.value.trim())
        : true
    )
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.startAt < b.startAt ? 1 : -1))
})

const statusTabs: { key: 'all' | BookingStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审批' },
  { key: 'approved', label: '待核验' },
  { key: 'checked', label: '使用中' },
  { key: 'closing', label: '待验收' },
  { key: 'completed', label: '已完成' }
]

function openIncCnt(b: { id: string }) {
  return kitchen.incidentsOf(b.id).filter((i) => i.status !== 'resolved').length
}
</script>

<template>
  <div>
    <div class="card tight">
      <div class="filter-bar">
        <div v-if="role === 'admin' || role === 'staff'" class="seg">
          <button :class="{ on: scope === 'all' }" @click="scope = 'all'">全部预约</button>
          <button :class="{ on: scope === 'mine' }" @click="scope = 'mine'">我发起的</button>
        </div>
        <span v-else class="tag gray">仅显示与你相关的预约记录</span>
        <select v-model="kindFilter" style="width: 150px">
          <option value="all">全部活动类型</option>
          <option v-for="(r, k) in ACTIVITY_RULES" :key="k" :value="k">{{ r.label }}</option>
        </select>
        <input v-if="role !== 'cleaner' && role !== 'repair'" v-model="keyword" placeholder="搜索编号 / 活动 / 负责人 / 组织" style="width: 240px" />
        <button v-if="auth.currentUser?.role === 'resident'" class="btn primary" @click="push('/create')">
          ➕ 新建预约
        </button>
      </div>
      <div class="seg" style="margin-top: 10px">
        <button
          v-for="t in statusTabs"
          :key="t.key"
          :class="{ on: statusFilter === t.key }"
          @click="statusFilter = t.key"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="card" v-if="list.length">
      <table class="data">
        <thead>
          <tr>
            <th>编号 / 活动</th>
            <th>类型</th>
            <th>使用时间</th>
            <th>负责人</th>
            <th>人数</th>
            <th>押金</th>
            <th>事件</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in list" :key="b.id" class="clickable" @click="push(`/booking/${b.id}`)">
            <td>
              <strong>{{ b.title }}</strong>
              <div class="tiny muted mono">{{ b.code }}</div>
            </td>
            <td><span class="tag" :class="ACTIVITY_RULES[b.activityKind].color">{{ ACTIVITY_RULES[b.activityKind].label }}</span></td>
            <td class="small">{{ b.date }}<br />{{ b.startAt }}–{{ b.endAt }}</td>
            <td class="small">
              {{ b.contactName }}
              <div v-if="b.orgName" class="tiny muted">{{ b.orgName }}</div>
            </td>
            <td class="mono">{{ b.peopleCount }}</td>
            <td class="small">
              <span v-if="b.depositFree" class="tag green">公益免押</span>
              <template v-else>
                <div class="mono">¥{{ b.depositRequired }}</div>
                <div class="tiny" :class="b.depositPaid ? 'green' : 'amber'">
                  {{ b.depositResult ? (b.depositResult.decision === 'full-refund' ? '已全额退' : '扣 ¥' + b.depositResult.deduction) : b.depositPaid ? '已缴' : '待缴' }}
                </div>
              </template>
            </td>
            <td>
              <span v-if="kitchen.incidentsOf(b.id).length" class="tag" :class="openIncCnt(b) ? 'red' : 'gray'">
                {{ kitchen.incidentsOf(b.id).length }} 起<span v-if="openIncCnt(b)"> · {{ openIncCnt(b) }} 未闭环</span>
              </span>
              <span v-else class="tiny muted">—</span>
              <div v-if="kitchen.incidentsOf(b.id).filter((i) => i.type === 'complaint').length" class="tiny red">
                含投诉 {{ kitchen.incidentsOf(b.id).filter((i) => i.type === 'complaint').length }}
              </div>
            </td>
            <td><span class="tag" :class="STATUS_META[b.status].color">{{ STATUS_META[b.status].label }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty">没有符合条件的预约记录。</div>
  </div>
</template>

<style scoped>
.filter-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
</style>
