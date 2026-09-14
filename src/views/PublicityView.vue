<script setup lang="ts">
import { computed, ref } from 'vue'
import { useKitchenStore } from '@/stores/kitchen'
import { useRouter } from '@/router'
import { ACTIVITY_RULES } from '@/rules'

const kitchen = useKitchenStore()
const { push } = useRouter()

const filter = ref('all')
const list = computed(() =>
  kitchen.bookings
    .filter((b) => b.publicity?.published)
    .filter((b) => (filter.value === 'all' ? true : b.activityKind === filter.value))
    .sort((a, b) => ((a.publicity!.publishedAt ?? '') < (b.publicity!.publishedAt ?? '') ? 1 : -1))
)

// 待公示（已批准以后但没有公示，且按规则需要公示的活动）
const pending = computed(() =>
  kitchen.bookings.filter(
    (b) =>
      !b.publicity?.published &&
      ['approved', 'checked', 'closing', 'completed'].includes(b.status) &&
      b.activityKind !== 'private'
  )
)
</script>

<template>
  <div>
    <h1>社区公示栏</h1>
    <div class="banner info">
      <span>📢</span>
      <div class="bx">
        公益课堂默认公示活动成果；邻里宴活动前公示时间范围、活动后公示卫生验收；
        <b>商业试吃强制前置公示不少于 3 天</b>并标明收费性质，接受邻里监督与投诉。居民自用仅公示时段占用。
      </div>
    </div>

    <div v-if="pending.length" class="card">
      <div class="card-title"><h2>待发布公示</h2></div>
      <table class="data">
        <tbody>
          <tr v-for="b in pending" :key="b.id" class="clickable" @click="push(`/booking/${b.id}`)">
            <td><strong>{{ b.title }}</strong></td>
            <td><span class="tag" :class="ACTIVITY_RULES[b.activityKind].color">{{ ACTIVITY_RULES[b.activityKind].label }}</span></td>
            <td class="small muted">{{ b.date }} · {{ b.contactName }}</td>
            <td class="small">{{ ACTIVITY_RULES[b.activityKind].publicityRule }}</td>
            <td><a>去发布 →</a></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="seg" style="margin-bottom: 14px">
      <button :class="{ on: filter === 'all' }" @click="filter = 'all'">全部公示</button>
      <button v-for="(r, k) in ACTIVITY_RULES" :key="k" :class="{ on: filter === k }" @click="filter = k">{{ r.label }}</button>
    </div>

    <div class="grid grid-2">
      <div v-for="b in list" :key="b.id" class="pub-card card tight" @click="push(`/booking/${b.id}`)">
        <div class="pc-top">
          <span class="tag" :class="ACTIVITY_RULES[b.activityKind].color">{{ ACTIVITY_RULES[b.activityKind].label }}</span>
          <span v-if="b.publicity!.board" class="tag blue">🏪 已上公示栏</span>
          <span class="tiny muted" style="margin-left: auto">{{ b.publicity!.publishedAt }}</span>
        </div>
        <h3 style="margin: 8px 0 6px">{{ b.publicity!.title }}</h3>
        <div class="small">{{ b.publicity!.summary }}</div>
        <div v-if="b.publicity!.feedback" class="feedback small">💬 邻里反馈：{{ b.publicity!.feedback }}</div>
        <div class="tiny muted" style="margin-top: 8px">发布人：{{ b.publicity!.by }}</div>
      </div>
    </div>
    <div v-if="!list.length" class="empty">暂无已发布的公示。</div>
  </div>
</template>

<style scoped>
.pub-card { cursor: pointer; }
.pub-card:hover { border-color: var(--c-brand); }
.pc-top { display: flex; gap: 6px; align-items: center; }
.feedback { margin-top: 8px; padding: 6px 8px; background: var(--c-surface-2); border-radius: 6px; }
</style>
