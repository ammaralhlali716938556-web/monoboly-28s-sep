/* ========================================================
   TACTILE TOYMORPHISM 3D BOARD GAME ENGINE
   Vanilla Three.js + Skeuomorphic PBR Materials + Juicy FX
   ======================================================== */

// حالة اللعبة
const GameState = {
  coins: 1250,
  diceRemaining: 30,
  maxDice: 30,
  currentTileIndex: 0,
  level: 1,
  exp: 35,
  multiplier: 1,
  isRolling: false,
  soundEnabled: true
};

// بيانات بلاطات اللوح الـ 16
const TILE_DATA = [
  { id: 0,  type: 'go',       name: 'البداية (GO)',     color: 0x10b981, reward: 200, icon: '🏁' },
  { id: 1,  type: 'city',     name: 'حي النخيل',        color: 0x38bdf8, reward: 50,  icon: '🏡' },
  { id: 2,  type: 'city',     name: 'شاطئ المرح',       color: 0x0284c7, reward: 75,  icon: '🏖️' },
  { id: 3,  type: 'tax',      name: 'صيانة المدينة',    color: 0xf43f5e, reward: -50, icon: '🛠️' },
  { id: 4,  type: 'chest',    name: 'صندوق الكنز',      color: 0xf59e0b, reward: 300, icon: '🎁' },
  { id: 5,  type: 'city',     name: 'حي الحلوى',        color: 0xec4899, reward: 80,  icon: '🍭' },
  { id: 6,  type: 'city',     name: 'شارع الزهور',      color: 0xdb2777, reward: 90,  icon: '🌸' },
  { id: 7,  type: 'surprise', name: 'عجلة الحظ',        color: 0x8b5cf6, reward: 150, icon: '🎡' },
  { id: 8,  type: 'park',     name: 'الحديقة المركزية', color: 0x14b8a6, reward: 100, icon: '🌳' },
  { id: 9,  type: 'city',     name: 'ضاحية الغروب',     color: 0xf97316, reward: 110, icon: '🌇' },
  { id: 10, type: 'city',     name: 'حي المرجان',       color: 0xe11d48, reward: 120, icon: '💎' },
  { id: 11, type: 'police',   name: 'مخفر الشرطة',      color: 0x64748b, reward: 0,   icon: '👮' },
  { id: 12, type: 'chance',   name: 'فرصة ذهبية',       color: 0xffbe0b, reward: 250, icon: '⭐' },
  { id: 13, type: 'city',     name: 'حي الألعاب',       color: 0xa855f7, reward: 130, icon: '🕹️' },
  { id: 14, type: 'city',     name: 'القصر الكرتوني',   color: 0x7c3aed, reward: 160, icon: '🏰' },
  { id: 15, type: 'bank',     name: 'البنك المركزي',    color: 0x059669, reward: 180, icon: '🏦' }
];

// هندسة الصوت التوليدي الداخلي (ASMR/Foley Sound Synth)
class SoundManager {
  constructor() { this.ctx = null; }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  playPop() {
    if (!GameState.soundEnabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.08);
  }

  playDiceClack() {
    if (!GameState.soundEnabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.12);
  }

  playCoinChime() {
    if (!GameState.soundEnabled) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + idx * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.25);
    });
  }

  playFanfare() {
    if (!GameState.soundEnabled) return;
    this.init();
    const chord = [440, 554.37, 659.25, 880];
    chord.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.6);
    });
  }
}

const sounds = new SoundManager();

// بناء المشهد ثلاثي الأبعاد
let scene, camera, renderer, pawn, dice;
let tileMeshes = [], windmillProp, clouds = [];

function init3D() {
  const canvas = document.getElementById('webgl-canvas');
  const container = document.getElementById('game-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa7d8ff);
  scene.fog = new THREE.Fog(0xa7d8ff, 32, 58);

  // زاوية كاميرا مصغرة ماكرو (Miniature Tilt-Shift Feel)
  camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 22, 22);
  camera.lookAt(0, -1, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // إضاءة شمس دافئة وإضاءة انعكاسية ناعمة
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x5b7c99, 0.7));
  const sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
  sunLight.position.set(12, 26, 16);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xa5c4ff, 0.4);
  fillLight.position.set(-14, 10, -10);
  scene.add(fillLight);

  buildMiniatureWorld();
  buildBoardTiles();
  buildPawn();
  buildDice();
  buildFloatingClouds();

  window.addEventListener('resize', onWindowResize);
}

// بناء العالم المصغر (الديوراما)
function buildMiniatureWorld() {
  const baseGeo = new THREE.BoxGeometry(16, 1.2, 16);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.4, metalness: 0.05 });
  const boardBase = new THREE.Mesh(baseGeo, baseMat);
  boardBase.position.y = -0.6;
  boardBase.receiveShadow = true;
  scene.add(boardBase);

  const lawnGeo = new THREE.BoxGeometry(9.6, 0.6, 9.6);
  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x70d65b, roughness: 0.6 });
  const lawn = new THREE.Mesh(lawnGeo, lawnMat);
  lawn.position.y = 0.3;
  lawn.receiveShadow = true;
  scene.add(lawn);

  // مبنى المدينة المركزي
  const hall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
  hall.position.set(0, 1.4, 0);
  hall.castShadow = true;
  scene.add(hall);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.5, 4), new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.3 }));
  roof.position.set(0, 3.2, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);

  // الطاحونة الذهبية الدوارة
  windmillProp = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.04), bladeMat);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.04), bladeMat);
  blade2.rotation.z = Math.PI / 2;
  windmillProp.add(blade1, blade2);
  windmillProp.position.set(0, 4.2, 0.1);
  scene.add(windmillProp);

  addCuteTree(-2.8, -2.8); addCuteTree(2.8, -2.8);
  addCuteTree(-2.8, 2.8);  addCuteTree(2.8, 2.8);
}

function addCuteTree(x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 }));
  trunk.position.set(x, 0.7, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65), new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.5 }));
  foliage.position.set(x, 1.4, z);
  foliage.castShadow = true;
  scene.add(foliage);
}

function getTilePosition(index) {
  const step = 2.8, offset = 5.6;
  if (index >= 0 && index <= 4) return { x: -offset + index * step, z: offset };
  if (index >= 4 && index <= 8) return { x: offset, z: offset - (index - 4) * step };
  if (index >= 8 && index <= 12) return { x: offset - (index - 8) * step, z: -offset };
  return { x: -offset, z: -offset + (index - 12) * step };
}

function buildBoardTiles() {
  const tileGeo = new THREE.BoxGeometry(2.5, 0.45, 2.5);
  TILE_DATA.forEach((tileInfo, i) => {
    const pos = getTilePosition(i);
    const tileMat = new THREE.MeshStandardMaterial({ color: tileInfo.color, roughness: 0.25, metalness: 0.1 });
    const tileMesh = new THREE.Mesh(tileGeo, tileMat);
    tileMesh.position.set(pos.x, 0.25, pos.z);
    tileMesh.receiveShadow = true;
    tileMesh.castShadow = true;
    scene.add(tileMesh);

    if (tileInfo.type === 'city') {
      const house = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
      house.position.set(pos.x, 0.75, pos.z);
      house.castShadow = true;
      scene.add(house);
    } else if (tileInfo.type === 'chest' || tileInfo.type === 'chance') {
      const miniBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), new THREE.MeshPhysicalMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 }));
      miniBox.position.set(pos.x, 0.8, pos.z);
      miniBox.castShadow = true;
      scene.add(miniBox);
    }
    tileMeshes.push(tileMesh);
  });
}

// البيدق الذهبي فائق اللمعان (PBR Gold Token)
function buildPawn() {
  pawn = new THREE.Group();
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xffc300,
    metalness: 0.95,
    roughness: 0.16,
    clearcoat: 0.6
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.35, 24), goldMat);
  base.position.y = 0.18; base.castShadow = true;

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 0.8, 24), goldMat);
  waist.position.y = 0.7; waist.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), goldMat);
  head.position.y = 1.65; head.castShadow = true;

  pawn.add(base, waist, head);
  const startPos = getTilePosition(0);
  pawn.position.set(startPos.x, 0.48, startPos.z);
  scene.add(pawn);
}

// النرد البلاستيكي ثلاثي الأبعاد
function createDiceFaceCanvas(number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, 244, 244);
  ctx.fillStyle = (number === 1) ? '#ff2a85' : '#2b2d42';

  const drawPip = (x, y, r = 24) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  const c = 128, l = 68, r = 188, t = 68, b = 188;
  if (number === 1) drawPip(c, c, 36);
  if (number === 2) { drawPip(l, t); drawPip(r, b); }
  if (number === 3) { drawPip(l, t); drawPip(c, c); drawPip(r, b); }
  if (number === 4) { drawPip(l, t); drawPip(r, t); drawPip(l, b); drawPip(r, b); }
  if (number === 5) { drawPip(l, t); drawPip(r, t); drawPip(c, c); drawPip(l, b); drawPip(r, b); }
  if (number === 6) { drawPip(l, t); drawPip(r, t); drawPip(l, c); drawPip(r, c); drawPip(l, b); drawPip(r, b); }
  return new THREE.CanvasTexture(canvas);
}

function buildDice() {
  const materials = [
    new THREE.MeshStandardMaterial({ map: createDiceFaceCanvas(1), roughness: 0.12, metalness: 0.05 }),
    new THREE.MeshStandardMaterial({ map: createDiceFaceCanvas(6), roughness: 0.12, metalness: 0.05 }),
    new THREE.MeshStandardMaterial({ map: createDiceFaceCanvas(2), roughness: 0.12, metalness: 0.05 }),
    new THREE.MeshStandardMaterial({ map: createDiceFaceCanvas(5), roughness: 0.12, metalness: 0.05 }),
    new THREE.MeshStandardMaterial({ map: createDiceFaceCanvas(3), roughness: 0.12, metalness: 0.05 }),
    new THREE.MeshStandardMaterial({ map: createDiceFaceCanvas(4), roughness: 0.12, metalness: 0.05 })
  ];
  dice = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), materials);
  dice.position.set(0, 1.3, 3.4);
  dice.castShadow = true;
  scene.add(dice);
}

function getDiceRotationForNumber(num) {
  switch(num) {
    case 1: return { x: 0, y: 0, z: Math.PI / 2 };
    case 6: return { x: 0, y: 0, z: -Math.PI / 2 };
    case 2: return { x: 0, y: 0, z: 0 };
    case 5: return { x: Math.PI, y: 0, z: 0 };
    case 3: return { x: -Math.PI / 2, y: 0, z: 0 };
    case 4: return { x: Math.PI / 2, y: 0, z: 0 };
    default: return { x: 0, y: 0, z: 0 };
  }
}

function buildFloatingClouds() {
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.88 });
  for (let i = 0; i < 4; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.4), cloudMat);
      puff.position.x = j * 0.7; cloud.add(puff);
    }
    cloud.position.set((Math.random() - 0.5) * 26, 8 + Math.random() * 3, (Math.random() - 0.5) * 26);
    clouds.push(cloud); scene.add(cloud);
  }
}

// تدحرج النرد وقفز البيدق
function rollDiceAction() {
  if (GameState.isRolling) return;
  if (GameState.diceRemaining <= 0) {
    showFloatingMsg("نفد النرد! انتظر تعبئته.");
    return;
  }

  GameState.isRolling = true;
  GameState.diceRemaining--;
  updateUI();

  sounds.playPop();
  const rollBtn = document.getElementById('roll-btn');
  rollBtn.classList.add('pressing');
  setTimeout(() => rollBtn.classList.remove('pressing'), 200);

  const rollResult = Math.floor(Math.random() * 6) + 1;
  animateDiceRoll(rollResult, () => {
    hopPawnSteps(rollResult);
  });
}

function animateDiceRoll(targetNumber, onComplete) {
  const duration = 1200;
  const startTime = performance.now();
  const targetRot = getDiceRotationForNumber(targetNumber);
  const startY = 1.3, peakY = 5.0;
  const extraRotX = (Math.floor(Math.random() * 3) + 3) * Math.PI * 2;
  const extraRotY = (Math.floor(Math.random() * 3) + 3) * Math.PI * 2;

  function updateDiceAnim(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    if (progress < 0.7) {
      const p = progress / 0.7;
      dice.position.y = startY + Math.sin(p * Math.PI) * (peakY - startY);
    } else {
      const p = (progress - 0.7) / 0.3;
      dice.position.y = startY + Math.abs(Math.sin(p * Math.PI * 2)) * 0.6 * (1 - p);
    }

    dice.rotation.x = THREE.MathUtils.lerp(0, targetRot.x + extraRotX, 1 - Math.pow(1 - progress, 3));
    dice.rotation.y = THREE.MathUtils.lerp(0, targetRot.y + extraRotY, 1 - Math.pow(1 - progress, 3));
    dice.rotation.z = THREE.MathUtils.lerp(0, targetRot.z, 1 - Math.pow(1 - progress, 3));

    if (progress < 1) {
      requestAnimationFrame(updateDiceAnim);
    } else {
      dice.rotation.set(targetRot.x, targetRot.y, targetRot.z);
      dice.position.y = startY;
      sounds.playDiceClack();
      onComplete();
    }
  }
  requestAnimationFrame(updateDiceAnim);
}

// قفز البيدق مع تأثير الـ Squash and Stretch الكرتوني
function hopPawnSteps(stepsRemaining) {
  if (stepsRemaining <= 0) {
    handleTileLanding();
    return;
  }

  const fromIndex = GameState.currentTileIndex;
  const toIndex = (fromIndex + 1) % TILE_DATA.length;
  GameState.currentTileIndex = toIndex;

  const startPos = getTilePosition(fromIndex);
  const endPos = getTilePosition(toIndex);
  const hopDuration = 220;
  const startTime = performance.now();
  sounds.playPop();

  function animHop(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / hopDuration, 1);

    pawn.position.x = THREE.MathUtils.lerp(startPos.x, endPos.x, t);
    pawn.position.z = THREE.MathUtils.lerp(startPos.z, endPos.z, t);
    pawn.position.y = 0.48 + Math.sin(t * Math.PI) * 1.3;

    // الانضغاط والاستطالة
    if (t < 0.5) {
      pawn.scale.set(0.85, 1.25, 0.85); // استطالة صعوداً
    } else {
      pawn.scale.set(1.2, 0.75, 1.2);   // انضغاط عند الهبوط
    }

    if (t < 1) {
      requestAnimationFrame(animHop);
    } else {
      pawn.position.set(endPos.x, 0.48, endPos.z);
      pawn.scale.set(1, 1, 1);
      setTimeout(() => hopPawnSteps(stepsRemaining - 1), 60);
    }
  }
  requestAnimationFrame(animHop);
}

function handleTileLanding() {
  const currentTile = TILE_DATA[GameState.currentTileIndex];
  const reward = currentTile.reward * GameState.multiplier;

  if (currentTile.type === 'chest' || currentTile.type === 'chance' || currentTile.type === 'go') {
    sounds.playFanfare();
    if (typeof confetti === 'function') confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    showEventModal(currentTile.icon, currentTile.name, `وصلت إلى ${currentTile.name}!`, `+${reward} 🪙`);
  } else {
    sounds.playCoinChime();
    showFloatingMsg(`+${reward} 🪙`);
    GameState.coins += reward;
    GameState.exp += 15;
    if (GameState.exp >= 100) {
      GameState.level++; GameState.exp = 0;
      showFloatingMsg(`ترقية مستوى! Lvl ${GameState.level} 🌟`);
    }
    updateUI();
    GameState.isRolling = false;
  }
}

function updateUI() {
  document.getElementById('coin-display').textContent = GameState.coins.toLocaleString('en-US');
  document.getElementById('dice-count-display').textContent = `${GameState.diceRemaining} / ${GameState.maxDice}`;
  document.getElementById('level-display').textContent = GameState.level;
  document.getElementById('exp-bar').style.width = `${GameState.exp}%`;
}

function showFloatingMsg(text) {
  const msgEl = document.getElementById('floating-msg');
  msgEl.textContent = text;
  msgEl.classList.remove('hidden');
  msgEl.style.animation = 'none';
  msgEl.offsetHeight;
  msgEl.style.animation = null;
  setTimeout(() => msgEl.classList.add('hidden'), 1200);
}

function showEventModal(icon, title, desc, reward) {
  document.getElementById('modal-icon').textContent = icon;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-desc').textContent = desc;
  document.getElementById('modal-reward').textContent = reward;
  document.getElementById('event-modal').classList.remove('hidden');
}

function onWindowResize() {
  const container = document.getElementById('game-container');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function setupEventListeners() {
  document.getElementById('roll-btn').addEventListener('click', rollDiceAction);
  document.getElementById('modal-claim-btn').addEventListener('click', () => {
    sounds.playCoinChime();
    const currentTile = TILE_DATA[GameState.currentTileIndex];
    GameState.coins += currentTile.reward * GameState.multiplier;
    updateUI();
    document.getElementById('event-modal').classList.add('hidden');
    GameState.isRolling = false;
  });

  document.getElementById('multiplier-btn').addEventListener('click', () => {
    sounds.playPop();
    const multipliers = [1, 2, 3, 5];
    const nextIdx = (multipliers.indexOf(GameState.multiplier) + 1) % multipliers.length;
    GameState.multiplier = multipliers[nextIdx];
    document.getElementById('multiplier-btn').querySelector('span').textContent = `x${GameState.multiplier}`;
  });

  document.getElementById('sound-btn').addEventListener('click', () => {
    GameState.soundEnabled = !GameState.soundEnabled;
    document.getElementById('sound-icon').textContent = GameState.soundEnabled ? '🔊' : '🔇';
    if (GameState.soundEnabled) sounds.playPop();
  });
}

function animate(time) {
  requestAnimationFrame(animate);
  if (windmillProp) windmillProp.rotation.z += 0.015;
  clouds.forEach((cloud, idx) => {
    cloud.position.x += 0.005;
    cloud.position.y += Math.sin(time * 0.001 + idx) * 0.002;
    if (cloud.position.x > 18) cloud.position.x = -18;
  });
  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', () => {
  init3D();
  setupEventListeners();
  updateUI();
  animate(0);
});
