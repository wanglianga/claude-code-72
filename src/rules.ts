import type {
  ActivityRule,
  BookingStatus,
  IncidentOwner,
  IncidentType,
  ResourceType,
  Role
} from '@/types'

export const ACTIVITY_RULES: Record<string, ActivityRule> = {
  'charity-class': {
    kind: 'charity-class',
    label: '公益课堂',
    deposit: 0,
    depositFreeEligible: true,
    cleaningRule: '基础保洁由社区保洁免费提供；厨房使用后仅需初清（台面归位、垃圾入桶）',
    publicityRule: '默认在社区公示栏与小程序公示活动成果，鼓励附现场照片与受益人数',
    noticeRule: '标准告知 + 公益活动食品安全承诺（集体分餐须留样 48 小时）',
    approveRole: 'staff',
    maxHours: 3,
    color: 'green'
  },
  'neighbor-feast': {
    kind: 'neighbor-feast',
    label: '邻里宴',
    deposit: 200,
    depositFreeEligible: false,
    cleaningRule: '使用者自行初清 + 保洁深度保洁；按 20 元/小时预收清洁费，多退少补',
    publicityRule: '活动前公示时间与参与范围，活动后公示卫生验收结果，接受邻里监督',
    noticeRule: '标准告知 + 集体聚餐登记（菜品清单、参与人数、过敏原提示）',
    approveRole: 'admin',
    maxHours: 5,
    color: 'brand'
  },
  commercial: {
    kind: 'commercial',
    label: '商业试吃',
    deposit: 800,
    depositFreeEligible: false,
    cleaningRule: '承担全额清洁成本（60 元/小时起），油炸后须专业除油，验收不合格照价扣费',
    publicityRule: '强制公示商家名称、活动内容与收费性质；公示期不少于 3 天接受投诉',
    noticeRule: '强化告知：须提交食材来源凭证、从业人员健康证明、试吃食品标签',
    approveRole: 'staff',
    maxHours: 4,
    color: 'purple'
  },
  private: {
    kind: 'private',
    label: '居民自用',
    deposit: 100,
    depositFreeEligible: false,
    cleaningRule: '谁使用谁清洁，按七项标准逐项验收；不合格扣保洁费 40 元/次',
    publicityRule: '仅公示时段占用信息（不公开姓名），不做成果公示',
    noticeRule: '标准食品安全告知',
    approveRole: 'admin',
    maxHours: 3,
    color: 'blue'
  }
}

export const STATUS_META: Record<BookingStatus, { label: string; color: string }> = {
  draft: { label: '待提交', color: 'gray' },
  pending: { label: '待审批', color: 'amber' },
  approved: { label: '已批准·待用前核验', color: 'blue' },
  checked: { label: '使用中', color: 'green' },
  closing: { label: '待验收', color: 'amber' },
  completed: { label: '已完成', color: 'gray' },
  rejected: { label: '已驳回', color: 'red' },
  canceled: { label: '已取消', color: 'gray' }
}

export const RESOURCE_META: Record<ResourceType, { label: string; icon: string }> = {
  stove: { label: '灶台', icon: '🔥' },
  oven: { label: '烤箱', icon: '♨️' },
  fridge: { label: '冰箱', icon: '🧊' },
  sterilizer: { label: '消毒柜', icon: '🫧' },
  tableware: { label: '餐具', icon: '🍽️' },
  sorting: { label: '垃圾分类点', icon: '♻️' }
}

export const INCIDENT_META: Record<
  IncidentType,
  { label: string; icon: string; defaultOwner: IncidentOwner; level: 'low' | 'mid' | 'high' }
> = {
  smoke: { label: '油烟过大', icon: '💨', defaultOwner: 'admin', level: 'mid' },
  damage: { label: '设备损坏', icon: '🔧', defaultOwner: 'repair', level: 'high' },
  complaint: { label: '邻里投诉', icon: '📞', defaultOwner: 'staff', level: 'high' },
  mixing: { label: '食材混放', icon: '🥩', defaultOwner: 'cleaner', level: 'mid' },
  'extra-people': { label: '临时加人', icon: '👥', defaultOwner: 'admin', level: 'low' },
  overtime: { label: '活动超时', icon: '⏰', defaultOwner: 'admin', level: 'mid' }
}

export const ROLE_META: Record<Role, { label: string; icon: string }> = {
  resident: { label: '居民/预约人', icon: '🏠' },
  admin: { label: '厨房管理员', icon: '🗝️' },
  cleaner: { label: '保洁', icon: '🧹' },
  repair: { label: '维修', icon: '🛠️' },
  staff: { label: '社区工作人员', icon: '🏛️' }
}

export const COOKING_TYPES = ['家常烹饪', '烘焙', '油炸', '蒸煮', '卤味', '食品分装'] as const

export const CLEAN_REQUIREMENTS: { key: string; icon: string; text: string }[] = [
  { key: 'stove', icon: '🔥', text: '灶台：关火断气，灶面无油污，烟机油盒清空' },
  { key: 'counter', icon: '🧽', text: '台面：清洁剂擦拭，无水渍残渣，物品归位' },
  { key: 'fridge', icon: '🧊', text: '冰箱：个人食材全部取走，不留隔夜半成品（留样除外）' },
  { key: 'trash', icon: '♻️', text: '垃圾：厨余/可回收/其他分类投放到分类点，废油单独交存' },
  { key: 'floor', icon: '🧴', text: '地面：清扫拖净，排水沟无堵塞，地垫晾挂' },
  { key: 'tableware', icon: '🍽️', text: '餐具：洗净入消毒柜完成消毒，破损登记赔偿' },
  { key: 'equipment', icon: '🔌', text: '设备：断电复位，烤箱清空余温，异常立即上报' }
]

export const FOOD_SAFETY_NOTICE = {
  title: '共享厨房食品安全告知书',
  version: '2026版',
  content: [
    '一、凡患有发热、腹泻、咽喉肿痛、化脓性皮肤病等有碍食品安全病症者，不得进入厨房操作。',
    '二、操作前规范洗手、佩戴口罩与帽子；生熟刀具、砧板分开使用，肉类中心温度不低于 70℃。',
    '三、食材须当日采购并保留凭证，不得使用过期、腐败、来源不明食材；冰箱暂存须贴标签注明使用人与日期。',
    '四、油炸食品油温控制在 190℃ 以内，专人看管，离人关火；废油倒入专用废油桶，严禁倒入下水道。',
    '五、集体聚餐 / 课堂分餐每样菜品留样不少于 125g，冷藏保存 48 小时。',
    '六、商业试吃须额外出示从业人员健康证明与食材来源票据，成品标注制作时间与过敏原。',
    '七、违反告知造成食品安全事故的，由预约人（负责人）依法承担责任，押金不足以弥补损失的继续追偿。'
  ]
}

// ---------------- 食材暂存 ----------------
export const STORAGE_CATEGORY_META: Record<
  string,
  { label: string; icon: string; meatSeafood: boolean; temp: string }
> = {
  'meat-seafood': { label: '肉类 / 海鲜', icon: '🥩', meatSeafood: true, temp: '0–4℃ 冷藏或 -18℃ 冷冻，生熟分层' },
  'dairy-egg': { label: '蛋奶 / 奶油', icon: '🥛', meatSeafood: false, temp: '2–6℃ 冷藏密封' },
  vegetable: { label: '蔬菜 / 水果', icon: '🥬', meatSeafood: false, temp: '冷藏或常温暂存架' },
  staple: { label: '米面 / 干货', icon: '🌾', meatSeafood: false, temp: '常温暂存架，离地离墙' },
  prepared: { label: '半成品 / 成品', icon: '🍱', meatSeafood: false, temp: '冷藏 ≤24h，留样按告知书执行' },
  other: { label: '其他', icon: '🧺', meatSeafood: false, temp: '按食材要求存放' }
}

// 暂存处置收费标准（元）；公益活动（charity-class）经核准可豁免
export const STORAGE_FEES = {
  pendingPerDay: 10, // 待处理食材占位费：10 元/天
  clearFee: 20, // 非风险食材管理员清空格位 20 元/次
  meatSeafoodDiscard: 60, // 肉类/海鲜超时强制报废处置（含危废登记）60 元/次
  otherDiscard: 30 // 普通食材报废 30 元/次
} as const

export const STORAGE_OVERTIME_HOURS = 2 // 超过预计取走时间 2 小时即判定超时

// 肉类 / 海鲜超时处置的食品安全规则
export const MEAT_SEAFOOD_RULE = {
  title: '肉类 / 海鲜超时食材食品安全处置规则',
  options: [
    {
      key: 'discard',
      label: '依规报废',
      desc: '超出预计取走时间且无法确认冷链连续性的肉类/海鲜，禁止再用于公共餐食，按餐厨危废流程报废登记、拍照留证，处置费 60 元由预约人承担（公益活动可申请豁免）。'
    },
    {
      key: 'retrieve',
      label: '联系负责人取回',
      desc: '管理员通过电话/短信通知负责人，其在 2 小时内到场、确认包装与温度完好并签收后可取回；不得继续存放，取回不收费。'
    }
  ] as const,
  forbidClear: true // 肉类海鲜不允许简单「清空格位」，必须报废或取回
}

// ---------------- 设备损坏验收 ----------------
export const DAMAGE_VERDICT_META: Record<
  string,
  { label: string; cls: string; desc: string }
> = {
  investigating: {
    label: '继续调查',
    cls: 'amber',
    desc: '现场使用人对损坏责任有异议，或无法确认是否本次使用造成。工单挂起、费用暂不进入押金，验收完成前必须给出结论。'
  },
  charge: {
    label: '维修扣费',
    cls: 'red',
    desc: '现场确认系本次使用人为损坏/遗失，由预约人按维修或重置成本承担，费用同步计入押金；设备进入维修工单。'
  },
  wear: {
    label: '自然损耗',
    cls: 'green',
    desc: '对照上次巡检与使用年限，确认属自然老化/正常磨损，使用人不承担费用，由社区维修预算处理，仍生成维修工单跟进。'
  },
  resolved: { label: '已处理完成', cls: 'gray', desc: '工单关闭，设备已恢复或完成报损替换。' }
}

export const DAMAGE_KIND_META = {
  damage: { label: '设备损坏', icon: '🔧' },
  loss: { label: '器具遗失', icon: '🍽️' }
} as const

// 现场确认三项全部通过，管理员才能给出扣费/自然损耗的最终结论
export const ONSITE_REQUIRED = ['确认本次使用人在场认可', '上次巡检时设备正常', '现场确认发生于本次使用'] as const

// ---------------- 邻里投诉回溯 ----------------
export const COMPLAINT_MEASURE_META: Record<
  string,
  { label: string; icon: string; termCategory: 'ventilation' | 'cleaning' | 'people' | 'frying' | 'hours' | 'patrol'; defaultTerm: string; defaultSurcharge: number; defaultPenalty: number }
> = {
  'ban-frying': {
    label: '后续限制油炸',
    icon: '🍳',
    termCategory: 'frying',
    defaultTerm: '下一次预约不得进行油炸操作（如需油炸须单独申请）',
    defaultSurcharge: 100,
    defaultPenalty: 150
  },
  'shorten-hours': {
    label: '缩短使用时段',
    icon: '⏰',
    termCategory: 'hours',
    defaultTerm: '下一次预约使用时长不超过 2 小时，结束后立即清场',
    defaultSurcharge: 50,
    defaultPenalty: 80
  },
  'add-patrol': {
    label: '增加管理员现场巡查',
    icon: '🗝️',
    termCategory: 'patrol',
    defaultTerm: '使用期间管理员至少现场巡查 2 次，负责人须配合签到',
    defaultSurcharge: 0,
    defaultPenalty: 60
  },
  'add-ventilation': {
    label: '全程加强排风',
    icon: '💨',
    termCategory: 'ventilation',
    defaultTerm: '烹饪全程开启排风机高档，油烟大的菜品错峰操作',
    defaultSurcharge: 50,
    defaultPenalty: 100
  },
  'limit-people': {
    label: '限制活动人数',
    icon: '👥',
    termCategory: 'people',
    defaultTerm: '下一次预约人数不得超过 15 人，临时加人须提前报备',
    defaultSurcharge: 50,
    defaultPenalty: 80
  },
  'strengthen-clean': {
    label: '加强清洁要求',
    icon: '🧹',
    termCategory: 'cleaning',
    defaultTerm: '结束后自行完成深度初清（烟机/地面/排水沟），保洁复检合格方可退押',
    defaultSurcharge: 50,
    defaultPenalty: 100
  }
}

export const COMPLAINT_TYPE_META = {
  smoke: { label: '油烟投诉', icon: '💨' },
  noise: { label: '噪声投诉', icon: '📢' },
  mixed: { label: '油烟+噪声', icon: '🌀' }
} as const

