import { defineStore } from 'pinia'
import type {
  Acceptance,
  AcceptanceItem,
  Booking,
  DepositDispute,
  Incident,
  IncidentOwner,
  IncidentType,
  KitchenResource,
  Photo,
  Publicity,
  ResourceType,
  StorageCategory,
  StorageDisposal,
  StorageDisposalAction,
  StorageItem
} from '@/types'
import { seedBookings, seedIncidents, seedResources } from '@/seed'
import {
  ACTIVITY_RULES,
  MEAT_SEAFOOD_RULE,
  STORAGE_FEES
} from '@/rules'
import { hoursSince, nowStr, parseDateTime, uid } from '@/utils/format'
import { storageAlertKind } from '@/utils/storageAlert'
import { validateAcceptance, type AcceptFormItem } from '@/utils/access'

// 各类活动的计费费率（元/分钟）
const RATES = {
  private: { reClean: 0.67, overtime: 0.5, failPenalty: 40 },
  'neighbor-feast': { reClean: 0.34, overtime: 0.67, failPenalty: 40 },
  commercial: { reClean: 1.0, overtime: 1.0, failPenalty: 60 },
  'charity-class': { reClean: 0, overtime: 0, failPenalty: 0 }
} as const

export interface NewBookingInput {
  applicantId: string
  applicantKind: 'resident' | 'org'
  orgName?: string
  contactName: string
  contactPhone: string
  activityKind: Booking['activityKind']
  title: string
  date: string
  startAt: string
  endAt: string
  peopleCount: number
  cookingTypes: Booking['cookingTypes']
  isFrying: boolean
  storageNeeded: boolean
  storageNote?: string
  equipmentNeeds: ResourceType[]
  natureNote?: string
  depositFree: boolean
}

interface KitchenState {
  bookings: Booking[]
  incidents: Incident[]
  resources: KitchenResource[]
  disputes: DepositDispute[]
  seq: number
}

export const useKitchenStore = defineStore('kitchen', {
  state: (): KitchenState => ({
    bookings: [],
    incidents: [],
    resources: [],
    disputes: [],
    seq: 100
  }),

  getters: {
    // ---------- 预约查询 ----------
    bookingById(state) {
      return (id: string) => state.bookings.find((b) => b.id === id)
    },
    incidentsOf(state) {
      return (bookingId: string) =>
        state.incidents
          .filter((i) => i.bookingId === bookingId)
          .sort((a, b) => (a.reportedAt < b.reportedAt ? 1 : -1))
    },
    disputeOf(state) {
      return (bookingId: string) => state.disputes.find((d) => d.bookingId === bookingId)
    },
    openIncidents(state): Incident[] {
      return state.incidents.filter((i) => i.status !== 'resolved')
    },
    pendingBookings(state): Booking[] {
      return state.bookings.filter((b) => b.status === 'pending')
    },
    activeBookings(state): Booking[] {
      return state.bookings.filter((b) => ['approved', 'checked', 'closing'].includes(b.status))
    },
    openDisputes(state): DepositDispute[] {
      return state.disputes.filter((d) => ['open', 'mediating'].includes(d.status))
    },
    repairingResources(state): KitchenResource[] {
      return state.resources.filter((r) => r.status === 'repairing')
    },

    // ---------- 食材暂存超时 ----------
    /** 所有在库中的暂存食材（未取走/未终结处置） */
    activeStorageItems(state): { item: StorageItem; booking: Booking; overdueHours: number }[] {
      const out: { item: StorageItem; booking: Booking; overdueHours: number }[] = []
      for (const bk of state.bookings) {
        for (const item of bk.storageItems) {
          if (['stored', 'notified', 'pending'].includes(item.state)) {
            out.push({ item, booking: bk, overdueHours: hoursSince(item.expectedTakeAt) })
          }
        }
      }
      return out.sort((a, b) => b.overdueHours - a.overdueHours)
    },
    /**
     * 真实超时：预计取走时间已过且超过阈值（不依赖 pending 状态）。
     * 活动已取消但取走时间未到的食材不在此列。
     */
    overdueStorageItems(state): { item: StorageItem; booking: Booking; overdueHours: number }[] {
      const out: { item: StorageItem; booking: Booking; overdueHours: number }[] = []
      const now = Date.now()
      for (const bk of state.bookings) {
        for (const item of bk.storageItems) {
          if (storageAlertKind(item, bk.status, now) === 'overdue') {
            out.push({ item, booking: bk, overdueHours: hoursSince(item.expectedTakeAt, now) })
          }
        }
      }
      return out.sort((a, b) => b.overdueHours - a.overdueHours)
    },
    /** 活动取消后的滞留待处置食材（预计取走时间尚未到，不算超时，不显示负时长） */
    canceledPendingStorage(state): { item: StorageItem; booking: Booking; remainHours: number }[] {
      const out: { item: StorageItem; booking: Booking; remainHours: number }[] = []
      const now = Date.now()
      for (const bk of state.bookings) {
        for (const item of bk.storageItems) {
          if (storageAlertKind(item, bk.status, now) === 'canceled') {
            out.push({ item, booking: bk, remainHours: -hoursSince(item.expectedTakeAt, now) })
          }
        }
      }
      // 距离取走时间最近（剩余最少）的排最前，便于优先处置
      return out.sort((a, b) => a.remainHours - b.remainHours)
    },
    /** 某预约的暂存处置费合计（含豁免记录） */
    storageFeeOf(state) {
      return (bookingId: string) => {
        const bk = state.bookings.find((b) => b.id === bookingId)
        let fee = 0
        let waived = 0
        for (const it of bk?.storageItems ?? []) {
          if (it.disposal) {
            fee += it.disposal.fee
            if (it.disposal.feeWaived) waived += it.disposal.fee
          }
        }
        return { fee, waived }
      }
    },
    /** 某预约是否还有未终结处置的在库食材（验收前必须为空） */
    hasUnresolvedStorage(state) {
      return (bookingId: string) => {
        const bk = state.bookings.find((b) => b.id === bookingId)
        return (bk?.storageItems ?? []).some((i) => ['stored', 'notified', 'pending'].includes(i.state))
      }
    },
    // 当前用户的待办数量
    todoCount() {
      return (role: string, userId: string) => {
        let n = 0
        for (const b of this.bookings as Booking[]) {
          if (b.status === 'pending' && ACTIVITY_RULES[b.activityKind].approveRole === role) n++
          if (b.status === 'approved' && role === 'admin') n++
          if (b.status === 'closing' && role === 'admin') n++
        }
        for (const i of this.incidents as Incident[]) {
          if (i.status !== 'resolved' && i.owner === role) n++
        }
        for (const d of this.disputes as DepositDispute[]) {
          if (['open', 'mediating'].includes(d.status) && role === 'staff') n++
        }
        // 超时食材 + 活动取消滞留食材待处置（管理员）
        if (role === 'admin')
          n += this.overdueStorageItems.length + this.canceledPendingStorage.length
        // 申请人自己的预约待补款/待签收
        for (const b of this.bookings as Booking[]) {
          if (
            b.applicantId === userId &&
            b.status === 'pending' &&
            (!b.foodSafetyAck || (!b.depositFree && !b.depositPaid))
          )
            n++
        }
        return n
      }
    },

    // ---------- 资源占用 ----------
    /** 某资源在某日某时段是否被已批准/进行中的预约占用 */
    resourceBusyAt(state) {
      return (resourceId: string, date: string, start: string, end: string, excludeId?: string) => {
        return state.bookings.some(
          (b) =>
            b.id !== excludeId &&
            b.date === date &&
            ['approved', 'checked', 'closing'].includes(b.status) &&
            b.allocatedResourceIds.includes(resourceId) &&
            start < b.endAt &&
            b.startAt < end
        )
      }
    },

    // ---------- 复盘分析 ----------
    /** 按活动类型聚合运营效果 */
    analyticsByKind(state) {
      const kinds = ['charity-class', 'neighbor-feast', 'commercial', 'private'] as const
      return kinds.map((kind) => {
        const list = state.bookings.filter((b) => b.activityKind === kind)
        const done = list.filter((b) => b.status === 'completed')
        const ids = new Set(list.map((b) => b.id))
        const kindIncidents = state.incidents.filter((i) => ids.has(i.bookingId))
        const cleaningMin = done.reduce((s, b) => s + (b.acceptance?.cleaningExtraMinutes ?? 0), 0)
        const overtimeMin = done.reduce((s, b) => s + (b.acceptance?.overtimeMinutes ?? 0), 0)
        const failItems = done.reduce(
          (s, b) => s + (b.acceptance?.items.filter((it) => it.result === 'fail').length ?? 0),
          0
        )
        const redirtyItems = done.reduce(
          (s, b) => s + (b.acceptance?.items.filter((it) => it.result === 'redirty').length ?? 0),
          0
        )
        const withheld = done.reduce((s, b) => s + (b.depositResult?.deduction ?? 0), 0)
        return {
          kind,
          label: ACTIVITY_RULES[kind].label,
          color: ACTIVITY_RULES[kind].color,
          total: list.length,
          completed: done.length,
          people: list.reduce((s, b) => s + b.peopleCount, 0),
          incidents: kindIncidents.length,
          complaints: kindIncidents.filter((i) => i.type === 'complaint').length,
          damages: kindIncidents.filter((i) => i.type === 'damage').length,
          smoke: kindIncidents.filter((i) => i.type === 'smoke').length,
          overtimeMin,
          cleaningMin,
          failItems,
          redirtyItems,
          withheld
        }
      })
    },

    /** 设备损耗排行 */
    resourceWear(state) {
      return [...state.resources].sort((a, b) => b.wear - a.wear)
    },

    /** 近期待处理投诉 */
    recentComplaints(state) {
      return state.incidents
        .filter((i) => i.type === 'complaint')
        .sort((a, b) => (a.reportedAt < b.reportedAt ? 1 : -1))
    },

    /** 清洁超时（补清洁>0）记录 */
    cleaningOvertimeList(state) {
      return state.bookings
        .filter((b) => (b.acceptance?.cleaningExtraMinutes ?? 0) > 0)
        .sort((a, b) => (b.acceptance!.at < a.acceptance!.at ? -1 : 1))
    }
  },

  actions: {
    // ================= 持久化 =================
    hydrate() {
      const raw = localStorage.getItem('nk-kitchen')
      if (raw) {
        try {
          const data = JSON.parse(raw) as KitchenState
          this.bookings = data.bookings ?? []
          this.incidents = data.incidents ?? []
          this.resources = data.resources ?? []
          this.disputes = data.disputes ?? []
          this.seq = data.seq ?? 100
        } catch {
          this.resetDemo()
        }
      } else {
        this.resetDemo()
      }
    },
    persist() {
      localStorage.setItem(
        'nk-kitchen',
        JSON.stringify({
          bookings: this.bookings,
          incidents: this.incidents,
          resources: this.resources,
          disputes: this.disputes,
          seq: this.seq
        })
      )
    },
    resetDemo() {
      this.bookings = JSON.parse(JSON.stringify(seedBookings))
      this.incidents = JSON.parse(JSON.stringify(seedIncidents))
      this.resources = JSON.parse(JSON.stringify(seedResources))
      this.disputes = [
        {
          id: 'd-1',
          bookingId: 'b-002',
          raisedBy: '周敏',
          raisedAt: '2026-09-11 09:00',
          reason: '烤盘划伤在接手前已有旧痕，不应全额赔 160 元；地面污渍清洁费 40 元认可。',
          claimAmount: 120,
          status: 'adjusted',
          mediatorId: 'u-staff',
          resultNote: '调取使用前照片发现烤盘边缘确有旧划痕，按新旧责任 7:3 分担，赔偿由 160 调减为 120 元，合计扣费 220 元，退还 40 元。',
          adjustedDeduction: 220,
          resolvedAt: '2026-09-12 10:30'
        }
      ]
      this.seq = 100
      this.persist()
    },

    tl(b: Booking, action: string, actor: string, tone?: 'gray' | 'green' | 'red' | 'blue' | 'brand' | 'amber') {
      b.timeline.push({ at: nowStr(), actor, action, tone })
    },

    makePhoto(emoji: string, label: string, by: string, dataUrl?: string): Photo {
      return { id: uid('p'), emoji, label, takenAt: nowStr(), by, dataUrl }
    },

    // ================= 预约申请 =================
    createBooking(input: NewBookingInput): { ok: boolean; msg?: string; id?: string } {
      const rule = ACTIVITY_RULES[input.activityKind]
      if (input.endAt <= input.startAt) return { ok: false, msg: '结束时间必须晚于开始时间' }
      const [sh, sm] = input.startAt.split(':').map(Number)
      const [eh, em] = input.endAt.split(':').map(Number)
      const minutes = eh * 60 + em - (sh * 60 + sm)
      if (minutes > rule.maxHours * 60)
        return { ok: false, msg: `${rule.label}单次最长 ${rule.maxHours} 小时，请调整时段` }
      if (input.peopleCount < 1) return { ok: false, msg: '使用人数至少 1 人' }
      if (input.equipmentNeeds.length === 0) return { ok: false, msg: '请至少选择一项设备需求' }
      const depositFree = rule.depositFreeEligible && input.depositFree
      this.seq += 1
      const b: Booking = {
        id: uid('b'),
        code: `NK-${input.date.replace(/-/g, '')}-${String(this.seq).padStart(3, '0')}`,
        applicantId: input.applicantId,
        applicantKind: input.applicantKind,
        orgName: input.orgName,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        activityKind: input.activityKind,
        title: input.title,
        date: input.date,
        startAt: input.startAt,
        endAt: input.endAt,
        peopleCount: input.peopleCount,
        cookingTypes: input.cookingTypes,
        isFrying: input.isFrying,
        storageNeeded: input.storageNeeded,
        storageNote: input.storageNote,
        equipmentNeeds: input.equipmentNeeds,
        natureNote: input.natureNote,
        depositRequired: depositFree ? 0 : rule.deposit,
        depositPaid: false,
        depositFree,
        status: 'pending',
        allocatedResourceIds: [],
        storageItems: [],
        incidentIds: [],
        foodSafetyAck: false,
        createdAt: nowStr(),
        timeline: [
          {
            at: nowStr(),
            actor: input.contactName,
            action: `提交预约申请（${rule.label}，押金${depositFree ? '公益免押' : rule.deposit + ' 元'}）`,
            tone: 'brand'
          }
        ]
      }
      this.bookings.unshift(b)
      this.persist()
      return { ok: true, id: b.id }
    },

    payDeposit(b: Booking, actor: string) {
      if (b.depositFree || b.depositPaid) return
      b.depositPaid = true
      this.tl(b, `缴纳押金 ${b.depositRequired} 元`, actor, 'blue')
      this.persist()
    },

    ackFoodSafety(b: Booking, actor: string) {
      b.foodSafetyAck = true
      b.foodSafetyAckAt = nowStr()
      this.tl(b, '在线签署《共享厨房食品安全告知书》', actor, 'blue')
      this.persist()
    },

    // ================= 审批（规则差异：commercial/charity 由社区工作人员） =================
    approve(b: Booking, approverRole: string, approverName: string, comment: string) {
      const rule = ACTIVITY_RULES[b.activityKind]
      if (rule.approveRole !== approverRole)
        return { ok: false, msg: `${rule.label}须由${rule.approveRole === 'staff' ? '社区工作人员' : '厨房管理员'}审批` }
      if (!b.foodSafetyAck) return { ok: false, msg: '预约人尚未签署食品安全告知书' }
      if (!b.depositFree && !b.depositPaid) return { ok: false, msg: '押金未缴纳' }
      b.status = 'approved'
      b.approverId = approverName
      b.approveComment = comment || '同意'
      this.tl(
        b,
        `审批通过（按${rule.label}规则：${rule.cleaningRule}）`,
        approverName,
        'green'
      )
      this.persist()
      return { ok: true }
    },

    reject(b: Booking, approverName: string, comment: string) {
      b.status = 'rejected'
      b.approveComment = comment
      this.tl(b, `审批驳回：${comment}`, approverName, 'red')
      this.persist()
    },

    cancel(b: Booking, actor: string) {
      b.status = 'canceled'
      this.tl(b, '预约取消', actor, 'gray')
      this.persist()
    },

    // ================= 使用前核验 + 资源分配 =================
    allocate(b: Booking, resourceIds: string[]) {
      // 冲突检测
      for (const rid of resourceIds) {
        const r = this.resources.find((x) => x.id === rid)
        if (!r) return { ok: false, msg: '资源不存在' }
        if (r.status === 'repairing') return { ok: false, msg: `${r.name}正在维修中，不可分配` }
        const busy = this.resourceBusyAt(rid, b.date, b.startAt, b.endAt, b.id)
        if (busy) return { ok: false, msg: `${r.name}在该时段已被占用` }
      }
      b.allocatedResourceIds = resourceIds
      this.persist()
      return { ok: true }
    },

    passPreCheck(
      b: Booking,
      checkerName: string,
      data: {
        identityOk: boolean
        healthPromise: boolean
        storageOk: boolean
        equipmentOk: boolean
        note?: string
        photos: Photo[]
      }
    ): { ok: boolean; msg?: string } {
      if (!data.identityOk) return { ok: false, msg: '预约人身份核验未通过，不能开始使用' }
      if (!data.healthPromise) return { ok: false, msg: '健康承诺未签署' }
      if (!data.equipmentOk) return { ok: false, msg: '设备状态异常，需维修确认后方可使用' }
      b.preCheck = { checkerId: checkerName, at: nowStr(), ...data }
      b.status = 'checked'
      this.tl(b, '使用前核验通过（预约人/健康承诺/食材存放/设备状态），活动开始', checkerName, 'green')
      this.persist()
      return { ok: true }
    },

    // 食材暂存：入库必须记录格位、时间、标签、负责人
    putStorage(
      b: Booking,
      data: {
        name: string
        zone: string
        category: StorageCategory
        label?: string
        ownerName: string
        ownerPhone: string
        expectedTakeAt: string
      },
      actor: string
    ): { ok: boolean; msg?: string } {
      if (!data.name.trim() || !data.zone.trim()) return { ok: false, msg: '请填写食材名称与存放格位' }
      if (!data.ownerName.trim() || !data.ownerPhone.trim())
        return { ok: false, msg: '负责人姓名与电话必填（超时通知需要）' }
      if (!data.expectedTakeAt) return { ok: false, msg: '请填写预计取走时间' }
      const expectedAt =
        data.expectedTakeAt.length === 5 ? `${b.date} ${data.expectedTakeAt}` : data.expectedTakeAt
      if (parseDateTime(expectedAt) <= Date.now())
        return { ok: false, msg: '预计取走时间必须晚于当前时间' }
      const item: StorageItem = {
        id: uid('st'),
        name: data.name.trim(),
        zone: data.zone.trim(),
        category: data.category,
        label: data.label?.trim() || `${data.name.trim()} / ${data.ownerName.trim()} ${data.ownerPhone.trim()} / ${expectedAt.slice(5, 10)}`,
        putAt: nowStr(),
        putBy: actor,
        ownerName: data.ownerName.trim(),
        ownerPhone: data.ownerPhone.trim(),
        expectedTakeAt: expectedAt,
        state: 'stored',
        notifications: [],
        history: [{ at: nowStr(), by: actor, action: `入库${data.zone.trim()}，粘贴标签` }]
      }
      b.storageItems.push(item)
      this.tl(b, `食材入库暂存：${item.name} → ${item.zone}（负责人 ${item.ownerName}）`, actor, 'blue')
      this.persist()
      return { ok: true }
    },

    /** 负责人正常取走 */
    takeStorage(b: Booking, itemId: string, actor: string) {
      const it = b.storageItems.find((x) => x.id === itemId)
      if (!it || !['stored', 'notified', 'pending'].includes(it.state)) return
      it.state = 'taken'
      it.takeAt = nowStr()
      it.history.push({ at: nowStr(), by: actor, action: '负责人取走' })
      this.tl(b, `食材取走：${it.name}`, actor, 'gray')
      this.persist()
    },

    /** 通知负责人（可多次，记录电话/短信/现场告知） */
    notifyStorage(
      b: Booking,
      itemId: string,
      data: { channel: string; note?: string },
      actor: string
    ): { ok: boolean; msg?: string } {
      const it = b.storageItems.find((x) => x.id === itemId)
      if (!it || !['stored', 'pending'].includes(it.state)) return { ok: false, msg: '当前状态无需通知' }
      it.notifications.push({ at: nowStr(), by: actor, channel: data.channel, note: data.note })
      it.state = 'notified'
      it.history.push({ at: nowStr(), by: actor, action: `通过${data.channel}通知负责人${data.note ? '：' + data.note : ''}` })
      this.tl(b, `超时食材通知：${it.name}（负责人 ${it.ownerName} ${it.ownerPhone}，${data.channel}）`, actor, 'amber')
      this.persist()
      return { ok: true }
    },

    /** 转为待处理食材（继续占位，按天计占位费，等待负责人取回或报废决定） */
    markStoragePending(b: Booking, itemId: string, note: string, actor: string) {
      const it = b.storageItems.find((x) => x.id === itemId)
      if (!it || it.state === 'taken' || it.state === 'disposed' || it.state === 'cleared') return
      it.state = 'pending'
      it.history.push({ at: nowStr(), by: actor, action: `转为待处理食材${note ? '：' + note : ''}` })
      this.tl(b, `「${it.name}」转为待处理食材，等待负责人取回或依规处置`, actor, 'red')
      this.persist()
    },

    /**
     * 终结处置：报废 / 取回 / 清空
     * - 肉类海鲜只允许 discard 或 retrieve（禁止 clear）
     * - discard 必须确认责任提示 + 拍照；肉类海鲜 60，普通 30
     * - clear 仅非肉类海鲜，20 元清空格位
     * - 公益活动可豁免处置费（记录在案）
     */
    disposeStorage(
      b: Booking,
      itemId: string,
      data: {
        action: StorageDisposalAction
        reason: string
        photos: Photo[]
        feeWaived: boolean
        liabilityAck: boolean
        note?: string
      },
      actor: string,
      actorRole: string
    ): { ok: boolean; msg?: string; fee?: number } {
      if (actorRole !== 'admin' && actorRole !== 'staff')
        return { ok: false, msg: '仅厨房管理员 / 社区工作人员可以处置暂存食材' }
      const it = b.storageItems.find((x) => x.id === itemId)
      if (!it) return { ok: false, msg: '暂存记录不存在' }
      if (['taken', 'disposed', 'cleared'].includes(it.state)) return { ok: false, msg: '该食材已终结处置' }
      const meatSeafood = it.category === 'meat-seafood'
      if (meatSeafood && data.action === 'clear') {
        return { ok: false, msg: MEAT_SEAFOOD_RULE.title + '：肉类/海鲜不得简单清空，必须「依规报废」或「联系负责人取回」' }
      }
      if (data.action === 'discard') {
        if (!data.liabilityAck)
          return { ok: false, msg: '报废前必须确认已向预约人提示责任承担' }
        if (data.photos.length === 0) return { ok: false, msg: '报废必须拍照留证（危废登记）' }
      }
      if (!data.reason.trim()) return { ok: false, msg: '请填写处置原因' }

      // 费用计算
      let fee = 0
      if (data.action === 'discard') fee = meatSeafood ? STORAGE_FEES.meatSeafoodDiscard : STORAGE_FEES.otherDiscard
      if (data.action === 'clear') fee = STORAGE_FEES.clearFee
      if (data.action === 'retrieve') fee = 0
      const canWaive = b.activityKind === 'charity-class'
      const feeWaived = data.feeWaived && canWaive && fee > 0
      if (data.feeWaived && !canWaive)
        return { ok: false, msg: '仅公益课堂活动可申请处置费豁免' }
      const charged = feeWaived ? 0 : fee

      const disposal: StorageDisposal = {
        action: data.action,
        at: nowStr(),
        by: actor,
        reason: data.reason.trim(),
        photos: data.photos,
        fee: charged,
        feeWaived,
        liabilityAck: data.liabilityAck,
        note: data.note
      }
      it.disposal = disposal
      if (data.action === 'retrieve') {
        it.state = 'taken'
        it.takeAt = nowStr()
      } else if (data.action === 'discard') {
        it.state = 'disposed'
      } else {
        it.state = 'cleared'
      }
      it.history.push({
        at: nowStr(),
        by: actor,
        action:
          data.action === 'discard'
            ? `依规报废（${meatSeafood ? '肉类/海鲜食品安全流程' : '普通食材'}，${feeWaived ? '公益豁免处置费' : '处置费 ' + charged + ' 元'}）`
            : data.action === 'retrieve'
              ? '负责人到场确认包装温度完好，签收取回'
              : `清空格位（${charged} 元）`
      })

      // 时间线与押金影响
      if (data.action === 'discard') {
        this.tl(
          b,
          `食材「${it.name}」依规报废，${feeWaived ? '公益活动豁免处置费' : `处置费 ${charged} 元由负责人承担`}`,
          actor,
          feeWaived ? 'blue' : 'red'
        )
      } else if (data.action === 'retrieve') {
        this.tl(b, `超时食材「${it.name}」由负责人 ${it.ownerName} 取回，无费用`, actor, 'green')
      } else {
        this.tl(b, `管理员清空「${it.name}」格位，清空格位费 ${charged} 元`, actor, 'amber')
      }
      // 押金影响：
      // - 已完成：追加到验收押金决定
      // - 未完成（含活动取消后滞留）：即时登记一笔押金扣费，验收时合并试算
      if (charged > 0 && !b.depositFree) {
        const reasonText = `食材「${it.name}」${data.action === 'discard' ? '超时报废' : '清空格位'}费 ${charged} 元`
        if (b.depositResult && b.status === 'completed') {
          b.depositResult.deduction = Math.min(b.depositRequired, b.depositResult.deduction + charged)
          b.depositResult.reasons.push('验收后追加：' + reasonText)
          disposal.postedToDeposit = true
        } else {
          // 即时落账（活动取消/验收前），验收押金试算不再重复计入
          if (!b.depositResult) {
            b.depositResult = {
              decision: 'partial',
              deduction: 0,
              reasons: [],
              decidedBy: actor,
              decidedAt: nowStr()
            }
          }
          b.depositResult.deduction = Math.min(b.depositRequired, b.depositResult.deduction + charged)
          if (!b.depositResult.reasons.includes(reasonText)) b.depositResult.reasons.push(reasonText)
          disposal.postedToDeposit = true
        }
      } else if (charged === 0) {
        disposal.postedToDeposit = true
      }
      this.persist()
      return { ok: true, fee: charged }
    },

    /** 待处理食材占位费（按天，不足一天按一天） */
    pendingDays(it: StorageItem): number {
      if (it.state !== 'pending') return 0
      const start = it.notifications.length
        ? parseDateTime(it.notifications[it.notifications.length - 1].at)
        : parseDateTime(it.expectedTakeAt)
      return Math.max(1, Math.ceil((Date.now() - start) / 86400000))
    },

    // ================= 使用中事件（多角色协作） =================
    reportIncident(
      bookingId: string,
      data: {
        type: IncidentType
        title: string
        detail: string
        level: Incident['level']
        reportedBy: string
        owner?: IncidentOwner
        photos: Photo[]
        resourceId?: string
      }
    ): Incident {
      const inc: Incident = {
        id: uid('i'),
        bookingId,
        type: data.type,
        title: data.title,
        detail: data.detail,
        level: data.level,
        reportedBy: data.reportedBy,
        reportedAt: nowStr(),
        status: 'open',
        owner: data.owner ?? 'admin',
        photos: data.photos ?? [],
        resourceId: data.resourceId
      }
      this.incidents.push(inc)
      const b = this.bookingById(bookingId)
      if (b) {
        b.incidentIds.push(inc.id)
        this.tl(b, `上报事件【${data.title}】，转${this.ownerLabel(inc.owner)}处理`, data.reportedBy, 'red')
      }
      this.persist()
      return inc
    },

    ownerLabel(owner: IncidentOwner) {
      return { admin: '管理员', cleaner: '保洁', repair: '维修', staff: '社区工作人员' }[owner]
    },

    assignIncident(inc: Incident, owner: IncidentOwner, actor: string) {
      inc.owner = owner
      inc.status = 'processing'
      const b = this.bookingById(inc.bookingId)
      if (b) this.tl(b, `事件【${inc.title}】改派给${this.ownerLabel(owner)}`, actor, 'blue')
      this.persist()
    },

    /**
     * 处理事件
     * - damage 可带 wearImpact / compensation，损耗计入设备；可选将设备置为维修中
     * - extra-people 可带 extraPeople，调整预约人数
     * - overtime 可带 overtimeMinutes，计入预约（验收时汇总）
     * - cleaningExtra 标记需要补清洁
     */
    resolveIncident(
      inc: Incident,
      data: {
        handlerName: string
        note: string
        wearImpact?: number
        compensation?: number
        extraPeople?: number
        overtimeMinutes?: number
        cleaningExtra?: boolean
        sendToRepair?: boolean
        resourceId?: string
      }
    ) {
      inc.status = 'resolved'
      inc.handlerId = data.handlerName
      inc.handleNote = data.note
      inc.resolvedAt = nowStr()
      inc.wearImpact = data.wearImpact
      inc.compensation = data.compensation
      inc.cleaningExtra = data.cleaningExtra
      inc.overtimeMinutes = data.overtimeMinutes
      const b = this.bookingById(inc.bookingId)

      if (data.extraPeople && b) {
        inc.extraPeople = data.extraPeople
        b.peopleCount += data.extraPeople
        this.tl(b, `临时加人 ${data.extraPeople} 人，现共 ${b.peopleCount} 人`, data.handlerName, 'amber')
      }
      const rid = data.resourceId ?? inc.resourceId
      if (inc.type === 'damage' && rid) {
        const r = this.resources.find((x) => x.id === rid)
        if (r) {
          if (data.wearImpact) r.wear = Math.min(100, r.wear + data.wearImpact)
          if (data.sendToRepair) {
            r.status = 'repairing'
            r.note = data.note
          }
        }
      }
      if (b) {
        const parts: string[] = []
        if (data.compensation) parts.push(`核定赔偿 ${data.compensation} 元`)
        if (data.overtimeMinutes) parts.push(`核定超时 ${data.overtimeMinutes} 分钟`)
        if (data.cleaningExtra) parts.push('需补清洁')
        this.tl(
          b,
          `事件【${inc.title}】处理完成${parts.length ? '（' + parts.join('，') + '）' : ''}`,
          data.handlerName,
          'green'
        )
      }
      this.persist()
    },

    setResourceStatus(r: KitchenResource, status: KitchenResource['status'], note: string) {
      r.status = status
      r.note = note
      if (status === 'ok' && r.wear > 100) r.wear = 100
      this.persist()
    },

    // ================= 结束使用 → 逐项验收 → 押金 =================
    finishUsing(b: Booking, actor: string) {
      b.status = 'closing'
      this.tl(b, '活动结束，预约人申请验收', actor, 'amber')
      this.persist()
    },

    /** 根据七项验收结果与活动规则自动试算扣费（接受表单态或正式验收对象） */
    computeDeposit(
      b: Booking,
      acceptance: {
        checkerId?: string
        at?: string
        overtimeMinutes: number
        cleaningExtraMinutes: number
        items: { result: string; label: string }[]
      }
    ) {
      const rate = RATES[b.activityKind]
      const fails = acceptance.items.filter((i) => i.result === 'fail')
      const redirties = acceptance.items.filter((i) => i.result === 'redirty')
      const reasons: string[] = []
      let deduction = 0

      // 食材暂存处置费 / 待处理占位费（公益活动经豁免的部分不计）
      for (const it of b.storageItems) {
        if (it.disposal && it.disposal.fee > 0) {
          reasons.push(
            `食材「${it.name}」${it.disposal.action === 'discard' ? '超时报废' : '清空格位'}费 ${it.disposal.fee} 元`
          )
          deduction += it.disposal.fee
        }
        if (it.state === 'pending') {
          const days = this.pendingDays(it)
          const fee = days * STORAGE_FEES.pendingPerDay
          if (b.activityKind === 'charity-class') {
            reasons.push(`食材「${it.name}」待处理占位 ${days} 天（公益活动占位费免收）`)
          } else {
            reasons.push(`食材「${it.name}」待处理占位 ${days} 天 × ${STORAGE_FEES.pendingPerDay} 元 = ${fee} 元`)
            deduction += fee
          }
        }
      }

      const comp = this.incidents
        .filter((i) => i.bookingId === b.id && i.type === 'damage')
        .reduce((s, i) => s + (i.compensation ?? 0), 0)
      if (comp > 0) {
        reasons.push(`设备损坏赔偿 ${comp} 元`)
        deduction += comp
      }
      if (fails.length) {
        const fee = fails.length * rate.failPenalty
        if (fee > 0) {
          reasons.push(`${fails.length} 项验收不合格，重清洁费 ${fee} 元（${fails.map((f) => f.label).join('、')}）`)
          deduction += fee
        } else {
          reasons.push(`${fails.length} 项不合格，由社区保洁免费返工（${fails.map((f) => f.label).join('、')}）`)
        }
      }
      if (acceptance.cleaningExtraMinutes > 0) {
        const fee = Math.round(acceptance.cleaningExtraMinutes * rate.reClean)
        if (fee > 0) {
          reasons.push(`补清洁 ${acceptance.cleaningExtraMinutes} 分钟，工时费 ${fee} 元`)
          deduction += fee
        } else if (redirties.length) {
          reasons.push(`补清洁 ${acceptance.cleaningExtraMinutes} 分钟（公益活动由社区保洁承担）`)
        }
      }
      if (acceptance.overtimeMinutes > 0) {
        const fee = Math.round(acceptance.overtimeMinutes * rate.overtime)
        if (fee > 0) {
          reasons.push(`超时 ${acceptance.overtimeMinutes} 分钟，占用费 ${fee} 元`)
          deduction += fee
        } else {
          reasons.push(`超时 ${acceptance.overtimeMinutes} 分钟（公益活动免收占用费）`)
        }
      }
      return { deduction: Math.round(deduction), reasons }
    },

    submitAcceptance(
      b: Booking,
      checkerName: string,
      checkerRole: string,
      data: {
        items: AcceptFormItem[]
        overtimeMinutes: number
        cleaningExtraMinutes: number
        overallComment?: string
      }
    ): { ok: boolean; msg?: string; deduction?: number; reasons?: string[] } {
      // 权限兜底：仅厨房管理员可出具验收
      if (checkerRole !== 'admin') {
        return { ok: false, msg: '仅厨房管理员可以提交验收' }
      }
      // 完整性兜底：空验收（未逐项检查 / 无总评 / 无留证）一律拒绝，状态保持「待验收」
      const v = validateAcceptance(
        data.items,
        data.overallComment ?? '',
        data.overtimeMinutes,
        data.cleaningExtraMinutes
      )
      if (!v.ok) return { ok: false, msg: v.msg }

      // 验收前所有在库食材必须已取走或完成处置
      const unresolved = b.storageItems.filter((i) => ['stored', 'notified', 'pending'].includes(i.state))
      if (unresolved.length) {
        return {
          ok: false,
          msg: `还有 ${unresolved.length} 项暂存食材未取走/未处置（${unresolved.map((i) => i.name).join('、')}），请先通知负责人并完成报废/取回/清空后再验收`
        }
      }

      // 规范化为领域对象（此时 7 项均已显式确认）
      const items: AcceptanceItem[] = data.items.map((i) => ({
        key: i.key,
        label: i.label,
        result: i.result as AcceptanceItem['result'],
        note: i.note,
        photos: i.photos
      }))
      const acceptance: Acceptance = {
        checkerId: checkerName,
        at: nowStr(),
        overtimeMinutes: data.overtimeMinutes,
        cleaningExtraMinutes: data.cleaningExtraMinutes,
        items,
        overallComment: data.overallComment
      }
      b.acceptance = acceptance
      b.status = 'completed'
      this.tl(
        b,
        `七项逐项验收完成：${items.filter((i) => i.result === 'pass').length} 合格 / ` +
          `${items.filter((i) => i.result === 'redirty').length} 补清洁 / ` +
          `${items.filter((i) => i.result === 'fail').length} 不合格`,
        checkerName,
        items.some((i) => i.result !== 'pass') ? 'amber' : 'green'
      )

      // 押金决定
      const { deduction, reasons } = this.computeDeposit(b, acceptance)
      if (b.depositFree) {
        b.depositResult = {
          decision: 'none',
          deduction: 0,
          reasons: reasons.length ? reasons : ['公益活动免押，无押金可退'],
          decidedBy: checkerName,
          decidedAt: nowStr()
        }
        this.tl(b, '公益免押活动：免押结算，损坏赔偿另行追偿', checkerName, 'blue')
      } else if (deduction === 0) {
        b.depositResult = { decision: 'full-refund', deduction: 0, reasons: [], decidedBy: checkerName, decidedAt: nowStr() }
        this.tl(b, `验收合格，押金 ${b.depositRequired} 元全额退还`, checkerName, 'green')
      } else if (deduction >= b.depositRequired) {
        b.depositResult = {
          decision: 'forfeit',
          deduction: b.depositRequired,
          reasons: [...reasons, `应扣 ${deduction} 元已超过押金 ${b.depositRequired} 元，押金全额扣除，超出部分另行追偿`],
          decidedBy: checkerName,
          decidedAt: nowStr()
        }
        this.tl(b, `押金 ${b.depositRequired} 元全额扣除（应扣 ${deduction} 元）`, checkerName, 'red')
      } else {
        b.depositResult = { decision: 'partial', deduction, reasons, decidedBy: checkerName, decidedAt: nowStr() }
        this.tl(b, `押金扣费 ${deduction} 元，退还 ${b.depositRequired - deduction} 元`, checkerName, 'amber')
      }
      this.persist()
      return { ok: true, deduction, reasons }
    },

    // ================= 押金争议（社区工作人员调解） =================
    raiseDispute(b: Booking, reason: string, claimAmount: number, raisedBy: string) {
      const d: DepositDispute = {
        id: uid('d'),
        bookingId: b.id,
        raisedBy,
        raisedAt: nowStr(),
        reason,
        claimAmount,
        status: 'open'
      }
      this.disputes.push(d)
      this.tl(b, `对押金扣费提出争议，主张退还 ${claimAmount} 元`, raisedBy, 'amber')
      if (b.depositResult) b.depositResult.disputeId = d.id
      this.persist()
    },
    mediateDispute(
      d: DepositDispute,
      outcome: 'upheld' | 'adjusted' | 'rejected',
      mediatorName: string,
      note: string,
      adjustedDeduction?: number
    ) {
      d.status = outcome === 'upheld' ? 'upheld' : outcome === 'adjusted' ? 'adjusted' : 'rejected'
      d.mediatorId = mediatorName
      d.resultNote = note
      d.resolvedAt = nowStr()
      const b = this.bookingById(d.bookingId)
      if (!b || !b.depositResult) return
      if (outcome === 'upheld') {
        d.adjustedDeduction = 0
        this.tl(b, `争议调解成立：押金全额退还 ${b.depositResult.deduction} 元`, mediatorName, 'green')
        b.depositResult.deduction = 0
        b.depositResult.decision = 'full-refund'
      } else if (outcome === 'adjusted' && adjustedDeduction != null) {
        const old = b.depositResult.deduction
        d.adjustedDeduction = adjustedDeduction
        b.depositResult.deduction = adjustedDeduction
        b.depositResult.decision = 'partial'
        this.tl(b, `争议调解：扣费由 ${old} 元调整为 ${adjustedDeduction} 元，退还差额`, mediatorName, 'blue')
      } else {
        this.tl(b, '争议调解：维持原扣费决定', mediatorName, 'gray')
      }
      b.depositResult.reasons = [...b.depositResult.reasons, `争议调解结果：${note}`]
      this.persist()
    },

    // ================= 限制后续预约 =================
    setRestriction(b: Booking, restricted: boolean, reason: string, actor: string) {
      b.restricted = restricted
      b.restrictReason = restricted ? reason : undefined
      this.tl(b, restricted ? `因「${reason}」限制后续预约` : '解除预约限制', actor, restricted ? 'red' : 'green')
      this.persist()
    },

    // ================= 社区公示 =================
    publish(b: Booking, data: Omit<Publicity, 'published' | 'publishedAt' | 'by'>, actor: string) {
      b.publicity = { ...data, published: true, publishedAt: nowStr(), by: actor }
      this.tl(b, data.board ? `发布社区公示并上公示栏：${data.title}` : `发布社区公示：${data.title}`, actor, 'blue')
      this.persist()
    }
  }
})
