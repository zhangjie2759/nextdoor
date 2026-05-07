// game.js - 《下一间》网页 Canvas 版 / 图片图层替换版
// 保留：难度选择 / 门吸附 / 鬼速度逻辑 / 安全进入动画 / 封印逻辑
// 新增：assets 目录图片图层结构，可直接替换 png
// 更新：只抽取已加载的角色图片；无图片槽位不再使用临时鬼/临时人物；测试版隐藏墙壁和地板
// 版本：v0.8.2
// 本版修正：封面显示版本号；无限门转场进一步放慢；整体镜头推进让小门/外门同步缩放；角色更靠右、更容易一开门就露出一部分；封印五号鬼触发 10 秒鬼眼

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

const GAME_VERSION = 'v0.8.2'
const GAME_VERSION_NOTE = '鬼眼 + 无限门慢速转场修正版'

let W = window.innerWidth
let H = window.innerHeight
let DPR = window.devicePixelRatio || 1

let gameState = 'menu' // loading / menu / playing / gameover
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
// 替换图片时，保持下面文件名不变即可。
const ASSET_PATHS = {
  frame: 'assets/frame.png',       // 门框，已处理成中间透明
  frameRaw: 'assets/frame_raw.png',// 原始门框，只用于菜单背景/备份
  wall: 'assets/wall.png',         // 墙壁 / 深处空间
  floor: 'assets/floor.png',       // 地板
  door: 'assets/door.png'          // 最大门和缩小门都先复用这一张
}

// ===== 角色资源槽位 =====
// 你后面只要把透明 PNG 放进对应文件夹即可。
// 鬼：assets/ghosts/一号鬼.png ... assets/ghosts/十二号鬼.png
// 人物：assets/people/一号人物.png ... assets/people/十二号人物.png
// 没有放图片的槽位不会报错，但不会参与随机；放几张就只从这几张里抽。
const CN_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

const GHOST_SLOTS = CN_NUMS.map((n, i) => ({
  id: i + 1,
  name: `${n}号鬼`,
  src: `assets/ghosts/${n}号鬼.png`
}))

const PERSON_SLOTS = CN_NUMS.map((n, i) => ({
  id: i + 1,
  name: `${n}号人物`,
  src: `assets/people/${n}号人物.png`
}))

const ASSETS = {}
const CHARACTER_ASSETS = {
  ghosts: {},
  people: {}
}

let ACTIVE_GHOST_SLOTS = []
let ACTIVE_PERSON_SLOTS = []

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
  innerDoorAlpha: 0.68,     // 房间里面的小门/小门框透明度，越低越暗
  ghostHeight: 0.55,        // 角色图片高度，占门洞高度；后续可微调
  personHeight: 0.50,       // 人物图片高度，占门洞高度
  characterBottom: 0.84     // 角色脚底/底部位置，占门洞高度
}

// 临时测试开关：先隐藏墙壁和地板，只保留黑底、内部门、外门框、外门。
// 后面想恢复墙壁地板，改成 true 即可。
const SHOW_WALL_AND_FLOOR = false

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
let ghostSlot = null     // 当前抽到几号鬼
let personSlot = null    // 当前抽到几号人物

let contentVisible = false
let hasSeenContent = false

let danger = 0
let dangerSpeed = 0.02
let ghostThreshold = 0.35

let isChangingRoom = false
let sealAnim = 0
let sealSuccess = false

let enterAnim = 0
let enteringRoom = false
let roomFadeIn = 0 // 新房间出现时的黑场淡入，避免切房间突兀

const ENTER_ANIM_SPEED = 0.0048
const ROOM_FADE_IN_SPEED = 0.035

const GHOST_EYE_DURATION_MS = 10000
let ghostEyeUntil = 0

const sealButton = { x: 0, y: 0, w: 0, h: 58 }

const menuButtons = {
  easy: { x: 0, y: 0, w: 0, h: 74 },
  hard: { x: 0, y: 0, w: 0, h: 74 }
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
  menuButtons.easy.x = (W - btnW) / 2
  menuButtons.easy.y = H * 0.48
  menuButtons.easy.w = btnW
  menuButtons.easy.h = btnH

  menuButtons.hard.x = (W - btnW) / 2
  menuButtons.hard.y = H * 0.48 + btnH + 18
  menuButtons.hard.w = btnW
  menuButtons.hard.h = btnH
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

function startGame(mode) {
  ghostEyeUntil = 0
  difficultyMode = mode
  room = 1
  best = getStoredBest(mode)
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

function newRoom() {
  dragging = false
  startX = 0
  startDoorOpen = 0

  doorOpen = 0
  doorTarget = 0
  doorAutoMoving = false
  roomContent = randomContent()
  ghostType = roomContent === 'ghost' ? randomGhostType() : 'normal'
  ghostSlot = roomContent === 'ghost' ? randomSlot(ACTIVE_GHOST_SLOTS) : null
  personSlot = roomContent === 'fake' ? randomSlot(ACTIVE_PERSON_SLOTS) : null

  contentVisible = false
  hasSeenContent = false
  danger = 0

  isChangingRoom = false
  sealAnim = 0
  sealSuccess = false
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

  if (gameState === 'menu') {
    if (pointInRect(x, y, menuButtons.easy)) startGame('easy')
    else if (pointInRect(x, y, menuButtons.hard)) startGame('hard')
    return
  }

  if (gameState === 'gameover') {
    ghostEyeUntil = 0
    if (!difficultyMode) {
      gameState = 'menu'
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
  if (isChangingRoom) return

  doorAutoMoving = false

  if (doorOpen <= 0.05 && hasSeenContent && inSealButton(x, y)) {
    if (roomContent === 'ghost') {
      sealSuccess = true
      sealAnim = 0
      if (ghostSlot && ghostSlot.id === 5) activateGhostEye()
      nextRoomAfterSeal()
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

  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(GAME_VERSION, W - 10, H - 12)

  if (roomFadeIn > 0 && !enteringRoom) {
    roomFadeIn = Math.max(0, roomFadeIn - ROOM_FADE_IN_SPEED)
  }

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
  }

  if (roomContent === 'fake' && (doorOpen > 0.08 || ghostEyeActive())) {
    contentVisible = true
    hasSeenContent = true
  }

  if (roomContent === 'empty' && doorOpen > 0.5) {
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

function drawClosedDoorSet(frameRect, alpha = 1) {
  // 关键：小门和大门都使用同一套门框开口比例。
  // 这样过渡时只需要放大/移动门框矩形，里面的门会自然跟着对齐，
  // 最后一帧可以和外层门完全重叠。
  const open = getOpeningRect(frameRect)

  ctx.save()
  ctx.globalAlpha = alpha
  drawImageCover(ASSETS.door, open.x, open.y, open.w, open.h)
  ctx.drawImage(ASSETS.frame, frameRect.x, frameRect.y, frameRect.w, frameRect.h)
  ctx.restore()
}

function drawInnerDoorSet(openRect, scaleBoost = 1, alpha = ART_LAYOUT.innerDoorAlpha) {
  const innerFrame = getInnerFrameRect(openRect, scaleBoost)
  // 缩小的门 / 门框比外层更暗，保持“深处还有一扇门”的空间感。
  drawClosedDoorSet(innerFrame, alpha)
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

  // 起始阶段保持深处门偏暗，越接近外层门越恢复完整亮度。
  const alpha = lerp(ART_LAYOUT.innerDoorAlpha, 1, morph)
  drawClosedDoorSet(frame, alpha)
}

function drawRoomContent(openRect) {
  // 鬼 / 人物在房间生成时就已经存在于门后。
  // 这里不再用 contentVisible 控制绘制，避免角色在开到某个阈值后才突然出现。
  if (roomContent === 'ghost') {
    const img = ghostSlot ? CHARACTER_ASSETS.ghosts[ghostSlot.id] : null
    if (img) drawGhostImage(img, openRect)
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

function drawGhostImage(img, openRect) {
  const pressureScale = 1 + danger * 0.18
  const alpha = Math.min(1, 0.38 + danger * 0.62)
  // 门是向左滑开，最先露出的是门洞右侧；角色略微靠右并放大，保证一开门就能看到一部分。
  const centerX = openRect.x + openRect.w * 0.66
  const bottomY = openRect.y + openRect.h * ART_LAYOUT.characterBottom
  const maxW = openRect.w * 0.82 * pressureScale
  const maxH = openRect.h * (ART_LAYOUT.ghostHeight * 1.12) * pressureScale

  ctx.save()
  ctx.globalAlpha = alpha
  drawImageContainBottom(img, centerX, bottomY, maxW, maxH)
  ctx.restore()

  if (danger > 0.6) {
    ctx.fillStyle = `rgba(255,255,255,${(danger - 0.6) * 0.35})`
    ctx.beginPath()
    ctx.arc(centerX, openRect.y + openRect.h * 0.45, openRect.w * (0.18 + danger * 0.08), 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPersonImage(img, openRect) {
  // 人物也略微靠右，避免门打开一小段时仍完全看不到。
  const centerX = openRect.x + openRect.w * 0.66
  const bottomY = openRect.y + openRect.h * ART_LAYOUT.characterBottom
  const maxW = openRect.w * 0.72
  const maxH = openRect.h * (ART_LAYOUT.personHeight * 1.08)
  drawImageContainBottom(img, centerX, bottomY, maxW, maxH)
}

function drawArtRoom(frameRect, options = {}) {
  const {
    includeLargeDoor = true,
    includeContent = true,
    depthScale = 1
  } = options

  const open = getOpeningRect(frameRect)

  // 先把门洞区域裁切，避免图层跑出门框。
  clipRect(open, () => {
    // 7. 黑底
    ctx.fillStyle = '#000'
    ctx.fillRect(open.x, open.y, open.w, open.h)

    if (SHOW_WALL_AND_FLOOR) {
      // 6/5. 缩小门 + 缩小门框
      // 先画一层深处门，再由墙壁/地板压出空间层次。
      drawInnerDoorSet(open, depthScale)

      // 4. 墙壁：房间内部墙壁比外层更暗。
      drawImageCover(ASSETS.wall, open.x, open.y, open.w, open.h)
      if (ART_LAYOUT.roomWallDarkness > 0) {
        const floorYForDark = open.y + open.h * ART_LAYOUT.floorStart
        ctx.fillStyle = `rgba(0,0,0,${ART_LAYOUT.roomWallDarkness})`
        ctx.fillRect(open.x, open.y, open.w, floorYForDark - open.y)
      }

      // 3. 地板，压在墙壁底部
      const floorY = open.y + open.h * ART_LAYOUT.floorStart
      const floorH = open.h * (1 - ART_LAYOUT.floorStart)
      drawImageCover(ASSETS.floor, open.x, floorY, open.w, floorH)
    }

    // 测试版：不管鬼 / 人 / 空房间，背景只保留黑底里的深处小门。
    // 这样可以先判断“无限门”的转场和构图是否成立。
    drawInnerDoorSet(open, depthScale)

    if (includeContent) drawRoomContent(open)
  })

  // 2. 外层门框，使用中间透明处理后的 frame.png
  ctx.drawImage(ASSETS.frame, frameRect.x, frameRect.y, frameRect.w, frameRect.h)

  // 1. 最大的门，放最后，保证它在最前景，并能盖住门后内容。
  if (includeLargeDoor) {
    const slide = doorOpen * open.w * ART_LAYOUT.largeDoorSlide
    const doorX = open.x - slide
    const doorAlpha = ghostEyeActive() ? 0.6 : 1
    drawImageCoverAlpha(ASSETS.door, doorX, open.y, open.w, open.h, doorAlpha)
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

function drawSealOnDoor(frameRect) {
  if (!sealSuccess) return

  const open = getOpeningRect(frameRect)
  const t = sealAnim
  const startX = W / 2
  const startY = sealButton.y + sealButton.h / 2
  const endX = open.x + open.w * 0.52
  const endY = open.y + open.h * 0.48
  const ease = 1 - Math.pow(1 - t, 3)

  const x = startX + (endX - startX) * ease
  const y = startY + (endY - startY) * ease
  const scale = 0.75 + 0.45 * Math.sin(Math.min(1, t) * Math.PI)
  const w = 54 * scale
  const h = 126 * scale

  ctx.save()
  ctx.translate(x, y)
  if (t > 0.82) ctx.scale(1.08, 0.94)

  ctx.fillStyle = '#e5c76c'
  ctx.fillRect(-w / 2, -h / 2, w, h)

  ctx.strokeStyle = '#9f2020'
  ctx.lineWidth = 3
  ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8)

  ctx.fillStyle = '#9f2020'
  ctx.font = `${Math.floor(28 * scale)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('封', 0, 0)
  ctx.restore()
}

function drawEnterTransition(baseFrameRect) {
  if (!enteringRoom) return

  const t = clamp01(enterAnim)
  const open = getOpeningRect(baseFrameRect)
  const inner = getInnerDoorRects(open).frame

  // 更慢、更自然的“无限空间”转场：
  // 不是只让里面的小门自己放大，而是把整个房间画面当成镜头推进。
  // 计算一个变换，让“房间里的小门框”在最后一帧刚好移动并放大到“外层大门框”的位置。
  // 因为整个画面一起变换，所以小门、大门、门框的放大速度是同步的，玩家会感觉自己真的靠近了下一扇门。
  const morph = easeInOutCubic(clamp01((t - 0.02) / 0.96))
  const targetScale = baseFrameRect.h / inner.h
  const scale = lerp(1, targetScale, morph)
  const targetTx = baseFrameRect.x - inner.x * targetScale
  const targetTy = baseFrameRect.y - inner.y * targetScale
  const tx = lerp(0, targetTx, morph)
  const ty = lerp(0, targetTy, morph)

  // 旧空间轻微压暗，转场更稳，不会突然闪一下。
  const roomDim = smoothstep(t / 0.65)
  if (roomDim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${0.10 * roomDim})`
    ctx.fillRect(0, 0, W, H)
  }

  ctx.save()
  ctx.setTransform(DPR * scale, 0, 0, DPR * scale, DPR * tx, DPR * ty)
  drawArtRoom(baseFrameRect, { includeLargeDoor: true, includeContent: true })
  ctx.restore()

  // 末尾只加很轻的暗角，避免下一间 reset 时有硬切感。
  const endVignette = smoothstep((t - 0.82) / 0.18)
  if (endVignette > 0) {
    const g = ctx.createRadialGradient(
      W / 2, open.y + open.h * 0.45, open.w * 0.36,
      W / 2, open.y + open.h * 0.45, Math.max(W, H) * 0.78
    )
    g.addColorStop(0, `rgba(0,0,0,0)`)
    g.addColorStop(1, `rgba(0,0,0,${0.20 * endVignette})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
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

function drawStartMenu() {
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
  ctx.fillText('下一间', W / 2, H * 0.2)

  ctx.fillStyle = 'rgba(255,255,255,0.68)'
  ctx.font = '15px sans-serif'
  ctx.fillText('选择难度后开始', W / 2, H * 0.2 + 35)

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
  ctx.fillText('开门看清楚；见鬼后关门，再点封印', W / 2, H * 0.82)
}

function draw() {
  if (!assetsReady) {
    drawLoading()
    return
  }

  if (gameState === 'menu') {
    drawStartMenu()
    return
  }

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '22px sans-serif'
  ctx.fillText(`第 ${room} 间`, W / 2, 48)

  ctx.font = '14px sans-serif'
  ctx.fillText(`${DIFFICULTY[difficultyMode].name}｜最高纪录：${best}`, W / 2, 73)

  const frameRect = getFrameRect()
  if (enteringRoom) {
    drawEnterTransition(frameRect)
  } else {
    drawArtRoom(frameRect, { includeLargeDoor: true, includeContent: true })
    drawSealOnDoor(frameRect)
    drawSealButton()
  }

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

  if (roomFadeIn > 0 && !enteringRoom) {
    ctx.fillStyle = `rgba(0,0,0,${roomFadeIn})`
    ctx.fillRect(0, 0, W, H)
  }

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
