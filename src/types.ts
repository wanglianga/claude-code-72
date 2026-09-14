// ============ 角色与用户 ============
export type Role = 'resident' | 'admin' | 'cleaner' | 'repair' | 'staff'

export interface User {
  id: string
  username: string
  password: string
  name: string
  role: Role
  phone: string
  org?: string // 所属社团/公益组织
}

// ============ 活动性质（差异化规则） ============
// charity-class 公益课堂 / neighbor-feast 邻里宴 / commercial 商业试吃
export type ActivityKind = 'charity-class' | 'neighbor-feast' | 'commercial' | 'private'

export interface ActivityRule {
  kind: ActivityKind
  label: string
  deposit: number // 押金（元）
  depositFreeEligible: boolean // 是否允许公益免押
  cleaningRule: string // 清洁规则
  publicityRule: string // 公示规则
  noticeRule: string // 食品安全告知强度
  approveRole: Role // 审批角色：社团/公益由社区工作人员审批
  maxHours: number // 单次最长使用小时
  color: string // tag 配色
}

// ============ 烹饪 / 资源 ============
export type CookingType = '家常烹饪' | '烘焙' | '油炸' | '蒸煮' | '卤味' | '食品分装'
export type ResourceType =
  | 'stove' // 灶台
  | 'oven' // 烤箱
  | 'fridge' // 冰箱
  | 'sterilizer' // 消毒柜
  | 'tableware' // 餐具
  | 'sorting' // 垃圾分类点

export interface KitchenResource {
  id: string
  type: ResourceType
  name: string
  location: string
  status: 'ok' | 'repairing' // 正常 / 维修中
  wear: number // 累计损耗度 0-100
  note?: string
}

export interface StorageItem {
  id: string
  name: string
  zone: string // 冷藏/冷冻/常温暂存架 + 格位
  putAt: string
  takeAt?: string
}

// ============ 预约状态机 ============
// draft 待提交 -> pending 待审批 -> approved 已批准(待使用前检查)
// -> checked 使用前核验通过(使用中) -> closing 使用结束待验收
// -> completed 验收完成 / rejected 审批驳回 / canceled 已取消
export type BookingStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'checked'
  | 'closing'
  | 'completed'
  | 'rejected'
  | 'canceled'

export interface Booking {
  id: string
  code: string // 预约编号 NK-20260914-001
  applicantId: string
  applicantKind: 'resident' | 'org' // 居民 / 社团或公益组织
  orgName?: string
  contactName: string // 负责人
  contactPhone: string
  activityKind: ActivityKind
  title: string // 活动名称
  date: string // 使用日期
  startAt: string
  endAt: string
  peopleCount: number // 使用人数
  cookingTypes: CookingType[]
  isFrying: boolean // 是否油炸
  storageNeeded: boolean // 食材暂存
  storageNote?: string
  equipmentNeeds: ResourceType[] // 设备需求
  natureNote?: string // 活动性质说明
  depositRequired: number // 应付押金
  depositPaid: boolean
  depositFree: boolean // 公益免押
  // 审批
  status: BookingStatus
  approverId?: string
  approveComment?: string
  // 使用前检查（管理员核验）
  preCheck?: PreCheck
  // 分配资源
  allocatedResourceIds: string[]
  storageItems: StorageItem[]
  // 使用中事件
  incidentIds: string[]
  // 结束验收
  acceptance?: Acceptance
  // 押金处理
  depositResult?: DepositResult
  // 公示
  publicity?: Publicity
  // 食品安全告知签收
  foodSafetyAck: boolean
  foodSafetyAckAt?: string
  // 限制
  restricted?: boolean
  restrictReason?: string
  createdAt: string
  timeline: TimelineEntry[]
}

export interface TimelineEntry {
  at: string
  actor: string
  action: string
  tone?: 'gray' | 'green' | 'red' | 'blue' | 'brand' | 'amber'
}

// 使用前核验
export interface PreCheck {
  checkerId: string
  at: string
  identityOk: boolean // 预约人身份
  healthPromise: boolean // 健康承诺
  storageOk: boolean // 食材存放
  equipmentOk: boolean // 设备状态
  note?: string
  photos: Photo[]
}

// 使用中事件
export type IncidentType =
  | 'smoke' // 油烟过大
  | 'damage' // 设备损坏
  | 'complaint' // 邻里投诉
  | 'mixing' // 食材混放
  | 'extra-people' // 临时加人
  | 'overtime' // 活动超时

export type IncidentStatus = 'open' | 'processing' | 'resolved'
export type IncidentOwner = 'admin' | 'cleaner' | 'repair' | 'staff'

export interface Incident {
  id: string
  bookingId: string
  type: IncidentType
  title: string
  detail: string
  level: 'low' | 'mid' | 'high'
  reportedBy: string
  reportedAt: string
  status: IncidentStatus
  owner: IncidentOwner // 处理角色
  handlerId?: string
  handleNote?: string
  resolvedAt?: string
  photos: Photo[]
  wearImpact?: number // 造成的设备损耗增量
  cleaningExtra?: boolean // 是否需要补清洁
  compensation?: number // 设备损坏赔偿金额（元）
  overtimeMinutes?: number // 超时事件核定的分钟数
  extraPeople?: number // 临时加人数
  resourceId?: string // 关联设备
}

// 现场拍照（占位图：emoji + 标签生成 data-URI 风格的描述对象）
export interface Photo {
  id: string
  emoji: string
  label: string
  takenAt: string
  by: string
  dataUrl?: string // 真实拍照（压缩后的 data URI）；无则以 emoji 占位图呈现
}

// 逐项验收
export type AcceptItemKey =
  | 'stove'
  | 'counter'
  | 'fridge'
  | 'trash'
  | 'floor'
  | 'tableware'
  | 'equipment'

export interface AcceptanceItem {
  key: AcceptItemKey
  label: string
  result: 'pass' | 'redirty' | 'fail' // 合格 / 需补清洁 / 不合格
  note?: string
  photos: Photo[]
}

export interface Acceptance {
  checkerId: string
  at: string
  overtimeMinutes: number // 实际超时分钟
  cleaningExtraMinutes: number // 补清洁工时（分钟）
  items: AcceptanceItem[]
  overallComment?: string
}

export type DepositDecision = 'full-refund' | 'partial' | 'forfeit' | 'none'
export interface DepositResult {
  decision: DepositDecision // 全额退 / 扣费 / 没收 / 免押无需退
  deduction: number
  reasons: string[]
  decidedBy: string
  decidedAt: string
  disputeId?: string
}

// 押金争议
export type DisputeStatus = 'open' | 'mediating' | 'upheld' | 'adjusted' | 'rejected'
export interface DepositDispute {
  id: string
  bookingId: string
  raisedBy: string
  raisedAt: string
  reason: string
  claimAmount: number
  status: DisputeStatus
  mediatorId?: string // 社区工作人员调解
  resultNote?: string
  adjustedDeduction?: number
  resolvedAt?: string
}

// 社区公示
export interface Publicity {
  published: boolean
  publishedAt?: string
  by?: string
  title: string
  summary: string
  board: boolean // 是否上社区公示栏
  feedback?: string
}

export interface NoticeDoc {
  id: string
  title: string
  content: string
  version: string
}
