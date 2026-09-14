import type { AcceptanceItem, Booking, Incident, Role } from '@/types'

/**
 * 数据隔离：预约记录的可见范围
 * - resident（预约人）：只能看自己发起的预约
 * - admin / staff：全量可见（管理、审批、调解、公示）
 * - cleaner / repair：仅可见存在「归属本角色处理」事件的预约（含处理中与本角色闭环的历史事件）
 */
export function canViewBooking(
  b: Pick<Booking, 'id' | 'applicantId' | 'incidentIds'>,
  role: Role,
  userId: string,
  incidents: Incident[]
): boolean {
  if (role === 'admin' || role === 'staff') return true
  if (role === 'resident') return b.applicantId === userId
  if (role === 'cleaner' || role === 'repair') {
    return incidents.some((i) => i.bookingId === b.id && i.owner === role)
  }
  return false
}

export const ACCEPT_ITEMS: { key: AcceptanceItem['key']; label: string }[] = [
  { key: 'stove', label: '灶台' },
  { key: 'counter', label: '台面' },
  { key: 'fridge', label: '冰箱' },
  { key: 'trash', label: '垃圾' },
  { key: 'floor', label: '地面' },
  { key: 'tableware', label: '餐具' },
  { key: 'equipment', label: '设备' }
]

export type AcceptFormResult = AcceptanceItem['result'] | 'unchecked'
export interface AcceptFormItem {
  key: AcceptanceItem['key']
  label: string
  result: AcceptFormResult
  note?: string
  photos: AcceptanceItem['photos']
}

export function emptyAcceptanceItems(): AcceptFormItem[] {
  return ACCEPT_ITEMS.map((i) => ({
    key: i.key,
    label: i.label,
    result: 'unchecked',
    note: '',
    photos: []
  }))
}

/**
 * 验收提交前校验（空操作不得通过）：
 * 1. 七项必须逐项显式选择，初始「未检查」不允许提交；
 * 2. 判为需补清洁 / 不合格的项必须填写问题描述；
 * 3. 判为不合格的项必须有至少 1 张现场照片留证；
 * 4. 总评必填；
 * 5. 超时与补清洁工时必须为合法非负数字。
 */
export function validateAcceptance(
  items: AcceptFormItem[],
  overallComment: string,
  overtimeMinutes: number,
  cleaningExtraMinutes: number
): { ok: boolean; msg?: string } {
  if (items.length !== 7) return { ok: false, msg: '验收必须覆盖全部 7 个项目' }
  for (const it of items) {
    if (!it.result || it.result === 'unchecked') {
      return { ok: false, msg: `「${it.label}」尚未检查，请逐项显式确认后再提交` }
    }
    if (it.result !== 'pass' && !it.note?.trim()) {
      return { ok: false, msg: `「${it.label}」标记为${it.result === 'fail' ? '不合格' : '需补清洁'}，必须填写问题描述` }
    }
    if (it.result === 'fail' && it.photos.length === 0) {
      return { ok: false, msg: `「${it.label}」判定不合格，必须上传或拍摄现场照片留证` }
    }
  }
  if (!overallComment.trim()) return { ok: false, msg: '请填写验收总评后再出具押金决定' }
  if (!Number.isFinite(overtimeMinutes) || overtimeMinutes < 0)
    return { ok: false, msg: '超时分钟数不合法' }
  if (!Number.isFinite(cleaningExtraMinutes) || cleaningExtraMinutes < 0)
    return { ok: false, msg: '补清洁工时不合法' }
  return { ok: true }
}

export function acceptanceProgress(items: AcceptFormItem[]): number {
  return items.filter((i) => i.result !== 'unchecked').length
}
