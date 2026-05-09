// game.js - 《下一间》网页 Canvas 版 / 图片图层替换版
// 保留：难度选择 / 门吸附 / 鬼速度逻辑 / 安全进入动画 / 封印逻辑
// 新增：assets 目录图片图层结构，可直接替换 png
// 更新：只抽取已加载的角色图片；无图片槽位不再使用临时鬼/临时人物；测试版隐藏墙壁和地板
// 版本：v0.9.6
// 本版更新：同步调用根目录新素材；旧 根目录新素材 路径全部停用

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

const GAME_VERSION = 'v0.9.8'
const GAME_VERSION_NOTE = '转场裁切/封印消失/角色统一落地版'

let W = window.innerWidth
let H = window.innerHeight
let DPR = window.devicePixelRatio || 1

let gameState = 'home' // loading / home / difficulty / rules / codex / playing / gameover
let difficultyMode = null // easy / hard
let assetsReady = false

const DIFFICULTY = {
  easy: {
    name: '简单版',
    desc: '瘦子鬼降速，适合先上手',
    thinMultiplier: 1.25,
    bestKey: 'bestRoomV7Easy'
  },
  hard: {
    name: '困难版',
    desc: '原版速度，更紧张',
    thinMultiplier: 1.8,
    bestKey: 'bestRoomV7Hard'
  }
}

// ===== 图片资源 =====
// v0.9.6：改为直接调用你上传在仓库根目录的素材，不再调用 根目录新素材 里的旧素材。
const ASSET_PATHS = {
  frame: '门框.png',          // 外层 / 内层门框
  frameRaw: '门框.png',       // 菜单背景备份
  room: '房间内.png',         // 门后的房间空间
  wall: '房间内.png',         // 兼容旧变量，不再调用旧 wall.png
  floor: '房间内.png',        // 兼容旧变量，不再调用旧 floor.png
  door: '门.png',             // 原始门图保留加载；实际门板改为代码复刻，避免尺寸不适配
  sealButton: '封印按钮.png'  // 封印按钮 / 符咒贴图
}

// ===== 角色资源槽位 =====
// v0.9.6：根据你当前上传的根目录图片建立映射。
// 鬼图鉴按首批山海经阵容排序；缺图不会报错，缺图槽位不会参与随机。
const GHOST_SLOTS = [
  { id: 1, name: '猼訑', src: '猼訑.png' },
  { id: 2, name: '赤鱬', src: '赤鱬.png' },
  { id: 3, name: '当康', src: '当康.png' },
  { id: 4, name: '混沌', src: '混沌.png' },
  { id: 5, name: '九尾狐', src: '九尾狐.png' },
  { id: 6, name: '夔牛', src: '夔牛.png' },
  { id: 7, name: '麒麟', src: '麒麟.png' },
  { id: 8, name: '穷奇', src: '穷奇.png' },
  { id: 9, name: '饕餮', src: '饕餮.png' },
  { id: 10, name: '狰', src: '狰.png' },
  { id: 11, name: '烛阴', src: '烛阴.png' }
]

// 人物素材使用你上传的 1号人物.png ～ 10号人物.png。
const PERSON_SLOTS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `${i + 1}号人物`,
  src: `${i + 1}号人物.png`
}))

const ASSETS = {}
const CHARACTER_ASSETS = {
  ghosts: {},
  people: {}
}

let ACTIVE_GHOST_SLOTS = []
let ACTIVE_PERSON_SLOTS = []

const CODEX_STORAGE_KEY = 'nextDoorSeenGhostIdsV1'
const PEOPLE_CODEX_STORAGE_KEY = 'nextDoorSeenPeopleIdsV1'
let SEEN_GHOST_IDS = new Set()
let SEEN_PERSON_IDS = new Set()
let codexTab = 'ghosts' // ghosts / people

// 门框原图里“门洞”的位置比例。
// 这组参数决定：门、墙壁、地板、鬼，都会被放进这个洞口里。
const FRAME_OPENING = {
  x: 126 / 1086,
  y: 229 / 1448,
  w: (948 - 126) / 1086,
  h: (1322 - 229) / 1448
}

// 这里是最重要的图层尺寸控制区，后续美术替换时优先调这里。
const ART_LAYOUT = {
  frameTop: 0.115,          // 最大门框距离屏幕顶部比例
  frameHeight: 0.70,        // 最大门框高度比例
  minFrameWidth: 0.94,      // 如果门框太窄，至少撑到屏幕宽度的 94%
  largeDoorSlide: 0.98,     // 最大门全开时，向左滑出多少个门洞宽度
  floorStart: 0.68,         // 地板从门洞高度的 68% 开始
  innerFrameHeight: 0.33,   // 缩小门框高度，占门洞高度
  innerFrameY: 0.30,        // 缩小门框位置，越小越靠上/越深
  innerDoorInset: 0.12,     // 缩小门在缩小门框内收进去多少
  roomWallDarkness: 0.22,   // 房间里面墙壁压暗程度，0=不压暗，越大越暗
  innerDoorAlpha: 1,        // v0.9.7：房间里的门不再半透明，而是完整绘制后整体压暗
  innerDoorDarkness: 0.46,   // 房间里的门/门框压暗程度，避免和外层门抢层级
  ghostHeight: 0.42,         // v0.9.8：鬼和人物统一高度范围
  personHeight: 0.42,        // v0.9.8：人物和鬼保持相近尺寸
  characterBottom: 0.965,    // v0.9.8：统一贴地，避免悬浮
  transitionClipPadding: 8   // v0.9.8：转场缩放裁切边界，防止盖住UI
}

// 临时测试开关：先隐藏墙壁和地板，只保留黑底、内部门、外门框、外门。
// 后面想恢复墙壁地板，改成 true 即可。
const SHOW_WALL_AND_FLOOR = true

let room = 1
let best = 1

let dragging = false
let startX = 0
let startDoorOpen = 0

let doorOpen = 0
let doorTarget = 0
let doorAutoMoving = false
const DOOR_SNAP_THRESHOLD = 0.45
const DOOR_AUTO_SPEED = 0.018

let roomContent = 'empty' // ghost / fake / empty
let ghostType = 'normal' // big / thin / normal
let ghostSlot = null     // 兼容旧逻辑：当前第一只鬼
let ghostSlots = []      // 当前房间所有鬼；可能 1~3 只
let personSlot = null    // 当前抽到几号人物

let contentVisible = false
let hasSeenContent = false

let danger = 0
let dangerSpeed = 0.02
let ghostThreshold = 0.35

let isChangingRoom = false
let sealAnim = 1
let sealSuccess = false
let sealCountRequired = 0
let sealCountDone = 0
let sealEyeTriggered = false
let sealResolveStart = 0
const SEAL_RESOLVE_DURATION = 520

let enterAnim = 0
let enteringRoom = false
let roomFadeIn = 0 // 新房间出现时的黑场淡入，避免切房间突兀

const ENTER_ANIM_SPEED = 0.011
const ROOM_FADE_IN_SPEED = 0.06

const GHOST_EYE_DURATION_MS = 10000
let ghostEyeUntil = 0

const BOSS_CONFIGS = [
  { stage: 1, time: 7.0, seals: 16 },
  { stage: 2, time: 6.5, seals: 20 },
  { stage: 3, time: 6.0, seals: 24 },
  { stage: 4, time: 5.8, seals: 28 },
  { stage: 5, time: 5.5, seals: 30 }
]

let bossActive = false
let bossStage = 1
let bossTimeLeft = 0
let bossTimeTotal = 7
let bossSealsRequired = 16
let bossSealsDone = 0
let bossScheduledStage = 0
let bossScheduledRoom = 0
let bossAttemptedStage = 0
let bossDefeatedStage = 0
let bossShake = 0
let bossForced = false
let bossPhase = 'idle' // idle / reveal / sealing
let bossSeen = false
let bossDoorPressure = 0
let bossSealFlash = 0
let bossSealStickers = []

const BOSS_CONFIRM_OPEN = 0.32
const BOSS_START_SEAL_OPEN = 0.06
const BOSS_BASE_PRESSURE = 0.13

const sealButton = { x: 0, y: 0, w: 0, h: 58 }
const bossButton = { x: 0, y: 0, w: 0, h: 76 }

const menuButtons = {
  start: { x: 0, y: 0, w: 0, h: 68 },
  rules: { x: 0, y: 0, w: 0, h: 60 },
  codex: { x: 0, y: 0, w: 0, h: 60 },
  easy: { x: 0, y: 0, w: 0, h: 74 },
  hard: { x: 0, y: 0, w: 0, h: 74 }
}

const backButton = { x: 14, y: 26, w: 58, h: 34 }
const screenBackButton = { x: 18, y: 24, w: 72, h: 38 }
const codexTabs = {
  ghosts: { x: 0, y: 0, w: 0, h: 38 },
  people: { x: 0, y: 0, w: 0, h: 38 }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function loadOptionalImage(src) {
  return loadImage(src).catch(() => null)
}

async function loadAssets() {
  // 基础空间图层是必需资源，加载失败需要报错。
  const entries = Object.entries(ASSET_PATHS)
  const loaded = await Promise.all(entries.map(async ([key, src]) => [key, await loadImage(src)]))
  loaded.forEach(([key, img]) => { ASSETS[key] = img })

  // 鬼和人物是可选资源，方便你后续慢慢补图。
  const ghostImgs = await Promise.all(GHOST_SLOTS.map(async (slot) => [slot.id, await loadOptionalImage(slot.src)]))
  const personImgs = await Promise.all(PERSON_SLOTS.map(async (slot) => [slot.id, await loadOptionalImage(slot.src)]))

  ghostImgs.forEach(([id, img]) => { CHARACTER_ASSETS.ghosts[id] = img })
  personImgs.forEach(([id, img]) => { CHARACTER_ASSETS.people[id] = img })

  ACTIVE_GHOST_SLOTS = GHOST_SLOTS.filter((slot) => CHARACTER_ASSETS.ghosts[slot.id])
  ACTIVE_PERSON_SLOTS = PERSON_SLOTS.filter((slot) => CHARACTER_ASSETS.people[slot.id])
  loadSeenGhosts()

  assetsReady = true
}

function resizeCanvas() {
  W = window.innerWidth
  H = window.innerHeight
  DPR = window.devicePixelRatio || 1

  canvas.width = Math.floor(W * DPR)
  canvas.height = Math.floor(H * DPR)
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

  sealButton.x = W * 0.3
  sealButton.y = H * 0.85
  sealButton.w = W * 0.4
  sealButton.h = 58

  const btnW = Math.min(W * 0.76, 340)
  const btnH = 74

  menuButtons.start.x = (W - btnW) / 2
  menuButtons.start.y = H * 0.44
  menuButtons.start.w = btnW
  menuButtons.start.h = 68

  menuButtons.rules.x = (W - btnW) / 2
  menuButtons.rules.y = H * 0.44 + 86
  menuButtons.rules.w = btnW
  menuButtons.rules.h = 60

  menuButtons.codex.x = (W - btnW) / 2
  menuButtons.codex.y = H * 0.44 + 158
  menuButtons.codex.w = btnW
  menuButtons.codex.h = 60

  menuButtons.easy.x = (W - btnW) / 2
  menuButtons.easy.y = H * 0.48
  menuButtons.easy.w = btnW
  menuButtons.easy.h = btnH

  menuButtons.hard.x = (W - btnW) / 2
  menuButtons.hard.y = H * 0.48 + btnH + 18
  menuButtons.hard.w = btnW
  menuButtons.hard.h = btnH

  backButton.x = 14
  backButton.y = Math.max(18, H * 0.025)
  backButton.w = 58
  backButton.h = 34

  screenBackButton.x = 18
  screenBackButton.y = Math.max(18, H * 0.025)
  screenBackButton.w = 72
  screenBackButton.h = 38

  bossButton.w = Math.min(W * 0.78, 360)
  bossButton.h = 78
  bossButton.x = (W - bossButton.w) / 2
  bossButton.y = H - bossButton.h - Math.max(26, H * 0.035)

  const tabW = Math.min(W * 0.34, 150)
  const tabGap = 12
  const tabsTotal = tabW * 2 + tabGap
  codexTabs.ghosts.x = (W - tabsTotal) / 2
  codexTabs.ghosts.y = H * 0.19
  codexTabs.ghosts.w = tabW
  codexTabs.ghosts.h = 38
  codexTabs.people.x = codexTabs.ghosts.x + tabW + tabGap
  codexTabs.people.y = codexTabs.ghosts.y
  codexTabs.people.w = tabW
  codexTabs.people.h = 38
}

resizeCanvas()
window.addEventListener('resize', resizeCanvas)
window.addEventListener('orientationchange', resizeCanvas)

function getStoredBest(mode) {
  if (mode === 'hard') {
    return Number(
      localStorage.getItem(DIFFICULTY.hard.bestKey) ||
      localStorage.getItem('bestRoomV7') ||
      1
    )
  }
  return Number(localStorage.getItem(DIFFICULTY.easy.bestKey) || 1)
}

function saveBest() {
  if (!difficultyMode) return
  localStorage.setItem(DIFFICULTY[difficultyMode].bestKey, String(best))
}

function loadSeenGhosts() {
  try {
    const raw = localStorage.getItem(CODEX_STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    SEEN_GHOST_IDS = new Set(arr.map(Number).filter(Boolean))
  } catch (err) {
    SEEN_GHOST_IDS = new Set()
  }

  try {
    const rawPeople = localStorage.getItem(PEOPLE_CODEX_STORAGE_KEY)
    const arrPeople = rawPeople ? JSON.parse(rawPeople) : []
    SEEN_PERSON_IDS = new Set(arrPeople.map(Number).filter(Boolean))
  } catch (err) {
    SEEN_PERSON_IDS = new Set()
  }
}

function saveSeenGhosts() {
  localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify(Array.from(SEEN_GHOST_IDS).sort((a, b) => a - b)))
}

function saveSeenPeople() {
  localStorage.setItem(PEOPLE_CODEX_STORAGE_KEY, JSON.stringify(Array.from(SEEN_PERSON_IDS).sort((a, b) => a - b)))
}

function markSeenGhosts(slots) {
  let changed = false
  slots.forEach((slot) => {
    if (!slot || !slot.id) return
    if (!SEEN_GHOST_IDS.has(slot.id)) {
      SEEN_GHOST_IDS.add(slot.id)
      changed = true
    }
  })
  if (changed) saveSeenGhosts()
}

function markSeenPerson(slot) {
  if (!slot || !slot.id) return
  if (!SEEN_PERSON_IDS.has(slot.id)) {
    SEEN_PERSON_IDS.add(slot.id)
    saveSeenPeople()
  }
}

function collectedGhostCount() {
  return ACTIVE_GHOST_SLOTS.filter((slot) => SEEN_GHOST_IDS.has(slot.id)).length
}

function totalGhostCount() {
  return ACTIVE_GHOST_SLOTS.length || GHOST_SLOTS.length
}

function collectedPeopleCount() {
  return ACTIVE_PERSON_SLOTS.filter((slot) => SEEN_PERSON_IDS.has(slot.id)).length
}

function totalPeopleCount() {
  return ACTIVE_PERSON_SLOTS.length || PERSON_SLOTS.length
}

function collectedTotalCount() {
  return collectedGhostCount() + collectedPeopleCount()
}

function totalCodexCount() {
  return totalGhostCount() + totalPeopleCount()
}

function startGame(mode) {
  ghostEyeUntil = 0
  difficultyMode = mode
  room = 1
  best = getStoredBest(mode)
  bossActive = false
  bossPhase = 'idle'
  bossSeen = false
  bossDoorPressure = 0
  bossSealFlash = 0
  bossScheduledStage = 0
  bossScheduledRoom = 0
  bossAttemptedStage = 0
  bossDefeatedStage = 0
  gameState = 'playing'
  roomFadeIn = 0
  newRoom()
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function smoothstep(v) {
  v = clamp01(v)
  return v * v * (3 - 2 * v)
}

function easeInOutCubic(v) {
  v = clamp01(v)
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}

function ghostEyeActive() {
  return performance.now() < ghostEyeUntil
}

function ghostEyeLeftSeconds() {
  return Math.max(0, (ghostEyeUntil - performance.now()) / 1000)
}

function activateGhostEye() {
  ghostEyeUntil = performance.now() + GHOST_EYE_DURATION_MS
}

function getBossStageForRoom(value = room) {
  return Math.floor((value - 1) / 25) + 1
}

function getBossStageStart(stage) {
  return (stage - 1) * 25 + 1
}

function getBossStageEnd(stage) {
  return stage * 25
}

function getBossConfig(stage) {
  return BOSS_CONFIGS[Math.min(stage, BOSS_CONFIGS.length) - 1] || BOSS_CONFIGS[BOSS_CONFIGS.length - 1]
}

function ensureBossScheduleForStage(stage) {
  if (bossScheduledStage === stage && bossScheduledRoom) return
  bossScheduledStage = stage
  bossAttemptedStage = 0
  bossDefeatedStage = Math.max(bossDefeatedStage, stage - 1)
  const minRoom = getBossStageStart(stage) + 19
  const maxRoom = getBossStageEnd(stage)
  bossScheduledRoom = minRoom + Math.floor(Math.random() * (maxRoom - minRoom + 1))
}

function shouldStartBossRoom() {
  const stage = getBossStageForRoom(room)
  ensureBossScheduleForStage(stage)
  if (bossDefeatedStage >= stage) return false
  const stageEnd = getBossStageEnd(stage)
  if (room >= stageEnd) return true
  if (bossAttemptedStage === stage) return false
  return room >= bossScheduledRoom
}

function startBossBattle(forced = false) {
  // Boss房间不能吃到上一间切房时留下的黑场。
  // 之前第25关强制Boss时，newRoom() 会先进入 bossActive，update() 又在Boss分支提前 return，
  // 导致 roomFadeIn 没机会衰减，于是画面一直黑屏。
  roomFadeIn = 0
  enteringRoom = false
  isChangingRoom = false

  bossActive = true
  bossPhase = 'reveal'
  bossSeen = false
  bossStage = getBossStageForRoom(room)
  const config = getBossConfig(bossStage)
  bossTimeTotal = config.time
  bossTimeLeft = config.time
  bossSealsRequired = config.seals
  bossSealsDone = 0
  bossForced = forced
  bossAttemptedStage = bossStage
  bossShake = 0
  bossDoorPressure = 0
  bossSealFlash = 0

  dragging = false
  doorAutoMoving = false
  doorOpen = 0
  doorTarget = 0
  roomContent = 'boss'
  hasSeenContent = false
  contentVisible = false
}

function beginBossSealing() {
  bossPhase = 'sealing'
  bossTimeLeft = bossTimeTotal
  bossDoorPressure = BOSS_BASE_PRESSURE
  doorOpen = bossDoorPressure
  doorTarget = 0
  doorAutoMoving = false
  dragging = false
}

function getBossPressureSpeed() {
  // 不点封印时，Boss 会在几秒内把门顶开；越后期压迫越明显。
  const stageBoost = Math.min(0.055, (bossStage - 1) * 0.012)
  const hpRatio = 1 - bossSealsDone / Math.max(1, bossSealsRequired)
  const lowHpSlowdown = hpRatio < 0.3 ? -0.025 : 0
  return 0.19 + stageBoost + lowHpSlowdown
}

function getBossSealPushBack() {
  // 每贴一次符，把门缝压回去一点；不直接归零，保留拉扯感。
  return 0.058
}

function completeBossBattle() {
  bossActive = false
  bossPhase = 'idle'
  bossSealStickers = []
  bossDefeatedStage = Math.max(bossDefeatedStage, bossStage)
  room = getBossStageEnd(bossStage) + 1
  if (room > best) {
    best = room
    saveBest()
  }
  bossScheduledStage = 0
  bossScheduledRoom = 0
  bossAttemptedStage = 0
  roomFadeIn = 0.55
  newRoom()
}

function failBossBattle() {
  const stageEnd = getBossStageEnd(bossStage)
  bossActive = false
  bossPhase = 'idle'
  bossSealStickers = []
  if (bossForced || room >= stageEnd) {
    gameOver()
    return
  }
  room++
  if (room > best) {
    best = room
    saveBest()
  }
  roomFadeIn = 0.45
  newRoom()
}

function randomContent() {
  const hasGhost = ACTIVE_GHOST_SLOTS.length > 0
  const hasPerson = ACTIVE_PERSON_SLOTS.length > 0
  const r = Math.random()

  // 有哪些角色图，就只从已有角色图里出；没图的临时鬼/人不再出现。
  if (hasGhost && hasPerson) {
    if (r < 0.4) return 'ghost'
    if (r < 0.65) return 'fake'
    return 'empty'
  }

  if (hasGhost) return r < 0.55 ? 'ghost' : 'empty'
  if (hasPerson) return r < 0.5 ? 'fake' : 'empty'
  return 'empty'
}

function randomGhostType() {
  const r = Math.random()
  if (r < 0.33) return 'big'
  if (r < 0.66) return 'thin'
  return 'normal'
}

function randomSlot(slots) {
  return slots[Math.floor(Math.random() * slots.length)]
}

function shuffleArray(arr) {
  const copy = arr.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

function pickGhostCount() {
  // 多鬼按关卡阶段解锁：
  // 1-24 关：最多 1 只鬼；
  // 25-49 关：有概率出现 2 只鬼；
  // 50 关以后：有概率出现 3 只鬼。
  const available = ACTIVE_GHOST_SLOTS.length
  if (available <= 0) return 0

  let stageMax = 1
  if (room >= 50) stageMax = 3
  else if (room >= 25) stageMax = 2

  const maxCount = Math.min(stageMax, available)
  if (maxCount <= 1) return 1

  const r = Math.random()

  if (maxCount >= 3) {
    if (r < 0.22) return 3
    if (r < 0.55) return 2
    return 1
  }

  // 25-49 关：开始出现 2 只鬼，但不必每次都是 2 只，避免难度突然跳太猛。
  if (maxCount >= 2) {
    return r < 0.38 ? 2 : 1
  }

  return 1
}

function randomGhostSlots() {
  const count = pickGhostCount()
  return shuffleArray(ACTIVE_GHOST_SLOTS).slice(0, count)
}

function newRoom() {
  dragging = false
  startX = 0
  startDoorOpen = 0

  doorOpen = 0
  doorTarget = 0
  doorAutoMoving = false
  bossActive = false

  if (shouldStartBossRoom()) {
    startBossBattle(room >= getBossStageEnd(getBossStageForRoom(room)))
    return
  }

  roomContent = randomContent()
  ghostType = roomContent === 'ghost' ? randomGhostType() : 'normal'
  ghostSlots = roomContent === 'ghost' ? randomGhostSlots() : []
  ghostSlot = ghostSlots[0] || null
  personSlot = roomContent === 'fake' ? randomSlot(ACTIVE_PERSON_SLOTS) : null
  sealCountRequired = roomContent === 'ghost' ? Math.max(1, ghostSlots.length) : 0
  sealCountDone = 0
  sealEyeTriggered = false

  contentVisible = false
  hasSeenContent = false
  danger = 0

  isChangingRoom = false
  sealAnim = 1
  sealSuccess = false
  sealResolveStart = 0
  enterAnim = 0
  enteringRoom = false

  ghostThreshold = [0.24, 0.34, 0.48][Math.floor(Math.random() * 3)]

  const base = 0.012 + room * 0.001

  if (ghostType === 'big') dangerSpeed = base * 0.7
  else if (ghostType === 'thin') dangerSpeed = base * DIFFICULTY[difficultyMode].thinMultiplier
  else dangerSpeed = base * 1.1
}

function finishNextRoom() {
  room++
  if (room > best) {
    best = room
    saveBest()
  }
  newRoom()
  // 安全房间用“内部门放大成外部门”的无缝转场，不再黑场淡入。
  roomFadeIn = 0
}

function nextRoomAfterSeal() {
  if (isChangingRoom) return
  isChangingRoom = true
  sealResolveStart = performance.now()

  room++
  if (room > best) {
    best = room
    saveBest()
  }

  setTimeout(() => {
    newRoom()
    roomFadeIn = 1
  }, 520)
}

function startEnterRoom() {
  if (isChangingRoom) return
  isChangingRoom = true
  enteringRoom = true
  enterAnim = 0
}

function gameOver() {
  gameState = 'gameover'
}

function inSealButton(x, y) {
  return x >= sealButton.x && x <= sealButton.x + sealButton.w && y >= sealButton.y && y <= sealButton.y + sealButton.h
}

function pointerDown(x, y) {
  if (!assetsReady) return

  if (gameState === 'home') {
    if (pointInRect(x, y, menuButtons.start)) gameState = 'difficulty'
    else if (pointInRect(x, y, menuButtons.rules)) gameState = 'rules'
    else if (pointInRect(x, y, menuButtons.codex)) gameState = 'codex'
    return
  }

  if (gameState === 'difficulty') {
    if (pointInRect(x, y, screenBackButton)) gameState = 'home'
    else if (pointInRect(x, y, menuButtons.easy)) startGame('easy')
    else if (pointInRect(x, y, menuButtons.hard)) startGame('hard')
    return
  }

  if (gameState === 'rules') {
    if (pointInRect(x, y, screenBackButton)) gameState = 'home'
    return
  }

  if (gameState === 'codex') {
    if (pointInRect(x, y, screenBackButton)) gameState = 'home'
    else if (pointInRect(x, y, codexTabs.ghosts)) codexTab = 'ghosts'
    else if (pointInRect(x, y, codexTabs.people)) codexTab = 'people'
    return
  }

  if (gameState === 'gameover') {
    ghostEyeUntil = 0
    if (!difficultyMode) {
      gameState = 'home'
      return
    }
    room = 1
    best = getStoredBest(difficultyMode)
    gameState = 'playing'
    roomFadeIn = 0
    newRoom()
    return
  }

  if (gameState !== 'playing') return

  if (pointInRect(x, y, backButton)) {
    gameState = 'home'
    isChangingRoom = false
    bossActive = false
    bossPhase = 'idle'
    dragging = false
    doorAutoMoving = false
    return
  }

  if (bossActive) {
    if (bossPhase === 'sealing') {
      if (pointInRect(x, y, bossButton)) {
        spawnBossSealEffect()
        bossSealsDone++
        bossShake = 1
        bossSealFlash = 1
        bossDoorPressure = Math.max(0.035, bossDoorPressure - getBossSealPushBack())
        doorOpen = bossDoorPressure
        if (bossSealsDone >= bossSealsRequired) completeBossBattle()
      }
      return
    }

    // Boss房仍然要先开门确认。看到Boss后，必须关门，才进入疯狂贴封印阶段。
    if (bossPhase === 'reveal') {
      doorAutoMoving = false
      dragging = true
      startX = x
      startDoorOpen = doorOpen
      return
    }
  }

  if (isChangingRoom) return

  doorAutoMoving = false

  if (doorOpen <= 0.05 && hasSeenContent && inSealButton(x, y)) {
    // 空房、人类房也会出现封印按钮；如果封错，仍然失败。
    if (roomContent === 'ghost') {
      // 多鬼房需要连续贴多张符。动画没贴完时不重复计数。
      if (sealSuccess && sealAnim < 1) return

      sealCountDone++
      sealSuccess = true
      sealAnim = 0

      if (!sealEyeTriggered && ghostSlots.some((slot) => slot.id === 5)) {
        sealEyeTriggered = true
        activateGhostEye()
      }

      if (sealCountDone >= sealCountRequired) {
        nextRoomAfterSeal()
      }
    } else {
      gameOver()
    }
    return
  }

  dragging = true
  startX = x
  startDoorOpen = doorOpen
}

function pointerMove(x) {
  if (!dragging || gameState !== 'playing') return
  if (isChangingRoom) return

  const dx = startX - x
  doorOpen = startDoorOpen + dx / (W * 0.55)
  doorOpen = Math.max(0, Math.min(1, doorOpen))
}

function pointerUp() {
  if (!dragging) return
  dragging = false

  if (gameState !== 'playing') return
  if (isChangingRoom) return

  // Boss确认阶段不使用普通门的“开到一半就自动全开”逻辑。
  // 否则玩家开门确认 Boss 后，门会继续自动打开，无法顺利回到“关门贴符”的阶段。
  if (bossActive && bossPhase === 'reveal') {
    if (doorOpen > BOSS_CONFIRM_OPEN) {
      contentVisible = true
      hasSeenContent = true
      bossSeen = true
    }

    // Boss一旦被确认，松手后门自动慢慢关回去；关上后进入疯狂贴封印。
    // 如果还没确认成功，松手也先回关，鼓励玩家重新开门确认。
    doorTarget = 0
    if (Math.abs(doorOpen - doorTarget) < 0.015) {
      doorOpen = doorTarget
      doorAutoMoving = false
    } else {
      doorAutoMoving = true
    }
    return
  }

  doorTarget = doorOpen >= DOOR_SNAP_THRESHOLD ? 1 : 0

  if (Math.abs(doorOpen - doorTarget) < 0.015) {
    doorOpen = doorTarget
    doorAutoMoving = false
  } else {
    doorAutoMoving = true
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  canvas.setPointerCapture?.(e.pointerId)
  pointerDown(e.clientX, e.clientY)
})

canvas.addEventListener('pointermove', (e) => {
  e.preventDefault()
  pointerMove(e.clientX)
})

canvas.addEventListener('pointerup', (e) => {
  e.preventDefault()
  pointerUp()
})

canvas.addEventListener('pointercancel', (e) => {
  e.preventDefault()
  pointerUp()
})

function update() {
  if (gameState !== 'playing') return

  // 黑场淡入/淡出必须优先更新，不能被 Boss 分支提前 return 卡住。
  if (roomFadeIn > 0 && !enteringRoom) {
    roomFadeIn = Math.max(0, roomFadeIn - ROOM_FADE_IN_SPEED)
  }

  if (bossActive) {
    bossShake = Math.max(0, bossShake - 0.08)
    bossSealFlash = Math.max(0, bossSealFlash - 0.1)
    updateBossSealEffects()

    if (doorAutoMoving && !dragging) {
      const diff = doorTarget - doorOpen
      const step = Math.min(Math.abs(diff), DOOR_AUTO_SPEED)
      if (Math.abs(diff) <= DOOR_AUTO_SPEED) {
        doorOpen = doorTarget
        doorAutoMoving = false
      } else {
        doorOpen += Math.sign(diff) * step
      }
    }

    if (bossPhase === 'reveal') {
      // 鬼眼可以提前看到Boss，属于玩家运气好；
      // 但鬼眼只负责“看见”，不能替代“开门确认”。
      // 之前的 bug 是：鬼眼状态下 bossSeen 会在门没打开时直接变 true，
      // 下一帧又因为 doorOpen 仍然接近 0，立刻进入 sealing，导致玩家感觉Boss房打不开门。
      if (ghostEyeActive()) {
        contentVisible = true
        hasSeenContent = true
      }

      // 必须真的把门打开到确认阈值，才算完成Boss确认。
      if (doorOpen > BOSS_CONFIRM_OPEN) {
        contentVisible = true
        hasSeenContent = true
        bossSeen = true
      }

      // 只有“开门确认过Boss”之后，再把门关回去，才开始疯狂贴封印。
      // v0.9.3：确认后强制把目标设为关门，避免 Boss 房门停在打开状态卡住。
      if (bossSeen && !dragging) {
        doorTarget = 0
        if (doorOpen > BOSS_START_SEAL_OPEN) {
          doorAutoMoving = true
        }
      }

      if (bossSeen && !dragging && doorOpen <= BOSS_START_SEAL_OPEN) {
        beginBossSealing()
      }
      return
    }

    if (bossPhase === 'sealing') {
      bossTimeLeft -= 1 / 60
      bossDoorPressure = Math.min(1, bossDoorPressure + getBossPressureSpeed() / 60)
      doorOpen = bossDoorPressure
      if (bossDoorPressure >= 1 || bossTimeLeft <= 0) {
        bossDoorPressure = 1
        doorOpen = 1
        bossTimeLeft = Math.max(0, bossTimeLeft)
        failBossBattle()
      }
      return
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(GAME_VERSION, W - 10, H - 12)

  if (sealSuccess) {
    sealAnim += 0.08
    if (sealAnim > 1) sealAnim = 1
  }

  if (enteringRoom) {
    enterAnim += ENTER_ANIM_SPEED
    if (enterAnim >= 1) {
      enterAnim = 1
      finishNextRoom()
    }
    return
  }

  if (isChangingRoom) return

  // 关门后，鬼的逼近/危险进度回到初始位置。
  // 这样玩家可以通过“开一点看看 → 关门缓一下 → 再确认”来降低压力。
  if (roomContent === 'ghost' && doorOpen <= 0.05) {
    danger = 0
  }

  if (doorAutoMoving && !dragging) {
    const diff = doorTarget - doorOpen
    const step = Math.min(Math.abs(diff), DOOR_AUTO_SPEED)

    if (Math.abs(diff) <= DOOR_AUTO_SPEED) {
      doorOpen = doorTarget
      doorAutoMoving = false
    } else {
      doorOpen += Math.sign(diff) * step
    }
  }

  // 角色现在一开始就已经在门后，只是被前景门遮住。
  // 开门一点点就能看到一部分；鬼眼状态下，即使门关着也能透过 60% 透明门看见。
  if (roomContent === 'ghost' && (doorOpen > 0.08 || ghostEyeActive())) {
    contentVisible = true
    hasSeenContent = true
    markSeenGhosts(ghostSlots)
  }

  if (roomContent === 'fake' && (doorOpen > 0.08 || ghostEyeActive())) {
    contentVisible = true
    hasSeenContent = true
    markSeenPerson(personSlot)
  }

  // 空门也需要能封印：只要开过一点并确认是空房，关门后就显示封印按钮。
  if (roomContent === 'empty' && doorOpen > 0.08) {
    hasSeenContent = true
  }

  // 只有门真的打开后，鬼才会造成危险；纯鬼眼透视不涨危险值。
  if (roomContent === 'ghost' && doorOpen > 0.08) {
    danger += dangerSpeed
    if (danger >= 1) {
      danger = 1
      gameOver()
    }
  }

  if (roomContent !== 'ghost' && doorOpen > 0.92) {
    startEnterRoom()
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawImageCover(img, x, y, w, h) {
  if (!img) return
  const imgRatio = img.width / img.height
  const boxRatio = w / h
  let sx = 0, sy = 0, sw = img.width, sh = img.height

  if (imgRatio > boxRatio) {
    sh = img.height
    sw = sh * boxRatio
    sx = (img.width - sw) / 2
  } else {
    sw = img.width
    sh = sw / boxRatio
    sy = (img.height - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function drawImageContain(img, x, y, w, h) {
  if (!img) return
  const imgRatio = img.width / img.height
  const boxRatio = w / h

  let dw = w
  let dh = h
  if (imgRatio > boxRatio) {
    dh = dw / imgRatio
  } else {
    dw = dh * imgRatio
  }

  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

function drawImageCoverAlpha(img, x, y, w, h, alpha) {
  ctx.save()
  ctx.globalAlpha = alpha
  drawImageCover(img, x, y, w, h)
  ctx.restore()
}

function drawImageAlpha(img, x, y, w, h, alpha) {
  if (!img) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.drawImage(img, x, y, w, h)
  ctx.restore()
}

function drawImageContainBottom(img, centerX, bottomY, maxW, maxH) {
  if (!img) return
  const imgRatio = img.width / img.height
  let drawH = maxH
  let drawW = drawH * imgRatio

  if (drawW > maxW) {
    drawW = maxW
    drawH = drawW / imgRatio
  }

  ctx.drawImage(img, centerX - drawW / 2, bottomY - drawH, drawW, drawH)
}

function getFrameRect() {
  const ratio = 1086 / 1448
  let frameH = H * ART_LAYOUT.frameHeight
  let frameW = frameH * ratio

  if (frameW < W * ART_LAYOUT.minFrameWidth) {
    frameW = W * ART_LAYOUT.minFrameWidth
    frameH = frameW / ratio
  }

  return {
    x: (W - frameW) / 2,
    y: H * ART_LAYOUT.frameTop,
    w: frameW,
    h: frameH
  }
}

function getOpeningRect(frameRect) {
  return {
    x: frameRect.x + frameRect.w * FRAME_OPENING.x,
    y: frameRect.y + frameRect.h * FRAME_OPENING.y,
    w: frameRect.w * FRAME_OPENING.w,
    h: frameRect.h * FRAME_OPENING.h
  }
}

function clipRect(rect, drawFn) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  drawFn()
  ctx.restore()
}

function getInnerFrameRect(openRect, scaleBoost = 1) {
  const frameRatio = 1086 / 1448
  const innerH = openRect.h * ART_LAYOUT.innerFrameHeight * scaleBoost
  const innerW = innerH * frameRatio
  return {
    x: openRect.x + openRect.w * 0.5 - innerW / 2,
    y: openRect.y + openRect.h * ART_LAYOUT.innerFrameY,
    w: innerW,
    h: innerH
  }
}

function drawProceduralDoor(open, alpha = 1, darkness = 0) {
  // v0.9.7：不再直接拉伸原始「门.png」。
  // 原图比例和门洞适配度较低，所以这里按同一风格复刻一扇暗色竖纹推拉门，
  // 尺寸永远精准填满门洞，避免外门/内门错位。
  ctx.save()
  ctx.globalAlpha = alpha

  const g = ctx.createLinearGradient(open.x, open.y, open.x + open.w, open.y)
  g.addColorStop(0, '#17191b')
  g.addColorStop(0.48, '#4b4f54')
  g.addColorStop(1, '#151719')
  ctx.fillStyle = g
  ctx.fillRect(open.x, open.y, open.w, open.h)

  // 细竖纹，呼应你上传门图的金属/木纹质感。
  const stripeCount = Math.max(22, Math.floor(open.w / 7))
  for (let i = 0; i <= stripeCount; i++) {
    const x = open.x + (i / stripeCount) * open.w
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.34)'
    ctx.lineWidth = Math.max(1, open.w * 0.0022)
    ctx.beginPath()
    ctx.moveTo(x, open.y)
    ctx.lineTo(x, open.y + open.h)
    ctx.stroke()
  }

  // 轻微中心高光，避免纯平。
  const hg = ctx.createRadialGradient(
    open.x + open.w * 0.52, open.y + open.h * 0.22, open.w * 0.03,
    open.x + open.w * 0.52, open.y + open.h * 0.22, open.w * 0.78
  )
  hg.addColorStop(0, 'rgba(255,255,255,0.18)')
  hg.addColorStop(0.42, 'rgba(255,255,255,0.05)')
  hg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = hg
  ctx.fillRect(open.x, open.y, open.w, open.h)

  // 边缘压暗。
  ctx.fillStyle = 'rgba(0,0,0,0.32)'
  ctx.fillRect(open.x, open.y, open.w * 0.025, open.h)
  ctx.fillRect(open.x + open.w * 0.975, open.y, open.w * 0.025, open.h)

  // 右侧门把手。
  const hx = open.x + open.w * 0.84
  const hy = open.y + open.h * 0.43
  const hw = Math.max(12, open.w * 0.055)
  const hh = open.h * 0.24
  ctx.strokeStyle = 'rgba(230,230,220,0.62)'
  ctx.lineWidth = Math.max(3, open.w * 0.01)
  roundRect(hx - hw / 2, hy, hw, hh, hw / 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.lineWidth = Math.max(1.5, open.w * 0.004)
  roundRect(hx - hw / 2, hy, hw, hh, hw / 2)
  ctx.stroke()

  if (darkness > 0) {
    ctx.fillStyle = `rgba(0,0,0,${darkness})`
    ctx.fillRect(open.x, open.y, open.w, open.h)
  }

  ctx.restore()
}

function drawClosedDoorSet(frameRect, alpha = 1, darkness = 0) {
  // 关键：小门和大门都使用同一套门框开口比例。
  const open = getOpeningRect(frameRect)

  ctx.save()
  ctx.globalAlpha = alpha
  drawProceduralDoor(open, 1, darkness)
  ctx.drawImage(ASSETS.frame, frameRect.x, frameRect.y, frameRect.w, frameRect.h)
  if (darkness > 0) {
    // 门框也跟着压暗，但不透明。
    ctx.fillStyle = `rgba(0,0,0,${darkness * 0.72})`
    ctx.fillRect(frameRect.x, frameRect.y, frameRect.w, frameRect.h)
  }
  ctx.restore()
}

function drawInnerDoorSet(openRect, scaleBoost = 1, alpha = ART_LAYOUT.innerDoorAlpha) {
  const innerFrame = getInnerFrameRect(openRect, scaleBoost)
  // v0.9.7：内部门不是半透明，而是完整门 + 压暗。
  drawClosedDoorSet(innerFrame, alpha, ART_LAYOUT.innerDoorDarkness)
}

function getInnerDoorRects(openRect) {
  const frame = getInnerFrameRect(openRect, 1)
  return {
    frame,
    door: getOpeningRect(frame)
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerpRect(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t)
  }
}

function drawExpandingInnerDoor(frameRect, openRect, t) {
  const morph = smoothstep(t)
  const start = getInnerDoorRects(openRect)

  // 不再分别插值“小门”和“小门框”。
  // 只插值门框矩形，再用同一套 FRAME_OPENING 计算门板位置。
  // 这样它会像一个整体被放大、平移，最后精准贴到外部门的位置。
  const frame = lerpRect(start.frame, frameRect, morph)

  // v0.9.7：过渡中用压暗程度逐步减少来变亮，不再用半透明。
  const darkness = lerp(ART_LAYOUT.innerDoorDarkness, 0, morph)
  drawClosedDoorSet(frame, 1, darkness)
}

function drawRoomContent(openRect) {
  // 鬼 / 人物在房间生成时就已经存在于门后。
  // 这里不再用 contentVisible 控制绘制，避免角色在开到某个阈值后才突然出现。
  if (roomContent === 'ghost') {
    ghostSlots.forEach((slot, index) => {
      const img = slot ? CHARACTER_ASSETS.ghosts[slot.id] : null
      if (img) drawGhostImage(img, openRect, index, ghostSlots.length)
    })
  }

  if (roomContent === 'fake') {
    const img = personSlot ? CHARACTER_ASSETS.people[personSlot.id] : null
    if (!img) return

    // 安全人类进入下一间时，不再硬切消失，而是先慢慢淡出。
    // 这样能形成“人从空间里退场，里面的门接管画面”的感觉。
    const fadeOut = enteringRoom ? smoothstep(enterAnim / 0.62) : 0
    const alpha = 1 - fadeOut
    if (alpha <= 0.02) return

    ctx.save()
    ctx.globalAlpha = alpha
    drawPersonImage(img, openRect)
    ctx.restore()
  }
}

function drawGhostImage(img, openRect, index = 0, total = 1) {
  const pressureScale = 1 + danger * 0.10
  const alpha = Math.min(1, 0.56 + danger * 0.44)
  // v0.9.8：所有角色以同一地面线落地；单只鬼/人物用相近高度，多鬼时才略微缩小以避免重叠。
  const offsets = total === 1 ? [0] : total === 2 ? [-0.14, 0.14] : [-0.22, 0, 0.22]
  const sizeFactor = total === 1 ? 1 : total === 2 ? 0.82 : 0.70
  const centerX = openRect.x + openRect.w * (0.60 + (offsets[index] || 0))
  const bottomY = openRect.y + openRect.h * ART_LAYOUT.characterBottom
  const maxW = openRect.w * 0.86 * pressureScale * sizeFactor
  const maxH = openRect.h * ART_LAYOUT.ghostHeight * pressureScale * sizeFactor

  ctx.save()
  ctx.globalAlpha = alpha
  drawImageContainBottom(img, centerX, bottomY, maxW, maxH)
  ctx.restore()

  if (danger > 0.6) {
    ctx.fillStyle = `rgba(255,255,255,${(danger - 0.6) * 0.35})`
    ctx.beginPath()
    ctx.arc(centerX, openRect.y + openRect.h * 0.52, openRect.w * (0.16 + danger * 0.07), 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPersonImage(img, openRect) {
  // v0.9.8：人物和妖怪共用同一地面线与相近尺寸，避免人物漂浮或大小差距过大。
  const centerX = openRect.x + openRect.w * 0.60
  const bottomY = openRect.y + openRect.h * ART_LAYOUT.characterBottom
  const maxW = openRect.w * 0.86
  const maxH = openRect.h * ART_LAYOUT.personHeight
  drawImageContainBottom(img, centerX, bottomY, maxW, maxH)
}

function drawArtRoom(frameRect, options = {}) {
  const {
    includeLargeDoor = true,
    includeContent = true,
    depthScale = 1,
    innerDoorAlpha = ART_LAYOUT.innerDoorAlpha
  } = options

  const open = getOpeningRect(frameRect)

  // 先把门洞区域裁切，避免图层跑出门框。
  clipRect(open, () => {
    // 7. 黑底
    ctx.fillStyle = '#000'
    ctx.fillRect(open.x, open.y, open.w, open.h)

    if (SHOW_WALL_AND_FLOOR) {
      // v0.9.6：门后空间改用你上传的「房间内.png」。
      // 不再调用旧的 wall.png / floor.png，也不再把地板和墙壁拆成旧图层。
      drawImageCover(ASSETS.room || ASSETS.wall, open.x, open.y, open.w, open.h)
      if (ART_LAYOUT.roomWallDarkness > 0) {
        ctx.fillStyle = `rgba(0,0,0,${ART_LAYOUT.roomWallDarkness})`
        ctx.fillRect(open.x, open.y, open.w, open.h)
      }
    }

    // 深处小门仍然保留，用于“下一间”的无限门转场。
    drawInnerDoorSet(open, depthScale, innerDoorAlpha)

    if (includeContent) drawRoomContent(open)
  })

  // 2. 外层门框，使用中间透明处理后的 frame.png
  ctx.drawImage(ASSETS.frame, frameRect.x, frameRect.y, frameRect.w, frameRect.h)

  // 1. 最大的门，放最后，保证它在最前景，并能盖住门后内容。
  if (includeLargeDoor) {
    const slide = doorOpen * open.w * ART_LAYOUT.largeDoorSlide
    const doorX = open.x - slide
    const doorAlpha = ghostEyeActive() ? 0.6 : 1
    ctx.save()
    ctx.globalAlpha = doorAlpha
    drawProceduralDoor({ x: doorX, y: open.y, w: open.w, h: open.h }, 1, 0)
    ctx.restore()
  }
}

function drawGhost(cx, cy, frameW, frameH) {
  const alpha = Math.min(1, 0.35 + danger * 0.65)
  let scale = Math.min(frameW, frameH) / 360
  scale *= 1 + danger * 0.7

  if (ghostType === 'big') {
    scale *= 1.45
    ctx.fillStyle = `rgba(0,0,0,${alpha})`
    roundRect(cx - 70 * scale, cy - 95 * scale, 140 * scale, 190 * scale, 50 * scale)
    ctx.fill()
    ctx.fillStyle = `rgba(220,220,210,${alpha})`
    ctx.beginPath()
    ctx.ellipse(cx, cy - 42 * scale, 42 * scale, 52 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (ghostType === 'thin') {
    scale *= 0.82
    ctx.fillStyle = `rgba(0,0,0,${alpha})`
    roundRect(cx - 24 * scale, cy - 135 * scale, 48 * scale, 260 * scale, 22 * scale)
    ctx.fill()
    ctx.fillStyle = `rgba(220,220,210,${alpha})`
    ctx.beginPath()
    ctx.ellipse(cx, cy - 78 * scale, 22 * scale, 42 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`
    roundRect(cx - 50 * scale, cy - 90 * scale, 100 * scale, 180 * scale, 38 * scale)
    ctx.fill()
    ctx.fillStyle = `rgba(220,220,210,${alpha})`
    ctx.beginPath()
    ctx.ellipse(cx, cy - 45 * scale, 32 * scale, 44 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(cx - 13 * scale, cy - 55 * scale, 5 * scale + danger * 5, 0, Math.PI * 2)
  ctx.arc(cx + 13 * scale, cy - 55 * scale, 5 * scale + danger * 5, 0, Math.PI * 2)
  ctx.fill()

  if (danger > 0.6) {
    ctx.fillStyle = `rgba(255,255,255,${(danger - 0.6) * 0.4})`
    ctx.beginPath()
    ctx.arc(cx, cy - 50 * scale, 70 * scale + danger * 35, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawFake(cx, cy, frameW, frameH) {
  const s = Math.min(frameW, frameH) / 420
  ctx.strokeStyle = '#8b806c'
  ctx.lineWidth = 5 * s

  ctx.beginPath()
  ctx.arc(cx, cy - 80 * s, 22 * s, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx, cy - 56 * s)
  ctx.lineTo(cx, cy + 48 * s)
  ctx.moveTo(cx - 42 * s, cy - 20 * s)
  ctx.lineTo(cx + 42 * s, cy - 20 * s)
  ctx.moveTo(cx, cy + 48 * s)
  ctx.lineTo(cx - 28 * s, cy + 96 * s)
  ctx.moveTo(cx, cy + 48 * s)
  ctx.lineTo(cx + 28 * s, cy + 96 * s)
  ctx.stroke()
}

function drawSealButton() {
  const canSeal = doorOpen <= 0.05 && hasSeenContent && !isChangingRoom
  if (!canSeal) return

  if (ASSETS.sealButton) {
    drawImageContain(ASSETS.sealButton, sealButton.x, sealButton.y, sealButton.w, sealButton.h)
    return
  }

  ctx.fillStyle = '#8b1e1e'
  roundRect(sealButton.x, sealButton.y, sealButton.w, sealButton.h, 12)
  ctx.fill()

  ctx.strokeStyle = '#d8bd75'
  ctx.lineWidth = 2
  roundRect(sealButton.x, sealButton.y, sealButton.w, sealButton.h, 12)
  ctx.stroke()

  ctx.fillStyle = '#f5df9b'
  ctx.font = '24px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('封 印', W / 2, sealButton.y + 37)
}

function drawTalismanImage(x, y, w, h, rot = 0, alpha = 1) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(rot)
  if (ASSETS.sealButton) {
    drawImageContain(ASSETS.sealButton, -w / 2, -h / 2, w, h)
  } else {
    ctx.fillStyle = '#e5c76c'
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.strokeStyle = '#9f2020'
    ctx.lineWidth = 2
    ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8)
    ctx.fillStyle = '#9f2020'
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('封', 0, 0)
  }
  ctx.restore()
}

function drawStaticSeal(open, index, total) {
  const cols = total <= 1 ? [0.52] : total === 2 ? [0.43, 0.61] : [0.38, 0.52, 0.66]
  const x = open.x + open.w * (cols[index] || 0.52)
  const y = open.y + open.h * (0.43 + (index % 2) * 0.08)
  drawTalismanImage(x, y, 54, 112, (index - 1) * 0.06, 0.98)
}

function drawSealOnDoor(frameRect) {
  const open = getOpeningRect(frameRect)

  // v0.9.8：封印完成后不硬留符咒，门框周围亮黄光，符咒逐渐透明消失，过渡到下一门更自然。
  const resolving = sealResolveStart > 0
  const resolveT = resolving ? clamp01((performance.now() - sealResolveStart) / SEAL_RESOLVE_DURATION) : 0
  const resolveFade = resolving ? (1 - smoothstep(resolveT)) : 1

  if (resolving) {
    const glow = resolveFade
    ctx.save()
    ctx.shadowColor = 'rgba(255,210,70,0.95)'
    ctx.shadowBlur = 28 * glow
    ctx.strokeStyle = `rgba(255,220,90,${0.72 * glow})`
    ctx.lineWidth = 8
    roundRect(frameRect.x + 6, frameRect.y + 6, frameRect.w - 12, frameRect.h - 12, 8)
    ctx.stroke()
    ctx.restore()

    const rg = ctx.createRadialGradient(
      frameRect.x + frameRect.w / 2, frameRect.y + frameRect.h * 0.52, open.w * 0.08,
      frameRect.x + frameRect.w / 2, frameRect.y + frameRect.h * 0.52, open.w * 0.68
    )
    rg.addColorStop(0, `rgba(255,210,60,${0.18 * glow})`)
    rg.addColorStop(1, 'rgba(255,210,60,0)')
    ctx.fillStyle = rg
    ctx.fillRect(frameRect.x, frameRect.y, frameRect.w, frameRect.h)
  }

  // 已贴好的符：多鬼房会保留多张符在门上；封印完成时随黄光渐隐。
  const movingOne = sealSuccess && sealAnim < 1 ? 1 : 0
  const staticCount = Math.max(0, sealCountDone - movingOne)
  ctx.save()
  ctx.globalAlpha = resolveFade
  for (let i = 0; i < staticCount; i++) {
    drawStaticSeal(open, i, Math.max(sealCountRequired, staticCount))
  }
  ctx.restore()

  if (!sealSuccess || sealAnim >= 1) return

  const t = sealAnim
  const startX = W / 2
  const startY = sealButton.y + sealButton.h / 2
  const index = Math.max(0, sealCountDone - 1)
  const cols = sealCountRequired <= 1 ? [0.52] : sealCountRequired === 2 ? [0.43, 0.61] : [0.38, 0.52, 0.66]
  const endX = open.x + open.w * (cols[index] || 0.52)
  const endY = open.y + open.h * (0.43 + (index % 2) * 0.08)
  const ease = 1 - Math.pow(1 - t, 3)

  const x = startX + (endX - startX) * ease
  const y = startY + (endY - startY) * ease
  const scale = 0.75 + 0.45 * Math.sin(Math.min(1, t) * Math.PI)
  const w = 54 * scale
  const h = 126 * scale

  ctx.save()
  ctx.globalAlpha = resolveFade
  ctx.translate(x, y)
  if (t > 0.82) ctx.scale(1.08, 0.94)
  drawTalismanImage(0, 0, w, h, 0, 1)
  ctx.restore()
}

function drawEnterTransition(baseFrameRect) {
  if (!enteringRoom) return

  const t = clamp01(enterAnim)
  const open = getOpeningRect(baseFrameRect)
  const inner = getInnerDoorRects(open).frame

  // v0.9.8：转场缩放必须有裁切边界。整个缩放只发生在外层门框区域内，避免放大后的门/房间压到顶部UI。
  const morph = easeInOutCubic(clamp01((t - 0.02) / 0.96))
  const targetScale = baseFrameRect.h / inner.h
  const scale = lerp(1, targetScale, morph)
  const targetTx = baseFrameRect.x - inner.x * targetScale
  const targetTy = baseFrameRect.y - inner.y * targetScale
  const tx = lerp(0, targetTx, morph)
  const ty = lerp(0, targetTy, morph)

  const pad = ART_LAYOUT.transitionClipPadding || 0
  ctx.save()
  ctx.beginPath()
  ctx.rect(baseFrameRect.x - pad, baseFrameRect.y - pad, baseFrameRect.w + pad * 2, baseFrameRect.h + pad * 2)
  ctx.clip()

  // 缩放区内轻微压暗，避免突然闪；不会覆盖UI。
  const roomDim = smoothstep(t / 0.65)
  if (roomDim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 * roomDim})`
    ctx.fillRect(baseFrameRect.x - pad, baseFrameRect.y - pad, baseFrameRect.w + pad * 2, baseFrameRect.h + pad * 2)
  }

  ctx.save()
  ctx.setTransform(DPR * scale, 0, 0, DPR * scale, DPR * tx, DPR * ty)
  drawArtRoom(baseFrameRect, {
    includeLargeDoor: true,
    includeContent: true,
    innerDoorAlpha: 1
  })
  ctx.restore()

  // 末尾暗角也限制在门框内部。
  const endVignette = smoothstep((t - 0.82) / 0.18)
  if (endVignette > 0) {
    const g = ctx.createRadialGradient(
      W / 2, open.y + open.h * 0.45, open.w * 0.36,
      W / 2, open.y + open.h * 0.45, Math.max(W, H) * 0.78
    )
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${0.16 * endVignette})`)
    ctx.fillStyle = g
    ctx.fillRect(baseFrameRect.x - pad, baseFrameRect.y - pad, baseFrameRect.w + pad * 2, baseFrameRect.h + pad * 2)
  }
  ctx.restore()
}

function drawPlainMenuButton(rect, title, subtitle = '', accent = '#d8bd75') {
  ctx.fillStyle = 'rgba(18,18,18,0.96)'
  roundRect(rect.x, rect.y, rect.w, rect.h, 16)
  ctx.fill()

  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  roundRect(rect.x, rect.y, rect.w, rect.h, 16)
  ctx.stroke()

  ctx.fillStyle = '#fff'
  ctx.font = rect.h >= 66 ? '24px sans-serif' : '21px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, rect.x + rect.w / 2, rect.y + rect.h / 2 - (subtitle ? 9 : 0))

  if (subtitle) {
    ctx.fillStyle = 'rgba(255,255,255,0.58)'
    ctx.font = '12px sans-serif'
    ctx.fillText(subtitle, rect.x + rect.w / 2, rect.y + rect.h / 2 + 17)
  }
}

function drawBackButton(rect, label = '返回') {
  ctx.fillStyle = 'rgba(0,0,0,0.58)'
  roundRect(rect.x, rect.y, rect.w, rect.h, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(245,223,155,0.7)'
  ctx.lineWidth = 1.5
  roundRect(rect.x, rect.y, rect.w, rect.h, 10)
  ctx.stroke()
  ctx.fillStyle = '#f5df9b'
  ctx.font = '15px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2)
}

function drawDifficultyButton(rect, title, desc, bestText, accent) {
  ctx.fillStyle = 'rgba(18,18,18,0.96)'
  roundRect(rect.x, rect.y, rect.w, rect.h, 16)
  ctx.fill()

  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  roundRect(rect.x, rect.y, rect.w, rect.h, 16)
  ctx.stroke()

  ctx.fillStyle = '#fff'
  ctx.font = '23px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(title, rect.x + 24, rect.y + 31)

  ctx.fillStyle = 'rgba(255,255,255,0.68)'
  ctx.font = '13px sans-serif'
  ctx.fillText(desc, rect.x + 24, rect.y + 54)

  ctx.fillStyle = 'rgba(245,223,155,0.9)'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(bestText, rect.x + rect.w - 20, rect.y + 44)
}

function drawLoading() {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = '18px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('加载中...', W / 2, H / 2)
}


function drawMenuBackground() {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)

  if (assetsReady) {
    const frameRect = getFrameRect()
    ctx.save()
    ctx.globalAlpha = 0.38
    drawArtRoom(frameRect, { includeLargeDoor: true, includeContent: false })
    ctx.restore()
    ctx.fillStyle = 'rgba(0,0,0,0.62)'
    ctx.fillRect(0, 0, W, H)
  }
}

function drawHomeMenu() {
  drawMenuBackground()

  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '46px sans-serif'
  ctx.fillText('下一间', W / 2, H * 0.18)

  ctx.fillStyle = 'rgba(245,223,155,0.82)'
  ctx.font = '13px sans-serif'
  ctx.fillText(`版本 ${GAME_VERSION}｜${GAME_VERSION_NOTE}`, W / 2, H * 0.18 + 36)

  drawPlainMenuButton(menuButtons.start, '开始游戏', '选择简单 / 困难版本', '#d8bd75')
  drawPlainMenuButton(menuButtons.rules, '游戏规则', '开门、确认、封印', '#6f8f75')
  drawPlainMenuButton(menuButtons.codex, '图 鉴', `已收集 ${collectedTotalCount()} / ${totalCodexCount()}`, '#9f2020')

  ctx.fillStyle = 'rgba(255,255,255,0.42)'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('见到新的鬼或人物，就会在图鉴里点亮', W / 2, H * 0.84)
}

function wrapTextLines(text, maxWidth, font) {
  ctx.font = font
  const result = []
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      result.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) result.push(line)
  return result
}

function drawWrappedParagraphs(lines, x, y, maxWidth, font, lineHeight, paragraphGap) {
  ctx.font = font
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  let cy = y
  lines.forEach((line) => {
    const wrapped = wrapTextLines(line, maxWidth, font)
    wrapped.forEach((part) => {
      ctx.fillText(part, x, cy)
      cy += lineHeight
    })
    cy += paragraphGap
  })
  return cy
}

function drawRulesScreen() {
  drawMenuBackground()
  drawBackButton(screenBackButton)

  ctx.fillStyle = '#fff'
  ctx.font = '32px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('游戏规则', W / 2, H * 0.16)

  const lines = [
    '1. 慢慢拉开门，观察门后的异常。',
    '2. 看到鬼：关门后点击「封印」。',
    '3. 看到人或空房：不要乱封，开到底进入下一间。',
    '4. 多只鬼需要贴多张符，但按钮不会提示数量。',
    '5. 关门后鬼会退回原位，可以多次确认。',
    '6. 见到新鬼或新人物后，会自动点亮对应图鉴。'
  ]

  const boxX = W * 0.08
  const boxY = H * 0.235
  const boxW = W * 0.84
  const boxH = Math.min(H * 0.61, 430)
  ctx.fillStyle = 'rgba(18,18,18,0.92)'
  roundRect(boxX, boxY, boxW, boxH, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(245,223,155,0.45)'
  ctx.lineWidth = 1.5
  roundRect(boxX, boxY, boxW, boxH, 18)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.84)'
  const fontSize = W < 380 ? 14 : 15
  const font = `${fontSize}px sans-serif`
  const lineHeight = fontSize + 8
  drawWrappedParagraphs(lines, boxX + 20, boxY + 38, boxW - 40, font, lineHeight, 8)
}

function drawCodexTab(rect, label, active) {
  ctx.fillStyle = active ? 'rgba(139,30,30,0.94)' : 'rgba(18,18,18,0.92)'
  roundRect(rect.x, rect.y, rect.w, rect.h, 12)
  ctx.fill()
  ctx.strokeStyle = active ? 'rgba(245,223,155,0.85)' : 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 1.5
  roundRect(rect.x, rect.y, rect.w, rect.h, 12)
  ctx.stroke()
  ctx.fillStyle = active ? '#f5df9b' : 'rgba(255,255,255,0.62)'
  ctx.font = '15px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2)
}

function drawCodexGrid(slots, assetGroup, seenSet, startY) {
  const cols = 3
  const gap = 12
  const gridW = Math.min(W * 0.86, 390)
  const cellW = (gridW - gap * (cols - 1)) / cols
  const cellH = Math.min(cellW * 1.12, (H - startY - 30 - gap * 3) / 4)
  const startX = (W - gridW) / 2

  slots.forEach((slot, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = startX + col * (cellW + gap)
    const y = startY + row * (cellH + gap)
    const hasAsset = !!CHARACTER_ASSETS[assetGroup][slot.id]
    const seen = seenSet.has(slot.id)

    ctx.fillStyle = seen ? 'rgba(28,24,20,0.95)' : 'rgba(12,12,12,0.92)'
    roundRect(x, y, cellW, cellH, 14)
    ctx.fill()
    ctx.strokeStyle = seen ? 'rgba(245,223,155,0.75)' : 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 1.5
    roundRect(x, y, cellW, cellH, 14)
    ctx.stroke()

    const img = CHARACTER_ASSETS[assetGroup][slot.id]
    if (seen && img) {
      drawImageContain(img, x + 8, y + 8, cellW - 16, cellH - 38)
      ctx.fillStyle = '#f5df9b'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(slot.name, x + cellW / 2, y + cellH - 14)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.font = '32px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', x + cellW / 2, y + cellH * 0.43)
      ctx.fillStyle = 'rgba(255,255,255,0.36)'
      ctx.font = '11px sans-serif'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(hasAsset ? '未发现' : '未放图', x + cellW / 2, y + cellH - 14)
    }
  })
}

function drawCodexScreen() {
  drawMenuBackground()
  drawBackButton(screenBackButton)

  ctx.fillStyle = '#fff'
  ctx.font = '32px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('图 鉴', W / 2, H * 0.135)

  drawCodexTab(codexTabs.ghosts, `鬼图鉴 ${collectedGhostCount()}/${totalGhostCount()}`, codexTab === 'ghosts')
  drawCodexTab(codexTabs.people, `人物图鉴 ${collectedPeopleCount()}/${totalPeopleCount()}`, codexTab === 'people')

  if (codexTab === 'people') {
    drawCodexGrid(PERSON_SLOTS, 'people', SEEN_PERSON_IDS, H * 0.255)
  } else {
    drawCodexGrid(GHOST_SLOTS, 'ghosts', SEEN_GHOST_IDS, H * 0.255)
  }
}

function drawDifficultyMenu() {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)

  if (assetsReady) {
    const frameRect = getFrameRect()
    ctx.save()
    ctx.globalAlpha = 0.42
    drawArtRoom(frameRect, { includeLargeDoor: true, includeContent: false })
    ctx.restore()
    ctx.fillStyle = 'rgba(0,0,0,0.58)'
    ctx.fillRect(0, 0, W, H)
  }

  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '42px sans-serif'
  drawBackButton(screenBackButton)

  ctx.fillText('选择难度', W / 2, H * 0.2)

  ctx.fillStyle = 'rgba(255,255,255,0.68)'
  ctx.font = '15px sans-serif'
  ctx.fillText('开始前选择一个版本', W / 2, H * 0.2 + 35)

  ctx.fillStyle = 'rgba(245,223,155,0.78)'
  ctx.font = '13px sans-serif'
  ctx.fillText(`版本 ${GAME_VERSION}｜${GAME_VERSION_NOTE}`, W / 2, H * 0.2 + 58)

  drawDifficultyButton(
    menuButtons.easy,
    '简单版',
    '瘦子鬼变慢，前期更适合测试',
    `纪录 ${getStoredBest('easy')}`,
    '#6f8f75'
  )

  drawDifficultyButton(
    menuButtons.hard,
    '困难版',
    '保留原版速度，压迫感更强',
    `纪录 ${getStoredBest('hard')}`,
    '#9f2020'
  )

  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('开门确认；见鬼后关门封印，多只鬼要贴多张符', W / 2, H * 0.82)
}


function bossSealPosition(index, total) {
  const col = index % 5
  const row = Math.floor(index / 5)
  const rowOffset = row % 2 === 0 ? 0 : 0.06
  return {
    fx: 0.30 + col * 0.10 + rowOffset + (Math.random() - 0.5) * 0.035,
    fy: 0.25 + row * 0.082 + (Math.random() - 0.5) * 0.025,
    rot: (Math.random() - 0.5) * 0.34,
    scale: 0.82 + Math.random() * 0.32
  }
}

function spawnBossSealEffect() {
  const pos = bossSealPosition(bossSealsDone, bossSealsRequired)
  const sticker = {
    fx: clamp01(pos.fx),
    fy: clamp01(pos.fy),
    rot: pos.rot,
    scale: pos.scale,
    birth: performance.now()
  }
  bossSealStickers.push(sticker)
  if (bossSealStickers.length > 36) bossSealStickers.shift()

}

function updateBossSealEffects() {
  // v0.9.5：Boss符咒不再飞行，直接贴在门板局部坐标上。
}

function drawBossTalisman(x, y, scale = 1, rot = 0, alpha = 1) {
  drawTalismanImage(x, y, 42 * scale, 92 * scale, rot, alpha)
}

function drawBossSealStickersOnDoor(doorRect) {
  // 符咒绑定在“门板局部坐标”上，而不是屏幕坐标。
  // Boss把门顶开/玩家把门压回去时，doorRect.x 会变化，符咒会跟着门一起动。
  bossSealStickers.forEach((seal) => {
    const age = Math.min(1, (performance.now() - (seal.birth || 0)) / 160)
    const pop = 1 + 0.18 * Math.sin(age * Math.PI)
    const x = doorRect.x + doorRect.w * seal.fx
    const y = doorRect.y + doorRect.h * seal.fy
    drawBossTalisman(x, y, seal.scale * pop, seal.rot, 0.98)
  })
}

function drawBossButton() {
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.018)
  ctx.fillStyle = '#9f2020'
  roundRect(bossButton.x, bossButton.y, bossButton.w, bossButton.h, 18)
  ctx.fill()

  ctx.strokeStyle = `rgba(245,223,155,${0.72 + pulse * 0.22})`
  ctx.lineWidth = 3
  roundRect(bossButton.x, bossButton.y, bossButton.w, bossButton.h, 18)
  ctx.stroke()

  ctx.fillStyle = '#f5df9b'
  ctx.font = '26px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('疯狂贴封印！', W / 2, bossButton.y + bossButton.h / 2)
}

function drawBossBattle(frameRect) {
  const shakePower = bossShake * 8
  const sx = (Math.random() - 0.5) * shakePower
  const sy = (Math.random() - 0.5) * shakePower
  const open = getOpeningRect(frameRect)
  const hpRatio = clamp01(1 - bossSealsDone / Math.max(1, bossSealsRequired))
  const pressure = clamp01(bossDoorPressure || doorOpen)
  const panic = hpRatio < 0.3 ? 0.5 + 0.5 * Math.sin(performance.now() * 0.035) : 0.25 + 0.25 * Math.sin(performance.now() * 0.014)
  const revealAlpha = bossPhase === 'reveal' && !bossSeen && !ghostEyeActive() ? clamp01((doorOpen - 0.06) / 0.28) : 1

  ctx.save()
  ctx.translate(sx, sy)

  // 先画没有前景门的房间，再把Boss和红光画在门后，最后再画门框与前景门。
  drawArtRoom(frameRect, { includeLargeDoor: false, includeContent: false, innerDoorAlpha: 0.72 })

  clipRect(open, () => {
    const glowCenterX = open.x + open.w * (0.5 + 0.04 * Math.sin(performance.now() * 0.006))
    const glowCenterY = open.y + open.h * 0.46
    const glowPower = bossPhase === 'sealing' ? 0.42 + pressure * 0.38 + panic * 0.18 : 0.22 + doorOpen * 0.38
    const glow = ctx.createRadialGradient(glowCenterX, glowCenterY, open.w * 0.06, glowCenterX, glowCenterY, open.w * 0.78)
    glow.addColorStop(0, `rgba(255,45,25,${glowPower})`)
    glow.addColorStop(0.45, `rgba(125,0,0,${glowPower * 0.55})`)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(open.x - open.w * 0.25, open.y - open.h * 0.14, open.w * 1.5, open.h * 1.25)

    // Boss 主体：优先复用已有鬼图，否则画一个更纯粹的幽灵剪影。
    const bossImg = ACTIVE_GHOST_SLOTS[0] ? CHARACTER_ASSETS.ghosts[ACTIVE_GHOST_SLOTS[0].id] : null
    const lunge = bossPhase === 'sealing' ? pressure * 0.16 : doorOpen * 0.05
    const bossBottom = open.y + open.h * (0.86 + lunge * 0.18)
    const bossH = open.h * (0.70 + lunge)
    const bossW = open.w * (0.72 + lunge * 0.22)

    ctx.save()
    ctx.globalAlpha = revealAlpha
    ctx.shadowColor = `rgba(255,0,0,${0.72 + panic * 0.28})`
    ctx.shadowBlur = 24 + panic * 32 + pressure * 18
    if (bossImg) {
      drawImageContainBottom(bossImg, W / 2, bossBottom, bossW, bossH)
    } else {
      ctx.fillStyle = '#050505'
      roundRect(W / 2 - bossW * 0.28, bossBottom - bossH, bossW * 0.56, bossH, 46)
      ctx.fill()
      ctx.fillStyle = '#f1e9d8'
      ctx.beginPath()
      ctx.ellipse(W / 2, bossBottom - bossH * 0.64, bossW * 0.16, bossH * 0.18, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // v0.9.5：符咒不再贴在Boss身上；统一贴在前景门板上。
  })

  // 门框和前景门最后画：Boss封印阶段会把门硬顶开；每贴一次会压回去。
  ctx.drawImage(ASSETS.frame, frameRect.x, frameRect.y, frameRect.w, frameRect.h)
  const slide = doorOpen * open.w * ART_LAYOUT.largeDoorSlide
  const doorX = open.x - slide
  const doorAlpha = ghostEyeActive() ? 0.6 : 1
  drawImageCoverAlpha(ASSETS.door, doorX, open.y, open.w, open.h, doorAlpha)

  if (bossPhase === 'sealing') {
    drawBossSealStickersOnDoor({ x: doorX, y: open.y, w: open.w, h: open.h })
  }

  // 门缝红光必须在门上方再补一层，让“压不住”的感觉更明显。
  if (doorOpen > 0.02) {
    const crackW = Math.max(3, open.w * Math.min(0.18, doorOpen * 0.18))
    const crackX = open.x + open.w * (1 - Math.min(0.98, doorOpen * ART_LAYOUT.largeDoorSlide))
    const crackAlpha = bossPhase === 'sealing' ? 0.35 + pressure * 0.45 : 0.22 + doorOpen * 0.32
    const g = ctx.createLinearGradient(crackX - crackW, open.y, crackX + crackW * 2, open.y)
    g.addColorStop(0, 'rgba(255,0,0,0)')
    g.addColorStop(0.5, `rgba(255,44,20,${crackAlpha})`)
    g.addColorStop(1, 'rgba(255,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(crackX - crackW, open.y + open.h * 0.05, crackW * 3, open.h * 0.9)
  }


  ctx.restore()

  // 顶部 Boss 血条 / 状态提示。
  const barW = Math.min(W * 0.78, 360)
  const barH = 16
  const barX = (W - barW) / 2
  const barY = 112
  ctx.fillStyle = 'rgba(0,0,0,0.72)'
  roundRect(barX, barY, barW, barH, 8)
  ctx.fill()
  ctx.fillStyle = hpRatio < 0.3 ? `rgba(255,40,25,${0.65 + panic * 0.35})` : '#b42323'
  roundRect(barX, barY, barW * hpRatio, barH, 8)
  ctx.fill()
  ctx.strokeStyle = '#f5df9b'
  ctx.lineWidth = 2
  roundRect(barX, barY, barW, barH, 8)
  ctx.stroke()

  ctx.fillStyle = '#f5df9b'
  ctx.font = '15px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  if (bossPhase === 'reveal') {
    const hint = bossSeen ? '关上门，准备封印！' : (ghostEyeActive() ? '鬼眼看见了 Boss，开门确认！' : '门后有红光，开门确认！')
    ctx.fillText(`第 ${bossStage} 大关 Boss｜${hint}`, W / 2, barY - 10)
  } else {
    ctx.fillText(`第 ${bossStage} 大关 Boss｜${bossTimeLeft.toFixed(1)}s`, W / 2, barY - 10)
  }

  if (bossPhase === 'sealing') {
    // 门缝危险条：越满说明门越要被顶开。
    const pressureY = barY + 24
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    roundRect(barX, pressureY, barW, 8, 4)
    ctx.fill()
    ctx.fillStyle = `rgba(255,70,35,${0.65 + panic * 0.25})`
    roundRect(barX, pressureY, barW * pressure, 8, 4)
    ctx.fill()
    drawBossButton()
  }
}

function drawGameUI() {
  drawBackButton(backButton, '主页')

  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '22px sans-serif'
  ctx.fillText(`第 ${room} 间`, W / 2, 48)

  ctx.font = '14px sans-serif'
  ctx.fillText(`${DIFFICULTY[difficultyMode].name}｜最高纪录：${best}`, W / 2, 73)

  ctx.fillStyle = 'rgba(245,223,155,0.88)'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`图鉴 ${collectedTotalCount()} / ${totalCodexCount()}`, W - 14, 34)

  if (ghostEyeActive()) {
    ctx.fillStyle = 'rgba(245,223,155,0.94)'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`鬼眼开启：${ghostEyeLeftSeconds().toFixed(1)}s｜门透明度 60%`, W / 2, 100)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(GAME_VERSION, W - 10, H - 12)
}

function draw() {
  if (!assetsReady) {
    drawLoading()
    return
  }

  if (gameState === 'home') {
    drawHomeMenu()
    return
  }

  if (gameState === 'difficulty') {
    drawDifficultyMenu()
    return
  }

  if (gameState === 'rules') {
    drawRulesScreen()
    return
  }

  if (gameState === 'codex') {
    drawCodexScreen()
    return
  }

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)

  const frameRect = getFrameRect()
  if (bossActive) {
    drawBossBattle(frameRect)
  } else if (enteringRoom) {
    drawEnterTransition(frameRect)
  } else {
    drawArtRoom(frameRect, { includeLargeDoor: true, includeContent: true })
    drawSealOnDoor(frameRect)
    drawSealButton()
  }

  if (roomFadeIn > 0 && !enteringRoom) {
    ctx.fillStyle = `rgba(0,0,0,${roomFadeIn})`
    ctx.fillRect(0, 0, W, H)
  }

  // 游戏上方 UI 最后绘制，确保不会被放大的门或转场盖住。
  drawGameUI()

  if (gameState === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.82)'
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#fff'
    ctx.font = '32px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('游戏结束', W / 2, H / 2 - 30)

    ctx.font = '18px sans-serif'
    ctx.fillText(`你到达了第 ${room} 间`, W / 2, H / 2 + 10)
    ctx.fillText(`当前难度：${DIFFICULTY[difficultyMode].name}`, W / 2, H / 2 + 42)
    ctx.fillText('点击屏幕重新开始', W / 2, H / 2 + 76)
  }
}

function loop() {
  update()
  draw()
  requestAnimationFrame(loop)
}

loadAssets()
  .catch((err) => {
    console.error('图片资源加载失败：', err)
  })

loop()
function debugImageInfo() {
  Object.entries(IMAGES).forEach(([key, img]) => {
    if (!img) return;
    console.log(key, img.src, img.naturalWidth, img.naturalHeight);
  });
}
setTimeout(debugImageInfo, 2000);
