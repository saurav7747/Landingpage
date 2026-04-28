/* ═══════════════════════════════════════════════════════
   NEXUS TANK ARENA — script.js
   Complete: Firebase Auth, Lobby, Garage, Game Engine
═══════════════════════════════════════════════════════ */
'use strict';

// ──────────────────────────────────────────────────────
// 1. FIREBASE
// ──────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCTTJWfGNmA73ifwfhUpHR8xXxoZrTdmLs",
  authDomain: "chatting-2d60f.firebaseapp.com",
  databaseURL: "https://chatting-2d60f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chatting-2d60f",
  storageBucket: "chatting-2d60f.firebasestorage.app",
  messagingSenderId: "823509247651",
  appId: "1:823509247651:web:ce83a1199c7791c9870116"
};

let auth = null, db = null, currentUser = null;

// Default player profile
const defaultProfile = {
  username: 'Commander', coins: 500, level: 1, wins: 0,
  selectedTank: 0, selectedSkin: '#00aaff',
  upgrades: { damage: 1, armor: 1, speed: 1, reload: 1 }
};

let profile = { ...defaultProfile };

function initFirebase() {
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db   = firebase.database();
    // Auto-login listener
    auth.onAuthStateChanged(user => {
      if (user) { currentUser = user; loadProfile(user.uid, () => showLobby()); }
    });
  } catch (e) { console.warn('Firebase unavailable, offline mode'); }
}

function loadProfile(uid, cb) {
  if (!db) { if (cb) cb(); return; }
  db.ref(`tanks_players/${uid}`).once('value').then(snap => {
    if (snap.exists()) Object.assign(profile, snap.val());
    else db.ref(`tanks_players/${uid}`).set(profile);
    if (cb) cb();
  }).catch(() => { if (cb) cb(); });
}

function saveProfile() {
  if (!db || !currentUser) return;
  db.ref(`tanks_players/${currentUser.uid}`).update(profile).catch(() => {});
}

// ──────────────────────────────────────────────────────
// 2. SCREEN MANAGER
// ──────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
    s.style.opacity = '0';
  });
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transition = 'opacity .4s ease';
    el.classList.add('active');
  });
}

// ──────────────────────────────────────────────────────
// 3. TOAST
// ──────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2500);
}

// ──────────────────────────────────────────────────────
// 4. PARTICLE SPAWNER
// ──────────────────────────────────────────────────────
function spawnParticles(containerId, n, colors) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const sz = Math.random() * 4 + 1;
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;background:${colors[i%colors.length]};animation-duration:${Math.random()*8+5}s;animation-delay:${Math.random()*6}s;opacity:0;`;
    c.appendChild(p);
  }
}

// ──────────────────────────────────────────────────────
// 5. INTRO
// ──────────────────────────────────────────────────────
function runIntro() {
  // Animated star field on intro canvas
  const canvas = document.getElementById('introCanvas');
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const stars = Array.from({length:80}, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + .3, v: Math.random() * .3 + .05
    }));
    let af;
    function drawStars() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = 'rgba(0,229,255,.5)';
      stars.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
        s.y -= s.v; if (s.y < 0) { s.y = canvas.height; s.x = Math.random()*canvas.width; }
      });
      af = requestAnimationFrame(drawStars);
    }
    drawStars();
    setTimeout(() => cancelAnimationFrame(af), 2500);
  }

  // Progress bar
  const fill = document.getElementById('introFill');
  let p = 0;
  const iv = setInterval(() => {
    p += Math.random() * 15 + 5;
    if (p >= 100) { p = 100; clearInterval(iv); }
    if (fill) fill.style.width = p + '%';
  }, 100);

  // After 2s show login or auto-auth handles it
  setTimeout(() => {
    if (!currentUser) showLoginScreen();
  }, 2000);
}

// ──────────────────────────────────────────────────────
// 6. LOGIN SCREEN
// ──────────────────────────────────────────────────────
function showLoginScreen() {
  showScreen('screen-login');
  // Animated background
  const canvas = document.getElementById('loginBg');
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    function drawLoginBg() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const g = ctx.createRadialGradient(canvas.width/2, canvas.height, 0, canvas.width/2, canvas.height, canvas.height);
      g.addColorStop(0, 'rgba(0,60,120,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
      // Hex grid
      ctx.strokeStyle = `rgba(0,229,255,${.03 + Math.sin(frame*.02)*.01})`;
      ctx.lineWidth = 1;
      const sz = 35;
      for (let row = 0; row < 20; row++) {
        for (let col = 0; col < 15; col++) {
          const x = col * sz * 1.5 + (row%2)*sz*.75;
          const y = row * sz * .866;
          ctx.beginPath();
          for (let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(x+sz*.5*Math.cos(a),y+sz*.5*Math.sin(a));}
          ctx.closePath(); ctx.stroke();
        }
      }
      frame++;
      if (document.getElementById('screen-login').classList.contains('active'))
        requestAnimationFrame(drawLoginBg);
    }
    drawLoginBg();
  }

  // Toggle forms
  document.getElementById('btnGoReg')?.addEventListener('click', () => {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('regForm').classList.remove('hidden');
  });
  document.getElementById('btnGoLogin')?.addEventListener('click', () => {
    document.getElementById('regForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
  });

  // Login
  document.getElementById('btnLogin')?.addEventListener('click', () => {
    const email = document.getElementById('inEmail')?.value.trim();
    const pass  = document.getElementById('inPass')?.value;
    const err   = document.getElementById('loginErr');
    if (!email || !pass) { if(err) err.textContent = 'Please fill all fields'; return; }
    if (!auth) { guestLogin(); return; }
    auth.signInWithEmailAndPassword(email, pass).then(cred => {
      currentUser = cred.user;
      loadProfile(cred.user.uid, () => showLobby());
    }).catch(e => { if(err) err.textContent = e.message; });
  });

  // Register
  document.getElementById('btnReg')?.addEventListener('click', () => {
    const uname = document.getElementById('inUname')?.value.trim();
    const email = document.getElementById('inRegEmail')?.value.trim();
    const pass  = document.getElementById('inRegPass')?.value;
    const err   = document.getElementById('regErr');
    if (!uname || !email || !pass) { if(err) err.textContent = 'Please fill all fields'; return; }
    if (pass.length < 6) { if(err) err.textContent = 'Password must be 6+ characters'; return; }
    if (!auth) { profile.username = uname; guestLogin(); return; }
    auth.createUserWithEmailAndPassword(email, pass).then(cred => {
      currentUser = cred.user;
      profile = { ...defaultProfile, username: uname };
      saveProfile();
      showLobby();
    }).catch(e => { if(err) err.textContent = e.message; });
  });

  // Guest
  document.getElementById('btnGuest')?.addEventListener('click', guestLogin);
}

function guestLogin() {
  profile = { ...defaultProfile, username: 'Guest_' + Math.floor(Math.random()*9999) };
  if (auth) {
    auth.signInAnonymously().then(cred => { currentUser = cred.user; saveProfile(); }).catch(() => {});
  }
  showLobby();
}

// ──────────────────────────────────────────────────────
// 7. LOBBY
// ──────────────────────────────────────────────────────
function showLobby() {
  showScreen('screen-lobby');
  spawnParticles('lobbyPart', 20, ['rgba(0,229,255,.5)','rgba(255,109,0,.5)','rgba(255,255,255,.2)']);
  updateLobbyHUD();
  drawShowroom();
  setupLobbyButtons();
}

function updateLobbyHUD() {
  setText('lobUser', profile.username);
  setText('lobLvl', profile.level);
  setText('lobCoins', profile.coins);
  setText('lobWins', profile.wins);
  setText('lobTankName', `NEXUS MK-${['I','II','III','IV','V'][profile.selectedTank] || 'I'}`);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// Draw rotating tank in showroom
let showroomAngle = 0, showroomAF = null;
function drawShowroom() {
  const canvas = document.getElementById('srCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  cancelAnimationFrame(showroomAF);
  function loop() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(showroomAngle);
    drawTankTopView(ctx, 0, 0, 1.0, profile.selectedSkin, showroomAngle, 'idle');
    ctx.restore();
    showroomAngle += 0.008;
    if (document.getElementById('screen-lobby').classList.contains('active'))
      showroomAF = requestAnimationFrame(loop);
  }
  loop();
}

function setupLobbyButtons() {
  // One-time binding (clone to remove old listeners)
  bindBtn('btnGarage',   () => showGarage());
  bindBtn('btnTanks',    () => showToast('Tank selection coming soon!'));
  bindBtn('btnMissions', () => showToast('Missions coming soon!'));
  bindBtn('btnAddFr',    () => showToast('Friend system coming soon!'));
  bindBtn('btnInvite',   () => showToast('Invite coming soon!'));
  bindBtn('btnMode',     () => showToast('More modes coming soon!'));
  bindBtn('btnBattle',   () => startLoadingAndBattle());
  bindBtn('btnLobSet',   () => document.getElementById('ovLobSet')?.classList.remove('hidden'));
  bindBtn('lsClose',     () => document.getElementById('ovLobSet')?.classList.add('hidden'));
  bindBtn('lsLogout',    () => { document.getElementById('ovLobSet')?.classList.add('hidden'); logout(); });
}

function bindBtn(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  const fresh = el.cloneNode(true);
  el.parentNode.replaceChild(fresh, el);
  document.getElementById(id)?.addEventListener('click', fn);
}

function logout() {
  if (auth) auth.signOut().catch(() => {});
  currentUser = null;
  profile = { ...defaultProfile };
  showLoginScreen();
}

// ──────────────────────────────────────────────────────
// 8. GARAGE
// ──────────────────────────────────────────────────────
const TANK_SKINS = ['#00aaff','#ff6d00','#00ff88','#ff1744','#ffd740','#aa44ff','#ffffff','#888888'];

function showGarage() {
  showScreen('screen-garage');
  cancelAnimationFrame(showroomAF);
  updateGarageHUD();
  drawGarageTank();
  setupGarageButtons();
  buildSkinOptions();
}

function updateGarageHUD() {
  setText('garCoins', profile.coins);
  const u = profile.upgrades;
  const stats = {damage: u.damage, armor: u.armor, speed: u.speed, reload: u.reload};
  Object.entries(stats).forEach(([key, lv]) => {
    const pct = Math.min(lv/10*100, 100) + '%';
    const bar = document.getElementById(`b${key[0].toUpperCase()+key.slice(1,3)}`);
    const lvEl = document.getElementById(`l${key[0].toUpperCase()+key.slice(1,3)}`);
    if (bar) bar.style.width = pct;
    if (lvEl) lvEl.textContent = `Lv${lv}`;
  });
  // Fix ID mapping
  setGarBar('bDmg','lDmg', u.damage);
  setGarBar('bArm','lArm', u.armor);
  setGarBar('bSpd','lSpd', u.speed);
  setGarBar('bRld','lRld', u.reload);
}

function setGarBar(barId, lvId, lv) {
  const bar = document.getElementById(barId);
  const lvEl = document.getElementById(lvId);
  if (bar) bar.style.width = Math.min(lv/10*100, 100) + '%';
  if (lvEl) lvEl.textContent = `Lv${lv}`;
}

function drawGarageTank() {
  const canvas = document.getElementById('garCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(canvas.width/2, canvas.height/2);
  drawTankTopView(ctx, 0, 0, 1.2, profile.selectedSkin, 0, 'idle');
  ctx.restore();
}

function setupGarageButtons() {
  bindBtn('btnGarBack', () => showLobby());

  const upgMap = [
    ['uDmg','damage'], ['uArm','armor'], ['uSpd','speed'], ['uRld','reload']
  ];
  upgMap.forEach(([btnId, stat]) => {
    bindBtn(btnId, () => {
      const cost = 200;
      const lv = profile.upgrades[stat];
      if (lv >= 10) { showToast('Already max level!'); return; }
      if (profile.coins < cost) { showToast('Not enough coins! 🪙'); return; }
      profile.coins -= cost;
      profile.upgrades[stat]++;
      saveProfile();
      updateGarageHUD();
      setText('garCoins', profile.coins);
      showToast(`${stat.toUpperCase()} upgraded to Lv${profile.upgrades[stat]}!`);
    });
  });
}

function buildSkinOptions() {
  const container = document.getElementById('skinOpts');
  if (!container) return;
  container.innerHTML = '';
  TANK_SKINS.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'skin-swatch' + (color === profile.selectedSkin ? ' active' : '');
    sw.style.background = color;
    sw.addEventListener('click', () => {
      profile.selectedSkin = color;
      container.querySelectorAll('.skin-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      drawGarageTank();
      saveProfile();
    });
    container.appendChild(sw);
  });
}

// ──────────────────────────────────────────────────────
// 9. LOADING → BATTLE
// ──────────────────────────────────────────────────────
const TIPS = [
  'TIP: Flank the enemy for bonus damage!',
  'TIP: Use BOOST to escape dangerous situations!',
  'TIP: Upgrade armor to survive longer!',
  'TIP: High-speed builds excel at hit-and-run tactics!',
  'TIP: SKILL fires a powerful burst shot!'
];

function startLoadingAndBattle() {
  showScreen('screen-loading');
  cancelAnimationFrame(showroomAF);
  const tip = document.getElementById('loadingTip');
  if (tip) tip.textContent = TIPS[Math.floor(Math.random()*TIPS.length)];
  const prog = document.getElementById('loadProg');
  let p = 0;
  const iv = setInterval(() => {
    p += Math.random()*10+5;
    if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => initGame(), 300); }
    if (prog) prog.style.width = p + '%';
  }, 100);
}

// ──────────────────────────────────────────────────────
// 10. TANK SPRITE RENDERER (Canvas 2D Top-Down)
// ──────────────────────────────────────────────────────
function drawTankTopView(ctx, x, y, scale, color, angle, state) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, 6*s, 28*s, 10*s, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();

  // Tracks (dark)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.roundRect(-28*s, -22*s, 10*s, 44*s, 4*s); ctx.fill();
  ctx.beginPath(); ctx.roundRect(18*s, -22*s, 10*s, 44*s, 4*s); ctx.fill();

  // Track details
  ctx.fillStyle = '#333';
  for (let i = -20; i < 20; i += 8) {
    ctx.fillRect(-27*s, i*s, 8*s, 4*s);
    ctx.fillRect(19*s, i*s, 8*s, 4*s);
  }

  // Hull
  const hull = ctx.createLinearGradient(-20*s, -18*s, 20*s, 18*s);
  hull.addColorStop(0, lighten(color, 40));
  hull.addColorStop(0.5, color);
  hull.addColorStop(1, darken(color, 40));
  ctx.fillStyle = hull;
  ctx.beginPath(); ctx.roundRect(-18*s, -18*s, 36*s, 36*s, 5*s); ctx.fill();

  // Armor plating detail
  ctx.strokeStyle = darken(color, 60);
  ctx.lineWidth = s;
  ctx.beginPath(); ctx.roundRect(-14*s, -14*s, 28*s, 28*s, 3*s); ctx.stroke();

  // Turret base
  ctx.beginPath();
  ctx.arc(0, 0, 12*s, 0, Math.PI*2);
  ctx.fillStyle = darken(color, 20); ctx.fill();
  ctx.strokeStyle = darken(color, 60); ctx.lineWidth = s; ctx.stroke();

  // Turret
  ctx.beginPath();
  ctx.arc(0, 0, 9*s, 0, Math.PI*2);
  ctx.fillStyle = lighten(color, 20); ctx.fill();

  // Cannon
  ctx.save();
  ctx.fillStyle = darken(color, 50);
  ctx.beginPath(); ctx.roundRect(-3*s, -24*s, 6*s, 22*s, 2*s); ctx.fill();
  // Muzzle
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.roundRect(-2.5*s, -26*s, 5*s, 5*s, 1*s); ctx.fill();
  ctx.restore();

  // Hit state flash
  if (state === 'hit') {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.roundRect(-18*s,-18*s,36*s,36*s,5*s); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Glow aura
  ctx.globalAlpha = 0.12;
  ctx.shadowColor = color; ctx.shadowBlur = 20*s;
  ctx.beginPath(); ctx.roundRect(-20*s,-20*s,40*s,40*s,6*s); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;

  ctx.restore();
}

function lighten(hex, amt) {
  return adjustColor(hex, amt);
}
function darken(hex, amt) {
  return adjustColor(hex, -amt);
}
function adjustColor(hex, amt) {
  let c = hex.replace('#','');
  if (c.length === 3) c = c.split('').map(x=>x+x).join('');
  const r = Math.max(0,Math.min(255,parseInt(c.slice(0,2),16)+amt));
  const g = Math.max(0,Math.min(255,parseInt(c.slice(2,4),16)+amt));
  const b = Math.max(0,Math.min(255,parseInt(c.slice(4,6),16)+amt));
  return `rgb(${r},${g},${b})`;
}

// ──────────────────────────────────────────────────────
// 11. GAME ENGINE
// ──────────────────────────────────────────────────────
let canvas, ctx, gameRunning = false, gamePaused = false;
let animId = null, frameCount = 0;
let gameTimer = 120, timerIv = null;
const WORLD_W = 1200, WORLD_H = 900;

// Camera
const cam = { x: 0, y: 0 };

// Game objects
let player, enemy;
const shells = [], explosions = [], obstacles = [];

// ─── Tank Object ─────────────────────────────────────
class Tank {
  constructor(x, y, color, isPlayer) {
    this.x = x; this.y = y;
    this.color = color;
    this.angle = isPlayer ? 0 : Math.PI;
    this.turretAngle = isPlayer ? 0 : Math.PI;
    this.speed = 0; this.rotSpeed = 0;
    this.hp = 100; this.maxHp = 100;
    this.isPlayer = isPlayer;
    this.w = 56; this.h = 56;
    this.state = 'idle';
    this.stateTimer = 0;
    this.shootCooldown = 0;
    this.boostActive = false; this.boostTimer = 0;
    this.skillCooldown = 0;
    // AI
    this.aiState = 'patrol';
    this.aiTimer = 0;
    this.aiTarget = { x:0, y:0 };
    this.retreatAngle = 0;
  }
  get cx() { return this.x + this.w/2; }
  get cy() { return this.y + this.h/2; }

  get moveSpeed() {
    const base = 2.2 + (profile.upgrades.speed - 1) * 0.2;
    return this.isPlayer ? (this.boostActive ? base*2 : base) : 1.8;
  }
  get damage() {
    return this.isPlayer ? (10 + (profile.upgrades.damage-1)*3) : 10;
  }
  get reloadTime() {
    return this.isPlayer ? Math.max(20, 45 - (profile.upgrades.reload-1)*3) : 50;
  }
  get armor() {
    return this.isPlayer ? (profile.upgrades.armor-1)*0.04 : 0;
  }

  shoot(angleOverride) {
    if (this.shootCooldown > 0) return;
    const a = angleOverride !== undefined ? angleOverride : this.turretAngle;
    shells.push(new Shell(this.cx, this.cy, a, this));
    this.shootCooldown = this.reloadTime;
    spawnMuzzleFlash(this.cx + Math.cos(a)*36, this.cy + Math.sin(a)*36, this.color);
  }

  shootSkill() {
    if (this.skillCooldown > 0 || !this.isPlayer) return;
    // Triple spread shot
    [-0.25, 0, 0.25].forEach(offset => {
      const a = this.turretAngle + offset;
      const sh = new Shell(this.cx, this.cy, a, this);
      sh.isSkill = true; sh.speed = 9; sh.damage = this.damage * 1.8;
      shells.push(sh);
    });
    this.skillCooldown = 180;
    spawnMuzzleFlash(this.cx, this.cy, '#ffd740');
  }

  boost() {
    if (this.boostTimer > 0 || !this.isPlayer) return;
    this.boostActive = true;
    this.boostTimer = 240;
  }

  update() {
    if (this.stateTimer > 0) this.stateTimer--;
    else this.state = 'idle';
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.skillCooldown > 0) this.skillCooldown--;
    if (this.boostTimer > 0) { this.boostTimer--; if(this.boostTimer<=0) this.boostActive=false; }
  }

  takeDamage(dmg) {
    const actual = dmg * (1 - this.armor);
    this.hp = Math.max(0, this.hp - actual);
    this.state = 'hit'; this.stateTimer = 15;
    spawnExplosion(this.cx, this.cy, false);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.angle);
    drawTankTopView(ctx, 0, 0, 1.0, this.color, 0, this.state);
    // Draw turret separately with its own angle
    ctx.rotate(-this.angle + this.turretAngle);
    ctx.fillStyle = darken(this.color, 20);
    ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.roundRect(-3,-24,6,22,2); ctx.fill();
    ctx.restore();

    // HP bar above tank
    const bw = 52, bh = 6;
    const bx = this.x + this.w/2 - bw/2;
    const by = this.y - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(bx-1, by-1, bw+2, bh+2, 3); ctx.fill();
    ctx.fillStyle = this.isPlayer ? '#00ff88' : '#ff4400';
    ctx.beginPath(); ctx.roundRect(bx, by, bw*(this.hp/this.maxHp), bh, 2); ctx.fill();

    // Boost indicator
    if (this.boostActive) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, 34, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  }
}

// ─── Shell ────────────────────────────────────────────
class Shell {
  constructor(x, y, angle, owner) {
    this.x = x; this.y = y;
    this.angle = angle;
    this.owner = owner;
    this.speed = 7.5;
    this.damage = owner.damage;
    this.isSkill = false;
    this.life = 120;
    this.color = owner.isPlayer ? '#ffd740' : '#ff4400';
    this.trail = [];
  }
  update() {
    this.trail.push({ x:this.x, y:this.y });
    if (this.trail.length > 8) this.trail.shift();
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.life--;
  }
  draw(ctx) {
    // Trail
    this.trail.forEach((p, i) => {
      ctx.globalAlpha = (i/this.trail.length) * 0.4;
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, (this.isSkill?5:3)*(i/this.trail.length), 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // Shell
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.shadowColor = this.color; ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.isSkill?7:5, this.isSkill?4:3, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ─── Explosion ────────────────────────────────────────
class Explosion {
  constructor(x, y, big) {
    this.x = x; this.y = y;
    this.life = big ? 40 : 25;
    this.maxLife = this.life;
    this.big = big;
    this.particles = Array.from({length: big?18:10}, () => ({
      vx: (Math.random()-0.5)*(big?10:6),
      vy: (Math.random()-0.5)*(big?10:6),
      r: Math.random()*(big?8:5)+2,
      color: ['#ff6600','#ffaa00','#ff2200','#ffff00'][Math.floor(Math.random()*4)]
    }));
  }
  update() { this.life--; }
  draw(ctx) {
    const t = this.life / this.maxLife;
    this.particles.forEach(p => {
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x + p.vx*(1-t)*this.maxLife*0.5, this.y + p.vy*(1-t)*this.maxLife*0.5, p.r*t, 0, Math.PI*2);
      ctx.fill();
    });
    // Shockwave
    if (this.big) {
      ctx.globalAlpha = t * 0.3;
      ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x, this.y, (1-t)*80, 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
}

function spawnExplosion(x, y, big = false) {
  explosions.push(new Explosion(x, y, big));
}

function spawnMuzzleFlash(x, y, color) {
  explosions.push({ x, y, life:8, maxLife:8, big:false,
    update() { this.life--; },
    draw(ctx) {
      ctx.globalAlpha = this.life/this.maxLife*0.8;
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(this.x, this.y, 10*(this.life/this.maxLife), 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  });
}

// ─── Obstacles ────────────────────────────────────────
function buildObstacles() {
  obstacles.length = 0;
  const layout = [
    {x:200, y:200, w:80, h:80}, {x:500, y:150, w:60, h:100},
    {x:800, y:250, w:90, h:60}, {x:300, y:450, w:70, h:70},
    {x:600, y:400, w:100, h:60},{x:900, y:400, w:60, h:90},
    {x:150, y:650, w:80, h:60},{x:450, y:650, w:90, h:70},
    {x:750, y:600, w:70, h:80},{x:1000, y:600, w:60, h:60},
  ];
  layout.forEach(o => obstacles.push(o));
}

function drawArena(ctx, cw, ch) {
  // Background
  ctx.fillStyle = '#0a1525'; ctx.fillRect(0,0,WORLD_W,WORLD_H);

  // Floor grid
  ctx.strokeStyle = 'rgba(0,229,255,.04)'; ctx.lineWidth = 1;
  for (let x=0;x<WORLD_W;x+=60) { ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_H);ctx.stroke(); }
  for (let y=0;y<WORLD_H;y+=60) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke(); }

  // Neon border
  ctx.strokeStyle = 'rgba(0,229,255,.5)'; ctx.lineWidth = 3;
  ctx.strokeRect(2,2,WORLD_W-4,WORLD_H-4);
  ctx.strokeStyle = 'rgba(0,229,255,.15)'; ctx.lineWidth = 1;
  ctx.strokeRect(8,8,WORLD_W-16,WORLD_H-16);

  // Corner decorations
  const corners = [[20,20],[WORLD_W-20,20],[20,WORLD_H-20],[WORLD_W-20,WORLD_H-20]];
  corners.forEach(([cx,cy]) => {
    ctx.strokeStyle = 'rgba(0,229,255,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.stroke();
  });

  // Obstacles (crates / walls)
  obstacles.forEach(o => {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(o.x+4, o.y+4, o.w, o.h);
    // Body
    const og = ctx.createLinearGradient(o.x,o.y,o.x+o.w,o.y+o.h);
    og.addColorStop(0,'#1a2840'); og.addColorStop(1,'#0e1a2e');
    ctx.fillStyle = og; ctx.fillRect(o.x,o.y,o.w,o.h);
    // Border
    ctx.strokeStyle = 'rgba(0,229,255,.3)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(o.x,o.y,o.w,o.h);
    // X cross detail
    ctx.strokeStyle = 'rgba(0,229,255,.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(o.x+o.w,o.y+o.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.x+o.w,o.y); ctx.lineTo(o.x,o.y+o.h); ctx.stroke();
  });
}

// ─── AABB Collision ──────────────────────────────────
function circleRect(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx+rw));
  const nearY = Math.max(ry, Math.min(cy, ry+rh));
  const dx = cx - nearX, dy = cy - nearY;
  return dx*dx + dy*dy < cr*cr;
}

function tankObstacleCollide(tank) {
  obstacles.forEach(o => {
    if (circleRect(tank.cx, tank.cy, 28, o.x, o.y, o.w, o.h)) {
      // Push back
      const cx2 = o.x + o.w/2, cy2 = o.y + o.h/2;
      const dx = tank.cx - cx2, dy = tank.cy - cy2;
      const len = Math.sqrt(dx*dx+dy*dy) || 1;
      tank.x += (dx/len)*3; tank.y += (dy/len)*3;
    }
  });
  // World boundary
  tank.x = Math.max(10, Math.min(WORLD_W - tank.w - 10, tank.x));
  tank.y = Math.max(10, Math.min(WORLD_H - tank.h - 10, tank.y));
}

// ─── Camera ──────────────────────────────────────────
function updateCamera(cw, ch) {
  const tx = player.cx - cw/2;
  const ty = player.cy - ch/2;
  cam.x += (tx - cam.x) * 0.1;
  cam.y += (ty - cam.y) * 0.1;
  cam.x = Math.max(0, Math.min(WORLD_W - cw, cam.x));
  cam.y = Math.max(0, Math.min(WORLD_H - ch, cam.y));
}

// ─── Minimap ─────────────────────────────────────────
function drawMinimap() {
  const mc = document.getElementById('minimap');
  if (!mc) return;
  const mctx = mc.getContext('2d');
  const mw = mc.width, mh = mc.height;
  const scaleX = mw/WORLD_W, scaleY = mh/WORLD_H;

  mctx.clearRect(0,0,mw,mh);
  mctx.fillStyle = 'rgba(0,5,15,.8)'; mctx.fillRect(0,0,mw,mh);

  // Obstacles
  mctx.fillStyle = 'rgba(0,229,255,.25)';
  obstacles.forEach(o => mctx.fillRect(o.x*scaleX,o.y*scaleY,o.w*scaleX,o.h*scaleY));

  // Player
  mctx.fillStyle = '#00ff88';
  mctx.beginPath(); mctx.arc(player.cx*scaleX,player.cy*scaleY,3.5,0,Math.PI*2); mctx.fill();

  // Enemy
  mctx.fillStyle = '#ff4400';
  mctx.beginPath(); mctx.arc(enemy.cx*scaleX,enemy.cy*scaleY,3.5,0,Math.PI*2); mctx.fill();

  // Camera rect
  mctx.strokeStyle = 'rgba(0,229,255,.4)'; mctx.lineWidth = 1;
  const cw = canvas.width, ch = canvas.height;
  mctx.strokeRect(cam.x*scaleX,cam.y*scaleY,cw*scaleX,ch*scaleY);
}

// ──────────────────────────────────────────────────────
// 12. AI SYSTEM
// ──────────────────────────────────────────────────────
function updateAI() {
  if (!enemy || enemy.hp <= 0 || !player || player.hp <= 0) return;
  enemy.aiTimer--;

  const dx = player.cx - enemy.cx;
  const dy = player.cy - enemy.cy;
  const dist = Math.sqrt(dx*dx+dy*dy);
  const angleToPlayer = Math.atan2(dy, dx);

  // Rotate turret toward player
  const aDiff = normalizeAngle(angleToPlayer - enemy.turretAngle);
  enemy.turretAngle += aDiff * 0.05;

  // State machine
  const hpRatio = enemy.hp / enemy.maxHp;

  if (hpRatio < 0.2) {
    enemy.aiState = 'retreat';
  } else if (dist < 180) {
    enemy.aiState = 'fight';
  } else if (dist < 450) {
    enemy.aiState = 'chase';
  } else {
    if (enemy.aiState !== 'patrol') enemy.aiState = 'patrol';
  }

  if (enemy.aiState === 'retreat') {
    // Move away
    const ra = angleToPlayer + Math.PI + (Math.random()-.5)*.5;
    enemy.x += Math.cos(ra) * enemy.moveSpeed;
    enemy.y += Math.sin(ra) * enemy.moveSpeed;
    enemy.angle = ra;
    if (enemy.shootCooldown <= 0 && dist < 300) enemy.shoot(enemy.turretAngle);
  } else if (enemy.aiState === 'fight') {
    // Strafe and shoot
    const strafeAngle = angleToPlayer + Math.PI/2;
    if (enemy.aiTimer < 0) {
      enemy.retreatAngle = Math.random() > 0.5 ? strafeAngle : strafeAngle + Math.PI;
      enemy.aiTimer = 40 + Math.floor(Math.random()*30);
    }
    enemy.x += Math.cos(enemy.retreatAngle) * enemy.moveSpeed * 0.7;
    enemy.y += Math.sin(enemy.retreatAngle) * enemy.moveSpeed * 0.7;
    enemy.angle = enemy.retreatAngle;
    if (enemy.shootCooldown <= 0) enemy.shoot(enemy.turretAngle);
  } else if (enemy.aiState === 'chase') {
    enemy.x += Math.cos(angleToPlayer) * enemy.moveSpeed;
    enemy.y += Math.sin(angleToPlayer) * enemy.moveSpeed;
    enemy.angle = angleToPlayer;
    if (enemy.shootCooldown <= 0 && dist < 350) enemy.shoot(enemy.turretAngle);
  } else {
    // Patrol
    if (enemy.aiTimer < 0) {
      enemy.aiTarget = { x:100+Math.random()*(WORLD_W-200), y:100+Math.random()*(WORLD_H-200) };
      enemy.aiTimer = 120;
    }
    const pdx = enemy.aiTarget.x - enemy.cx, pdy = enemy.aiTarget.y - enemy.cy;
    const pa = Math.atan2(pdy, pdx);
    enemy.x += Math.cos(pa) * enemy.moveSpeed * 0.7;
    enemy.y += Math.sin(pa) * enemy.moveSpeed * 0.7;
    enemy.angle = pa;
  }

  tankObstacleCollide(enemy);
  enemy.update();
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI*2;
  while (a < -Math.PI) a += Math.PI*2;
  return a;
}

// ──────────────────────────────────────────────────────
// 13. JOYSTICK
// ──────────────────────────────────────────────────────
const joy = { active:false, startX:0, startY:0, dx:0, dy:0 };

function setupJoystick() {
  const zone  = document.getElementById('joyZone');
  const knob  = document.getElementById('joyKnob');
  const base  = document.getElementById('joyBase');
  if (!zone || !knob || !base) return;
  const maxR = 32;

  function onStart(e) {
    const touch = e.touches ? e.touches[0] : e;
    joy.active = true;
    const rect = base.getBoundingClientRect();
    joy.startX = rect.left + rect.width/2;
    joy.startY = rect.top  + rect.height/2;
    onMove(e);
  }
  function onMove(e) {
    if (!joy.active) return;
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - joy.startX;
    const dy = touch.clientY - joy.startY;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const clamped = Math.min(dist, maxR);
    const a = Math.atan2(dy, dx);
    joy.dx = Math.cos(a) * (clamped/maxR);
    joy.dy = Math.sin(a) * (clamped/maxR);
    knob.style.transform = `translate(${Math.cos(a)*clamped}px,${Math.sin(a)*clamped}px)`;
  }
  function onEnd() {
    joy.active = false; joy.dx = 0; joy.dy = 0;
    knob.style.transform = 'translate(0,0)';
  }

  zone.addEventListener('touchstart', onStart, {passive:false});
  zone.addEventListener('touchmove', onMove, {passive:false});
  zone.addEventListener('touchend', onEnd);
  zone.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
}

// Keyboard fallback
const keys2 = {};
function setupKeyboard() {
  window.addEventListener('keydown', e => { keys2[e.key] = true; });
  window.addEventListener('keyup',   e => { keys2[e.key] = false; });
}

// ──────────────────────────────────────────────────────
// 14. ACTION BUTTONS
// ──────────────────────────────────────────────────────
function setupActionButtons() {
  document.getElementById('btnFire')?.addEventListener('touchstart', e => { e.preventDefault(); player.shoot(player.turretAngle); }, {passive:false});
  document.getElementById('btnFire')?.addEventListener('mousedown', () => player.shoot(player.turretAngle));

  document.getElementById('btnBoost')?.addEventListener('touchstart', e => { e.preventDefault(); player.boost(); }, {passive:false});
  document.getElementById('btnBoost')?.addEventListener('mousedown', () => player.boost());

  document.getElementById('btnSkill')?.addEventListener('touchstart', e => { e.preventDefault(); player.shootSkill(); }, {passive:false});
  document.getElementById('btnSkill')?.addEventListener('mousedown', () => player.shootSkill());
}

// ──────────────────────────────────────────────────────
// 15. SETTINGS OVERLAY (IN-GAME)
// ──────────────────────────────────────────────────────
function setupGameSettings() {
  bindBtn('btnGSet', () => {
    gamePaused = true;
    document.getElementById('ovSettings')?.classList.remove('hidden');
  });
  bindBtn('ovResume', () => { gamePaused = false; document.getElementById('ovSettings')?.classList.add('hidden'); });
  bindBtn('ovRestart', () => { document.getElementById('ovSettings')?.classList.add('hidden'); initGame(); });
  bindBtn('ovQuit', () => { document.getElementById('ovSettings')?.classList.add('hidden'); endGame(); showLobby(); });
  bindBtn('ovLogout', () => { document.getElementById('ovSettings')?.classList.add('hidden'); endGame(); logout(); });
}

// ──────────────────────────────────────────────────────
// 16. HUD UPDATES
// ──────────────────────────────────────────────────────
function updateGameHUD() {
  const p1El = document.getElementById('p1HP');
  const p2El = document.getElementById('p2HP');
  const p1N  = document.getElementById('p1Num');
  const p2N  = document.getElementById('p2Num');
  if (p1El) p1El.style.width = (player.hp / player.maxHp * 100) + '%';
  if (p2El) p2El.style.width = (enemy.hp / enemy.maxHp * 100) + '%';
  if (p1N) p1N.textContent = Math.ceil(player.hp);
  if (p2N) p2N.textContent = Math.ceil(enemy.hp);
}

// ──────────────────────────────────────────────────────
// 17. MAIN GAME LOOP
// ──────────────────────────────────────────────────────
function gameLoop() {
  if (!gameRunning) return;
  animId = requestAnimationFrame(gameLoop);
  if (gamePaused) return;
  frameCount++;

  const cw = canvas.width, ch = canvas.height;
  ctx.clearRect(0,0,cw,ch);

  // Camera
  updateCamera(cw, ch);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  // Arena
  drawArena(ctx, cw, ch);

  // --- Player Input ---
  if (player.hp > 0) {
    let moveX = joy.dx, moveY = joy.dy;
    if (keys2['ArrowLeft'])  moveX -= 1;
    if (keys2['ArrowRight']) moveX += 1;
    if (keys2['ArrowUp'])    moveY -= 1;
    if (keys2['ArrowDown'])  moveY += 1;
    if (keys2['z'] || keys2['Z']) player.shoot(player.turretAngle);
    if (keys2['x']) player.shootSkill();
    if (keys2['c']) player.boost();

    if (Math.abs(moveX) > 0.05 || Math.abs(moveY) > 0.05) {
      const spd = player.moveSpeed;
      player.x += moveX * spd;
      player.y += moveY * spd;
      player.angle = Math.atan2(moveY, moveX);
      // Turret follows movement direction (unless overridden)
      player.turretAngle = player.angle;
    }
    tankObstacleCollide(player);
    player.update();
  }

  // --- AI ---
  updateAI();

  // --- Shells ---
  for (let i = shells.length-1; i >= 0; i--) {
    const sh = shells[i];
    sh.update();
    if (sh.life <= 0) { shells.splice(i,1); continue; }

    // Obstacle hit
    let hitWall = false;
    obstacles.forEach(o => {
      if (circleRect(sh.x, sh.y, 6, o.x, o.y, o.w, o.h)) hitWall = true;
    });
    // World boundary
    if (sh.x < 0 || sh.x > WORLD_W || sh.y < 0 || sh.y > WORLD_H) hitWall = true;

    if (hitWall) { spawnExplosion(sh.x, sh.y, false); shells.splice(i,1); continue; }

    // Hit player
    if (!sh.owner.isPlayer && player.hp > 0) {
      const dx = sh.x - player.cx, dy = sh.y - player.cy;
      if (dx*dx+dy*dy < 32*32) {
        player.takeDamage(sh.damage);
        shells.splice(i,1);
        updateGameHUD();
        if (player.hp <= 0) triggerResult(false);
        continue;
      }
    }
    // Hit enemy
    if (sh.owner.isPlayer && enemy.hp > 0) {
      const dx = sh.x - enemy.cx, dy = sh.y - enemy.cy;
      if (dx*dx+dy*dy < 32*32) {
        enemy.takeDamage(sh.damage);
        shells.splice(i,1);
        updateGameHUD();
        if (enemy.hp <= 0) triggerResult(true);
        continue;
      }
    }
    sh.draw(ctx);
  }

  // --- Explosions ---
  for (let i = explosions.length-1; i >= 0; i--) {
    explosions[i].update();
    explosions[i].draw(ctx);
    if (explosions[i].life <= 0) explosions.splice(i,1);
  }

  // --- Draw tanks ---
  if (enemy.hp > 0) enemy.draw(ctx);
  if (player.hp > 0) player.draw(ctx);

  ctx.restore();

  // Minimap
  drawMinimap();
}

// ──────────────────────────────────────────────────────
// 18. RESULT
// ──────────────────────────────────────────────────────
function triggerResult(playerWon) {
  if (!gameRunning) return;
  gameRunning = false;
  clearInterval(timerIv);
  spawnExplosion(playerWon ? enemy.cx : player.cx, playerWon ? enemy.cy : player.cy, true);

  setTimeout(() => {
    const title  = document.getElementById('resTitle');
    const reward = document.getElementById('resReward');
    const stars  = document.getElementById('resStars');
    if (playerWon) {
      if (title) title.textContent = '🏆 VICTORY!';
      if (title) title.style.color = '#ffd740';
      const coins = 200 + Math.floor(Math.random()*100);
      if (reward) reward.textContent = `+${coins} 🪙`;
      if (stars) stars.textContent = '⭐⭐⭐';
      profile.wins++;
      profile.coins += coins;
      profile.level = Math.max(profile.level, Math.floor(profile.wins/3)+1);
    } else {
      if (title) title.textContent = '💀 DEFEAT';
      if (title) title.style.color = '#ff4444';
      const coins = 50;
      if (reward) reward.textContent = `+${coins} 🪙 (Participation)`;
      if (stars) stars.textContent = '⭐';
      profile.coins += coins;
    }
    saveProfile();
    document.getElementById('ovResult')?.classList.remove('hidden');
  }, 900);

  bindBtn('btnRematch', () => { document.getElementById('ovResult')?.classList.add('hidden'); initGame(); });
  bindBtn('btnResLobby', () => { document.getElementById('ovResult')?.classList.add('hidden'); endGame(); showLobby(); });
}

// ──────────────────────────────────────────────────────
// 19. GAME TIMER
// ──────────────────────────────────────────────────────
function startGameTimer() {
  gameTimer = 120;
  updateTimerDisplay();
  clearInterval(timerIv);
  timerIv = setInterval(() => {
    if (gamePaused || !gameRunning) return;
    gameTimer--;
    updateTimerDisplay();
    if (gameTimer <= 0) {
      clearInterval(timerIv);
      // Higher HP wins
      triggerResult(player.hp >= enemy.hp);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('gameTmr');
  if (el) { el.textContent = gameTimer; el.style.color = gameTimer <= 15 ? '#ff4444' : '#fff'; }
}

// ──────────────────────────────────────────────────────
// 20. INIT GAME
// ──────────────────────────────────────────────────────
function initGame() {
  showScreen('screen-game');
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();

  // Create tanks
  player = new Tank(150, WORLD_H/2 - 28, profile.selectedSkin || '#00aaff', true);
  enemy  = new Tank(WORLD_W - 200, WORLD_H/2 - 28, '#ff4400', false);

  // Reset
  shells.length = 0;
  explosions.length = 0;
  buildObstacles();
  frameCount = 0;
  gameRunning = true;
  gamePaused = false;

  // Reset overlays
  document.getElementById('ovSettings')?.classList.add('hidden');
  document.getElementById('ovResult')?.classList.add('hidden');

  updateGameHUD();
  startGameTimer();
  setupJoystick();
  setupKeyboard();
  setupActionButtons();
  setupGameSettings();

  cam.x = player.cx - canvas.width/2;
  cam.y = player.cy - canvas.height/2;

  cancelAnimationFrame(animId);
  gameLoop();
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animId);
  clearInterval(timerIv);
  cancelAnimationFrame(showroomAF);
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

// ──────────────────────────────────────────────────────
// 21. BOOT
// ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Show intro
  const intro = document.getElementById('screen-intro');
  if (intro) { intro.style.display = 'flex'; intro.style.opacity = '1'; }
  initFirebase();
  runIntro();
});
