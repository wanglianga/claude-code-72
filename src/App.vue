<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { useRouter } from '@/router'
import { ROLE_META } from '@/rules'
import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'
import BookingListView from '@/views/BookingListView.vue'
import BookingCreateView from '@/views/BookingCreateView.vue'
import BookingDetailView from '@/views/BookingDetailView.vue'
import ResourcesView from '@/views/ResourcesView.vue'
import TasksView from '@/views/TasksView.vue'
import PublicityView from '@/views/PublicityView.vue'
import AnalyticsView from '@/views/AnalyticsView.vue'

const auth = useAuthStore()
const kitchen = useKitchenStore()
const { route, push } = useRouter()

// 初始化本地数据
auth.hydrate()
if (auth.isLoggedIn) kitchen.hydrate()
watch(
  () => auth.isLoggedIn,
  (v) => {
    if (v) kitchen.hydrate()
  }
)

function ensureKitchen() {
  if (!kitchen.bookings.length && !kitchen.resources.length) kitchen.hydrate()
}

const page = computed(() => route.params[0] ?? 'dashboard')

const nav = computed(() => {
  const role = auth.currentUser?.role
  const uid0 = auth.currentUser?.id ?? ''
  const items: { key: string; label: string; icon: string; badge?: number; show: boolean }[] = [
    { key: 'dashboard', label: '工作台', icon: '🏡', show: true },
    { key: 'bookings', label: '预约记录', icon: '📒', show: true },
    { key: 'create', label: '新建预约', icon: '➕', show: role === 'resident' },
    { key: 'tasks', label: '协作任务台', icon: '🧰', badge: kitchen.todoCount(role ?? '', uid0), show: true },
    { key: 'resources', label: '设备资源', icon: '🍳', show: true },
    { key: 'publicity', label: '社区公示', icon: '📢', show: true },
    { key: 'analytics', label: '运营复盘', icon: '📊', show: role === 'admin' || role === 'staff' }
  ]
  return items.filter((i) => i.show)
})

const crumbs = computed(() => {
  const map: Record<string, string> = {
    dashboard: '工作台',
    bookings: '预约记录',
    create: '新建预约',
    booking: '预约详情',
    resources: '设备资源与可用性',
    tasks: '协作任务台',
    publicity: '社区公示',
    analytics: '社区运营复盘'
  }
  return map[page.value] ?? ''
})

function go(key: string) {
  push(key === 'dashboard' ? '/dashboard' : `/${key}`)
}

function resetDemo() {
  if (window.confirm('确定要清空当前操作并恢复演示数据吗？')) {
    kitchen.resetDemo()
    push('/dashboard')
  }
}
</script>

<template>
  <LoginView v-if="!auth.isLoggedIn" />
  <div v-else class="layout">
    <aside class="sidebar">
      <div class="logo">🍲 邻里共享厨房</div>
      <nav>
        <div class="nav-group">
          <div
            v-for="i in nav"
            :key="i.key"
            class="nav-item"
            :class="{ active: page === i.key || (i.key === 'bookings' && page === 'booking') }"
            @click="go(i.key)"
          >
            <span>{{ i.icon }}</span>
            <span>{{ i.label }}</span>
            <span v-if="i.badge" class="nav-badge">{{ i.badge }}</span>
          </div>
        </div>
      </nav>
      <div class="userbox">
        <div><strong>{{ auth.currentUser?.name }}</strong></div>
        <span class="tag brand role-tag">
          {{ ROLE_META[auth.currentUser!.role].icon }} {{ ROLE_META[auth.currentUser!.role].label }}
        </span>
        <div v-if="auth.currentUser?.org" class="tiny" style="color: #b8a994">{{ auth.currentUser.org }}</div>
        <div style="display: flex; gap: 6px; margin-top: 8px">
          <button class="btn sm" style="flex: 1" @click="auth.logout()">退出登录</button>
          <button class="btn sm ghost" title="恢复演示数据" @click="resetDemo">↺</button>
        </div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="crumbs">邻里共享厨房管理 / {{ crumbs }}</div>
        <div style="margin-left: auto" class="small muted">一次使用，多方协同 · 卫生 · 邻里 · 设备</div>
      </header>
      <div class="content" @focusin="ensureKitchen">
        <DashboardView v-if="page === 'dashboard'" />
        <BookingListView v-else-if="page === 'bookings'" />
        <BookingCreateView v-else-if="page === 'create'" />
        <BookingDetailView v-else-if="page === 'booking' && route.params[1]" :id="route.params[1]" />
        <ResourcesView v-else-if="page === 'resources'" />
        <TasksView v-else-if="page === 'tasks'" />
        <PublicityView v-else-if="page === 'publicity'" />
        <AnalyticsView v-else-if="page === 'analytics'" />
      </div>
    </main>
  </div>
</template>
