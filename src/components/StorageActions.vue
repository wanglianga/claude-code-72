<script setup lang="ts">
import { ref } from 'vue'
import type { Booking, Photo, StorageDisposalAction, StorageItem } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useKitchenStore } from '@/stores/kitchen'
import { MEAT_SEAFOOD_RULE, STORAGE_FEES } from '@/rules'
import BaseModal from '@/components/BaseModal.vue'
import PhotoCapture from '@/components/PhotoCapture.vue'
import PhotoList from '@/components/PhotoList.vue'

const props = defineProps<{ item: StorageItem; booking: Booking }>()
const auth = useAuthStore()
const kitchen = useKitchenStore()

const meat = props.item.category === 'meat-seafood'
const charity = props.booking.activityKind === 'charity-class'

const mode = ref<'' | 'notify' | 'dispose'>('')
const channel = ref('电话')
const notifyNote = ref('')
const pendingNote = ref('')
const showPending = ref(false)

const action = ref<StorageDisposalAction>(meat ? 'discard' : 'discard')
const reason = ref('')
const note = ref('')
const liabilityAck = ref(false)
const feeWaived = ref(false)
const photos = ref<Photo[]>([])
const err = ref('')

const feePreview = () => {
  if (action.value === 'retrieve') return 0
  if (action.value === 'clear') return STORAGE_FEES.clearFee
  return meat ? STORAGE_FEES.meatSeafoodDiscard : STORAGE_FEES.otherDiscard
}

function openDispose(a?: StorageDisposalAction) {
  if (a) action.value = a
  mode.value = 'dispose'
  err.value = ''
}

function doNotify() {
  const r = kitchen.notifyStorage(
    props.booking,
    props.item.id,
    { channel: channel.value, note: notifyNote.value },
    auth.currentUser!.name
  )
  if (!r.ok) {
    err.value = r.msg ?? '通知失败'
    return
  }
  mode.value = ''
  notifyNote.value = ''
}

function doPending() {
  kitchen.markStoragePending(props.booking, props.item.id, pendingNote.value, auth.currentUser!.name)
  showPending.value = false
  pendingNote.value = ''
}

function addPhoto(p: Photo) {
  photos.value.push(p)
}

function doDispose() {
  err.value = ''
  const r = kitchen.disposeStorage(
    props.booking,
    props.item.id,
    {
      action: action.value,
      reason: reason.value,
      photos: photos.value,
      feeWaived: feeWaived.value,
      liabilityAck: liabilityAck.value,
      note: note.value
    },
    auth.currentUser!.name,
    auth.currentUser!.role
  )
  if (!r.ok) {
    err.value = r.msg ?? '处置失败'
    return
  }
  mode.value = ''
  reason.value = ''
  note.value = ''
  liabilityAck.value = false
  feeWaived.value = false
  photos.value = []
}
</script>

<template>
  <div class="acts">
    <template v-if="['stored', 'pending'].includes(item.state)">
      <button class="btn sm" @click="mode = 'notify'">📞 通知负责人</button>
    </template>
    <button v-if="item.state !== 'pending'" class="btn sm" @click="showPending = true">⏳ 转待处理食材</button>
    <button class="btn sm" @click="openDispose('retrieve')">✅ 负责人取回</button>
    <button v-if="!meat" class="btn sm" @click="openDispose('clear')">🧹 清空格位</button>
    <button class="btn danger sm" @click="openDispose('discard')">♻️ 依规报废</button>
    <div v-if="meat" class="tiny red" style="width: 100%">
      肉类/海鲜受食品安全规则约束：不得简单清空，只能报废或负责人取回。
    </div>

    <!-- 通知弹窗 -->
    <BaseModal v-if="mode === 'notify'" :title="`通知负责人 · ${item.ownerName}`" @close="mode = ''">
      <div class="modal-body">
        <div class="banner info"><span>📞</span><div class="bx">将通知 <b>{{ item.ownerName }} {{ item.ownerPhone }}</b>：食材「{{ item.name }}」已到/超过预计取走时间，请尽快取走；肉类海鲜无法确认冷链时将依规报废。</div></div>
        <div class="field"><label>通知方式</label>
          <select v-model="channel"><option>电话</option><option>短信</option><option>微信</option><option>现场告知</option></select>
        </div>
        <div class="field"><label>沟通记录</label><textarea v-model="notifyNote" placeholder="负责人答复、约定取回时间等"></textarea></div>
        <div v-if="err" class="error-text">{{ err }}</div>
      </div>
      <template #footer>
        <button class="btn" @click="mode = ''">取消</button>
        <button class="btn primary" @click="doNotify">记录通知</button>
      </template>
    </BaseModal>

    <!-- 转待处理 -->
    <BaseModal v-if="showPending" title="转为待处理食材" @close="showPending = false">
      <div class="modal-body">
        <div class="banner warn"><span>⏳</span><div class="bx">转为待处理后继续占位，按 <b>{{ STORAGE_FEES.pendingPerDay }} 元/天</b> 计占位费（公益课堂免收），等待负责人取回或依规处置。</div></div>
        <div class="field"><label>备注</label><input v-model="pendingNote" placeholder="如：负责人出差，三日后回" /></div>
      </div>
      <template #footer>
        <button class="btn" @click="showPending = false">取消</button>
        <button class="btn primary" @click="doPending">确认转待处理</button>
      </template>
    </BaseModal>

    <!-- 处置弹窗 -->
    <BaseModal v-if="mode === 'dispose'" :title="`食材处置 · ${item.name}`" wide @close="mode = ''">
      <div class="modal-body">
        <div v-if="meat" class="banner warn">
          <span>🥩</span>
          <div class="bx">
            <b>{{ MEAT_SEAFOOD_RULE.title }}</b>
            <div v-for="o in MEAT_SEAFOOD_RULE.options" :key="o.key" class="small" style="margin-top: 6px">
              · <b>{{ o.label }}</b>：{{ o.desc }}
            </div>
          </div>
        </div>

        <div class="field">
          <label>处置方式<span class="req">*</span></label>
          <div class="seg">
            <button :class="{ on: action === 'discard' }" @click="action = 'discard'">♻️ 依规报废（¥{{ meat ? STORAGE_FEES.meatSeafoodDiscard : STORAGE_FEES.otherDiscard }}）</button>
            <button :class="{ on: action === 'retrieve' }" @click="action = 'retrieve'">✅ 负责人取回（免费）</button>
            <button v-if="!meat" :class="{ on: action === 'clear' }" @click="action = 'clear'">🧹 清空格位（¥{{ STORAGE_FEES.clearFee }}）</button>
          </div>
        </div>

        <div class="field"><label>处置原因 / 过程<span class="req">*</span></label>
          <textarea v-model="reason" :placeholder="action === 'retrieve' ? '到场时间、包装温度确认、签收情况' : action === 'clear' ? '清空格位原因（普通食材）' : '报废依据：超时、冷链不可确认、感官异常等'"></textarea>
        </div>

        <template v-if="action === 'discard'">
          <label class="checkbox">
            <input type="checkbox" v-model="liabilityAck" />
            <span><b>责任提示已送达预约人</b>：已告知「{{ booking.contactName }}」该食材按食品安全规则报废、处置费由其承担（电话/短信记录在案）。</span>
          </label>
          <div v-if="charity" class="field" style="margin-top: 6px">
            <label class="switch"><input type="checkbox" v-model="feeWaived" /><span><b>公益豁免</b>：本活动为公益课堂，核准豁免处置费 ¥{{ feePreview() }}（仍记录责任）</span></label>
          </div>
          <h3 style="margin: 10px 0 6px">报废拍照留证（危废登记，必传）</h3>
          <PhotoCapture :by="auth.currentUser!.name" @shot="addPhoto" />
          <div style="margin-top: 8px"><PhotoList :photos="photos" /></div>
        </template>

        <div class="field" style="margin-top: 10px"><label>备注</label><input v-model="note" placeholder="选填" /></div>

        <div class="fee-line">
          本次处置费：
          <b v-if="feeWaived" class="green">¥0（公益豁免，原价 ¥{{ feePreview() }}）</b>
          <b v-else-if="feePreview() > 0">¥{{ feePreview() }}（从押金扣除）</b>
          <b v-else class="green">¥0</b>
        </div>
        <div v-if="err" class="error-text">{{ err }}</div>
      </div>
      <template #footer>
        <button class="btn" @click="mode = ''">取消</button>
        <button class="btn primary" @click="doDispose">确认处置</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.acts { display: flex; gap: 8px; flex-wrap: wrap; }
.fee-line { margin-top: 12px; padding: 9px 12px; background: var(--c-amber-soft); border-radius: 6px; font-size: 13px; }
</style>
