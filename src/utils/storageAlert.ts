import type { Booking, StorageItem } from '@/types'
import { STORAGE_OVERTIME_HOURS } from '@/rules'
import { hoursSince } from '@/utils/format'

/**
 * 暂存食材提醒分类（仅对仍在库的状态：stored / notified / pending）：
 * - overdue：预计取走时间已过且超过阈值（STORAGE_OVERTIME_HOURS 小时），显示正数超时时长
 * - canceled：预约已取消且预计取走时间尚未到（或未超时）→ 「活动取消待处置」，绝不显示负超时
 * - none：正常在库，无需提醒
 *
 * 注意：已取消但又真实超时的食材归入 overdue（食品安全优先，标签叠加显示）。
 */
export type StorageAlertKind = 'none' | 'overdue' | 'canceled'

export function storageAlertKind(
  item: Pick<StorageItem, 'state' | 'expectedTakeAt'>,
  bookingStatus: Booking['status'],
  now: number = Date.now()
): StorageAlertKind {
  if (!['stored', 'notified', 'pending'].includes(item.state)) return 'none'
  const h = hoursSince(item.expectedTakeAt, now)
  if (h >= STORAGE_OVERTIME_HOURS) return 'overdue'
  if (bookingStatus === 'canceled') return 'canceled'
  return 'none'
}

/** 超时小时数（非超时返回 null，杜绝负时长展示） */
export function overtimeHours(
  item: Pick<StorageItem, 'state' | 'expectedTakeAt'>,
  now: number = Date.now()
): number | null {
  if (!['stored', 'notified', 'pending'].includes(item.state)) return null
  const h = hoursSince(item.expectedTakeAt, now)
  return h >= STORAGE_OVERTIME_HOURS ? h : null
}

/** 统一的时长/剩余时间展示 */
export function storageTimeText(
  item: Pick<StorageItem, 'state' | 'expectedTakeAt'>,
  now: number = Date.now()
): string {
  if (!['stored', 'notified', 'pending'].includes(item.state)) return ''
  const h = hoursSince(item.expectedTakeAt, now)
  if (h >= STORAGE_OVERTIME_HOURS) return `超时 ${h.toFixed(1)} 小时`
  if (h >= 0) return `临近取走（已过 ${h.toFixed(1)} 小时）`
  return `距预计取走还有 ${(-h).toFixed(1)} 小时`
}
