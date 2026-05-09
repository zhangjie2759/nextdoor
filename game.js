(() => {
  'use strict';

  const VERSION = 'v0.11.13';
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const DPR_MAX = 2;
  const STORAGE_KEY = 'next_room_v01111_save';

  const ASSET_BASES = ['assets/', './', 'images/'];

  const GHOSTS = [
    { name: '猼訑', nameEn: 'Botuo', file: '猼訑.png', type: 'normal', speed: 1.28, fire: 2, desc: '警觉又狡猾，喜欢躲在门后观察人。', descEn: 'Alert and cunning. It likes watching people from behind the door.' },
    { name: '赤鱬', nameEn: 'Chiru', file: '赤鱬.png', type: 'thin', speed: 2.08, fire: 2, desc: '细长灵活，动作很快，最擅长突然贴近。', descEn: 'Slim, agile, and fast. It is good at suddenly closing the distance.' },
    { name: '当康', nameEn: 'Dangkang', file: '当康.png', type: 'heavy', speed: 1.05, fire: 2, desc: '体型敦实，压迫感强，逼近时像重物挪动。', descEn: 'Heavy and solid. Its approach feels like something massive shifting forward.' },
    { name: '混沌', nameEn: 'Hundun', file: '混沌.png', type: 'heavy', speed: 0.72, fire: 3, desc: '轮廓混乱，越盯着看越分不清它的形状。', descEn: 'A chaotic silhouette. The longer you stare, the harder it is to read.' },
    { name: '九尾狐', nameEn: 'Nine-tailed Fox', file: '九尾狐.png', type: 'normal', speed: 1.76, fire: 2, ghostEye: true, desc: '擅长迷惑视线，被封印后会短暂开启鬼眼。', descEn: 'A master of deception. Sealing it briefly activates Ghost Eye.' },
    { name: '夔牛', nameEn: 'Kui Ox', file: '夔牛.png', type: 'heavy', speed: 1.18, fire: 2, desc: '独脚震地，虽然不快，但每次靠近都很有压迫。', descEn: 'Not the fastest, but every step feels heavy and oppressive.' },
    { name: '麒麟', nameEn: 'Qilin', file: '麒麟.png', type: 'normal', speed: 1.42, fire: 2, desc: '外表庄重，但在门后出现时往往并不吉利。', descEn: 'It looks solemn, but seeing it behind the door is never a good sign.' },
    { name: '穷奇', nameEn: 'Qiongqi', file: '穷奇.png', type: 'thin', speed: 2.22, fire: 3, desc: '凶性外露，判断失误时最容易被它扑出门。', descEn: 'Ferocious and direct. One bad read can let it burst out.' },
    { name: '饕餮', nameEn: 'Taotie', file: '饕餮.png', type: 'heavy', speed: 1.32, fire: 3, desc: '贪婪巨口，虽然笨重，但存在感异常强烈。', descEn: 'A greedy maw. Slow and heavy, but impossible to ignore.' },
    { name: '狰', nameEn: 'Zheng', file: '狰.png', type: 'normal', speed: 1.70, fire: 3, desc: '神情凶狠，常常伴着成群鬼火一起出现。', descEn: 'A fierce presence, often surrounded by ghost fire.' },
    { name: '烛阴', nameEn: 'Zhuyin', file: '烛阴.png', type: 'thin', speed: 2.45, fire: 3, desc: '危险等级极高，速度极快，几乎不给人反应时间。', descEn: 'Extremely dangerous and very fast. It gives you almost no time to react.' }
  ];

  const PEOPLE = [
    { name: '1号人物', nameEn: 'Resident 1', file: '1号人物.png', scale: 1.28, desc: '一个看起来有点拘谨的普通住客。', descEn: 'A slightly awkward but ordinary resident.' },
    { name: '2号人物', nameEn: 'Resident 2', file: '2号人物.png', desc: '总像在发呆，但目前没有发现异常。', descEn: 'Often looks spaced out, but no anomaly has been found.' },
    { name: '3号人物', nameEn: 'Resident 3', file: '3号人物.png', desc: '动作有点夸张，容易让人误以为是鬼。', descEn: 'Moves dramatically, which makes them easy to misjudge.' },
    { name: '4号人物', nameEn: 'Resident 4', file: '4号人物.png', desc: '门后最常见的住客之一，神态比较平静。', descEn: 'One of the more common residents behind the door.' },
    { name: '5号人物', nameEn: 'Resident 5', file: '5号人物.png', desc: '经常保持奇怪姿势，但本质上只是普通人。', descEn: 'Often caught in odd poses, but still a normal person.' },
    { name: '6号人物', nameEn: 'Resident 6', file: '6号人物.png', desc: '喜欢独自待着，容易制造出尴尬气氛。', descEn: 'Likes being alone and often creates awkward scenes.' },
    { name: '7号人物', nameEn: 'Resident 7', file: '7号人物.png', desc: '看起来心事重重，常常在角落停留。', descEn: 'Looks troubled and often stays in the corner.' },
    { name: '8号人物', nameEn: 'Resident 8', file: '8号人物.png', desc: '表情有点空，但目前还算安全。', descEn: 'A blank expression, but currently considered safe.' },
    { name: '9号人物', nameEn: 'Resident 9', file: '9号人物.png', desc: '动作松弛，属于让人放松警惕的类型。', descEn: 'Relaxed and harmless-looking, which can lower your guard.' },
    { name: '10号人物', nameEn: 'Resident 10', file: '10号人物.png', desc: '气质最怪的一位普通住客，最容易被误封。', descEn: 'The strangest-looking resident, and the easiest to seal by mistake.' }
  ];

  const GHOST_FIRE_FILES = ['鬼火1.png', '鬼火2.png', '鬼火3.png', '鬼火4.png', '鬼火5.png'];

  const BOSS_CONFIGS = [
    { stage: 1, time: 7.0, seals: 16 },
    { stage: 2, time: 6.5, seals: 20 },
    { stage: 3, time: 6.0, seals: 24 },
    { stage: 4, time: 5.8, seals: 28 },
    { stage: 5, time: 5.5, seals: 30 }
  ];

  const state = {
    screen: 'menu',
    lang: 'zh',
    lastScreen: 'menu',
    difficulty: 'normal',
    room: 1,
    mode: 'normal',
    content: null,
    door: 0,
    snapTarget: null,
    draggingDoor: false,
    dragStartX: 0,
    dragStartDoor: 0,
    danger: 0,
    sealFlash: 0,
    personFade: 0,
    transition: 0,
    transitionFadeContent: true,
    pendingNextRoom: 2,
    resultReason: '',
    ghostEye: 0,
    eyeFx: 0,
    bossDefeated: {},
    bossWindowSeen: {},
    toast: null,
    galleryTab: 'ghosts',
    galleryScroll: 0,
    galleryDragging: false,
    galleryDragStartY: 0,
    galleryDragStartScroll: 0,
    rulesScroll: 0,
    rulesDragging: false,
    rulesDragStartY: 0,
    rulesDragStartScroll: 0,
    save: loadSave(),
    pointer: { x: 0, y: 0, down: false },
    layout: null,
    t: 0
  };

  const assets = {};
  const allAssetFiles = [
    '封印按钮.png',
    ...PEOPLE.map(p => p.file),
    ...GHOSTS.map(g => g.file),
    ...GHOST_FIRE_FILES
  ];

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error('no save');
      const data = JSON.parse(raw);
      return {
        bestRoom: Number(data.bestRoom || 1),
        ghosts: data.ghosts || {},
        people: data.people || {}
      };
    } catch (e) {
      return { bestRoom: 1, ghosts: {}, people: {} };
    }
  }

  function saveGame() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.save));
    } catch (e) {}
  }

  function loadImageWithFallback(file) {
    let baseIndex = 0;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { assets[file] = img; };
    img.onerror = () => {
      baseIndex += 1;
      if (baseIndex < ASSET_BASES.length) {
        img.src = ASSET_BASES[baseIndex] + file;
      } else {
        assets[file] = null;
      }
    };
    img.src = ASSET_BASES[baseIndex] + file;
    assets[file] = img;
  }

  allAssetFiles.forEach(loadImageWithFallback);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const w = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 390);
    const h = Math.max(520, window.innerHeight || document.documentElement.clientHeight || 760);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.layout = computeLayout(w, h);
  }

  window.addEventListener('resize', resize);
  resize();

  function computeLayout(w, h) {
    const topH = Math.max(78, Math.min(94, h * 0.10));
    const bottomH = Math.max(112, Math.min(136, h * 0.145));
    const gameTop = topH;
    const gameBottom = h - bottomH;
    const gameH = gameBottom - gameTop;

    const doorH = clamp(Math.min(gameH * 0.80, w * 1.26, 610), 370, 610);
    const doorW = doorH * 0.64;
    const doorX = (w - doorW) / 2;
    const doorY = gameTop + Math.max(24, (gameH - doorH) * 0.34);

    const bigHole = { x: doorX, y: doorY, w: doorW, h: doorH };
    const bigDoor = { x: doorX, y: doorY, w: doorW, h: doorH };

    const smallScale = 0.36;
    const smallDoor = {
      w: doorW * smallScale,
      h: doorH * smallScale,
      x: (w - doorW * smallScale) / 2,
      y: doorY + doorH * 0.39
    };
    const smallHole = { ...smallDoor };
    const smallWall = {
      x: smallHole.x - smallHole.w * 0.64,
      y: smallHole.y - smallHole.h * 0.56,
      w: smallHole.w * 2.28,
      h: smallHole.h * 1.56
    };

    return {
      w, h, topH, bottomH, gameTop, gameBottom, gameH,
      bigDoor, bigHole, smallDoor, smallHole, smallWall,
      home: { x: 10, y: 16, w: 64, h: 36 },
      galleryButton: { x: w - 86, y: 16, w: 76, h: 36 },
      sealButton: { x: w / 2 - 88, y: h - 124, w: 176, h: 82 },
      bossButton: { x: w / 2 - 132, y: h - 118, w: 264, h: 76 }
    };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function isEn() { return state.lang === 'en'; }
  function displayName(item) { return isEn() ? (item.nameEn || item.name) : item.name; }
  function displayDesc(item) { return isEn() ? (item.descEn || item.desc || 'No record yet.') : (item.desc || '暂无记录'); }
  function ui(zh, en) { return isEn() ? en : zh; }

  function startRun(difficulty) {
    state.screen = 'game';
    state.difficulty = difficulty;
    state.room = 1;
    state.mode = 'normal';
    state.door = 0;
    state.snapTarget = null;
    state.draggingDoor = false;
    state.danger = 0;
    state.sealFlash = 0;
    state.personFade = 0;
    state.transition = 0;
    state.transitionFadeContent = true;
    state.pendingNextRoom = 2;
    state.resultReason = '';
    state.ghostEye = 0;
    state.eyeFx = 0;
    state.bossDefeated = {};
    state.bossWindowSeen = {};
    state.toast = null;
    createContent();
  }

  function bossStageForRoom(room) {
    return Math.floor((room - 1) / 25) + 1;
  }

  function bossWindow(room) {
    const stage = bossStageForRoom(room);
    const end = stage * 25;
    const start = end - 5;
    return { stage, start, end, forced: room === end, active: room >= start && room <= end };
  }

  function bossConfig(stage) {
    return BOSS_CONFIGS[Math.min(stage, BOSS_CONFIGS.length) - 1] || { stage, time: 5.5, seals: 30 };
  }


  function bossGhostForStage(stage) {
    return GHOSTS[(stage * 2 + 6) % GHOSTS.length];
  }

  function currentStageProgress(room = state.room) {
    const stage = bossStageForRoom(room);
    const index = ((room - 1) % 25) + 1;
    return { stage, index, ratio: index / 25, boss: bossGhostForStage(stage) };
  }

  function ghostDangerSpeed(g) {
    const typeBoost = g.type === 'thin' ? 1.18 : g.type === 'heavy' ? 0.92 : 1;
    return (g.speed || 1) * typeBoost;
  }

  function ghostApproachStep() {
    const raw = clamp(state.danger, 0, 1);
    const steps = 7;
    const index = Math.floor(raw * steps);
    const local = raw * steps - index;
    const kick = Math.sin(local * Math.PI) * 0.055;
    return clamp(index / steps + kick, 0, 1);
  }

  function createContent() {
    const room = state.room;
    const win = bossWindow(room);

    state.mode = 'normal';
    state.door = 0;
    state.snapTarget = null;
    state.draggingDoor = false;
    state.danger = 0;
    state.sealFlash = 0;
    state.personFade = 0;

    if (win.active && !state.bossDefeated[win.stage]) {
      const chance = win.forced ? 1 : (0.26 + (room - win.start) * 0.11);
      if (Math.random() < chance) {
        const bossGhost = bossGhostForStage(win.stage);
        state.content = {
          type: 'boss',
          stage: win.stage,
          bossGhost,
          cfg: bossConfig(win.stage),
          seen: false,
          bossSeen: false,
          hits: 0,
          talismans: [],
          forced: win.forced,
          passTimer: 0
        };
        return;
      }
    }

    const r = Math.random();
    const ghostChance = clamp(0.44 + room * 0.004, 0.44, 0.72);
    const personChance = room < 8 ? 0.34 : 0.28;

    if (r < ghostChance) {
      const count = ghostCountForRoom(room);
      const ghosts = pickGhosts(count, room);
      state.content = {
        type: 'ghost',
        ghosts,
        requiredSeals: count,
        sealed: 0,
        seen: false,
        passTimer: 0,
        talismans: []
      };
    } else if (r < ghostChance + personChance) {
      const person = randItem(PEOPLE);
      state.content = {
        type: 'person',
        person,
        seen: false,
        passTimer: 0,
        talismans: []
      };
    } else {
      state.content = {
        type: 'empty',
        seen: false,
        passTimer: 0,
        talismans: []
      };
    }
  }

  function ghostCountForRoom(room) {
    if (room < 25) return 1;
    if (room < 50) return Math.random() < 0.34 ? 2 : 1;
    const r = Math.random();
    if (r < 0.22) return 3;
    if (r < 0.58) return 2;
    return 1;
  }

  function pickGhosts(count, room) {
    const unlockCount = clamp(4 + Math.floor(room / 8), 4, GHOSTS.length);
    const pool = GHOSTS.slice(0, unlockCount);
    const picked = [];
    while (picked.length < count) {
      const g = randItem(pool);
      if (!picked.includes(g)) picked.push(g);
    }
    return picked;
  }

  function markSeenContent() {
    const c = state.content;
    if (!c || c.seen) return;
    c.seen = true;
    if (c.type === 'ghost') {
      c.ghosts.forEach(g => { state.save.ghosts[g.name] = true; });
      saveGame();
    } else if (c.type === 'person') {
      state.save.people[c.person.name] = true;
      saveGame();
    } else if (c.type === 'boss') {
      state.save.ghosts[c.bossGhost.name] = true;
      saveGame();
    }
  }

  function setToast(text, time = 1.4) {
    state.toast = { text, time };
  }

  function update(dt) {
    state.t += dt;
    if (state.toast) {
      state.toast.time -= dt;
      if (state.toast.time <= 0) state.toast = null;
    }
    if (state.ghostEye > 0 && state.screen === 'game') {
      state.ghostEye = Math.max(0, state.ghostEye - dt);
    }
    if (state.eyeFx > 0 && state.screen === 'game') {
      state.eyeFx = Math.max(0, state.eyeFx - dt);
    }

    if (state.screen !== 'game') return;

    if (state.mode === 'transition') {
      const transitionSpeed = state.difficulty === 'normal' ? 2.35 : 1.95;
      state.transition += dt * transitionSpeed;
      if (state.transition >= 1) finishAdvance();
      return;
    }

    if (state.mode === 'sealSuccess') {
      state.sealFlash += dt;
      if (state.sealFlash >= 0.72) {
        if (state.content && state.content.talismans) state.content.talismans = [];
        finishSealAdvance();
      }
      return;
    }

    if (state.mode === 'personFade') {
      const fadeSpeed = state.difficulty === 'normal' ? 2.05 : 1.55;
      state.personFade += dt * fadeSpeed;
      if (state.personFade >= 1) {
        startAdvance({ toRoom: state.room + 1, fadeContent: false });
      }
      return;
    }

    if (state.snapTarget !== null && !state.draggingDoor && state.mode === 'normal') {
      const direction = state.snapTarget > state.door ? 1 : -1;
      const speed = state.difficulty === 'normal' ? 2.85 : 2.20;
      state.door += direction * speed * dt;
      if ((direction > 0 && state.door >= state.snapTarget) || (direction < 0 && state.door <= state.snapTarget)) {
        state.door = state.snapTarget;
        state.snapTarget = null;
      }
      state.door = clamp(state.door, 0, 1);
    }

    const c = state.content;
    if (!c) return;

    if (state.door > 0.08) markSeenContent();

    if (state.mode === 'bossFight') {
      updateBossFight(dt);
      return;
    }

    if (c.type === 'ghost') {
      if (state.door > 0.055) {
        const base = 0.62 + Math.min(state.room, 90) * 0.0066;
        const speediest = Math.max(...c.ghosts.map(ghostDangerSpeed));
        const multi = 1 + (c.ghosts.length - 1) * 0.34;
        const easySlow = state.difficulty === 'easy' && c.ghosts.some(g => g.type === 'thin') ? 0.92 : 1;
        const hardBoost = state.difficulty === 'normal' ? 1.38 : 1;
        const openFactor = 0.95 + state.door * 1.05;
        state.danger += dt * base * speediest * multi * easySlow * hardBoost * openFactor;
      } else {
        state.danger = 0;
      }
      if (state.danger >= 1) {
        gameOver('门开太久，鬼冲出来了');
      }
    } else if (c.type === 'person' || c.type === 'empty') {
      if (state.door >= 0.92) {
        c.passTimer += dt;
        if (c.passTimer > 0.22) {
          if (c.type === 'person') {
            state.mode = 'personFade';
            state.personFade = 0;
            state.snapTarget = null;
          } else {
            startAdvance({ toRoom: state.room + 1 });
          }
        }
      } else {
        c.passTimer = 0;
      }
    } else if (c.type === 'boss') {
      if (state.door > 0.12) c.bossSeen = true;
      if (c.bossSeen && state.door < 0.04 && !state.draggingDoor && state.snapTarget === null) {
        beginBossFight();
      }
    }
  }

  function beginBossFight() {
    state.mode = 'bossFight';
    state.door = 0.06;
    state.snapTarget = null;
    state.danger = 0;
    setToast('Boss开始顶门！', 1.1);
  }

  function updateBossFight(dt) {
    const c = state.content;
    if (!c || c.type !== 'boss') return;
    const hpRatio = 1 - c.hits / c.cfg.seals;
    const panicBoost = hpRatio < 0.3 ? 1.25 : 1.08;
    const hardBoost = state.difficulty === 'normal' ? 1.22 : 1;
    state.door += dt / c.cfg.time * panicBoost * hardBoost;
    state.door = clamp(state.door, 0, 1);
    if (state.door >= 1) failBoss();
  }

  function startAdvance(opts = {}) {
    state.mode = 'transition';
    state.transition = 0;
    state.transitionFadeContent = opts.fadeContent !== false;
    state.personFade = 0;
    state.pendingNextRoom = opts.toRoom || state.room + 1;
    state.draggingDoor = false;
    state.snapTarget = null;
    state.danger = 0;
    state.save.bestRoom = Math.max(state.save.bestRoom || 1, state.pendingNextRoom);
    saveGame();
  }

  function finishAdvance() {
    state.room = state.pendingNextRoom;
    state.transition = 0;
    state.personFade = 0;
    state.transitionFadeContent = true;
    createContent();
  }

  function finishSealAdvance() {
    state.room = state.pendingNextRoom;
    state.mode = 'normal';
    state.door = 0;
    state.snapTarget = null;
    state.draggingDoor = false;
    state.danger = 0;
    state.sealFlash = 0;
    state.personFade = 0;
    state.transition = 0;
    state.save.bestRoom = Math.max(state.save.bestRoom || 1, state.room);
    saveGame();
    createContent();
  }

  function gameOver(reason) {
    state.resultReason = reason;
    state.save.bestRoom = Math.max(state.save.bestRoom || 1, state.room);
    saveGame();
    state.screen = 'result';
    state.mode = 'normal';
    state.personFade = 0;
    state.draggingDoor = false;
    state.snapTarget = null;
  }

  function handleSealClick() {
    if (state.screen !== 'game' || state.mode !== 'normal') return;
    const c = state.content;
    if (!c) return;

    if (c.type === 'person') {
      gameOver('封错了，人家只是普通人');
      return;
    }
    if (c.type === 'empty') {
      gameOver('封错了，这间房是空的');
      return;
    }
    if (c.type === 'boss') {
      if (!c.bossSeen) {
        setToast('先开门确认');
      } else {
        setToast('关门后才能开始贴符');
      }
      return;
    }
    if (c.type !== 'ghost') return;

    if (state.door > 0.08) {
      setToast('先把门关上');
      return;
    }

    c.sealed += 1;
    c.talismans.push(randomTalisman());
    state.sealFlash = 0.01;

    if (c.sealed >= c.requiredSeals) {
      c.ghosts.forEach(g => {
        if (g.ghostEye) {
          state.ghostEye = 10;
          state.eyeFx = 1.05;
          setToast('鬼眼开启：10秒透视', 1.6);
        }
      });
      state.mode = 'sealSuccess';
      state.pendingNextRoom = state.room + 1;
      state.snapTarget = null;
    } else {
      setToast('符咒贴上去了');
    }
  }

  function handleBossSealClick() {
    const c = state.content;
    if (!c || c.type !== 'boss' || state.mode !== 'bossFight') return;
    c.hits += 1;
    c.talismans.push(randomTalisman());
    state.door = Math.max(0, state.door - 0.115);
    if (c.hits >= c.cfg.seals) {
      state.bossDefeated[c.stage] = true;
      const nextStageStart = c.stage * 25 + 1;
      state.pendingNextRoom = nextStageStart;
      state.mode = 'sealSuccess';
      state.sealFlash = 0.01;
      setToast('Boss已封印，进入下一大关', 1.4);
    }
  }

  function failBoss() {
    const c = state.content;
    if (!c || c.type !== 'boss') return;
    if (c.forced) {
      gameOver('强制Boss战失败，Boss冲出来了');
    } else {
      setToast('Boss逃走了', 1.1);
      startAdvance({ toRoom: state.room + 1 });
    }
  }

  function randomTalisman() {
    return {
      rx: 0.18 + Math.random() * 0.64,
      ry: 0.14 + Math.random() * 0.68,
      rot: (Math.random() - 0.5) * 0.7,
      scale: 0.72 + Math.random() * 0.38,
      born: state.t
    };
  }

  function getPointer(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function hit(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  function onPointerDown(e) {
    e.preventDefault();
    const p = getPointer(e);
    state.pointer = { x: p.x, y: p.y, down: true };

    if (state.screen === 'menu') return handleMenuDown(p);
    if (state.screen === 'difficulty') return handleDifficultyDown(p);
    if (state.screen === 'rules') return handleRulesDown(p);
    if (state.screen === 'gallery') return handleGalleryDown(p);
    if (state.screen === 'result') return handleResultDown(p);
    if (state.screen !== 'game') return;

    const l = state.layout;
    if (hit(p, l.home)) {
      state.screen = 'menu';
      state.draggingDoor = false;
      return;
    }
    if (hit(p, l.galleryButton)) {
      state.lastScreen = 'game';
      state.screen = 'gallery';
      state.draggingDoor = false;
      return;
    }

    if (state.mode === 'bossFight') {
      if (hit(p, l.bossButton)) handleBossSealClick();
      return;
    }

    if (state.mode !== 'normal') return;

    if (hit(p, l.sealButton)) {
      handleSealClick();
      return;
    }

    const dragZone = {
      x: l.bigDoor.x - 18,
      y: l.bigDoor.y - 18,
      w: l.bigDoor.w + 70,
      h: l.bigDoor.h + 36
    };
    if (hit(p, dragZone)) {
      state.draggingDoor = true;
      state.dragStartX = p.x;
      state.dragStartDoor = state.door;
      state.snapTarget = null;
    }
  }

  function onPointerMove(e) {
    const p = getPointer(e);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    if (state.screen === 'rules' && state.rulesDragging) {
      e.preventDefault();
      state.rulesScroll = clamp(state.rulesDragStartScroll + (state.rulesDragStartY - p.y), 0, maxRulesScroll());
      return;
    }
    if (state.screen === 'gallery' && state.galleryDragging) {
      e.preventDefault();
      state.galleryScroll = clamp(state.galleryDragStartScroll + (state.galleryDragStartY - p.y), 0, maxGalleryScroll());
      return;
    }
    if (!state.draggingDoor || state.screen !== 'game' || state.mode !== 'normal') return;
    e.preventDefault();
    const l = state.layout;
    const dx = state.dragStartX - p.x;
    state.door = clamp(state.dragStartDoor + dx / (l.bigDoor.w * 0.58), 0, 1);
  }

  function onPointerUp(e) {
    const p = getPointer(e);
    state.pointer = { x: p.x, y: p.y, down: false };
    if (state.rulesDragging) {
      state.rulesDragging = false;
    }
    if (state.galleryDragging) {
      state.galleryDragging = false;
    }
    if (state.draggingDoor) {
      state.draggingDoor = false;
      state.snapTarget = state.door > 0.46 ? 1 : 0;
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', onPointerUp, { passive: false });
  canvas.addEventListener('pointercancel', onPointerUp, { passive: false });
  canvas.addEventListener('wheel', e => {
    if (state.screen === 'rules') {
      e.preventDefault();
      state.rulesScroll = clamp(state.rulesScroll + e.deltaY, 0, maxRulesScroll());
      return;
    }
    if (state.screen === 'gallery') {
      e.preventDefault();
      state.galleryScroll = clamp(state.galleryScroll + e.deltaY, 0, maxGalleryScroll());
    }
  }, { passive: false });

  function menuButtons() {
    const l = state.layout;
    const bw = Math.min(260, l.w * 0.68);
    const bh = 58;
    const x = (l.w - bw) / 2;
    const y = l.h * 0.45;
    return {
      start: { x, y, w: bw, h: bh },
      rules: { x, y: y + 76, w: bw, h: bh },
      gallery: { x, y: y + 152, w: bw, h: bh },
      lang: { x: l.w - 82, y: 18, w: 64, h: 36 }
    };
  }

  function handleMenuDown(p) {
    const b = menuButtons();
    if (hit(p, b.lang)) {
      state.lang = state.lang === 'zh' ? 'en' : 'zh';
      return;
    }
    if (hit(p, b.start)) state.screen = 'difficulty';
    else if (hit(p, b.rules)) state.screen = 'rules';
    else if (hit(p, b.gallery)) { state.lastScreen = 'menu'; state.screen = 'gallery'; }
  }

  function handleDifficultyDown(p) {
    const l = state.layout;
    const bw = Math.min(270, l.w * 0.72);
    const x = (l.w - bw) / 2;
    const easy = { x, y: l.h * 0.43, w: bw, h: 70 };
    const hard = { x, y: l.h * 0.43 + 94, w: bw, h: 70 };
    const back = { x: 16, y: 18, w: 70, h: 40 };
    if (hit(p, back)) state.screen = 'menu';
    else if (hit(p, easy)) startRun('easy');
    else if (hit(p, hard)) startRun('normal');
  }

  function handleRulesDown(p) {
    if (hit(p, { x: 16, y: 18, w: 70, h: 40 })) {
      state.screen = 'menu';
      state.rulesDragging = false;
      return;
    }
    const panel = rulesPanelRect();
    if (hit(p, panel)) {
      state.rulesDragging = true;
      state.rulesDragStartY = p.y;
      state.rulesDragStartScroll = state.rulesScroll;
    }
  }

  function handleGalleryDown(p) {
    const l = state.layout;
    if (hit(p, { x: 16, y: 18, w: 70, h: 40 })) {
      state.screen = state.lastScreen === 'game' ? 'game' : 'menu';
      state.galleryDragging = false;
      return;
    }
    const tabY = 78;
    const tabW = Math.min(146, (l.w - 44) / 2);
    const ghostTab = { x: 18, y: tabY, w: tabW, h: 42 };
    const peopleTab = { x: 28 + tabW, y: tabY, w: tabW, h: 42 };
    if (hit(p, ghostTab)) {
      state.galleryTab = 'ghosts';
      state.galleryScroll = 0;
      return;
    } else if (hit(p, peopleTab)) {
      state.galleryTab = 'people';
      state.galleryScroll = 0;
      return;
    }
    if (p.y > 126) {
      state.galleryDragging = true;
      state.galleryDragStartY = p.y;
      state.galleryDragStartScroll = state.galleryScroll;
    }
  }

  function handleResultDown(p) {
    const l = state.layout;
    const bw = Math.min(260, l.w * 0.68);
    const x = (l.w - bw) / 2;
    const again = { x, y: l.h * 0.58, w: bw, h: 58 };
    const home = { x, y: l.h * 0.58 + 76, w: bw, h: 58 };
    if (hit(p, again)) state.screen = 'difficulty';
    else if (hit(p, home)) state.screen = 'menu';
  }

  function clear() {
    const l = state.layout;
    ctx.clearRect(0, 0, l.w, l.h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, l.w, l.h);
  }

  function draw() {
    clear();
    if (state.screen === 'menu') drawMenu();
    else if (state.screen === 'difficulty') drawDifficulty();
    else if (state.screen === 'rules') drawRules();
    else if (state.screen === 'gallery') drawGallery();
    else if (state.screen === 'game') drawGame();
    else if (state.screen === 'result') drawResult();
  }

  function drawMenu() {
    const l = state.layout;
    drawDoodleBackground();
    drawHomeGhostFires();
    const en = state.lang === 'en';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fffdf6';
    roundRect(l.w / 2 - 138, l.h * 0.18, 276, 126, 24, true, true, 5);
    ctx.fillStyle = '#111';
    ctx.font = en ? '900 44px system-ui, -apple-system, sans-serif' : '900 54px system-ui, -apple-system, sans-serif';
    ctx.fillText(en ? 'NEXT ROOM' : '下一间', l.w / 2, l.h * 0.24);
    ctx.font = '700 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(en ? 'Open. Observe. Decide.' : '开门一秒，识别异常', l.w / 2, l.h * 0.305);
    ctx.font = '700 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(VERSION, l.w / 2, l.h * 0.36);
    ctx.restore();

    const b = menuButtons();
    drawMiniButton(b.lang, en ? '中' : 'EN');
    drawUIButton(b.start, en ? 'Start' : '开始游戏');
    drawUIButton(b.rules, en ? 'Rules' : '游戏规则');
    drawUIButton(b.gallery, en ? `Archive ${collectCountText()}` : `图鉴 ${collectCountText()}`);
  }

  function drawDifficulty() {
    const l = state.layout;
    drawDoodleBackground();
    drawBackButton();
    drawTitleBlock(ui('选择难度', 'Select Difficulty'), ui('简单版会降低瘦子鬼速度', 'Easy mode slows down thin ghosts'));
    const bw = Math.min(270, l.w * 0.72);
    const x = (l.w - bw) / 2;
    drawUIButton({ x, y: l.h * 0.43, w: bw, h: 70 }, ui('简单版', 'Easy'), ui('新手 / 瘦子鬼更慢', 'Beginner / slower thin ghosts'));
    drawUIButton({ x, y: l.h * 0.43 + 94, w: bw, h: 70 }, ui('困难版', 'Hard'), ui('原始速度 / 更紧张', 'Original speed / tense'));
  }

  function rulesLines() {
    return isEn() ? [
      '1. Drag the wooden sliding door left to peek inside. Release to snap open or closed.',
      '2. Ghosts have different speeds. If you stare too long, they will step closer and burst out.',
      '3. For normal ghosts, closing the door resets their approach. Close the door, then tap Seal.',
      '4. Multiple ghosts require multiple seals, but the button will never reveal how many are left.',
      '5. If there is a person or an empty room, open the door wide enough to pass. Sealing them ends the run.',
      '6. After sealing the Nine-tailed Fox, Ghost Eye opens for 10 seconds and the door becomes transparent.',
      '7. Bosses appear near every 25th room. Confirm the Boss, close the door, then seal rapidly before it forces the door open.',
      '8. The Archive records ghosts and people you have seen. Scroll to view all entries.'
    ] : [
      '1. 拖动红木滑门向左开门，松手后会自动吸附开/关。',
      '2. 鬼有快慢差异，看太久会一段段逼近，危险值满了就会冲出来。',
      '3. 普通鬼只要关门，逼近进度会重置；看清后关门，再点击封印。',
      '4. 多只鬼需要贴多张符，但封印按钮不会显示还剩几张，避免剧透。',
      '5. 门后是人物或空房间时，开到足够大即可通过；乱封会直接失败。',
      '6. 封印九尾狐后开启10秒鬼眼，门会变透明，并出现眼睛特效。',
      '7. 每25关附近会出现Boss：先开门确认，再关门疯狂贴符，不能让它把门顶开。',
      '8. 图鉴会记录见过的鬼和人物，可以上下滑动查看全部内容。'
    ];
  }

  function rulesPanelRect() {
    const l = state.layout;
    return { x: l.w * 0.07, y: l.h * 0.31, w: l.w * 0.86, h: l.h * 0.55 };
  }

  function maxRulesScroll() {
    const r = rulesPanelRect();
    ctx.save();
    ctx.font = `${isEn() ? 12 : 14}px system-ui, -apple-system, sans-serif`;
    const h = measureLinesHeight(rulesLines(), r.w - 36, isEn() ? 17 : 22, 7);
    ctx.restore();
    return Math.max(0, h - (r.h - 42));
  }

  function drawRules() {
    const l = state.layout;
    drawDoodleBackground();
    drawBackButton();
    drawTitleBlock(ui('游戏规则', 'Rules'), ui('不要乱封，也不要看太久', 'Observe first. Seal only when sure.'));
    state.rulesScroll = clamp(state.rulesScroll, 0, maxRulesScroll());
    drawScrollableTextPanel(rulesLines(), rulesPanelRect(), state.rulesScroll);
  }

  function galleryMetrics() {
    const l = state.layout;
    const list = state.galleryTab === 'ghosts' ? GHOSTS : PEOPLE;
    const cols = isEn() ? 2 : 3;
    const gap = 12;
    const cardW = (l.w - 32 - gap * (cols - 1)) / cols;
    const cardH = isEn() ? Math.min(218, cardW * 1.42) : Math.min(182, cardW * 1.78);
    const startY = 138;
    const rows = Math.ceil(list.length / cols);
    const contentH = rows * (cardH + 14) - 14;
    const viewH = l.h - startY - 18;
    return { l, list, cols, gap, cardW, cardH, startY, contentH, viewH };
  }

  function maxGalleryScroll() {
    const m = galleryMetrics();
    return Math.max(0, m.contentH - m.viewH);
  }

  function drawGallery() {
    const m = galleryMetrics();
    const l = m.l;
    state.galleryScroll = clamp(state.galleryScroll, 0, maxGalleryScroll());
    drawDoodleBackground();
    drawBackButton();
    ctx.save();
    ctx.fillStyle = '#111';
    ctx.font = '900 30px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ui('图鉴', 'Archive'), l.w / 2, 45);
    ctx.restore();

    const tabY = 78;
    const tabW = Math.min(146, (l.w - 44) / 2);
    const ghostTab = { x: 18, y: tabY, w: tabW, h: 42 };
    const peopleTab = { x: 28 + tabW, y: tabY, w: tabW, h: 42 };
    drawTab(ghostTab, `${ui('鬼图鉴', 'Ghosts')} ${seenGhostCount()}/${GHOSTS.length}`, state.galleryTab === 'ghosts');
    drawTab(peopleTab, `${ui('人物图鉴', 'People')} ${seenPeopleCount()}/${PEOPLE.length}`, state.galleryTab === 'people');

    const seenMap = state.galleryTab === 'ghosts' ? state.save.ghosts : state.save.people;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, m.startY - 4, l.w, l.h - m.startY + 4);
    ctx.clip();
    m.list.forEach((item, i) => {
      const col = i % m.cols;
      const row = Math.floor(i / m.cols);
      const x = 16 + col * (m.cardW + m.gap);
      const y = m.startY + row * (m.cardH + 14) - state.galleryScroll;
      if (y > l.h || y + m.cardH < m.startY - 10) return;
      drawGalleryCard({ x, y, w: m.cardW, h: m.cardH }, item, !!seenMap[item.name]);
    });
    ctx.restore();

    if (maxGalleryScroll() > 0) {
      const trackH = l.h - m.startY - 24;
      const thumbH = Math.max(34, trackH * (m.viewH / (m.contentH || 1)));
      const thumbY = m.startY + 8 + (trackH - thumbH) * (state.galleryScroll / maxGalleryScroll());
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      roundRect(l.w - 9, m.startY + 8, 4, trackH, 2, true, false, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(l.w - 10, thumbY, 6, thumbH, 3, true, false, 0);
      ctx.restore();
    }
  }

  function drawResult() {
    const l = state.layout;
    drawDoodleBackground();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fffdf6';
    roundRect(l.w * 0.08, l.h * 0.22, l.w * 0.84, l.h * 0.28, 24, true, true, 5);
    ctx.fillStyle = '#111';
    ctx.font = '900 38px system-ui, -apple-system, sans-serif';
    ctx.fillText(ui('游戏结束', 'Game Over'), l.w / 2, l.h * 0.30);
    ctx.font = '700 17px system-ui, -apple-system, sans-serif';
    wrapText(resultText(state.resultReason), l.w / 2, l.h * 0.365, l.w * 0.72, 24, 'center');
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(ui(`本次到达：第 ${state.room} 间`, `Reached Room ${state.room}`), l.w / 2, l.h * 0.445);
    ctx.fillText(ui(`最高纪录：第 ${state.save.bestRoom || 1} 间`, `Best: Room ${state.save.bestRoom || 1}`), l.w / 2, l.h * 0.478);
    ctx.restore();

    const bw = Math.min(260, l.w * 0.68);
    const x = (l.w - bw) / 2;
    drawUIButton({ x, y: l.h * 0.58, w: bw, h: 58 }, ui('再来一局', 'Try Again'));
    drawUIButton({ x, y: l.h * 0.58 + 76, w: bw, h: 58 }, ui('返回主页', 'Home'));
  }

  function resultText(zh) {
    if (!isEn()) return zh;
    const map = {
      '门开太久，鬼冲出来了': 'The door stayed open too long. The ghost escaped.',
      '封错了，人家只是普通人': 'Wrong seal. That was just a normal person.',
      '封错了，这间房是空的': 'Wrong seal. This room was empty.',
      '强制Boss战失败，Boss冲出来了': 'Forced boss fight failed. The boss broke out.'
    };
    return map[zh] || zh || 'Run ended.';
  }

  function toastText(zh) {
    if (!isEn()) return zh;
    const map = {
      'Boss开始顶门！': 'Boss is forcing the door!',
      '先开门确认': 'Open the door to confirm first.',
      '关门后才能开始贴符': 'Close the door before sealing.',
      '先把门关上': 'Close the door first.',
      '鬼眼开启：10秒透视': 'Ghost Eye: 10 seconds of vision.',
      '符咒贴上去了': 'Seal placed.',
      'Boss已封印，进入下一大关': 'Boss sealed. Next stage unlocked.',
      'Boss逃走了': 'Boss escaped.'
    };
    return map[zh] || zh;
  }

  function drawGame() {
    if (state.mode === 'transition') drawTransitionScene();
    else drawInfinityScene();
    drawTopUI();
    drawGhostEyeFx();
    drawBottomControls();
    drawToast();
  }

  function drawInfinityScene() {
    const l = state.layout;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, l.topH, l.w, l.h - l.topH);
    ctx.clip();
    drawInfinityCore();
    ctx.restore();
  }

  function drawInfinityCore() {
    const l = state.layout;
    drawSceneGround(l.bigHole, l.smallWall);
    drawSmallWallAndDoor(l.smallWall, l.smallHole, l.smallDoor);
    drawInteriorPerspective();
    drawContentBehindDoor();
    drawBigWall();
    drawBossGlow();
    drawDoorPanel(l.bigDoor, state.door, { big: true });
    drawDoorBaseLine(l.bigDoor, state.door, 1);
    drawDoorTalismans();
    drawSealSuccessGlow();
    drawDangerVignette();
  }

  function drawTransitionScene() {
    const l = state.layout;
    const t = easeInOut(clamp(state.transition, 0, 1));
    const bigHole = rectLerp(l.smallHole, l.bigHole, t);
    const bigDoor = rectLerp(l.smallDoor, l.bigDoor, t);
    const smallScale = 0.36;
    const innerDoor = {
      w: bigDoor.w * smallScale,
      h: bigDoor.h * smallScale,
      x: bigDoor.x + (bigDoor.w - bigDoor.w * smallScale) * 0.5,
      y: bigDoor.y + bigDoor.h * 0.39
    };
    const innerHole = { ...innerDoor };
    const innerWall = {
      x: innerHole.x - innerHole.w * 0.64,
      y: innerHole.y - innerHole.h * 0.56,
      w: innerHole.w * 2.28,
      h: innerHole.h * 1.56
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, l.topH, l.w, l.h - l.topH);
    ctx.clip();
    drawSceneGround(bigHole, innerWall, clamp(1 - t * 0.4, 0.7, 1));
    drawSmallWallAndDoor(innerWall, innerHole, innerDoor, clamp(0.82 + (1 - t) * 0.15, 0.78, 1));
    drawInteriorPerspective(bigHole, innerWall);
    if (state.transitionFadeContent) {
      ctx.save();
      ctx.globalAlpha = clamp(1 - t * 1.45, 0, 1);
      drawContentBehindDoor(bigDoor, bigHole);
      ctx.restore();
    }
    drawBigWall(bigHole);
    drawDoorPanel(bigDoor, 0, { big: true });
    drawDoorBaseLine(bigDoor, 0, 1);
    ctx.restore();
  }

  function rectLerp(a, b, t) {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      w: lerp(a.w, b.w, t),
      h: lerp(a.h, b.h, t)
    };
  }

  function drawInteriorPerspective(holeArg, wallArg) {
    const l = state.layout;
    const a = holeArg || l.bigHole;
    const b = wallArg || l.smallWall;

    const frontL = { x: a.x, y: a.y + a.h };
    const frontR = { x: a.x + a.w, y: a.y + a.h };
    const backL = { x: b.x, y: b.y + b.h };
    const backR = { x: b.x + b.w, y: b.y + b.h };
    const backTopL = { x: b.x, y: b.y };
    const backTopR = { x: b.x + b.w, y: b.y };
    const frontTopL = { x: a.x, y: a.y };
    const frontTopR = { x: a.x + a.w, y: a.y };

    function interp(p, q, t) {
      return { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) };
    }
    function floorPoint(xFrac, depth) {
      const left = interp(frontL, backL, depth);
      const right = interp(frontR, backR, depth);
      return interp(left, right, xFrac);
    }
    function depthEase(i, total) {
      const t = i / total;
      return 1 - Math.pow(1 - t, 1.62);
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 墙面/天花连接线：必须连到后墙与地板，避免断线。
    ctx.strokeStyle = 'rgba(0,0,0,0.42)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(frontTopL.x, frontTopL.y);
    ctx.lineTo(backTopL.x, backTopL.y);
    ctx.lineTo(backL.x, backL.y);
    ctx.moveTo(frontTopR.x, frontTopR.y);
    ctx.lineTo(backTopR.x, backTopR.y);
    ctx.lineTo(backR.x, backR.y);
    ctx.moveTo(frontL.x, frontL.y);
    ctx.lineTo(backL.x, backL.y);
    ctx.moveTo(frontR.x, frontR.y);
    ctx.lineTo(backR.x, backR.y);
    ctx.stroke();

    // 后墙天花横线 + 后墙两条竖线 + 后墙地板线。
    ctx.strokeStyle = 'rgba(0,0,0,0.58)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(backTopL.x, backTopL.y);
    ctx.lineTo(backTopR.x, backTopR.y);
    ctx.moveTo(backTopL.x, backTopL.y);
    ctx.lineTo(backL.x, backL.y);
    ctx.moveTo(backTopR.x, backTopR.y);
    ctx.lineTo(backR.x, backR.y);
    ctx.moveTo(backL.x, backL.y);
    ctx.lineTo(backR.x, backR.y);
    ctx.stroke();

    // 前方门洞地板线。
    ctx.strokeStyle = 'rgba(0,0,0,0.56)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(frontL.x, frontL.y);
    ctx.lineTo(frontR.x, frontR.y);
    ctx.stroke();

    // 地砖网格：横线和纵线都从同一个四边形地面计算，避免不对齐。
    ctx.strokeStyle = 'rgba(0,0,0,0.20)';
    ctx.lineWidth = 1.2;

    for (let i = 1; i <= 6; i++) {
      const xFrac = i / 7;
      const p0 = floorPoint(xFrac, 0);
      const p1 = floorPoint(xFrac, 1);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    for (let i = 1; i <= 6; i++) {
      const d = depthEase(i, 7);
      const left = floorPoint(0, d);
      const right = floorPoint(1, d);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSceneGround(frontHole, innerWall, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const floorTop = frontHole.y + frontHole.h;
    const floorBottom = Math.min(state.layout.h - state.layout.bottomH * 0.35, floorTop + state.layout.gameH * 0.20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-state.layout.w, state.layout.topH, state.layout.w * 3, state.layout.h);

    const shadow = ctx.createLinearGradient(0, floorTop, 0, floorBottom);
    shadow.addColorStop(0, 'rgba(0,0,0,0.08)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.fillRect(frontHole.x - frontHole.w * 0.18, floorTop - 1, frontHole.w * 1.36, floorBottom - floorTop);

    // 最外门的落地线
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(frontHole.x - frontHole.w * 0.12, floorTop);
    ctx.lineTo(frontHole.x + frontHole.w * 1.12, floorTop);
    ctx.stroke();
    ctx.restore();
  }

  function drawSmallWallAndDoor(wall, hole, door, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    drawWallWithHole(wall, hole, { stroke: 5, fill: '#ffffff' });
    drawDoorPanel(door, 0, { big: false, noHandle: true });
    drawDoorBaseLine(door, 0, alpha);
    ctx.restore();
  }

  function drawBigWall(holeArg) {
    const l = state.layout;
    const wall = { x: 0, y: l.topH, w: l.w, h: l.h - l.topH };
    drawWallWithHole(wall, holeArg || l.bigHole, { stroke: 5, fill: '#ffffff' });
  }

  function drawWallWithHole(wall, hole, opts = {}) {
    const fill = opts.fill || '#ffffff';
    const stroke = 5; // 绝对线宽，不随门大小变化。
    const r = 10;
    ctx.save();
    ctx.fillStyle = fill;

    // 墙面被门洞掏空，底部不再封死，门框是倒U形落在地板线上。
    ctx.fillRect(wall.x, wall.y, Math.max(0, hole.x - wall.x), wall.h);
    ctx.fillRect(hole.x + hole.w, wall.y, Math.max(0, wall.x + wall.w - (hole.x + hole.w)), wall.h);
    ctx.fillRect(hole.x, wall.y, hole.w, Math.max(0, hole.y - wall.y));
    ctx.fillRect(hole.x, hole.y + hole.h, hole.w, Math.max(0, wall.y + wall.h - (hole.y + hole.h)));

    ctx.strokeStyle = '#111';
    ctx.lineWidth = stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 倒U型门框：左边、上边、右边。底部只由地板线承接。
    ctx.beginPath();
    ctx.moveTo(hole.x, hole.y + hole.h);
    ctx.lineTo(hole.x, hole.y + r);
    ctx.quadraticCurveTo(hole.x, hole.y, hole.x + r, hole.y);
    ctx.lineTo(hole.x + hole.w - r, hole.y);
    ctx.quadraticCurveTo(hole.x + hole.w, hole.y, hole.x + hole.w, hole.y + r);
    ctx.lineTo(hole.x + hole.w, hole.y + hole.h);
    ctx.stroke();

    // 地板横线：比普通透视线更明确，但不超过门框宽度。
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(hole.x + 1, hole.y + hole.h);
    ctx.lineTo(hole.x + hole.w - 1, hole.y + hole.h);
    ctx.stroke();
    ctx.restore();
  }

  function drawDoorPanel(door, progress, opts = {}) {
    const alpha = opts.alpha ?? doorAlphaForGhostEye();
    const slide = door.w * 0.96 * progress;
    const x = door.x - slide;
    const y = door.y;
    const w = door.w;
    const h = door.h;
    const strokeW = 5;
    const inset = 13;

    ctx.save();
    ctx.globalAlpha = alpha;

    const body = ctx.createLinearGradient(x, y, x + w, y);
    body.addColorStop(0, '#6f3523');
    body.addColorStop(0.18, '#8b4a30');
    body.addColorStop(0.52, '#a35b3b');
    body.addColorStop(0.84, '#7b3d29');
    body.addColorStop(1, '#5f2b1c');
    ctx.fillStyle = body;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = strokeW;
    roundRect(x, y, w, h, 10, true, true, strokeW);

    ctx.save();
    ctx.beginPath();
    roundRectPath(x + 3, y + 3, w - 6, h - 6, 8);
    ctx.clip();

    // 竖向木纹：不再画横向木纹，也不再画门把手。
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    const stripeCount = Math.max(6, Math.floor(w / 22));
    for (let i = 1; i < stripeCount; i++) {
      const xx = x + (w / stripeCount) * i + Math.sin(i * 1.7) * 1.2;
      ctx.beginPath();
      ctx.moveTo(xx, y + 8);
      ctx.bezierCurveTo(xx + Math.sin(i) * 1.5, y + h * 0.30, xx - Math.cos(i) * 1.3, y + h * 0.65, xx + Math.sin(i * 2.1), y + h - 8);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1.3;
    for (let i = 1; i < stripeCount; i += 2) {
      const xx = x + (w / stripeCount) * i;
      ctx.beginPath();
      ctx.moveTo(xx, y + 6);
      ctx.lineTo(xx, y + h - 6);
      ctx.stroke();
    }
    ctx.restore();

    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    roundRect(x + inset, y + inset, w - inset * 2, h - inset * 2, 8, false, true, 2.2);

    ctx.globalAlpha = alpha * 0.12;
    ctx.fillStyle = '#ffffff';
    roundRect(x + inset, y + inset, Math.max(22, w * 0.12), h - inset * 2, 8, true, false, 0);
    ctx.restore();
  }

  function drawDoorBaseLine(door, progress = 0, alpha = 1) {
    const slide = door.w * 0.96 * progress;
    const x = door.x - slide;
    const y = door.y + door.h;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(0,0,0,0.68)';
    ctx.lineWidth = 2.6; // 绝对线宽。
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 1, y);
    ctx.lineTo(x + door.w - 1, y);
    ctx.stroke();
    ctx.restore();
  }

  function doorAlphaForGhostEye() {
    if (state.ghostEye > 0 && state.mode === 'normal') return 0.4;
    return 1;
  }

  function actualDoorRect() {
    const d = state.layout.bigDoor;
    const x = d.x - d.w * 0.96 * state.door;
    return { x, y: d.y, w: d.w, h: d.h };
  }

  function drawBossGlow() {
    const c = state.content;
    if (!c || c.type !== 'boss') return;
    const l = state.layout;
    const pulse = 0.5 + Math.sin(state.t * 12) * 0.5;
    const hpRatio = 1 - (c.hits || 0) / c.cfg.seals;
    const fast = hpRatio < 0.3 ? 1 : 0.35;
    ctx.save();
    ctx.globalAlpha = state.mode === 'bossFight' ? 0.48 + pulse * fast * 0.24 : 0.34;
    const g = ctx.createRadialGradient(l.bigHole.x + l.bigHole.w / 2, l.bigHole.y + l.bigHole.h / 2, 10, l.bigHole.x + l.bigHole.w / 2, l.bigHole.y + l.bigHole.h / 2, l.bigHole.w * 0.82);
    g.addColorStop(0, 'rgba(255,28,10,0.95)');
    g.addColorStop(0.48, 'rgba(255,28,10,0.28)');
    g.addColorStop(1, 'rgba(255,28,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(l.bigHole.x - 80, l.bigHole.y - 80, l.bigHole.w + 160, l.bigHole.h + 160);
    ctx.restore();
  }

  function drawContentBehindDoor(doorArg, holeArg) {
    const c = state.content;
    if (!c) return;
    const l = state.layout;
    const door = doorArg || l.bigDoor;
    const hole = holeArg || l.bigHole;
    const floorY = door.y + door.h * 0.96;
    let contentAlpha = state.mode === 'transition' && state.transitionFadeContent
      ? clamp(1 - state.transition * 1.15, 0, 1)
      : 1;
    if (state.mode === 'personFade' && c.type === 'person') {
      contentAlpha *= clamp(1 - state.personFade, 0, 1);
    }

    ctx.save();
    ctx.globalAlpha *= contentAlpha;
    ctx.beginPath();
    ctx.rect(hole.x, hole.y, hole.w, hole.h);
    ctx.clip();

    if (c.type === 'empty') {
      drawEmptyRoomMark(hole);
    } else if (c.type === 'person') {
      drawCharacter(c.person, door.x + door.w / 2, floorY, door.h * 0.60, 'person', 1);
    } else if (c.type === 'ghost') {
      const count = c.ghosts.length;
      const approach = ghostApproachStep();
      const dangerScale = 1 + approach * 0.68;
      const baseH = door.h * (count === 1 ? 0.60 : count === 2 ? 0.49 : 0.40);
      const spread = door.w * (count === 1 ? 0 : count === 2 ? 0.25 : 0.28);
      c.ghosts.forEach((g, i) => {
        const baseOffset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
        const hiddenOffset = g.name === '九尾狐' ? -door.w * 0.24 : 0;
        const gx = door.x + door.w / 2 + baseOffset + hiddenOffset;
        const gh = baseH * dangerScale;
        drawCharacter(g, gx, floorY, baseH, 'ghost', dangerScale);
        drawGhostFires(g, gx, floorY - gh * 0.58, gh, Math.max(1, g.fire || 1), i);
      });
    } else if (c.type === 'boss') {
      const approach = state.mode === 'bossFight' ? Math.floor(state.door * 8) / 8 : 0;
      const scale = state.mode === 'bossFight' ? 1 + approach * 0.45 : 1;
      drawCharacter(c.bossGhost, door.x + door.w / 2, floorY + door.h * 0.04, door.h * 0.76, 'boss', scale);
      drawGhostFires(c.bossGhost, door.x + door.w / 2, floorY - door.h * 0.52, door.h * 0.80, (c.bossGhost.fire || 3) + 2, 9);
    }
    ctx.restore();
  }

  function drawEmptyRoomMark(hole) {
    // 空房间不再画圆圈标记，避免被误认为小门上的图案。
  }

  function drawGhostFires(def, cx, cy, bodyH, count, seed = 0) {
    ctx.save();
    const base = GHOSTS.findIndex(g => g.name === def.name);
    const safeSeed = base >= 0 ? base : seed;
    const max = clamp(count, 1, 7);
    for (let i = 0; i < max; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const layer = Math.floor(i / 2);
      const drift = Math.sin(state.t * (1.1 + i * 0.17) + safeSeed * 0.9 + i) * bodyH * 0.035;
      const bob = Math.sin(state.t * (1.7 + i * 0.23) + i * 1.8) * bodyH * 0.045;
      const x = cx + side * bodyH * (0.22 + layer * 0.08) + drift;
      const y = cy - bodyH * (0.04 + layer * 0.035) + bob;
      const size = bodyH * (0.14 + (i % 3) * 0.022);
      const img = assets[GHOST_FIRE_FILES[(safeSeed + i) % GHOST_FIRE_FILES.length]];
      const pulse = 0.72 + Math.sin(state.t * 3.2 + i) * 0.15;
      ctx.globalAlpha = clamp(0.72 + pulse * 0.24, 0.58, 1);
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, x - size / 2, y - size * 0.65, size, size * 1.28);
      } else {
        drawCodeGhostFire(x, y, size, pulse);
      }
    }
    ctx.restore();
  }

  function drawCodeGhostFire(x, y, size, pulse) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 1 + pulse * 0.15);
    const g = ctx.createRadialGradient(0, 0, size * 0.05, 0, 0, size * 0.72);
    g.addColorStop(0, 'rgba(255,255,220,0.95)');
    g.addColorStop(0.34, 'rgba(95,255,160,0.72)');
    g.addColorStop(1, 'rgba(35,220,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.78);
    ctx.bezierCurveTo(size * 0.45, -size * 0.28, size * 0.38, size * 0.32, 0, size * 0.48);
    ctx.bezierCurveTo(-size * 0.42, size * 0.18, -size * 0.40, -size * 0.28, 0, -size * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCharacter(def, x, floorY, targetH, kind, scale = 1) {
    const img = assets[def.file];
    const h = targetH * scale * (def.scale || 1);
    const aspect = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.62;
    const w = h * aspect;
    const y = floorY - h;

    ctx.save();
    if (kind === 'boss') {
      const pulse = 0.5 + Math.sin(state.t * 14) * 0.5;
      ctx.shadowColor = 'rgba(255,0,0,0.85)';
      ctx.shadowBlur = 24 + pulse * 16;
    }

    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, x - w / 2, y, w, h);
    } else {
      drawFallbackCharacter(def.name, x, y, w, h, kind);
    }
    ctx.restore();
  }

  function drawFallbackCharacter(name, x, y, w, h, kind) {
    ctx.save();
    ctx.fillStyle = kind === 'person' ? '#fffdf6' : '#111';
    ctx.strokeStyle = kind === 'person' ? '#111' : '#fffdf6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.43, w * 0.38, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + h * 0.14, w * 0.23, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = kind === 'person' ? '#111' : '#fffdf6';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name.slice(0, 4), x, y + h * 0.54);
    ctx.restore();
  }

  function drawDoorTalismans() {
    const c = state.content;
    if (!c || !c.talismans || !c.talismans.length) return;
    const d = actualDoorRect();
    c.talismans.forEach(t => {
      const age = state.t - (t.born || state.t);
      let alpha = 1;
      if (state.mode === 'sealSuccess' && age > 0.15) {
        alpha = clamp(1 - state.sealFlash / 0.72, 0, 1);
      }
      drawSealPaper(d.x + d.w * t.rx, d.y + d.h * t.ry, d.w * 0.25 * t.scale, d.h * 0.118 * t.scale, t.rot, alpha);
    });
  }

  function drawSealPaper(x, y, w, h, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    const ww = Math.max(w * 0.72, 34);
    const hh = Math.max(h * 1.12, 72);
    ctx.fillStyle = '#f7d85a';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    roundRect(-ww / 2, -hh / 2, ww, hh, 5, true, true, 3);
    ctx.strokeStyle = '#b11616';
    ctx.lineWidth = 2;
    roundRect(-ww / 2 + 5, -hh / 2 + 6, ww - 10, hh - 12, 3, false, true, 2);
    ctx.fillStyle = '#b11616';
    ctx.font = `900 ${Math.max(18, ww * 0.48)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('封', 0, -hh * 0.20);
    ctx.font = `900 ${Math.max(14, ww * 0.36)}px serif`;
    ctx.fillText('印', 0, hh * 0.18);
    ctx.restore();
  }

  function drawSealSuccessGlow() {
    if (state.mode !== 'sealSuccess') return;
    const l = state.layout;
    const alpha = clamp(1 - state.sealFlash / 0.72, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = '#ffe243';
    ctx.lineWidth = 12;
    roundRect(l.bigHole.x - 8, l.bigHole.y - 8, l.bigHole.w + 16, l.bigHole.h + 16, 18, false, true, 12);
    ctx.globalAlpha = alpha * 0.32;
    ctx.fillStyle = '#ffe243';
    ctx.fillRect(l.bigHole.x - 24, l.bigHole.y - 24, l.bigHole.w + 48, l.bigHole.h + 48);
    ctx.restore();
  }

  function drawDangerVignette() {
    if (state.danger <= 0.02 || state.mode !== 'normal') return;
    const l = state.layout;
    ctx.save();
    ctx.globalAlpha = clamp(state.danger, 0, 1) * 0.38;
    const g = ctx.createRadialGradient(l.w / 2, l.h / 2, l.w * 0.15, l.w / 2, l.h / 2, l.w * 0.72);
    g.addColorStop(0, 'rgba(255,0,0,0)');
    g.addColorStop(1, 'rgba(255,0,0,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, l.topH, l.w, l.h - l.topH);
    ctx.restore();
  }

  function drawTopUI() {
    const l = state.layout;
    const prog = currentStageProgress();
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, l.w, l.topH);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, l.topH - 2);
    ctx.lineTo(l.w, l.topH - 2);
    ctx.stroke();

    drawMiniButton(l.home, ui('主页', 'Home'));
    drawMiniButton(l.galleryButton, ui('图鉴', 'Archive'));

    ctx.fillStyle = '#111';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '900 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(ui(`第 ${state.room} 间`, `Room ${state.room}`), 86, 20);
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    const diff = state.difficulty === 'easy' ? ui('简单', 'Easy') : ui('困难', 'Hard');
    ctx.fillText(ui(`难度 ${diff}  最高 ${state.save.bestRoom || 1}`, `${diff}  Best ${state.save.bestRoom || 1}`), 86, 40);
    ctx.fillText(ui(`进度 ${prog.index}/25  Boss：${prog.boss.name}`, `Progress ${prog.index}/25  Boss: ${displayName(prog.boss)}`), 86, 58);

    const barX = 86;
    const barY = l.topH - 13;
    const barW = Math.max(80, l.w - 188);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    roundRect(barX, barY, barW, 6, 3, true, true, 2);
    ctx.fillStyle = '#111';
    roundRect(barX, barY, barW * prog.ratio, 6, 3, true, false, 0);

    ctx.textAlign = 'right';
    ctx.font = '700 10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#111';
    ctx.fillText(collectCountText(), l.w - 10, 61);
    if (state.ghostEye > 0) {
      ctx.font = '800 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(ui(`鬼眼 ${Math.ceil(state.ghostEye)}s`, `Eye ${Math.ceil(state.ghostEye)}s`), l.w - 10, l.topH - 16);
    }

    if (state.mode === 'bossFight' && state.content && state.content.type === 'boss') {
      drawBossHPBar();
    }
    ctx.restore();
  }

  function drawBossHPBar() {
    const l = state.layout;
    const c = state.content;
    const ratio = clamp(1 - c.hits / c.cfg.seals, 0, 1);
    const x = 86;
    const y = l.topH - 24;
    const w = l.w - 172;
    const h = 9;
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 4, true, true, 2);
    ctx.fillStyle = ratio < 0.3 ? '#ff3b20' : '#111';
    roundRect(x, y, w * ratio, h, 4, true, false, 0);
    ctx.restore();
  }

  function drawBottomControls() {
    const l = state.layout;
    if (state.mode === 'transition' || state.mode === 'sealSuccess' || state.mode === 'personFade') return;

    if (state.mode === 'bossFight') {
      drawBossSealButton(l.bossButton);
      return;
    }

    drawSealButton(l.sealButton);
  }

  function drawSealButton(r) {
    const img = assets['封印按钮.png'];
    ctx.save();
    if (img && img.complete && img.naturalWidth) {
      const aspect = img.naturalWidth / img.naturalHeight;
      let drawH = r.h;
      let drawW = drawH * aspect;
      if (drawW > r.w) {
        drawW = r.w;
        drawH = drawW / aspect;
      }
      const x = r.x + (r.w - drawW) / 2;
      const y = r.y + (r.h - drawH) / 2;
      ctx.drawImage(img, x, y, drawW, drawH);
    } else {
      ctx.fillStyle = '#fff06d';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 4;
      roundRect(r.x, r.y, r.w, r.h, 15, true, true, 4);
      ctx.fillStyle = '#111';
      ctx.font = '900 25px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('封 印', r.x + r.w / 2, r.y + r.h / 2);
    }
    ctx.restore();
  }

  function drawBossSealButton(r) {
    ctx.save();
    const beat = 1 + Math.sin(state.t * 18) * 0.025;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(beat, beat);
    const rr = { x: -r.w / 2, y: -r.h / 2, w: r.w, h: r.h };
    ctx.fillStyle = '#fff06d';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    roundRect(rr.x, rr.y, rr.w, rr.h, 18, true, true, 5);
    ctx.fillStyle = '#111';
    ctx.font = '900 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ui('疯狂贴封印！', 'Seal Fast!'), 0, 0);
    ctx.restore();
  }

  function drawGhostEyeFx() {
    if (state.eyeFx <= 0) return;
    const l = state.layout;
    const p = clamp(state.eyeFx / 1.05, 0, 1);
    ctx.save();
    ctx.globalAlpha = p * 0.85;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(0, l.topH, l.w, l.h - l.topH);
    ctx.translate(l.w / 2, l.topH + (l.h - l.topH) * 0.42);
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-86, 0);
    ctx.quadraticCurveTo(0, -52, 86, 0);
    ctx.quadraticCurveTo(0, 52, -86, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fill();
    ctx.restore();
  }

  function drawToast() {
    if (!state.toast) return;
    const l = state.layout;
    ctx.save();
    ctx.globalAlpha = clamp(state.toast.time, 0, 1);
    ctx.fillStyle = '#111';
    ctx.strokeStyle = '#fffdf6';
    ctx.lineWidth = 3;
    const w = Math.min(l.w * 0.78, 300);
    const h = 42;
    const x = (l.w - w) / 2;
    const y = l.topH + 12;
    roundRect(x, y, w, h, 18, true, true, 3);
    ctx.fillStyle = '#fffdf6';
    ctx.font = '800 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(toastText(state.toast.text), l.w / 2, y + h / 2);
    ctx.restore();
  }

  function drawDoodleBackground() {
    const l = state.layout;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, l.w, l.h);
    ctx.restore();
  }

  function drawHomeGhostFires() {
    const l = state.layout;
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const baseX = (0.08 + (i % 5) * 0.21) * l.w;
      const baseY = (0.14 + Math.floor(i / 5) * 0.55 + (i % 2) * 0.08) * l.h;
      const x = baseX + Math.sin(state.t * (0.8 + i * 0.06) + i) * 16;
      const y = baseY + Math.cos(state.t * (1.0 + i * 0.08) + i * 1.7) * 18;
      const size = Math.max(34, Math.min(58, l.w * (0.09 + (i % 3) * 0.012)));
      const img = assets[GHOST_FIRE_FILES[i % GHOST_FIRE_FILES.length]];
      ctx.globalAlpha = 0.34 + Math.sin(state.t * 2 + i) * 0.08;
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, x - size / 2, y - size * 0.65, size, size * 1.28);
      } else {
        drawCodeGhostFire(x, y, size, 0.8);
      }
    }
    ctx.restore();
  }

  function drawTitleBlock(title, sub) {
    const l = state.layout;
    ctx.save();
    ctx.fillStyle = '#fffdf6';
    roundRect(l.w * 0.08, l.h * 0.18, l.w * 0.84, 104, 22, true, true, 5);
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.font = '900 34px system-ui, -apple-system, sans-serif';
    ctx.fillText(title, l.w / 2, l.h * 0.18 + 45);
    ctx.font = '700 14px system-ui, -apple-system, sans-serif';
    ctx.fillText(sub, l.w / 2, l.h * 0.18 + 76);
    ctx.restore();
  }

  function drawBackButton() {
    const label = state.screen === 'gallery' && state.lastScreen === 'game'
      ? ui('返回游戏', 'Back')
      : ui('返回', 'Back');
    drawMiniButton({ x: 16, y: 18, w: 70, h: 40 }, label);
  }

  function drawMiniButton(r, text) {
    ctx.save();
    ctx.fillStyle = '#fffdf6';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    roundRect(r.x, r.y, r.w, r.h, 12, true, true, 3);
    ctx.fillStyle = '#111';
    ctx.font = '800 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
    ctx.restore();
  }

  function drawUIButton(r, title, sub = '') {
    ctx.save();
    ctx.fillStyle = '#fffdf6';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    roundRect(r.x, r.y, r.w, r.h, 18, true, true, 5);
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = sub ? '900 22px system-ui, -apple-system, sans-serif' : '900 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(title, r.x + r.w / 2, r.y + r.h / 2 - (sub ? 10 : 0));
    if (sub) {
      ctx.font = '700 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(sub, r.x + r.w / 2, r.y + r.h / 2 + 18);
    }
    ctx.restore();
  }

  function drawTab(r, text, active) {
    ctx.save();
    ctx.fillStyle = active ? '#111' : '#fffdf6';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    roundRect(r.x, r.y, r.w, r.h, 13, true, true, 3);
    ctx.fillStyle = active ? '#fffdf6' : '#111';
    ctx.font = '800 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
    ctx.restore();
  }

  function drawGalleryCard(r, item, seen) {
    ctx.save();
    ctx.fillStyle = '#fffdf6';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    roundRect(r.x, r.y, r.w, r.h, 16, true, true, 3);
    const imageBox = { x: r.x + 6, y: r.y + 6, w: r.w - 12, h: r.h - (isEn() ? 78 : 66) };
    ctx.beginPath();
    ctx.rect(imageBox.x, imageBox.y, imageBox.w, imageBox.h);
    ctx.clip();
    if (seen) {
      drawCardImage(item, imageBox, false);
    } else {
      drawUnknownEgg(imageBox, r.w);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x + 6, r.y + r.h - (isEn() ? 72 : 58), r.w - 12, isEn() ? 68 : 54);
    ctx.clip();
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '800 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(seen ? displayName(item) : ui('？？？', '???'), r.x + r.w / 2, r.y + r.h - (isEn() ? 70 : 56));
    ctx.font = `${isEn() ? 9.5 : 10}px system-ui, -apple-system, sans-serif`;
    const desc = seen ? displayDesc(item) : ui('尚未记录', 'Not recorded yet');
    wrapText(desc, r.x + r.w / 2, r.y + r.h - (isEn() ? 52 : 38), r.w - 14, isEn() ? 11 : 12, 'center');
    ctx.restore();
  }

  function drawUnknownEgg(box, cardW) {
    ctx.save();
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h * 0.52;
    const rx = Math.min(box.w * 0.24, box.h * 0.28);
    const ry = Math.min(box.h * 0.32, box.w * 0.38);
    ctx.fillStyle = '#111';
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `900 ${Math.max(24, cardW * 0.30)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fffdf6';
    ctx.fillStyle = '#111';
    ctx.strokeText('?', cx, cy);
    ctx.fillText('?', cx, cy);
    ctx.restore();
  }

  function drawCardImage(item, box, silhouette) {
    const img = assets[item.file];
    if (img && img.complete && img.naturalWidth) {
      const aspect = img.naturalWidth / img.naturalHeight;
      let drawH = box.h * 0.96;
      let drawW = drawH * aspect;
      if (drawW > box.w * 0.95) {
        drawW = box.w * 0.95;
        drawH = drawW / aspect;
      }
      const x = box.x + box.w / 2 - drawW / 2;
      const y = box.y + box.h - drawH;
      if (silhouette) {
        drawSilhouetteImage(img, x, y, drawW, drawH);
      } else {
        ctx.drawImage(img, x, y, drawW, drawH);
      }
    } else {
      ctx.save();
      if (silhouette) ctx.globalAlpha = 0.9;
      drawFallbackCharacter(item.name, box.x + box.w / 2, box.y + box.h * 0.08, box.w * 0.56, box.h * 0.86, state.galleryTab === 'people' ? 'person' : 'ghost');
      ctx.restore();
    }
  }

  function drawSilhouetteImage(img, x, y, w, h) {
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(w));
    off.height = Math.max(1, Math.round(h));
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.clearRect(0, 0, off.width, off.height);
    octx.drawImage(img, 0, 0, off.width, off.height);

    const frame = octx.getImageData(0, 0, off.width, off.height);
    const d = frame.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      if (a < 16) {
        d[i + 3] = 0;
        continue;
      }
      const maxc = Math.max(r, g, b);
      const minc = Math.min(r, g, b);
      const isGreenScreen = g > 90 && g > r * 1.18 && g > b * 1.12 && (maxc - minc) > 18;
      if (isGreenScreen) {
        d[i + 3] = 0;
      } else {
        d[i] = 17;
        d[i + 1] = 17;
        d[i + 2] = 17;
        d[i + 3] = 255;
      }
    }
    octx.putImageData(frame, 0, 0);
    ctx.drawImage(off, x, y, w, h);
  }

  function drawTextPanel(lines, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = '#fffdf6';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    roundRect(x, y, w, h, 18, true, true, 4);
    ctx.fillStyle = '#111';
    ctx.font = '700 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let yy = y + 22;
    lines.forEach(line => {
      yy = wrapText(line, x + 18, yy, w - 36, 22, 'left') + 6;
    });
    ctx.restore();
  }

  function drawScrollableTextPanel(lines, r, scroll) {
    ctx.save();
    ctx.fillStyle = '#fffdf6';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    roundRect(r.x, r.y, r.w, r.h, 18, true, true, 4);
    ctx.beginPath();
    ctx.rect(r.x + 12, r.y + 14, r.w - 28, r.h - 28);
    ctx.clip();
    ctx.fillStyle = '#111';
    ctx.font = `${isEn() ? 12 : 14}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lineH = isEn() ? 17 : 22;
    let yy = r.y + 20 - scroll;
    lines.forEach(line => {
      yy = wrapText(line, r.x + 18, yy, r.w - 42, lineH, 'left') + 7;
    });
    ctx.restore();

    const maxScroll = maxRulesScroll();
    if (maxScroll > 0) {
      const trackH = r.h - 30;
      const thumbH = Math.max(32, trackH * ((r.h - 42) / ((r.h - 42) + maxScroll)));
      const thumbY = r.y + 15 + (trackH - thumbH) * (scroll / maxScroll);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      roundRect(r.x + r.w - 11, r.y + 15, 4, trackH, 2, true, false, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(r.x + r.w - 12, thumbY, 6, thumbH, 3, true, false, 0);
      ctx.restore();
    }
  }

  function measureLinesHeight(lines, maxWidth, lineHeight, gap = 0) {
    let total = 0;
    lines.forEach(line => {
      total += countWrappedLines(line, maxWidth) * lineHeight + gap;
    });
    return total;
  }

  function countWrappedLines(text, maxWidth) {
    const tokens = textTokens(text);
    let line = '';
    let count = 1;
    tokens.forEach(token => {
      const test = line + token;
      if (ctx.measureText(test).width > maxWidth && line.trim()) {
        line = token.trimStart ? token.trimStart() : token;
        count += 1;
      } else {
        line = test;
      }
    });
    return count;
  }

  function collectCountText() {
    return `${seenGhostCount() + seenPeopleCount()}/${GHOSTS.length + PEOPLE.length}`;
  }
  function seenGhostCount() { return GHOSTS.filter(g => state.save.ghosts[g.name]).length; }
  function seenPeopleCount() { return PEOPLE.filter(p => state.save.people[p.name]).length; }

  function textTokens(text) {
    const s = String(text);
    if (/[A-Za-z]/.test(s) && /\s/.test(s)) {
      return s.split(/(\s+)/).filter(Boolean);
    }
    return s.split('');
  }

  function wrapText(text, x, y, maxWidth, lineHeight, align = 'left') {
    ctx.save();
    ctx.textAlign = align;
    const tokens = textTokens(text);
    let line = '';
    let yy = y;
    for (let i = 0; i < tokens.length; i++) {
      const test = line + tokens[i];
      if (ctx.measureText(test).width > maxWidth && line.trim()) {
        ctx.fillText(line.trimEnd ? line.trimEnd() : line, x, yy);
        line = tokens[i].trimStart ? tokens[i].trimStart() : tokens[i];
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line.trimEnd ? line.trimEnd() : line, x, yy);
    ctx.restore();
    return yy + lineHeight;
  }

  function roundRectPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function roundRect(x, y, w, h, r, fill, stroke, lineWidth = 1) {
    roundRectPath(x, y, w, h, r);
    if (fill) ctx.fill();
    if (stroke) {
      const old = ctx.lineWidth;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.lineWidth = old;
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
