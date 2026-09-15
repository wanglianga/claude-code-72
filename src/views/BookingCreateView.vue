<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore, type NewBookingInput } from '@/stores/kitchen'
import { useRouter } from '@/router'
import { ACTIVITY_RULES, COOKING_TYPES, FOOD_SAFETY_NOTICE, RESOURCE_META } from '@/rules'
import type { ActivityKind, CookingType, ResourceType } from '@/types'
import BaseModal from '@/components/BaseModal.vue'
import { todayStr } from '@/utils/format'

const auth = useAuthStore()
const kitchen = useKitchenStore()
const { push } = useRouter()
const me = computed(() => auth.currentUser!)

const form = reactive({
  applicantKind: (me.value.org ? 'org' : 'resident') as 'resident' | 'org',
  orgName: me.value.org ?? '',
  contactName: me.value.name,
  contactPhone: me.value.phone,
  activityKind: 'private' as ActivityKind,
  title: '',
  date: todayStr(),
  startAt: '09:00',
  endAt: '11:00',
  peopleCount: 6,
  cookingTypes: ['家常烹饪'] as CookingType[],
  isFrying: false,
  storageNeeded: false,
  storageNote: '',
  equipmentNeeds: ['stove'] as ResourceType[],
  natureNote: '',
  depositFree: false
})

const acked = ref(false)
const showNotice = ref(false)
const err = ref('')

const rule = computed(() => ACTIVITY_RULES[form.activityKind])

function toggleCooking(t: CookingType) {
  const i = form.cookingTypes.indexOf(t)
  if (i >= 0) form.cookingTypes.splice(i, 1)
  else form.cookingTypes.push(t)
}
function toggleEquip(t: ResourceType) {
  const i = form.equipmentNeeds.indexOf(t)
  if (i >= 0) form.equipmentNeeds.splice(i, 1)
  else form.equipmentNeeds.push(t)
}
function onKindChange() {
  // 非可免押类型重置免押勾选
  if (!rule.value.depositFreeEligible) form.depositFree = false
}
function onFrying(v: boolean) {
  form.isFrying = v
  if (v && !form.cookingTypes.includes('油炸')) form.cookingTypes.push('油炸')
}

const equipOptions = computed(() =>
  (Object.keys(RESOURCE_META) as ResourceType[]).map((t) => {
    const list = kitchen.resources.filter((r) => r.type === t)
    const affectedWO = kitchen.workOrders.find((w) => w.resourceType === t && w.affectsBookings && w.status !== 'closed')
    return {
      type: t,
      ...RESOURCE_META[t],
      total: list.length,
      ok: list.filter((r) => r.status === 'ok').length,
      affected: !!affectedWO,
      fullyBlocked: affectedWO?.blockSameKind ?? false,
      affectedLabel: affectedWO ? (affectedWO.blockSameKind ? '同类活动暂停' : '部分设备停用') : ''
    }
  })
)

function submit() {
  err.value = ''
  if (!form.title.trim()) return (err.value = '请填写活动名称')
  if (!form.contactName.trim() || !form.contactPhone.trim()) return (err.value = '请填写负责人与联系电话')
  if (!acked.value) return (err.value = '请先阅读并同意《食品安全告知书》')
  const input: NewBookingInput = {
    applicantId: me.value.id,
    applicantKind: form.applicantKind,
    orgName: form.applicantKind === 'org' ? form.orgName : undefined,
    contactName: form.contactName,
    contactPhone: form.contactPhone,
    activityKind: form.activityKind,
    title: form.title.trim(),
    date: form.date,
    startAt: form.startAt,
    endAt: form.endAt,
    peopleCount: Number(form.peopleCount),
    cookingTypes: form.cookingTypes,
    isFrying: form.isFrying,
    storageNeeded: form.storageNeeded,
    storageNote: form.storageNeeded ? form.storageNote : undefined,
    equipmentNeeds: form.equipmentNeeds,
    natureNote: form.natureNote,
    depositFree: form.depositFree
  }
  const r = kitchen.createBooking(input)
  if (!r.ok || !r.id) {
    err.value = r.msg ?? '提交失败'
    return
  }
  kitchen.ackFoodSafety(kitchen.bookingById(r.id)!, `${form.contactName}（在线签署）`)
  push(`/booking/${r.id}`)
}
</script>

<template>
  <div>
    <h1>新建共享厨房预约</h1>

    <!-- 规则差异提示 -->
    <div class="banner" :class="rule.color === 'green' ? 'ok' : rule.color === 'purple' ? 'info' : 'warn'">
      <span>⚖️</span>
      <div class="bx">
        已选择 <strong>{{ rule.label }}</strong>：押金
        <strong>{{ rule.depositFreeEligible ? ' 0 元（可申请公益免押）' : ' ' + rule.deposit + ' 元' }}</strong>；
        {{ rule.approveRole === 'staff' ? '由<b>社区工作人员</b>审批' : '由<b>厨房管理员</b>审批' }}；
        单次最长 {{ rule.maxHours }} 小时。下方可查看该类型的清洁、公示与告知规则差异。
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h2>① 活动性质</h2></div>
      <div class="form-row">
        <div class="field">
          <label>预约主体<span class="req">*</span></label>
          <div class="seg">
            <button :class="{ on: form.applicantKind === 'resident' }" @click="form.applicantKind = 'resident'">居民</button>
            <button :class="{ on: form.applicantKind === 'org' }" @click="form.applicantKind = 'org'">社团 / 公益组织</button>
          </div>
        </div>
        <div class="field" v-if="form.applicantKind === 'org'">
          <label>组织名称<span class="req">*</span></label>
          <input v-model="form.orgName" placeholder="如：阳光公益服务中心" />
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label>活动类型<span class="req">*</span></label>
          <select v-model="form.activityKind" @change="onKindChange">
            <option v-for="(r, k) in ACTIVITY_RULES" :key="k" :value="k">{{ r.label }}</option>
          </select>
          <div class="hint">三类公共活动适用不同押金 / 清洁 / 公示规则，审批人会看到差异。</div>
        </div>
        <div class="field" style="flex: 2">
          <label>活动名称<span class="req">*</span></label>
          <input v-model="form.title" placeholder="如：迎国庆邻里长桌宴" />
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label>活动性质说明</label>
          <textarea v-model="form.natureNote" placeholder="参与对象、是否收费、公益/商业目的等，供审批判断"></textarea>
        </div>
      </div>
      <div class="rule-detail">
        <div class="small"><span class="tag" :class="rule.color">{{ rule.label }}</span> 差异化规则</div>
        <div class="small"><b>清洁规则：</b>{{ rule.cleaningRule }}</div>
        <div class="small"><b>公示规则：</b>{{ rule.publicityRule }}</div>
        <div class="small"><b>食品安全告知：</b>{{ rule.noticeRule }}</div>
        <div v-if="rule.depositFreeEligible" class="deposit-free">
          <label class="switch">
            <input type="checkbox" v-model="form.depositFree" />
            <span><b>申请公益免押</b>（提交后由社区工作人员核准免押资格）</span>
          </label>
        </div>
        <div v-else class="small"><b>应付押金：¥{{ rule.deposit }}</b>，审批通过后在线缴纳。</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h2>② 使用时间与人数</h2></div>
      <div class="form-row">
        <div class="field"><label>使用日期<span class="req">*</span></label><input type="date" v-model="form.date" :min="todayStr()" /></div>
        <div class="field"><label>开始时间<span class="req">*</span></label><input type="time" v-model="form.startAt" /></div>
        <div class="field"><label>结束时间<span class="req">*</span></label><input type="time" v-model="form.endAt" /></div>
        <div class="field"><label>使用人数<span class="req">*</span></label><input type="number" min="1" max="120" v-model.number="form.peopleCount" /></div>
      </div>
      <div class="hint">该类型单次最长 {{ rule.maxHours }} 小时；临时加人需在使用中向管理员报备。</div>
    </div>

    <div class="card">
      <div class="card-title"><h2>③ 烹饪类型与油炸申报</h2></div>
      <div class="chip-row">
        <button
          v-for="t in COOKING_TYPES"
          :key="t"
          type="button"
          class="chip"
          :class="{ on: form.cookingTypes.includes(t) }"
          @click="toggleCooking(t)"
        >
          {{ t }}
        </button>
      </div>
      <label class="checkbox">
        <input type="checkbox" :checked="form.isFrying" @change="onFrying(($event.target as HTMLInputElement).checked)" />
        <span>
          <b>本次活动涉及油炸</b> —— 将触发油炸安全专项告知：油温 ≤190℃、专人看管、废油交存废油回收点，
          结束后灶台/烟机按油炸标准验收。
        </span>
      </label>
    </div>

    <div class="card">
      <div class="card-title"><h2>④ 食材暂存与设备需求</h2></div>
      <label class="checkbox">
        <input type="checkbox" v-model="form.storageNeeded" />
        <span><b>需要食材暂存</b>（冷藏 / 冷冻 / 常温暂存架，入库须贴标签注明负责人与日期）</span>
      </label>
      <div v-if="form.storageNeeded" class="field" style="margin-left: 26px; max-width: 520px">
        <label>暂存说明</label>
        <input v-model="form.storageNote" placeholder="食材、数量、需要的温区与大致存取时间" />
      </div>
      <hr class="divider" />
      <label class="small muted" style="display: block; margin-bottom: 8px">设备需求（可多选，批准后由管理员分配具体设备并校验时段冲突）：</label>
      <div class="equip-grid">
        <div
          v-for="o in equipOptions"
          :key="o.type"
          class="equip-item"
          :class="{ on: form.equipmentNeeds.includes(o.type), disabled: o.ok === 0 || o.fullyBlocked }"
          @click="o.ok > 0 && !o.fullyBlocked && toggleEquip(o.type)"
        >
          <div style="font-size: 20px">{{ o.icon }}</div>
          <div><b>{{ o.label }}</b></div>
          <div class="tiny muted">可用 {{ o.ok }}/{{ o.total }}</div>
          <div v-if="o.affected" class="tiny" :class="o.fullyBlocked ? 'red' : 'amber'">
            {{ o.fullyBlocked ? '🚫 ' + o.affectedLabel : '⚠️ ' + o.affectedLabel }}
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h2>⑤ 负责人与食品安全告知</h2></div>
      <div class="form-row">
        <div class="field"><label>负责人姓名<span class="req">*</span></label><input v-model="form.contactName" /></div>
        <div class="field"><label>联系电话<span class="req">*</span></label><input v-model="form.contactPhone" /></div>
      </div>
      <div class="notice-box">
        <div class="small" style="margin-bottom: 6px">
          📄 <b>{{ FOOD_SAFETY_NOTICE.title }}（{{ FOOD_SAFETY_NOTICE.version }}）</b>
          <a @click="showNotice = true" style="margin-left: 8px">查看全文</a>
        </div>
        <label class="checkbox" style="padding: 0">
          <input type="checkbox" v-model="acked" />
          <span>我已阅读并同意告知书全部条款，承诺对本次活动食品安全负责。</span>
        </label>
      </div>
      <div v-if="err" class="error-text" style="margin-top: 10px">{{ err }}</div>
      <div style="margin-top: 14px; display: flex; gap: 10px">
        <button class="btn primary" @click="submit">提交预约</button>
        <button class="btn" @click="push('/bookings')">取消</button>
      </div>
    </div>

    <BaseModal v-if="showNotice" title="食品安全告知书" wide @close="showNotice = false">
      <div class="modal-body">
        <h3>{{ FOOD_SAFETY_NOTICE.title }}（{{ FOOD_SAFETY_NOTICE.version }}）</h3>
        <p v-for="(c, i) in FOOD_SAFETY_NOTICE.content" :key="i" class="small">{{ c }}</p>
      </div>
      <template #footer>
        <button class="btn primary" @click="acked = true; showNotice = false">我已阅读并同意</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.rule-detail {
  margin-top: 12px; border: 1px dashed var(--c-border); border-radius: 8px;
  padding: 10px 12px; background: var(--c-surface-2); display: flex; flex-direction: column; gap: 6px;
}
.deposit-free { margin-top: 4px; padding: 8px 10px; background: var(--c-green-soft); border-radius: 6px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.chip {
  border: 1px solid var(--c-border); background: #fff; border-radius: 20px;
  padding: 5px 16px; cursor: pointer; font-family: inherit; font-size: 13px;
}
.chip.on { background: var(--c-brand); border-color: var(--c-brand); color: #fff; }
.equip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.equip-item {
  border: 1px solid var(--c-border); border-radius: 8px; padding: 12px 8px; text-align: center;
  cursor: pointer; background: #fff; user-select: none;
}
.equip-item.on { border-color: var(--c-brand); background: var(--c-brand-soft); box-shadow: 0 0 0 2px rgba(210,105,30,.12); }
.equip-item.disabled { opacity: .4; cursor: not-allowed; }
.notice-box { border: 1px solid var(--c-border); border-radius: 8px; padding: 10px 12px; background: var(--c-surface-2); }
</style>
