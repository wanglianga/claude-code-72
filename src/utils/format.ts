export function nowStr(offsetMin = 0): string {
  const d = new Date(Date.now() + offsetMin * 60000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function todayStr(): string {
  return nowStr().slice(0, 10)
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function money(n: number): string {
  return `¥${n.toFixed(0)}`
}

// 时间段重叠（同一日期 HH:mm 比较）
export function timeOverlap(
  dateA: string,
  sA: string,
  eA: string,
  dateB: string,
  sB: string,
  eB: string
): boolean {
  if (dateA !== dateB) return false
  return sA < eB && sB < eA
}

// 计算两段时间差分钟（end - start，HH:mm）
export function durationMin(start: string, end: string): number {
  const [h1, m1] = start.split(':').map(Number)
  const [h2, m2] = end.split(':').map(Number)
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1))
}

// 解析 "YYYY-MM-DD HH:mm" 为时间戳
export function parseDateTime(s: string): number {
  const t = Date.parse(s.replace(' ', 'T'))
  return Number.isNaN(t) ? 0 : t
}

// 当前是否已超过某时刻 overtimeHours 小时
export function hoursSince(expectedAt: string): number {
  const t = parseDateTime(expectedAt)
  if (!t) return 0
  return (Date.now() - t) / 3600000
}
