<script setup lang="ts">
import { computed } from 'vue'
import { useKitchenStore } from '@/stores/kitchen'
import { useRouter } from '@/router'
import { ACTIVITY_RULES, RESOURCE_META } from '@/rules'

const kitchen = useKitchenStore()
const { push } = useRouter()

const rows = computed(() => kitchen.analyticsByKind)

const maxTotal = computed(() => Math.max(1, ...rows.value.map((r) => r.total)))
const maxIncidents = computed(() => Math.max(1, ...rows.value.map((r) => r.incidents)))
const maxClean = computed(() => Math.max(1, ...rows.value.map((r) => r.cleaningMin)))

const totals = computed(() => {
  const all = kitchen.bookings
  const done = all.filter((b) => b.status === 'completed')
  return {
    total: all.length,
    completed: done.length,
    people: all.reduce((s, b) => s + b.peopleCount, 0),
    incidents: kitchen.incidents.length,
    openIncidents: kitchen.openIncidents.length,
    complaints: kitchen.incidents.filter((i) => i.type === 'complaint').length,
    damages: kitchen.incidents.filter((i) => i.type === 'damage').length,
    smoke: kitchen.incidents.filter((i) => i.type === 'smoke').length,
    cleaningMin: done.reduce((s, b) => s + (b.acceptance?.cleaningExtraMinutes ?? 0), 0),
    overtimeMin: done.reduce((s, b) => s + (b.acceptance?.overtimeMinutes ?? 0), 0),
    withheld: done.reduce((s, b) => s + (b.depositResult?.deduction ?? 0), 0),
    fullRefund: done.filter((b) => b.depositResult?.decision === 'full-refund').length,
    avgAcceptPass: done.length
      ? Math.round(
          (done.reduce(
            (s, b) => s + b.acceptance!.items.filter((i) => i.result === 'pass').length,
            0
          ) /
            (done.length * 7)) *
            100
        )
      : 100
  }
})

// 单次使用综合影响排行（事件数 + 验收不合格项 + 设备损耗增量）
const impactList = computed(() =>
  kitchen.bookings
    .map((b) => {
      const inc = kitchen.incidentsOf(b.id)
      const fail = b.acceptance?.items.filter((i) => i.result !== 'pass').length ?? 0
      const wear = inc.reduce((s, i) => s + (i.wearImpact ?? 0), 0)
      const score = inc.length * 2 + fail + wear / 10
      return {
        b,
        inc: inc.length,
        complaints: inc.filter((i) => i.type === 'complaint').length,
        fail,
        wear,
        cleaning: b.acceptance?.cleaningExtraMinutes ?? 0,
        score: Math.round(score * 10) / 10
      }
    })
    .filter((x) => x.inc > 0 || x.fail > 0)
    .sort((a, c) => c.score - a.score)
    .slice(0, 6)
)

const kindColorVar: Record<string, string> = {
  'charity-class': 'var(--c-green)',
  'neighbor-feast': 'var(--c-brand)',
  commercial: 'var(--c-purple)',
  private: 'var(--c-blue)'
}
</script>

<template>
  <div>
    <h1>社区共享厨房运营复盘</h1>
    <div class="banner info">
      <span>📊</span>
      <div class="bx">
        按<b>活动类型 / 设备损耗 / 清洁超时 / 投诉</b>四个维度复盘，让管理员看清一次使用对
        <b>卫生、邻里关系和设备寿命</b>的影响，为押金规则调整、设备更新与活动准入提供依据。
      </div>
    </div>

    <!-- KPI -->
    <div class="grid grid-4" style="margin-bottom: 16px">
      <div class="card tight stat"><div class="num">{{ totals.total }}</div><div class="lbl">累计预约（完成 {{ totals.completed }}）</div></div>
      <div class="card tight stat"><div class="num">{{ totals.people }}</div><div class="lbl">累计服务人次</div></div>
      <div class="card tight stat"><div class="num" :class="totals.incidents ? '' : 'green'">{{ totals.incidents }}<span class="small muted"> / {{ totals.openIncidents }} 未闭环</span></div><div class="lbl">使用中事件</div></div>
      <div class="card tight stat"><div class="num">{{ totals.avgAcceptPass }}%</div><div class="lbl">七项验收一次合格率</div></div>
      <div class="card tight stat"><div class="num" :class="totals.complaints ? '' : 'green'">{{ totals.complaints }}</div><div class="lbl">邻里投诉</div></div>
      <div class="card tight stat"><div class="num" :class="totals.damages ? 'red' : 'green'">{{ totals.damages }}</div><div class="lbl">设备损坏</div></div>
      <div class="card tight stat"><div class="num">{{ totals.cleaningMin }}<span class="small muted"> 分</span></div><div class="lbl">累计补清洁工时</div></div>
      <div class="card tight stat"><div class="num">¥{{ totals.withheld }}</div><div class="lbl">累计押金扣费（全退 {{ totals.fullRefund }} 单）</div></div>
    </div>

    <!-- 按活动类型 -->
    <div class="card">
      <div class="card-title"><h2>① 按活动类型看运营效果</h2></div>
      <div class="chart-block">
        <div class="chart-title small muted">活动场次</div>
        <div v-for="r in rows" :key="r.kind" class="bar-line">
          <div class="bar-label"><span class="tag" :class="r.color">{{ r.label }}</span></div>
          <div class="bar-track" style="height: 18px">
            <div class="bar-fill" :style="{ width: (r.total / maxTotal) * 100 + '%', background: kindColorVar[r.kind] }"></div>
          </div>
          <div class="bar-val mono">{{ r.total }} 场 · {{ r.people }} 人次</div>
        </div>
      </div>

      <div class="chart-block">
        <div class="chart-title small muted">事件数（油烟 / 损坏 / 投诉）</div>
        <div v-for="r in rows" :key="r.kind" class="bar-line">
          <div class="bar-label"><span class="tag" :class="r.color">{{ r.label }}</span></div>
          <div class="bar-track" style="height: 18px">
            <div class="bar-fill" :style="{ width: (r.incidents / maxIncidents) * 100 + '%', background: 'var(--c-red)' }"></div>
          </div>
          <div class="bar-val mono small">{{ r.incidents }} 起（💨{{ r.smoke }} 🔧{{ r.damages }} 📞{{ r.complaints }}）</div>
        </div>
      </div>

      <div class="chart-block">
        <div class="chart-title small muted">补清洁工时（分钟）</div>
        <div v-for="r in rows" :key="r.kind" class="bar-line">
          <div class="bar-label"><span class="tag" :class="r.color">{{ r.label }}</span></div>
          <div class="bar-track" style="height: 18px">
            <div class="bar-fill" :style="{ width: (r.cleaningMin / maxClean) * 100 + '%', background: 'var(--c-blue)' }"></div>
          </div>
          <div class="bar-val mono small">{{ r.cleaningMin }} 分 · 超时 {{ r.overtimeMin }} 分 · 不合格 {{ r.failItems }} 项 / 补清 {{ r.redirtyItems }} 项</div>
        </div>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr><th>活动类型</th><th>场次</th><th>人次</th><th>事件</th><th>投诉</th><th>损坏</th><th>补清洁(分)</th><th>超时(分)</th><th>押金扣费</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.kind">
              <td><span class="tag" :class="r.color">{{ r.label }}</span></td>
              <td class="mono">{{ r.total }}</td>
              <td class="mono">{{ r.people }}</td>
              <td class="mono">{{ r.incidents }}</td>
              <td class="mono" :class="r.complaints ? 'red' : ''">{{ r.complaints }}</td>
              <td class="mono" :class="r.damages ? 'red' : ''">{{ r.damages }}</td>
              <td class="mono">{{ r.cleaningMin }}</td>
              <td class="mono">{{ r.overtimeMin }}</td>
              <td class="mono">¥{{ r.withheld }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="grid grid-2">
      <!-- 设备损耗 -->
      <div class="card">
        <div class="card-title"><h2>② 设备损耗与寿命</h2></div>
        <div v-for="r in kitchen.resourceWear.slice(0, 10)" :key="r.id" class="wear-line">
          <div class="wl-name small">
            {{ RESOURCE_META[r.type].icon }} {{ r.name }}
            <span v-if="r.status === 'repairing'" class="tag red">维修中</span>
          </div>
          <div class="bar-track" style="flex: 1; height: 12px">
            <div class="bar-fill" :style="{
              width: r.wear + '%',
              background: r.wear >= 75 ? 'var(--c-red)' : r.wear >= 50 ? 'var(--c-amber)' : 'var(--c-green)'
            }"></div>
          </div>
          <div class="mono tiny" style="width: 40px; text-align: right">{{ r.wear }}%</div>
        </div>
        <div class="hint">损耗度 ≥75% 建议安排检修或更新；设备损坏事件定损后自动累加到对应设备。</div>
      </div>

      <!-- 清洁超时 -->
      <div class="card">
        <div class="card-title"><h2>③ 清洁超时记录</h2></div>
        <table class="data">
          <thead><tr><th>预约</th><th>类型</th><th>补清洁</th><th>超时</th></tr></thead>
          <tbody>
            <tr v-for="b in kitchen.cleaningOvertimeList" :key="b.id" class="clickable" @click="push(`/booking/${b.id}`)">
              <td class="small">{{ b.title }}</td>
              <td><span class="tag" :class="ACTIVITY_RULES[b.activityKind].color">{{ ACTIVITY_RULES[b.activityKind].label }}</span></td>
              <td class="mono">{{ b.acceptance!.cleaningExtraMinutes }} 分</td>
              <td class="mono">{{ b.acceptance!.overtimeMinutes }} 分</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!kitchen.cleaningOvertimeList.length" class="small muted">暂无补清洁记录。</div>
      </div>
    </div>

    <!-- 投诉 -->
    <div class="card">
      <div class="card-title"><h2>④ 邻里投诉跟踪</h2></div>
      <table class="data" v-if="kitchen.recentComplaints.length">
        <thead><tr><th>投诉内容</th><th>关联活动</th><th>类型</th><th>时间</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="i in kitchen.recentComplaints" :key="i.id" class="clickable" @click="push(`/booking/${i.bookingId}`)">
            <td><b>{{ i.title }}</b><div class="tiny muted">{{ i.detail }}</div></td>
            <td class="small">{{ kitchen.bookingById(i.bookingId)?.title }}</td>
            <td><span class="tag" :class="ACTIVITY_RULES[kitchen.bookingById(i.bookingId)?.activityKind ?? 'private'].color">
              {{ ACTIVITY_RULES[kitchen.bookingById(i.bookingId)?.activityKind ?? 'private'].label }}
            </span></td>
            <td class="small">{{ i.reportedAt }}</td>
            <td><span class="tag" :class="i.status === 'resolved' ? 'green' : 'red'">{{ i.status === 'resolved' ? '已闭环' : '处理中' }}</span></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="small green">✔ 暂无邻里投诉，厨房与邻里关系良好。</div>
    </div>

    <!-- 单次使用影响 -->
    <div class="card">
      <div class="card-title"><h2>⑤ 单次使用综合影响 TOP（卫生 × 邻里 × 设备）</h2></div>
      <table class="data" v-if="impactList.length">
        <thead><tr><th>活动</th><th>类型</th><th>事件</th><th>投诉</th><th>验收问题项</th><th>设备损耗增量</th><th>补清洁</th><th>影响分</th></tr></thead>
        <tbody>
          <tr v-for="x in impactList" :key="x.b.id" class="clickable" @click="push(`/booking/${x.b.id}`)">
            <td class="small"><b>{{ x.b.title }}</b><div class="tiny muted">{{ x.b.date }} · {{ x.b.contactName }}</div></td>
            <td><span class="tag" :class="ACTIVITY_RULES[x.b.activityKind].color">{{ ACTIVITY_RULES[x.b.activityKind].label }}</span></td>
            <td class="mono">{{ x.inc }}</td>
            <td class="mono" :class="x.complaints ? 'red' : ''">{{ x.complaints }}</td>
            <td class="mono" :class="x.fail ? 'amber' : ''">{{ x.fail }}/7</td>
            <td class="mono" :class="x.wear >= 10 ? 'red' : ''">+{{ x.wear }}%</td>
            <td class="mono">{{ x.cleaning }} 分</td>
            <td><b class="mono">{{ x.score }}</b></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="small green">✔ 所有使用记录均无不良影响。</div>
    </div>
  </div>
</template>

<style scoped>
.chart-block { margin-bottom: 18px; }
.chart-title { margin-bottom: 6px; }
.bar-line { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.bar-label { width: 86px; flex-shrink: 0; }
.bar-val { width: 260px; flex-shrink: 0; color: var(--c-text-2); }
.wear-line { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
.wl-name { width: 150px; flex-shrink: 0; display: flex; align-items: center; gap: 4px; }
.table-wrap { overflow-x: auto; }
@media (max-width: 800px) { .bar-val { width: 150px; } }
</style>
