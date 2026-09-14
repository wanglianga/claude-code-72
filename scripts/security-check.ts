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

// C1. 七项全合格 + 总评 → 完成，押金 200 全额退
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

console.log(`\n========== 结果：${pass} 通过，${fail} 失败 ==========`)
if (fail > 0) process.exit(1)
