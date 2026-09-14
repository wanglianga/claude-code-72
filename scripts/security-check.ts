/**
 * 安全回归用例（Node 内执行，不依赖浏览器）：
 * A. 数据隔离：两个居民账号互相访问对方/其他组织预约均被拒绝；保洁/维修按职责访问
 * B. 验收空操作：七项未逐项确认 / 无总评 / 非管理员提交，一律拒绝且状态不变
 * C. 完整七项确认后才生成验收与押金决定
 */
import { createPinia, setActivePinia } from 'pinia'

// ---- 浏览器环境垫片 ----
const mem = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => mem.set(k, v),
  removeItem: (k: string) => mem.delete(k),
  clear: () => mem.clear()
}

import { useKitchenStore } from '@/stores/kitchen'
import { canViewBooking, emptyAcceptanceItems, validateAcceptance } from '@/utils/access'
import { storageAlertKind, overtimeHours, storageTimeText } from '@/utils/storageAlert'
import type { Booking, Photo } from '@/types'

let pass = 0
let fail = 0
function assert(name: string, cond: boolean, extra = '') {
  if (cond) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    console.error(`  ❌ ${name} ${extra}`)
  }
}

setActivePinia(createPinia())
const kitchen = useKitchenStore()
kitchen.hydrate()

const b001 = kitchen.bookingById('b-001')! // 王秀兰的邻里宴
const b002 = kitchen.bookingById('b-002')! // 绿洲餐社商业试吃（u-org2）
const b006 = kitchen.bookingById('b-006')! // 待验收邻里宴

// ================= A. 越权访问 =================
console.log('\n[A] 预约记录数据隔离（canViewBooking）')
const U = {
  wang: 'u-res1', // 王秀兰
  li: 'u-res2', // 李建国（另一个居民）
  org2: 'u-org2', // 绿洲餐社（b-002 的申请人）
  org1: 'u-org1' // 阳光公益（第三方组织）
}

// 王秀兰直接访问 #/booking/b-002（其他组织的商业活动，含电话/押金/食材敏感资料）
assert('居民王秀兰 访问 绿洲餐社商业试吃 b-002 → 拒绝', canViewBooking(b002, 'resident', U.wang, kitchen.incidents) === false)
// 第二个居民账号李建国访问 b-002
assert('居民李建国 访问 b-002 → 拒绝', canViewBooking(b002, 'resident', U.li, kitchen.incidents) === false)
// 另一个组织（阳光公益）访问绿洲餐社的预约
assert('组织阳光公益 访问 其他组织 b-002 → 拒绝', canViewBooking(b002, 'resident', U.org1, kitchen.incidents) === false)
// 王秀兰访问李建国的 b-004
assert('居民王秀兰 访问 李建国 b-004 → 拒绝', canViewBooking(kitchen.bookingById('b-004')!, 'resident', U.wang, kitchen.incidents) === false)
// 本人可访问
assert('绿洲餐社 访问 自己的 b-002 → 允许', canViewBooking(b002, 'resident', U.org2, kitchen.incidents) === true)
assert('王秀兰 访问 自己的 b-001 → 允许', canViewBooking(b001, 'resident', U.wang, kitchen.incidents) === true)
// 管理角色全量
assert('管理员 访问 b-002 → 允许', canViewBooking(b002, 'admin', 'u-admin', kitchen.incidents) === true)
assert('社区工作人员 访问 b-002 → 允许', canViewBooking(b002, 'staff', 'u-staff', kitchen.incidents) === true)
// 保洁：b-002 有食材混放事件（owner=cleaner）可看；b-001 无事件不可看
assert('保洁 访问 有食材混放事件的 b-002 → 允许（职责内）', canViewBooking(b002, 'cleaner', 'u-clean', kitchen.incidents) === true)
assert('保洁 访问 与己无关的 b-001 → 拒绝', canViewBooking(b001, 'cleaner', 'u-clean', kitchen.incidents) === false)
// 维修：b-002 有设备损坏事件（owner=repair）可看；b-001 不可看
assert('维修 访问 有设备损坏事件的 b-002 → 允许（职责内）', canViewBooking(b002, 'repair', 'u-repair', kitchen.incidents) === true)
assert('维修 访问 与己无关的 b-001 → 拒绝', canViewBooking(b001, 'repair', 'u-repair', kitchen.incidents) === false)

// ================= B. 空验收不得通过（纯函数 + store 双兜底） =================
console.log('\n[B] 七项验收显式确认 —— 空操作必须被拒绝')

// B1. 初始七项「未检查」+ 无总评
let items = emptyAcceptanceItems()
let v = validateAcceptance(items, '', 0, 0)
assert('校验器拒绝：七项均未检查', v.ok === false && /尚未检查/.test(v.msg ?? ''), JSON.stringify(v))

// B2. 只勾两项其余未检查
items[0].result = 'pass'
items[1].result = 'pass'
v = validateAcceptance(items, '总评', 0, 0)
assert('校验器拒绝：仍有 5 项未检查', v.ok === false && /尚未检查/.test(v.msg ?? ''))

// B3. 七项全合格但无总评
items = emptyAcceptanceItems().map((i) => ({ ...i, result: 'pass' as const }))
v = validateAcceptance(items, '', 0, 0)
assert('校验器拒绝：七项合格但无总评', v.ok === false && /总评/.test(v.msg ?? ''))

// B4. 有不合格项但没填描述/没拍照
items = emptyAcceptanceItems().map((i) => ({ ...i, result: 'pass' as const }))
items[4].result = 'fail' // 地面不合格
v = validateAcceptance(items, '总评', 0, 0)
assert('校验器拒绝：不合格项缺问题描述', v.ok === false && /描述/.test(v.msg ?? ''))
items[4].note = '地面面糊未清理'
v = validateAcceptance(items, '总评', 0, 0)
assert('校验器拒绝：不合格项缺现场照片', v.ok === false && /照片/.test(v.msg ?? ''))

// B5. store 层：空验收提交，状态/押金必须保持不变
kitchen.resetDemo()
const target = kitchen.bookingById('b-006')!
const beforeStatus = target.status
const beforeAccept = target.acceptance
const beforeDeposit = target.depositResult
const emptyItems = emptyAcceptanceItems()
let r = kitchen.submitAcceptance(target, '张管理', 'admin', {
  items: emptyItems,
  overtimeMinutes: 0,
  cleaningExtraMinutes: 0,
  overallComment: ''
})
assert('store 拒绝空验收提交', r.ok === false)
assert('空验收后状态仍为「待验收」', kitchen.bookingById('b-006')!.status === beforeStatus, kitchen.bookingById('b-006')!.status)
assert('空验收未生成 acceptance', kitchen.bookingById('b-006')!.acceptance === beforeAccept)
assert('空验收未生成押金决定', kitchen.bookingById('b-006')!.depositResult === beforeDeposit)

// B6. 非管理员（居民本人）尝试提交验收 → 拒绝
r = kitchen.submitAcceptance(target, '王秀兰', 'resident', {
  items: emptyAcceptanceItems().map((i) => ({ ...i, result: 'pass' as const })),
  overtimeMinutes: 0,
  cleaningExtraMinutes: 0,
  overallComment: '我觉得很干净'
})
assert('store 拒绝非管理员提交验收', r.ok === false && /管理员/.test(r.msg ?? ''))
assert('被拒后状态仍为「待验收」', kitchen.bookingById('b-006')!.status === 'closing')

// B7. 即使数据伪造为七项 pass 但缺总评，store 兜底仍拒绝
r = kitchen.submitAcceptance(target, '张管理', 'admin', {
  items: emptyAcceptanceItems().map((i) => ({ ...i, result: 'pass' as const })),
  overtimeMinutes: 0,
  cleaningExtraMinutes: 0,
  overallComment: ''
})
assert('store 兜底拒绝「七项 pass 但无总评」', r.ok === false)
assert('状态仍为「待验收」，押金决定未生成', kitchen.bookingById('b-006')!.status === 'closing' && !kitchen.bookingById('b-006')!.depositResult)

// ================= C. 完整确认后生成验收与押金决定 =================
console.log('\n[C] 七项完整确认 + 总评 → 正常生成验收与押金决定')
const photo: Photo = { id: 'p-test', emoji: '🧴', label: '验收现场', takenAt: '2026-09-13 14:00', by: '张管理' }

// 验收前置：b-006 有超时未取的炸肉丸（st-4），负责人取回（免费）后才允许验收
function resolveB006Storage() {
  const t = kitchen.bookingById('b-006')!
  const mb = t.storageItems.find((i) => i.name.includes('炸肉丸'))
  if (mb && ['stored', 'notified', 'pending'].includes(mb.state)) {
    kitchen.disposeStorage(
      t, mb.id,
      { action: 'retrieve', reason: '负责人到场签收，确认包装温度完好后取回', photos: [], feeWaived: false, liabilityAck: false },
      '张管理', 'admin'
    )
  }
}

// C1. 七项全合格 + 总评 → 完成，押金 200 全额退
resolveB006Storage()
r = kitchen.submitAcceptance(target, '张管理', 'admin', {
  items: emptyAcceptanceItems().map((i) => ({ ...i, result: 'pass' as const })),
  overtimeMinutes: 0,
  cleaningExtraMinutes: 0,
  overallComment: '组织有序，卫生良好。'
})
assert('七项全合格提交成功', r.ok === true, JSON.stringify(r))
assert('预约状态变为已完成', kitchen.bookingById('b-006')!.status === 'completed')
assert('生成 7 项验收记录', kitchen.bookingById('b-006')!.acceptance?.items.length === 7)
assert('押金决定：全额退还、扣费 0', kitchen.bookingById('b-006')!.depositResult?.decision === 'full-refund' && kitchen.bookingById('b-006')!.depositResult?.deduction === 0)

// C2. 重置后走「地面不合格（有照片+描述）+ 灶台补清洁」→ 扣费决定
kitchen.resetDemo()
const target2 = kitchen.bookingById('b-006')!
const items2 = emptyAcceptanceItems().map((i) => ({ ...i, result: 'pass' as const }))
items2[0].result = 'redirty'
items2[0].note = '灶台有油污需要补清洁'
items2[4].result = 'fail'
items2[4].note = '地面有顽固污渍'
items2[4].photos.push(photo)
resolveB006Storage()
r = kitchen.submitAcceptance(target2, '张管理', 'admin', {
  items: items2,
  overtimeMinutes: 40,
  cleaningExtraMinutes: 30,
  overallComment: '整体配合较好，但卫生需返工。'
})
assert('问题项证据齐全时提交成功', r.ok === true, JSON.stringify(r))
assert('产生押金扣费（>0）', (r.deduction ?? 0) > 0, `deduction=${r.deduction}`)
assert('验收记录含 1 不合格 + 1 补清洁', (() => {
  const its = kitchen.bookingById('b-006')!.acceptance!.items
  return its.filter((i) => i.result === 'fail').length === 1 && its.filter((i) => i.result === 'redirty').length === 1
})())

// ================= D. 食材暂存超时处置 =================
console.log('\n[D] 食材暂存超时：通知 / 待处理 / 报废 / 取回 / 清空 与押金联动')

kitchen.resetDemo()
const b008 = kitchen.bookingById('b-008')! // 已取消，虾仁(肉类 pending) + 饺子皮(stored)
const shrimp = b008.storageItems.find((i) => i.name.includes('虾仁'))!
const wrapper = b008.storageItems.find((i) => i.name.includes('饺子皮'))!
const photoD: Photo = { id: 'p-d1', emoji: '🥩', label: '危废报废登记照', takenAt: '2026-09-15 12:00', by: '张管理' }

// D0. 隔离：王秀兰（第三方居民）不能访问李建国的取消预约
assert('居民王秀兰 访问 李建国取消的 b-008 → 拒绝', canViewBooking(b008, 'resident', U.wang, kitchen.incidents) === false)

// D1. 非管理员不能处置
let rd = kitchen.disposeStorage(
  b008, shrimp.id,
  { action: 'discard', reason: '超时', photos: [photoD], feeWaived: false, liabilityAck: true },
  '王秀兰', 'resident'
)
assert('非管理员报废食材 → 拒绝', rd.ok === false && /管理员/.test(rd.msg ?? ''))

// D2. 肉类/海鲜不允许简单清空
rd = kitchen.disposeStorage(
  b008, shrimp.id,
  { action: 'clear', reason: '随便扔掉', photos: [], feeWaived: false, liabilityAck: false },
  '张管理', 'admin'
)
assert('肉类/海鲜清空格位 → 拒绝（必须报废或取回）', rd.ok === false && /肉类\/海鲜/.test(rd.msg ?? ''))

// D3. 报废必须责任确认 + 拍照
rd = kitchen.disposeStorage(
  b008, shrimp.id,
  { action: 'discard', reason: '超时无法确认冷链', photos: [], feeWaived: false, liabilityAck: false },
  '张管理', 'admin'
)
assert('报废缺责任提示 → 拒绝', rd.ok === false && /责任/.test(rd.msg ?? ''))
rd = kitchen.disposeStorage(
  b008, shrimp.id,
  { action: 'discard', reason: '超时无法确认冷链', photos: [], feeWaived: false, liabilityAck: true },
  '张管理', 'admin'
)
assert('报废缺现场照片 → 拒绝', rd.ok === false && /拍照|照片/.test(rd.msg ?? ''))

// D4. 合规报废肉类/海鲜 → 处置费 60，即时计入押金
rd = kitchen.disposeStorage(
  b008, shrimp.id,
  { action: 'discard', reason: '超时 2 小时以上且负责人出差无法取回，冷链连续性不可确认', photos: [photoD], feeWaived: false, liabilityAck: true },
  '张管理', 'admin'
)
assert('合规报废虾仁成功', rd.ok === true && rd.fee === 60, JSON.stringify(rd))
assert('虾仁状态=已报废', kitchen.bookingById('b-008')!.storageItems.find((i) => i.id === shrimp.id)!.state === 'disposed')
assert('处置费 60 已计入押金（活动取消也即时落账）', (kitchen.bookingById('b-008')!.depositResult?.deduction ?? 0) === 60)

// D5. 非肉类（饺子皮）清空 → 20 元，押金累计 80
rd = kitchen.disposeStorage(
  b008, wrapper.id,
  { action: 'discard', reason: '饺子皮粘连变质', photos: [photoD], feeWaived: false, liabilityAck: true },
  '张管理', 'admin'
)
// 普通食材报废 30
assert('普通食材依规报废成功，费 30', rd.ok === true && rd.fee === 30)
assert('押金累计扣费 90（60+30）', (kitchen.bookingById('b-008')!.depositResult?.deduction ?? -1) === 90)

// D6. 公益活动豁免
const b007 = kitchen.bookingById('b-007')!
const putR = kitchen.putStorage(
  b007,
  { name: '测试豆腐 1kg', zone: '冷藏柜A-4层', category: 'other', ownerName: '陈小明', ownerPhone: '138-0000-2001', expectedTakeAt: '2099-01-01 10:00' },
  '张管理'
)
assert('公益活动食材可入库', putR.ok === true)
const tofu = b007.storageItems.find((i) => i.name.includes('测试豆腐'))!
rd = kitchen.disposeStorage(
  b007, tofu.id,
  { action: 'discard', reason: '测试公益豁免', photos: [photoD], feeWaived: true, liabilityAck: true },
  '张管理', 'admin'
)
assert('公益活动报废可豁免处置费（0 元但记录责任）', rd.ok === true && rd.fee === 0)
assert('公益免押活动未生成押金扣费', !b007.depositResult || (b007.depositResult.deduction ?? 0) === 0)

// D7. 非公益活动申请豁免 → 拒绝
const b006x = kitchen.bookingById('b-006')!
const putR2 = kitchen.putStorage(
  b006x,
  { name: '测试青菜 1kg', zone: '常温暂存架-3号位', category: 'vegetable', ownerName: '王秀兰', ownerPhone: '138-0000-1001', expectedTakeAt: '2099-01-01 10:00' },
  '张管理'
)
assert('邻里宴食材可入库', putR2.ok === true)
const veg = b006x.storageItems.find((i) => i.name.includes('测试青菜'))!
rd = kitchen.disposeStorage(
  b006x, veg.id,
  { action: 'discard', reason: '测试', photos: [photoD], feeWaived: true, liabilityAck: true },
  '张管理', 'admin'
)
assert('邻里宴申请公益豁免 → 拒绝', rd.ok === false && /豁免/.test(rd.msg ?? ''))
// 拒绝后状态不变
assert('豁免被拒后食材仍在库，未被扣费', b006x.storageItems.find((i) => i.id === veg.id)!.state === 'stored')
// 正常报废 30
kitchen.disposeStorage(
  b006x, veg.id,
  { action: 'discard', reason: '测试', photos: [photoD], feeWaived: false, liabilityAck: true },
  '张管理', 'admin'
)

// D8. 入库校验：缺负责人电话 / 预计取走时间早于现在
const bad1 = kitchen.putStorage(b006x, { name: 'x', zone: 'z', category: 'other', ownerName: '王', ownerPhone: '', expectedTakeAt: '2099-01-01 10:00' }, '张管理')
assert('入库缺负责人电话 → 拒绝', bad1.ok === false && /电话/.test(bad1.msg ?? ''))
const bad2 = kitchen.putStorage(b006x, { name: 'x', zone: 'z', category: 'other', ownerName: '王', ownerPhone: '138', expectedTakeAt: '2000-01-01 10:00' }, '张管理')
assert('预计取走时间早于现在 → 拒绝', bad2.ok === false)

// D9. 通知与待处理状态流转
const putR3 = kitchen.putStorage(
  b006x,
  { name: '测试排骨 1kg', zone: '冷藏柜A-3层', category: 'meat-seafood', ownerName: '王秀兰', ownerPhone: '138-0000-1001', expectedTakeAt: '2099-01-01 10:00' },
  '张管理'
)
const rib = b006x.storageItems.find((i) => i.name.includes('测试排骨'))!
const nr = kitchen.notifyStorage(b006x, rib.id, { channel: '电话', note: '约定明早取' }, '张管理')
assert('通知负责人成功', nr.ok === true && b006x.storageItems.find((i) => i.id === rib.id)!.state === 'notified')
kitchen.markStoragePending(b006x, rib.id, '负责人暂不能取', '张管理')
assert('转待处理成功', b006x.storageItems.find((i) => i.id === rib.id)!.state === 'pending')
// 负责人取回（免费）
rd = kitchen.disposeStorage(
  b006x, rib.id,
  { action: 'retrieve', reason: '到场确认温度完好，签收取回', photos: [], feeWaived: false, liabilityAck: false },
  '张管理', 'admin'
)
assert('负责人取回成功且免费', rd.ok === true && rd.fee === 0)
assert('取回后状态=已取走(taken)', b006x.storageItems.find((i) => i.id === rib.id)!.state === 'taken')

// D10. 验收前拦截：b-006 初始有处于 notified 的炸肉丸(st-4)，七项全合格也不允许验收
kitchen.resetDemo()
const targetD = kitchen.bookingById('b-006')!
assert('验收前存在未处置食材（炸肉丸）', kitchen.hasUnresolvedStorage('b-006') === true)
let rd2: { ok: boolean; msg?: string; deduction?: number } = kitchen.submitAcceptance(targetD, '张管理', 'admin', {
  items: emptyAcceptanceItems().map((i) => ({ ...i, result: 'pass' as const })),
  overtimeMinutes: 0,
  cleaningExtraMinutes: 0,
  overallComment: '合格'
})
assert('有未处置食材时验收 → 拒绝', rd2.ok === false && /食材/.test(rd2.msg ?? ''))
assert('拒绝验收后状态仍为 closing', kitchen.bookingById('b-006')!.status === 'closing')
// 处置炸肉丸（肉类，60 元）
const meatball = targetD.storageItems.find((i) => i.name.includes('炸肉丸'))!
kitchen.disposeStorage(
  targetD, meatball.id,
  { action: 'discard', reason: '隔夜肉类不可继续存放于公共冰箱', photos: [photoD], feeWaived: false, liabilityAck: true },
  '张管理', 'admin'
)
assert('处置后无未结食材', kitchen.hasUnresolvedStorage('b-006') === false)
rd2 = kitchen.submitAcceptance(targetD, '张管理', 'admin', {
  items: emptyAcceptanceItems().map((i) => ({ ...i, result: 'pass' as const })),
  overtimeMinutes: 0,
  cleaningExtraMinutes: 0,
  overallComment: '处置完成后验收合格'
})
assert('食材处置完毕后验收成功，处置费 60 计入押金', rd2.ok === true && (rd2.deduction ?? 0) === 60, `deduction=${rd2.deduction}`)

// ================= E. 取消滞留 vs 真实超时 的分类 =================
console.log('\n[E] 工作台提醒分类：活动取消待处置 ≠ 食材暂存超时（不得出现负时长）')

const NOW = Date.parse('2026-09-15T10:00:00') // 固定“当前时间”便于构造双场景

// E1. 活动已取消 + 预计取走在未来 → canceled，不是 overdue
const futureItem = { state: 'pending' as const, expectedTakeAt: '2026-09-15 20:00' }
assert('未来取走 + 活动取消 → 分类 canceled', storageAlertKind(futureItem, 'canceled', NOW) === 'canceled')
assert('取消滞留不算超时（overdueHours 为 null，杜绝负数）', overtimeHours(futureItem, NOW) === null)
const t1 = storageTimeText(futureItem, NOW)
assert('取消滞留时长文案显示“剩余 10.0 小时”而非负超时', /距预计取走还有 10\.0 小时/.test(t1), t1)
assert('文案中绝不出现负的“超时”', !/超时\s*-/.test(t1))

// E2. 活动已取消但取走时间已过 2 小时以上 → 仍按真实超时（食品安全优先）
const canceledOverdueItem = { state: 'pending' as const, expectedTakeAt: '2026-09-14 20:00' }
assert('已取消但真实超时 14 小时 → 分类 overdue（优先食安）', storageAlertKind(canceledOverdueItem, 'canceled', NOW) === 'overdue')
assert('超时时长为正数 14.0', (overtimeHours(canceledOverdueItem, NOW) ?? 0).toFixed(1) === '14.0')

// E3. 正常预约未取消 + 未来取走 → none，不应出现在任何提醒
assert('正常预约 + 未来取走 → none', storageAlertKind(futureItem, 'checked', NOW) === 'none')

// E4. 正常预约 + 已过 2 小时 → overdue，正数
const normalOverdueItem = { state: 'notified' as const, expectedTakeAt: '2026-09-15 07:00' }
assert('正常预约超时 3 小时 → overdue', storageAlertKind(normalOverdueItem, 'closing', NOW) === 'overdue')
assert('超时显示正数 3.0 小时', storageTimeText(normalOverdueItem, NOW) === '超时 3.0 小时')

// E5. 已终结状态（取走/报废/清空）一律 none
assert('已取走记录不提醒', storageAlertKind({ state: 'taken' as const, expectedTakeAt: '2000-01-01 00:00' }, 'completed', NOW) === 'none')
assert('已报废记录不提醒', storageAlertKind({ state: 'disposed' as const, expectedTakeAt: '2000-01-01 00:00' }, 'canceled', NOW) === 'none')

// E6. store getter 双场景：种子 b-008（取消、虾仁 pending、预计 09-15 20:00）在演示当前时间下应进取消滞留而非超时
kitchen.resetDemo()
const overdueList = kitchen.overdueStorageItems
const canceledList = kitchen.canceledPendingStorage
const inOverdue = overdueList.some((x) => x.item.id === 'st-6')
const inCanceled = canceledList.some((x) => x.item.id === 'st-6')
assert('种子虾仁(st-6)不出现在“真实超时”列表', inOverdue === false)
assert('种子虾仁(st-6)出现在“活动取消待处置”列表', inCanceled === true)
// 取消滞留列表的剩余时长必须非负
assert('取消滞留剩余时长全部为非负数', canceledList.every((x) => x.remainHours >= 0))
// 真实超时列表的超时时长必须全部为正数（>=2 小时阈值）
assert('真实超时列表时长全部 ≥2 小时（无负数）', overdueList.every((x) => x.overdueHours >= 2))

// E7. 构造一个“真实超时的正常预约”：给 b-006 的肉丸把预计取走改到过去（种子本就是 09-13，演示日 09-14 已超时）
const meatballInOverdue = overdueList.some((x) => x.item.id === 'st-4')
assert('b-006 炸肉丸(st-4) 出现在“真实超时”列表', meatballInOverdue === true)

console.log(`\n========== 结果：${pass} 通过，${fail} 失败 ==========`)
if (fail > 0) process.exit(1)
