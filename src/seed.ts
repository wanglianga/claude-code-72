import type { Booking, Incident, KitchenResource, Photo, User } from '@/types'

// ---------------- 用户 / 测试账号 ----------------
export const seedUsers: User[] = [
  { id: 'u-res1', username: 'wangxiulan', password: '123456', name: '王秀兰', role: 'resident', phone: '138-0000-1001' },
  { id: 'u-res2', username: 'lijianguo', password: '123456', name: '李建国', role: 'resident', phone: '138-0000-1002' },
  { id: 'u-org1', username: 'yggy', password: '123456', name: '陈小明', role: 'resident', phone: '138-0000-2001', org: '阳光公益服务中心' },
  { id: 'u-org2', username: 'lzcs', password: '123456', name: '周敏', role: 'resident', phone: '138-0000-2002', org: '绿洲餐社（商业）' },
  { id: 'u-admin', username: 'admin', password: '123456', name: '张管理', role: 'admin', phone: '139-0000-3001' },
  { id: 'u-clean', username: 'cleaner', password: '123456', name: '刘保洁', role: 'cleaner', phone: '139-0000-4001' },
  { id: 'u-repair', username: 'repair', password: '123456', name: '赵维修', role: 'repair', phone: '139-0000-5001' },
  { id: 'u-staff', username: 'staff', password: '123456', name: '孙社工', role: 'staff', phone: '139-0000-6001' }
]

// ---------------- 厨房资源 ----------------
export const seedResources: KitchenResource[] = [
  { id: 'r-s1', type: 'stove', name: '1号灶台', location: '烹饪区 A', status: 'ok', wear: 42 },
  { id: 'r-s2', type: 'stove', name: '2号灶台', location: '烹饪区 A', status: 'ok', wear: 55 },
  { id: 'r-s3', type: 'stove', name: '3号灶台', location: '烹饪区 B', status: 'ok', wear: 18 },
  { id: 'r-s4', type: 'stove', name: '4号灶台', location: '烹饪区 B', status: 'repairing', wear: 88, note: '点火器故障待更换' },
  { id: 'r-o1', type: 'oven', name: '1号烤箱', location: '烘焙区', status: 'repairing', wear: 72, note: '烤箱门铰链断裂（工单 WX-20260914-01），停用待修', lastInspectionAt: '2026-09-13 18:00', lastInspectionBy: '张管理', lastInspectionResult: '门体开合正常，温控校准合格（报修前最后一次巡检）' },
  { id: 'r-o2', type: 'oven', name: '2号烤箱', location: '烘焙区', status: 'ok', wear: 61, lastInspectionAt: '2026-09-13 18:05', lastInspectionBy: '张管理', lastInspectionResult: '正常' },
  { id: 'r-f1', type: 'fridge', name: '公共冷藏柜 A', location: '暂存区', status: 'ok', wear: 25 },
  { id: 'r-f2', type: 'fridge', name: '冷冻柜 B', location: '暂存区', status: 'ok', wear: 38 },
  { id: 'r-x1', type: 'sterilizer', name: '1号消毒柜', location: '洗消区', status: 'ok', wear: 20 },
  { id: 'r-x2', type: 'sterilizer', name: '2号消毒柜', location: '洗消区', status: 'repairing', wear: 76, note: '柜门密封条老化' },
  { id: 'r-t1', type: 'tableware', name: '餐具套装（30人份）', location: '餐具柜 1', status: 'ok', wear: 15 },
  { id: 'r-t2', type: 'tableware', name: '餐具套装（60人份）', location: '餐具柜 2', status: 'ok', wear: 33 },
  { id: 'r-g1', type: 'sorting', name: '1号垃圾分类点', location: '后门', status: 'ok', wear: 10 },
  { id: 'r-g2', type: 'sorting', name: '废油回收点', location: '后门', status: 'ok', wear: 22 }
]

const ph = (emoji: string, label: string, by: string, at = '2026-09-14 09:00'): Photo => ({
  id: 'p-' + Math.random().toString(36).slice(2, 8),
  emoji,
  label,
  takenAt: at,
  by
})

// ---------------- 使用中事件 ----------------
export const seedIncidents: Incident[] = [
  {
    id: 'i-1',
    bookingId: 'b-003',
    type: 'smoke',
    title: '油烟报警，烟机档位不足',
    detail: '课堂同时四个灶台煸炒，油烟瞬时过大，烟感报警 2 次，已开窗并改为两灶轮换。',
    level: 'mid',
    reportedBy: '张管理',
    reportedAt: '2026-09-14 09:42',
    status: 'processing',
    owner: 'admin',
    handlerId: 'u-admin',
    handleNote: '已调度加开排风，要求 10:30 前降低油温；观察中。',
    photos: [ph('💨', '烟机现场照片', '张管理', '2026-09-14 09:42')],
    cleaningExtra: false
  },
  {
    id: 'i-2',
    bookingId: 'b-003',
    type: 'complaint',
    title: '2号楼 302 反映噪音与油烟',
    detail: '邻居电话投诉厨房外窗飘出辣椒炒肉味道，家中有哮喘老人。',
    level: 'high',
    reportedBy: '物业前台',
    reportedAt: '2026-09-14 09:55',
    status: 'open',
    owner: 'staff',
    photos: [ph('📞', '投诉电话记录', '物业前台', '2026-09-14 09:55')]
  },
  {
    id: 'i-3',
    bookingId: 'b-006',
    type: 'overtime',
    title: '邻里宴预计超时 40 分钟',
    detail: '包饺子进度慢于计划，预约 13:00 结束，负责人申请延至 13:40，下一时段无人预约。',
    level: 'mid',
    reportedBy: '王秀兰',
    reportedAt: '2026-09-13 12:35',
    status: 'resolved',
    owner: 'admin',
    handlerId: 'u-admin',
    handleNote: '同意延时 40 分钟，按 20 元/半小时计超时占用费，结束后一并验收。',
    resolvedAt: '2026-09-13 12:40',
    photos: [],
    overtimeMinutes: 40
  },
  {
    id: 'i-4',
    bookingId: 'b-002',
    type: 'damage',
    title: '不粘烤盘涂层划伤',
    detail: '商业试吃团队使用金属铲，导致 2 号烤箱原配烤盘涂层大面积划伤，无法再用于烘焙。',
    level: 'high',
    reportedBy: '张管理',
    reportedAt: '2026-09-10 16:10',
    status: 'resolved',
    owner: 'repair',
    handlerId: 'u-repair',
    handleNote: '确认人为损坏，更换烤盘成本 160 元，维修单 WX-20260910-02。',
    resolvedAt: '2026-09-10 17:20',
    photos: [ph('🔧', '烤盘划伤照片', '赵维修', '2026-09-10 16:15')],
    wearImpact: 14,
    compensation: 160,
    cleaningExtra: false
  },
  {
    id: 'i-5',
    bookingId: 'b-002',
    type: 'mixing',
    title: '试吃食材与居民食材混放',
    detail: '奶油未密封与他人半成品同层放置，存在交叉污染，已现场隔离。',
    level: 'mid',
    reportedBy: '刘保洁',
    reportedAt: '2026-09-10 15:20',
    status: 'resolved',
    owner: 'cleaner',
    handlerId: 'u-clean',
    handleNote: '已要求加贴标签并装入密封盒，冷藏柜 A 第 3 层划给该团队专用。',
    resolvedAt: '2026-09-10 15:40',
    photos: [ph('🥩', '混放现场照片', '刘保洁', '2026-09-10 15:22')],
    cleaningExtra: true
  }
]

// ---------------- 预约 ----------------
export const seedBookings: Booking[] = [
  // 1. 已完成 · 邻里宴 · 全额退押
  {
    id: 'b-001',
    code: 'NK-20260912-001',
    applicantId: 'u-res1',
    applicantKind: 'resident',
    contactName: '王秀兰',
    contactPhone: '138-0000-1001',
    activityKind: 'neighbor-feast',
    title: '中秋邻里包饺子宴',
    date: '2026-09-12',
    startAt: '09:00',
    endAt: '13:00',
    peopleCount: 26,
    cookingTypes: ['蒸煮', '家常烹饪'],
    isFrying: false,
    storageNeeded: true,
    storageNote: '面粉、猪肉白菜馅冷藏暂存半天',
    equipmentNeeds: ['stove', 'fridge', 'sterilizer', 'tableware', 'sorting'],
    natureNote: '3号楼楼栋自治组织，参与者均为本楼住户。',
    depositRequired: 200,
    depositPaid: true,
    depositFree: false,
    status: 'completed',
    approverId: 'u-admin',
    approveComment: '符合邻里活动要求，注意错峰使用灶台。',
    preCheck: {
      checkerId: 'u-admin',
      at: '2026-09-12 08:45',
      identityOk: true,
      healthPromise: true,
      storageOk: true,
      equipmentOk: true,
      note: '26 人全部签到，健康承诺已签，设备正常。',
      photos: [ph('✅', '使用前核验现场', '张管理', '2026-09-12 08:45')]
    },
    allocatedResourceIds: ['r-s1', 'r-s2', 'r-f1', 'r-x1', 'r-t2', 'r-g1'],
    storageItems: [
      {
        id: 'st-1', name: '猪肉馅 5kg', zone: '冷藏柜A-2层', category: 'meat-seafood',
        label: '猪肉馅5kg / 王秀兰 138-0000-1001 / 09-12',
        putAt: '2026-09-12 08:40', putBy: '张管理', ownerName: '王秀兰', ownerPhone: '138-0000-1001',
        expectedTakeAt: '2026-09-12 13:00', takeAt: '2026-09-12 12:50', state: 'taken',
        notifications: [],
        history: [
          { at: '2026-09-12 08:40', by: '张管理', action: '入库冷藏柜A-2层，贴标签' },
          { at: '2026-09-12 12:50', by: '王秀兰', action: '活动结束取走' }
        ]
      },
      {
        id: 'st-2', name: '白菜 8kg', zone: '常温暂存架-1号位', category: 'vegetable',
        label: '白菜8kg / 王秀兰 138-0000-1001 / 09-12',
        putAt: '2026-09-12 08:40', putBy: '张管理', ownerName: '王秀兰', ownerPhone: '138-0000-1001',
        expectedTakeAt: '2026-09-12 13:00', takeAt: '2026-09-12 11:00', state: 'taken',
        notifications: [],
        history: [
          { at: '2026-09-12 08:40', by: '张管理', action: '入常温暂存架1号位' },
          { at: '2026-09-12 11:00', by: '王秀兰', action: '取走使用' }
        ]
      }
    ],
    incidentIds: [],
    acceptance: {
      checkerId: 'u-admin',
      at: '2026-09-12 13:20',
      overtimeMinutes: 0,
      cleaningExtraMinutes: 0,
      items: [
        { key: 'stove', label: '灶台', result: 'pass', note: '灶面干净', photos: [] },
        { key: 'counter', label: '台面', result: 'pass', note: '', photos: [] },
        { key: 'fridge', label: '冰箱', result: 'pass', note: '食材全部取走', photos: [] },
        { key: 'trash', label: '垃圾', result: 'pass', note: '分类正确', photos: [] },
        { key: 'floor', label: '地面', result: 'pass', note: '已拖净', photos: [] },
        { key: 'tableware', label: '餐具', result: 'pass', note: '已消毒归位', photos: [] },
        { key: 'equipment', label: '设备', result: 'pass', note: '', photos: [] }
      ],
      overallComment: '组织有序，卫生情况优秀，可作为邻里宴示范。'
    },
    depositResult: {
      decision: 'full-refund',
      deduction: 0,
      reasons: [],
      decidedBy: '张管理',
      decidedAt: '2026-09-12 13:25'
    },
    publicity: {
      published: true,
      publishedAt: '2026-09-12 18:00',
      by: '孙社工',
      title: '中秋邻里包饺子宴圆满举办',
      summary: '26 位居民参与，卫生验收 7 项全合格，押金全额退还。',
      board: true,
      feedback: '居民留言希望再办一场。'
    },
    foodSafetyAck: true,
    foodSafetyAckAt: '2026-09-11 20:10',
    createdAt: '2026-09-10 15:00',
    timeline: [
      { at: '2026-09-10 15:00', actor: '王秀兰', action: '提交预约申请' },
      { at: '2026-09-10 16:20', actor: '张管理', action: '审批通过', tone: 'green' },
      { at: '2026-09-11 20:10', actor: '王秀兰', action: '在线签署食品安全告知书', tone: 'blue' },
      { at: '2026-09-12 08:45', actor: '张管理', action: '使用前核验通过（身份/健康承诺/食材/设备）', tone: 'green' },
      { at: '2026-09-12 13:20', actor: '张管理', action: '七项逐项验收全部合格', tone: 'green' },
      { at: '2026-09-12 13:25', actor: '张管理', action: '押金 200 元全额退还', tone: 'green' },
      { at: '2026-09-12 18:00', actor: '孙社工', action: '活动成果上公示栏', tone: 'blue' }
    ]
  },
  // 2. 已完成 · 商业试吃 · 扣费 + 争议调解调整
  {
    id: 'b-002',
    code: 'NK-20260910-005',
    applicantId: 'u-org2',
    applicantKind: 'org',
    orgName: '绿洲餐社（商业）',
    contactName: '周敏',
    contactPhone: '138-0000-2002',
    activityKind: 'commercial',
    title: '秋季低糖烘焙试吃会',
    date: '2026-09-10',
    startAt: '14:00',
    endAt: '18:00',
    peopleCount: 40,
    cookingTypes: ['烘焙', '食品分装'],
    isFrying: false,
    storageNeeded: true,
    storageNote: '奶油、试吃成品冷藏',
    equipmentNeeds: ['oven', 'fridge', 'sterilizer', 'tableware', 'sorting'],
    natureNote: '收费试吃活动，39 元/人，属于商业性质。',
    depositRequired: 800,
    depositPaid: true,
    depositFree: false,
    status: 'completed',
    approverId: 'u-staff',
    approveComment: '已核验健康证明与食材票据，准予试吃；公示三天无异议后举办。',
    preCheck: {
      checkerId: 'u-admin',
      at: '2026-09-10 13:40',
      identityOk: true,
      healthPromise: true,
      storageOk: false,
      equipmentOk: true,
      note: '初始食材标签不完整，现场补齐后放行。',
      photos: [ph('📋', '健康证明与票据核查', '张管理', '2026-09-10 13:40')]
    },
    allocatedResourceIds: ['r-o2', 'r-f1', 'r-f2', 'r-x1', 'r-t1', 'r-g1'],
    storageItems: [
      {
        id: 'st-3', name: '淡奶油 6L', zone: '冷藏柜A-3层（团队专用）', category: 'dairy-egg',
        label: '淡奶油6L / 周敏 138-0000-2002 / 09-10',
        putAt: '2026-09-10 13:45', putBy: '张管理', ownerName: '周敏', ownerPhone: '138-0000-2002',
        expectedTakeAt: '2026-09-10 18:00', takeAt: '2026-09-10 18:10', state: 'taken',
        notifications: [],
        history: [
          { at: '2026-09-10 13:45', by: '张管理', action: '混放整改后入团队专用层，密封贴签' },
          { at: '2026-09-10 18:10', by: '周敏', action: '活动结束取走' }
        ]
      }
    ],
    incidentIds: ['i-4', 'i-5'],
    acceptance: {
      checkerId: 'u-admin',
      at: '2026-09-10 18:30',
      overtimeMinutes: 10,
      cleaningExtraMinutes: 40,
      items: [
        { key: 'stove', label: '灶台', result: 'pass', note: '', photos: [] },
        { key: 'counter', label: '台面', result: 'redirty', note: '奶油残留，需要补清洁', photos: [ph('🧽', '台面残留', '张管理', '2026-09-10 18:30')] },
        { key: 'fridge', label: '冰箱', result: 'redirty', note: '标签混放整改后合格', photos: [] },
        { key: 'trash', label: '垃圾', result: 'pass', note: '', photos: [] },
        { key: 'floor', label: '地面', result: 'fail', note: '面糊滴落多处未清理', photos: [ph('🧴', '地面污渍', '张管理', '2026-09-10 18:30')] },
        { key: 'tableware', label: '餐具', result: 'pass', note: '', photos: [] },
        { key: 'equipment', label: '设备', result: 'fail', note: '2号烤箱烤盘人为划伤', photos: [ph('🔧', '烤盘损坏', '赵维修', '2026-09-10 18:32')] }
      ],
      overallComment: '商业活动卫生与设备爱护意识不足，按商业规则计扣。'
    },
    depositResult: {
      decision: 'partial',
      deduction: 260,
      reasons: ['烤盘人为损坏赔偿 160 元', '深度补清洁 40 分钟 × 1 元/分 = 40 元', '食材混放整改与超时占用合计 60 元'],
      decidedBy: '张管理',
      decidedAt: '2026-09-10 18:45',
      disputeId: 'd-1'
    },
    publicity: {
      published: true,
      publishedAt: '2026-09-07 10:00',
      by: '孙社工',
      title: '【商业公示】绿洲餐社低糖烘焙试吃会',
      summary: '收费 39 元/人，押金 800 元，清洁按实际工时计。公示期 3 天。',
      board: true,
      feedback: '公示期无异议；活动后投诉 0 起。'
    },
    foodSafetyAck: true,
    foodSafetyAckAt: '2026-09-07 09:30',
    restricted: false,
    createdAt: '2026-09-06 11:00',
    timeline: [
      { at: '2026-09-06 11:00', actor: '周敏', action: '提交商业试吃申请（押金 800 元）' },
      { at: '2026-09-07 09:30', actor: '周敏', action: '签收强化食品安全告知并上传健康证明', tone: 'blue' },
      { at: '2026-09-07 10:00', actor: '孙社工', action: '审批通过并发布前置公示（3 天）', tone: 'green' },
      { at: '2026-09-10 15:20', actor: '刘保洁', action: '上报食材混放事件', tone: 'red' },
      { at: '2026-09-10 16:10', actor: '张管理', action: '上报设备损坏事件', tone: 'red' },
      { at: '2026-09-10 18:30', actor: '张管理', action: '七项验收：2 项不合格、2 项需补清洁', tone: 'red' },
      { at: '2026-09-10 18:45', actor: '张管理', action: '押金扣费 260 元', tone: 'red' },
      { at: '2026-09-11 09:00', actor: '周敏', action: '对扣费提出押金争议', tone: 'amber' },
      { at: '2026-09-12 10:30', actor: '孙社工', action: '社区调解：调减至 220 元，退还 40 元', tone: 'blue' }
    ]
  },
  // 3. 使用中 · 公益课堂 · 免押 · 事件进行中
  {
    id: 'b-003',
    code: 'NK-20260914-002',
    applicantId: 'u-org1',
    applicantKind: 'org',
    orgName: '阳光公益服务中心',
    contactName: '陈小明',
    contactPhone: '138-0000-2001',
    activityKind: 'charity-class',
    title: '小厨师公益课堂：认识蔬菜',
    date: '2026-09-14',
    startAt: '09:00',
    endAt: '12:00',
    peopleCount: 20,
    cookingTypes: ['家常烹饪'],
    isFrying: false,
    storageNeeded: false,
    equipmentNeeds: ['stove', 'oven', 'sterilizer', 'tableware', 'sorting'],
    natureNote: '面向社区困境儿童的免费公益课堂，志愿者 5 名。',
    depositRequired: 0,
    depositPaid: false,
    depositFree: true,
    status: 'checked',
    approverId: 'u-staff',
    approveComment: '公益免押资格已核实，同意免押使用；建议错峰煸炒。',
    preCheck: {
      checkerId: 'u-admin',
      at: '2026-09-14 08:40',
      identityOk: true,
      healthPromise: true,
      storageOk: true,
      equipmentOk: true,
      note: '20 名儿童 + 5 名志愿者，健康承诺齐全，留样盒已备。',
      photos: [ph('👧', '活动前签到检查', '张管理', '2026-09-14 08:40')]
    },
    allocatedResourceIds: ['r-s1', 'r-s3', 'r-o1', 'r-x1', 'r-t1', 'r-g1'],
    storageItems: [],
    incidentIds: ['i-1', 'i-2'],
    // 邻里投诉回溯：运行时排风与巡查记录
    ventilationLogs: [
      { id: 'v-1', at: '2026-09-14 09:05', level: 2, by: '张管理', note: '开场排风 2 档' },
      { id: 'v-2', at: '2026-09-14 09:43', level: 3, by: '张管理', note: '油烟报警后调至 3 档并加开窗户' }
    ],
    patrolLogs: [
      { id: 'pl-1', at: '2026-09-14 09:20', by: '张管理', finding: '四个灶台同时煸炒，人数 25（含家长围观），油烟偏大', action: '要求两灶轮换、围观家长在外等候' },
      { id: 'pl-2', at: '2026-09-14 09:45', by: '张管理', finding: '排风 3 档后油烟下降，现场秩序正常', action: '持续观察' }
    ],
    // 上次投诉回溯（09-08 课堂）写入本次预约的条件，负责人已在确认页勾选
    boundTerms: [
      { id: 'ct-1', sourceReviewCode: 'TS-20260908-01', category: 'ventilation', label: '烹饪全程开启排风机高档，油烟大的菜品错峰操作', surcharge: 0, penalty: 100 },
      { id: 'ct-2', sourceReviewCode: 'TS-20260908-01', category: 'patrol', label: '使用期间管理员至少现场巡查 2 次，负责人配合签到', surcharge: 0, penalty: 60, requiredPatrols: 2 }
    ],
    termAcks: [
      { termId: 'ct-1', sourceReviewCode: 'TS-20260908-01', label: '烹饪全程开启排风机高档，油烟大的菜品错峰操作', surcharge: 0, penalty: 100, acked: true, ackedAt: '2026-09-13 17:00', violated: true, violateNote: '09:20 巡查发现四个灶台同时煸炒、排风仅 2 档，09:43 才整改，认定违反排风要求' },
      { termId: 'ct-2', sourceReviewCode: 'TS-20260908-01', label: '使用期间管理员至少现场巡查 2 次，负责人配合签到', surcharge: 0, penalty: 60, acked: true, ackedAt: '2026-09-13 17:00', violated: false }
    ],
    foodSafetyAck: true,
    foodSafetyAckAt: '2026-09-13 16:00',
    createdAt: '2026-09-11 09:00',
    timeline: [
      { at: '2026-09-11 09:00', actor: '陈小明', action: '提交公益课堂申请并申请免押' },
      { at: '2026-09-11 14:00', actor: '孙社工', action: '核准公益免押，审批通过', tone: 'green' },
      { at: '2026-09-13 16:00', actor: '陈小明', action: '签署食品安全告知（集体分餐留样 48h）', tone: 'blue' },
      { at: '2026-09-14 08:40', actor: '张管理', action: '使用前核验通过，活动开始', tone: 'green' },
      { at: '2026-09-14 09:42', actor: '张管理', action: '上报油烟过大事件', tone: 'red' },
      { at: '2026-09-14 09:55', actor: '孙社工', action: '接到邻里投诉并建单', tone: 'red' }
    ]
  },
  // 4. 已批准待用前核验 · 居民自用
  {
    id: 'b-004',
    code: 'NK-20260914-003',
    applicantId: 'u-res2',
    applicantKind: 'resident',
    contactName: '李建国',
    contactPhone: '138-0000-1002',
    activityKind: 'private',
    title: '家庭烘焙：给女儿做生日蛋糕',
    date: '2026-09-14',
    startAt: '14:00',
    endAt: '17:00',
    peopleCount: 4,
    cookingTypes: ['烘焙'],
    isFrying: false,
    storageNeeded: true,
    storageNote: '黄油、淡奶油需冷藏 3 小时',
    equipmentNeeds: ['oven', 'fridge', 'tableware'],
    depositRequired: 100,
    depositPaid: true,
    depositFree: false,
    status: 'approved',
    approverId: 'u-admin',
    approveComment: '已缴押金，按时到场核验。',
    allocatedResourceIds: ['r-o2', 'r-f1', 'r-t1'],
    storageItems: [],
    incidentIds: [],
    foodSafetyAck: true,
    foodSafetyAckAt: '2026-09-13 21:00',
    createdAt: '2026-09-12 19:30',
    timeline: [
      { at: '2026-09-12 19:30', actor: '李建国', action: '提交预约（押金 100 元）' },
      { at: '2026-09-12 20:00', actor: '张管理', action: '审批通过', tone: 'green' },
      { at: '2026-09-13 21:00', actor: '李建国', action: '签署食品安全告知书', tone: 'blue' },
      { at: '2026-09-14 12:25', actor: '系统', action: '1 号烤箱损坏停用，自动通知改派 2 号烤箱，预约人已确认', tone: 'amber' }
    ]
  },
  // 5. 待审批 · 商业试吃（社区工作人员审批，展示规则差异）
  {
    id: 'b-005',
    code: 'NK-20260916-001',
    applicantId: 'u-org2',
    applicantKind: 'org',
    orgName: '绿洲餐社（商业）',
    contactName: '周敏',
    contactPhone: '138-0000-2002',
    activityKind: 'commercial',
    title: '手工月饼量产试吃（预售自提）',
    date: '2026-09-16',
    startAt: '09:00',
    endAt: '13:00',
    peopleCount: 12,
    cookingTypes: ['烘焙', '食品分装'],
    isFrying: false,
    storageNeeded: true,
    storageNote: '馅料、成品暂存',
    equipmentNeeds: ['oven', 'fridge', 'sterilizer', 'sorting'],
    natureNote: '月饼预售自提，商业经营活动。',
    depositRequired: 800,
    depositPaid: false,
    depositFree: false,
    status: 'pending',
    allocatedResourceIds: [],
    storageItems: [],
    incidentIds: [],
    foodSafetyAck: false,
    createdAt: '2026-09-13 18:20',
    timeline: [
      { at: '2026-09-13 18:20', actor: '周敏', action: '提交商业试吃申请（待社区工作人员审批）', tone: 'amber' }
    ]
  },
  // 6. 待验收 · 邻里宴 · 已超时
  {
    id: 'b-006',
    code: 'NK-20260913-004',
    applicantId: 'u-res1',
    applicantKind: 'resident',
    contactName: '王秀兰',
    contactPhone: '138-0000-1001',
    activityKind: 'neighbor-feast',
    title: '迎国庆邻里长桌宴',
    date: '2026-09-13',
    startAt: '09:00',
    endAt: '13:00',
    peopleCount: 34,
    cookingTypes: ['家常烹饪', '油炸', '蒸煮'],
    isFrying: true,
    storageNeeded: true,
    storageNote: '肉丸、扣肉半成品提前一天暂存',
    equipmentNeeds: ['stove', 'oven', 'fridge', 'sterilizer', 'tableware', 'sorting'],
    depositRequired: 200,
    depositPaid: true,
    depositFree: false,
    status: 'closing',
    approverId: 'u-admin',
    approveComment: '涉及油炸，已强调废油回收与油温控制。',
    preCheck: {
      checkerId: 'u-admin',
      at: '2026-09-13 08:35',
      identityOk: true,
      healthPromise: true,
      storageOk: true,
      equipmentOk: true,
      note: '油炸负责人专项告知签字。',
      photos: [ph('🔥', '油炸安全告知签字', '张管理', '2026-09-13 08:35')]
    },
    allocatedResourceIds: ['r-s1', 'r-s2', 'r-s3', 'r-o1', 'r-f1', 'r-f2', 'r-x1', 'r-t2', 'r-g1', 'r-g2'],
    storageItems: [
      {
        id: 'st-4', name: '炸肉丸半成品（猪肉）3kg', zone: '冷藏柜A-1层', category: 'meat-seafood',
        label: '炸肉丸半成品3kg / 王秀兰 138-0000-1001 / 09-13',
        putAt: '2026-09-13 08:30', putBy: '张管理', ownerName: '王秀兰', ownerPhone: '138-0000-1001',
        expectedTakeAt: '2026-09-13 13:40', state: 'notified',
        notifications: [
          { at: '2026-09-13 16:00', by: '张管理', channel: '电话', note: '负责人称次日上午来取，管理员告知肉类不可隔夜存放于公共冰箱' }
        ],
        history: [
          { at: '2026-09-13 08:30', by: '张管理', action: '入库冷藏柜A-1层，贴标签注明负责人与电话' },
          { at: '2026-09-13 16:00', by: '张管理', action: '超时未取，电话通知负责人' }
        ]
      }
    ],
    incidentIds: ['i-3'],
    foodSafetyAck: true,
    foodSafetyAckAt: '2026-09-12 19:00',
    createdAt: '2026-09-10 10:00',
    timeline: [
      { at: '2026-09-10 10:00', actor: '王秀兰', action: '提交邻里宴申请' },
      { at: '2026-09-10 11:00', actor: '张管理', action: '审批通过（含油炸安全提示）', tone: 'green' },
      { at: '2026-09-13 08:35', actor: '张管理', action: '使用前核验通过', tone: 'green' },
      { at: '2026-09-13 12:35', actor: '王秀兰', action: '申请延时 40 分钟', tone: 'amber' },
      { at: '2026-09-13 12:40', actor: '张管理', action: '批准延时，按标准收超时费', tone: 'blue' },
      { at: '2026-09-13 13:45', actor: '张管理', action: '活动结束，等待逐项验收', tone: 'amber' }
    ]
  },
  // 7. 已完成 · 公益课堂（复盘统计用）
  {
    id: 'b-007',
    code: 'NK-20260908-002',
    applicantId: 'u-org1',
    applicantKind: 'org',
    orgName: '阳光公益服务中心',
    contactName: '陈小明',
    contactPhone: '138-0000-2001',
    activityKind: 'charity-class',
    title: '银发营养早餐课',
    date: '2026-09-08',
    startAt: '08:30',
    endAt: '10:30',
    peopleCount: 18,
    cookingTypes: ['蒸煮', '家常烹饪'],
    isFrying: false,
    storageNeeded: true,
    equipmentNeeds: ['stove', 'sterilizer', 'tableware', 'sorting'],
    natureNote: '为社区独居老人提供的免费早餐课堂。',
    depositRequired: 0,
    depositPaid: false,
    depositFree: true,
    status: 'completed',
    approverId: 'u-staff',
    preCheck: {
      checkerId: 'u-admin',
      at: '2026-09-08 08:15',
      identityOk: true,
      healthPromise: true,
      storageOk: true,
      equipmentOk: true,
      photos: []
    },
    allocatedResourceIds: ['r-s2', 'r-x1', 'r-t1', 'r-g1'],
    storageItems: [
      {
        id: 'st-5', name: '志愿者捐赠青菜 4kg（未使用）', zone: '常温暂存架-2号位', category: 'vegetable',
        label: '青菜4kg / 陈小明（阳光公益）138-0000-2001 / 09-08',
        putAt: '2026-09-08 08:20', putBy: '张管理', ownerName: '陈小明', ownerPhone: '138-0000-2001',
        expectedTakeAt: '2026-09-08 11:00', state: 'disposed',
        notifications: [
          { at: '2026-09-08 11:30', by: '张管理', channel: '现场告知', note: '志愿者离场时遗漏，已现场提醒' }
        ],
        disposal: {
          action: 'discard', at: '2026-09-09 09:00', by: '张管理',
          reason: '公益课堂结束后菜叶萎蔫不宜再用，负责人确认放弃；按公益活动豁免处置费',
          photos: [ph('🥬', '报废青菜登记照', '张管理', '2026-09-09 09:00')],
          fee: 0, feeWaived: true, liabilityAck: true,
          note: '社区工作人员核准公益豁免，不扣押金（本活动免押），仅记录责任提醒'
        },
        history: [
          { at: '2026-09-08 08:20', by: '张管理', action: '入常温暂存架2号位' },
          { at: '2026-09-08 11:30', by: '张管理', action: '超时未取，现场通知负责人' },
          { at: '2026-09-09 09:00', by: '张管理', action: '依规报废，公益豁免处置费' }
        ]
      }
    ],
    incidentIds: [],
    acceptance: {
      checkerId: 'u-admin',
      at: '2026-09-08 10:50',
      overtimeMinutes: 0,
      cleaningExtraMinutes: 15,
      items: [
        { key: 'stove', label: '灶台', result: 'pass', photos: [] },
        { key: 'counter', label: '台面', result: 'pass', photos: [] },
        { key: 'fridge', label: '冰箱', result: 'pass', note: '未使用', photos: [] },
        { key: 'trash', label: '垃圾', result: 'redirty', note: '可回收与其他混投，保洁协助二次分拣', photos: [] },
        { key: 'floor', label: '地面', result: 'pass', photos: [] },
        { key: 'tableware', label: '餐具', result: 'pass', photos: [] },
        { key: 'equipment', label: '设备', result: 'pass', photos: [] }
      ],
      overallComment: '公益免押，补清洁由社区保洁承担。'
    },
    depositResult: { decision: 'none', deduction: 0, reasons: ['公益活动免押，无需退押'], decidedBy: '张管理', decidedAt: '2026-09-08 10:55' },
    publicity: {
      published: true,
      publishedAt: '2026-09-08 16:00',
      by: '孙社工',
      title: '银发营养早餐课服务 18 位独居老人',
      summary: '公益免押；垃圾分拣需改进，已在志愿者群提醒。',
      board: true
    },
    foodSafetyAck: true,
    foodSafetyAckAt: '2026-09-07 10:00',
    createdAt: '2026-09-05 14:00',
    timeline: [
      { at: '2026-09-05 14:00', actor: '陈小明', action: '提交公益课堂申请（免押）' },
      { at: '2026-09-05 15:30', actor: '孙社工', action: '核准免押并通过审批', tone: 'green' },
      { at: '2026-09-08 11:30', actor: '张管理', action: '遗留青菜超时未取，现场通知负责人', tone: 'amber' },
      { at: '2026-09-09 09:00', actor: '张管理', action: '青菜依规报废，公益豁免处置费并提示责任', tone: 'blue' },
      { at: '2026-09-08 10:50', actor: '张管理', action: '验收完成（垃圾项补清洁）', tone: 'blue' }
    ]
  },
  // 8. 活动取消但食材已提前入库（待管理员处置：通知/待处理/清空，处置影响押金）
  {
    id: 'b-008',
    code: 'NK-20260915-002',
    applicantId: 'u-res2',
    applicantKind: 'resident',
    contactName: '李建国',
    contactPhone: '138-0000-1002',
    activityKind: 'private',
    title: '手工饺子制作（已取消，食材滞留）',
    date: '2026-09-15',
    startAt: '18:00',
    endAt: '20:00',
    peopleCount: 6,
    cookingTypes: ['蒸煮'],
    isFrying: false,
    storageNeeded: true,
    storageNote: '虾仁与饺子皮提前一天暂存',
    equipmentNeeds: ['stove', 'fridge', 'tableware'],
    natureNote: '家庭聚会，临时取消。',
    depositRequired: 100,
    depositPaid: true,
    depositFree: false,
    status: 'canceled',
    approverId: 'u-admin',
    approveComment: '同意，食材请按时取走。',
    allocatedResourceIds: [],
    storageItems: [
      {
        id: 'st-6', name: '冷冻虾仁 1.5kg', zone: '冷冻柜B-2层', category: 'meat-seafood',
        label: '冷冻虾仁1.5kg / 李建国 138-0000-1002 / 09-14',
        putAt: '2026-09-14 20:10', putBy: '张管理', ownerName: '李建国', ownerPhone: '138-0000-1002',
        expectedTakeAt: '2026-09-15 20:00', state: 'pending',
        notifications: [
          { at: '2026-09-15 09:00', by: '张管理', channel: '电话', note: '活动取消后电话确认，负责人称出差三日后才回' },
          { at: '2026-09-15 09:05', by: '张管理', channel: '短信', note: '短信告知肉类/海鲜超时处置规则' }
        ],
        history: [
          { at: '2026-09-14 20:10', by: '张管理', action: '提前入库冷冻柜B-2层' },
          { at: '2026-09-15 08:30', by: '李建国', action: '活动取消' },
          { at: '2026-09-15 09:00', by: '张管理', action: '电话+短信通知负责人' },
          { at: '2026-09-15 10:00', by: '张管理', action: '转为待处理食材，等待报废/取回处置' }
        ]
      },
      {
        id: 'st-7', name: '饺子皮 2kg', zone: '冷藏柜A-2层', category: 'staple',
        label: '饺子皮2kg / 李建国 138-0000-1002 / 09-14',
        putAt: '2026-09-14 20:10', putBy: '张管理', ownerName: '李建国', ownerPhone: '138-0000-1002',
        expectedTakeAt: '2026-09-15 20:00', state: 'stored',
        notifications: [],
        history: [
          { at: '2026-09-14 20:10', by: '张管理', action: '提前入库冷藏柜A-2层' }
        ]
      }
    ],
    incidentIds: [],
    foodSafetyAck: true,
    foodSafetyAckAt: '2026-09-13 21:00',
    createdAt: '2026-09-13 20:30',
    timeline: [
      { at: '2026-09-13 20:30', actor: '李建国', action: '提交预约并缴纳押金 100 元' },
      { at: '2026-09-13 21:00', actor: '张管理', action: '审批通过', tone: 'green' },
      { at: '2026-09-14 20:10', actor: '张管理', action: '食材提前入库（冷冻虾仁 + 饺子皮）', tone: 'blue' },
      { at: '2026-09-15 08:30', actor: '李建国', action: '因故取消活动', tone: 'gray' },
      { at: '2026-09-15 09:00', actor: '张管理', action: '食材超时未取，电话/短信通知负责人', tone: 'amber' },
      { at: '2026-09-15 10:00', actor: '张管理', action: '冷冻虾仁转为待处理食材，等待按食品安全规则处置', tone: 'red' }
    ]
  },
  // 9. 活动结束发现烤箱门损坏（待设备损坏验收 + 维修工单 + 通知下一位预约人）
  {
    id: 'b-009',
    code: 'NK-20260914-006',
    applicantId: 'u-res1',
    applicantKind: 'resident',
    contactName: '王秀兰',
    contactPhone: '138-0000-1001',
    activityKind: 'neighbor-feast',
    title: '烘焙体验：手工面包分享',
    date: '2026-09-14',
    startAt: '09:00',
    endAt: '12:00',
    peopleCount: 12,
    cookingTypes: ['烘焙'],
    isFrying: false,
    storageNeeded: false,
    equipmentNeeds: ['oven', 'sterilizer', 'tableware'],
    natureNote: '楼栋烘焙小组，使用 1 号烤箱。',
    depositRequired: 200,
    depositPaid: true,
    depositFree: false,
    status: 'closing',
    approverId: 'u-admin',
    approveComment: '同意，烤箱按规程操作。',
    preCheck: {
      checkerId: 'u-admin',
      at: '2026-09-14 08:40',
      identityOk: true,
      healthPromise: true,
      storageOk: true,
      equipmentOk: true,
      note: '使用前确认 1 号烤箱门开合正常。',
      photos: [ph('♨️', '1号烤箱使用前照片', '张管理', '2026-09-14 08:40')]
    },
    allocatedResourceIds: ['r-o1', 'r-x1', 'r-t1'],
    storageItems: [],
    incidentIds: [],
    foodSafetyAck: true,
    foodSafetyAckAt: '2026-09-13 20:00',
    createdAt: '2026-09-12 12:00',
    timeline: [
      { at: '2026-09-12 12:00', actor: '王秀兰', action: '提交烘焙体验预约（押金 200 元）' },
      { at: '2026-09-12 13:00', actor: '张管理', action: '审批通过', tone: 'green' },
      { at: '2026-09-14 08:40', actor: '张管理', action: '使用前核验，1 号烤箱正常', tone: 'green' },
      { at: '2026-09-14 12:05', actor: '张管理', action: '活动结束发现 1 号烤箱门铰链断裂，登记设备损坏报告，等待责任定性', tone: 'red' }
    ]
  }
]

// ---------------- 设备损坏验收 ----------------
export const seedDamageReports: import('@/types').DamageReport[] = [
  // b-002 商业试吃烤盘划伤（历史：已扣费 160，工单关闭）
  {
    id: 'dr-1',
    code: 'WS-20260910-01',
    bookingId: 'b-002',
    resourceId: 'r-o2',
    resourceName: '2号烤箱原配烤盘',
    resourceType: 'oven',
    kind: 'damage',
    title: '不粘烤盘涂层人为划伤',
    detail: '团队使用金属铲导致涂层大面积划伤，无法再用于烘焙。',
    reportedBy: '张管理',
    reportedAt: '2026-09-10 16:10',
    photos: [ph('🔧', '烤盘划伤照片', '赵维修', '2026-09-10 16:15')],
    lastInspectionAt: '2026-09-09 18:00',
    lastInspectionResult: '烤盘涂层完好',
    onSite: { userIdMatch: true, beforeNormal: true, onSiteConfirmed: true, note: '使用前照片显示无划痕' },
    verdict: 'charge',
    decidedBy: '张管理',
    decidedAt: '2026-09-10 18:45',
    decisionNote: '认定人为损坏，更换烤盘 160 元计入押金。',
    chargeAmount: 160,
    chargePosted: true,
    workOrderId: 'wo-1'
  },
  // b-009 烤箱门损坏（调查中 → 待管理员定性）
  {
    id: 'dr-2',
    code: 'WS-20260914-01',
    bookingId: 'b-009',
    resourceId: 'r-o1',
    resourceName: '1号烤箱',
    resourceType: 'oven',
    kind: 'damage',
    title: '烤箱门铰链断裂、门体无法闭合',
    detail: '活动结束验收时发现烤箱门下坠、无法闭合，温控仍可启动；现场有金属受力变形痕迹。使用人称开合时突然断裂。',
    reportedBy: '张管理',
    reportedAt: '2026-09-14 12:05',
    photos: [
      ph('♨️', '烤箱门损坏现场照', '张管理', '2026-09-14 12:05'),
      ph('🔩', '断裂铰链特写', '赵维修', '2026-09-14 12:20')
    ],
    lastInspectionAt: '2026-09-13 18:00',
    lastInspectionResult: '门体开合正常，温控校准合格（报修前最后一次巡检）',
    onSite: { userIdMatch: true, beforeNormal: true, onSiteConfirmed: false, note: '使用人对“是否暴力关门”有异议，现场确认尚未完成' },
    verdict: 'investigating',
    chargeAmount: 0,
    chargePosted: false,
    workOrderId: 'wo-2'
  }
]

export const seedWorkOrders: import('@/types').RepairWorkOrder[] = [
  {
    id: 'wo-1',
    code: 'WX-20260910-02',
    damageReportId: 'dr-1',
    bookingId: 'b-002',
    resourceId: 'r-o2',
    resourceName: '2号烤箱原配烤盘',
    resourceType: 'oven',
    title: '更换划伤烤盘',
    createdAt: '2026-09-10 16:20',
    createdBy: '赵维修',
    status: 'closed',
    affectsBookings: false,
    blockSameKind: false,
    estimatedRepairDays: 1,
    repairCost: 160,
    handlerId: '赵维修',
    handleNote: '已更换新烤盘，不影响烤箱主体使用。',
    closedAt: '2026-09-10 17:20',
    timeline: [
      { at: '2026-09-10 16:20', actor: '赵维修', action: '维修工单建立', tone: 'red' },
      { at: '2026-09-10 17:20', actor: '赵维修', action: '更换完成，工单关闭', tone: 'green' }
    ]
  },
  {
    id: 'wo-2',
    code: 'WX-20260914-01',
    damageReportId: 'dr-2',
    bookingId: 'b-009',
    resourceId: 'r-o1',
    resourceName: '1号烤箱',
    resourceType: 'oven',
    title: '烤箱门铰链断裂维修',
    createdAt: '2026-09-14 12:20',
    createdBy: '赵维修',
    status: 'repairing',
    affectsBookings: true,
    blockReason: '门体无法闭合存在烫伤风险，停用维修；2 号烤箱可承接改派',
    blockSameKind: false,
    estimatedRepairDays: 3,
    repairCost: 320,
    handlerId: '赵维修',
    timeline: [
      { at: '2026-09-14 12:05', actor: '张管理', action: '设备损坏报告登记，设备停用', tone: 'red' },
      { at: '2026-09-14 12:20', actor: '赵维修', action: '维修工单建立，核定更换铰链约 320 元、预计 3 天，标记影响后续预约', tone: 'amber' }
    ]
  }
]

// 1 号烤箱停用后，系统对已分配/已申请烤箱的后续预约自动发出的通知
export const seedEquipmentNotifications: import('@/types').EquipmentNotification[] = [
  {
    id: 'en-1',
    workOrderId: 'wo-2',
    resourceType: 'oven',
    bookingId: 'b-004',
    applicantId: 'u-res2',
    channel: '站内',
    sentAt: '2026-09-14 12:25',
    sentBy: '系统',
    message: '您 09-14 14:00 家庭烘焙原分配的 1 号烤箱因烤箱门损坏停用，已为您改派 2 号烤箱，请按时到场核验。',
    status: 'responded',
    response: 'change-equipment',
    responseNote: '同意改用 2 号烤箱',
    respondedAt: '2026-09-14 12:40'
  },
  {
    id: 'en-2',
    workOrderId: 'wo-2',
    resourceType: 'oven',
    bookingId: 'b-005',
    applicantId: 'u-org2',
    channel: '站内',
    sentAt: '2026-09-14 12:25',
    sentBy: '系统',
    message: '您 09-16 商业试吃申请的烤箱设备中，1 号烤箱预计 3 天内无法使用；审批通过后将安排 2 号烤箱，请知悉，如需改期请联系管理员。',
    status: 'pending'
  }
]

// ---------------- 邻里投诉回溯 ----------------
export const seedComplaintReviews: import('@/types').ComplaintReview[] = [
  // 历史：09-08 银发课堂油烟投诉，已回溯并给该组织（u-org1）下一次预约写入条件
  {
    id: 'cr-1',
    code: 'TS-20260908-01',
    bookingId: 'b-007',
    applicantId: 'u-org1',
    complaintType: 'smoke',
    summary: '2 号楼有老人反映早餐课煎制食物时油烟味进入楼道。',
    neighborFrom: '2号楼 201 电话',
    reportedAt: '2026-09-08 09:20',
    context: {
      cookingTypes: ['蒸煮', '家常烹饪'],
      isFrying: false,
      peopleCount: 18,
      timeRange: '2026-09-08 08:30-10:30',
      allocatedResourceIds: ['r-s2', 'r-x1', 'r-t1', 'r-g1'],
      ventilation: [
        { id: 'sv-1', at: '2026-09-08 08:35', level: 1, by: '张管理', note: '排风 1 档（志愿者不会调档）' },
        { id: 'sv-2', at: '2026-09-08 09:10', level: 3, by: '张管理', note: '投诉后调至 3 档' }
      ],
      patrols: [
        { id: 'spl-1', at: '2026-09-08 09:05', by: '张管理', finding: '志愿者使用灶台不熟练，排风档位偏低', action: '现场教学调至高档' }
      ]
    },
    status: 'reviewed',
    conclusion: '排风开启不及时、现场缺少巡查引导，非恶意；对该组织后续课堂提出加强排风和增加巡查要求。',
    reviewedBy: '孙社工',
    reviewedAt: '2026-09-08 15:00',
    measures: [
      { type: 'add-ventilation', detail: '后续课堂烹饪全程排风高档，油烟菜品错峰' },
      { type: 'add-patrol', detail: '管理员在开场与烹饪高峰各巡查 1 次（共 ≥2 次）' }
    ],
    nextBookingTerms: [
      { id: 'ct-1', sourceReviewCode: 'TS-20260908-01', category: 'ventilation', label: '烹饪全程开启排风机高档，油烟大的菜品错峰操作', surcharge: 0, penalty: 100 },
      { id: 'ct-2', sourceReviewCode: 'TS-20260908-01', category: 'patrol', label: '使用期间管理员至少现场巡查 2 次，负责人配合签到', surcharge: 0, penalty: 60, requiredPatrols: 2 }
    ]
  },
  // 当前：09-14 公益课堂油烟+哮喘老人投诉，待社区工作人员回溯
  {
    id: 'cr-2',
    code: 'TS-20260914-01',
    incidentId: 'i-2',
    bookingId: 'b-003',
    applicantId: 'u-org1',
    complaintType: 'mixed',
    summary: '2 号楼 302 哮喘老人家庭反映辣椒炒肉油烟与儿童喧闹噪声，要求控制影响。',
    neighborFrom: '2号楼 302（物业转来）',
    reportedAt: '2026-09-14 09:55',
    context: {
      cookingTypes: ['家常烹饪'],
      isFrying: false,
      peopleCount: 20,
      timeRange: '2026-09-14 09:00-12:00',
      allocatedResourceIds: ['r-s1', 'r-s3', 'r-o1', 'r-x1', 'r-t1', 'r-g1'],
      ventilation: [
        { id: 'sv-3', at: '2026-09-14 09:05', level: 2, by: '张管理', note: '开场排风 2 档' },
        { id: 'sv-4', at: '2026-09-14 09:43', level: 3, by: '张管理', note: '油烟报警后调至 3 档并开窗' }
      ],
      patrols: [
        { id: 'spl-2', at: '2026-09-14 09:20', by: '张管理', finding: '四灶同炒，含家长围观约 25 人，油烟与噪声偏大', action: '要求两灶轮换、围观者外候' },
        { id: 'spl-3', at: '2026-09-14 09:45', by: '张管理', finding: '排风 3 档后油烟下降', action: '持续观察' }
      ]
    },
    status: 'open',
    measures: [],
    nextBookingTerms: []
  }
]
