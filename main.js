const isDesktop = window.innerWidth >= 768;
if (!isDesktop) document.getElementById('app').style.display = 'none';

/* Handle viewport crossing the mobile/desktop breakpoint */
let _lastBreakpoint = isDesktop ? 'desktop' : 'mobile';
window.addEventListener('resize', () => {
  const now = window.innerWidth >= 768 ? 'desktop' : 'mobile';
  if (now === _lastBreakpoint) return;
  _lastBreakpoint = now;
  const app = document.getElementById('app');
  if (now === 'desktop') {
    app.style.display = '';   // let CSS take over
    mvCloseAll();             // close any open mobile pages/menu
    mvMenuClose();
  } else {
    app.style.display = 'none';
    closeAllWins();           // close any open desktop windows
  }
});

/* ── Mobile menu ── */
function _hamSet(expanded) {
  const btn = document.getElementById('mv-ham');
  if (!btn) return;
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  btn.setAttribute('aria-label', expanded ? 'Close' : 'Open menu');
}
function mvMenuOpen()  {
  document.getElementById('mv-menu').classList.add('open');
  _hamSet(true);
}
function mvMenuClose() {
  document.getElementById('mv-menu').classList.remove('open');
  _hamSet(false);
}
function mvPageOpen(id) {
  mvMenuClose();
  document.getElementById('mv-page-' + id).classList.add('open');
  _hamSet(true);
  if (id === 'about') startMvTerm();
}
function mvPageClose(id) {
  document.getElementById('mv-page-' + id).classList.remove('open');
  const anyOpen = ['portfolio','about','contact'].some(p => document.getElementById('mv-page-'+p).classList.contains('open'));
  if (!anyOpen) _hamSet(false);
}
function mvCloseAll() {
  ['portfolio','about','contact'].forEach(id => document.getElementById('mv-page-'+id).classList.remove('open'));
  _hamSet(false);
}
function mvHamClick() {
  const anyPage = ['portfolio','about','contact'].some(id => document.getElementById('mv-page-'+id).classList.contains('open'));
  if (anyPage) { mvCloseAll(); return; }
  if (document.getElementById('mv-menu').classList.contains('open')) { mvMenuClose(); return; }
  mvMenuOpen();
}

/* ── Voice recording (SpeechRecognition) ── */
let _isRecording = false, _speechRecog = null;

function toggleRecording() {
  _isRecording ? _stopRecording() : _startRecording();
}

function _startRecording() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Speech recognition not available in this browser 🎤'); return; }
  try {
    _speechRecog = new SR();
    _speechRecog.continuous = true;
    _speechRecog.interimResults = true;
    _speechRecog.lang = 'en-US';
    _speechRecog.onresult = (e) => {
      const ta = document.getElementById('rp-ta');
      const sb = document.getElementById('rp-sb');
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      ta.value = transcript;
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 90) + 'px';
      sb.disabled = transcript.trim().length === 0;
    };
    _speechRecog.onerror = () => { _stopRecording(); showToast('Mic error — check browser permissions 🎤'); };
    _speechRecog.onend   = () => { if (_isRecording) _stopRecording(); };
    _speechRecog.start();
    _isRecording = true;
    document.getElementById('rp-mic-btn').classList.add('recording');
    showToast('Listening… click mic to stop 🎤');
  } catch(err) { showToast('Could not start recording 🎤'); }
}

function _stopRecording() {
  if (_speechRecog) {
    _speechRecog.onresult = null; /* prevent stale final event from disabling submit */
    try { _speechRecog.stop(); } catch(e){}
    _speechRecog = null;
  }
  _isRecording = false;
  const btn = document.getElementById('rp-mic-btn');
  if (btn) btn.classList.remove('recording');
  /* sync submit button with current textarea content */
  const ta = document.getElementById('rp-ta');
  const sb = document.getElementById('rp-sb');
  if (ta && sb) sb.disabled = ta.value.trim().length === 0;
}

/* ── Theme ── */
function toggleHint() {
  const p = document.getElementById('hint-panel');
  if (p) p.classList.toggle('open');
}
/* close hint panel when clicking outside */
document.addEventListener('click', e => {
  const p = document.getElementById('hint-panel');
  const b = document.getElementById('hint-btn');
  if (p && p.classList.contains('open') && !p.contains(e.target) && e.target !== b) {
    p.classList.remove('open');
  }
});

let dark = false;
function swapThemeImages() {
  document.querySelectorAll('img[data-src-dark]').forEach(img => {
    const light = img.dataset.srcLight;
    const d     = img.dataset.srcDark;
    if (light && d) img.src = dark ? d : light;
  });
}
function toggleTheme() {
  dark = !dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  /* swap theme-aware thumbnails */
  swapThemeImages();
  /* sync case study iframe */
  document.querySelectorAll('.proj-iframe').forEach(f=>{try{f.contentWindow.postMessage({type:'theme',dark},'*');}catch(e){}});
  document.getElementById('icon-moon').style.display = dark ? 'none' : 'block';
  document.getElementById('icon-sun').style.display  = dark ? 'block' : 'none';
  /* sync mobile theme icons */
  const mm = document.getElementById('mv-icon-moon');
  const ms = document.getElementById('mv-icon-sun');
  if (mm) mm.style.display = dark ? 'none' : 'flex';
  if (ms) ms.style.display = dark ? 'flex' : 'none';
  const tt = document.getElementById('mv-theme-text');
  if (tt) tt.textContent = dark ? 'Light mode' : 'Dark mode';
}

/* ── Clock ── */
function tick() {
  document.getElementById('tb-clock').textContent = new Date().toLocaleTimeString('he-IL',
    {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Jerusalem'});
}
tick(); setInterval(tick, 1000);

/* ── Cursor — Figma-style 3-state system ── */
const curEl  = document.getElementById('cursor');
const ctagEl = document.getElementById('ctag');

/* hotspot offsets per state: how far the "tip" is from div origin */
let curState = 'arrow';
const CUR_OFFSET = {
  arrow: [4,  4],   /* tip of arrow */
  hand:  [11, 1],   /* tip of index finger — Group 19 hand */
  grab:  [11, 1],   /* tip of index finger — open grab hand */
};

function setCursorState(state) {
  if (curState === state) return;
  curState = state;
  document.getElementById('cur-arrow').style.display = state==='arrow' ? '' : 'none';
  document.getElementById('cur-hand').style.display  = state==='hand'  ? '' : 'none';
  document.getElementById('cur-grab').style.display  = state==='grab'  ? '' : 'none';
  /* name tag only visible in arrow state */
  ctagEl.style.opacity = state==='arrow' ? '' : '0';
}

if (isDesktop) {
  window.addEventListener('mousemove', e => {
    const [ox, oy] = CUR_OFFSET[curState] || [4, 4];
    curEl.style.transform = `translate(${e.clientX - ox}px,${e.clientY - oy}px)`;
  }, { passive: true });
}
function setName(name) {
  ctagEl.textContent = name; ctagEl.classList.add('on');
  const u = getPortfolioUser();
  addVisitorPresence(name, u ? u.avatarId : null);
}

/* ── Modal ── */
const mBg = document.getElementById('modal-bg');
const nIn  = document.getElementById('name-input');
const bGo  = document.getElementById('btn-go');

const PORTFOLIO_KEY = 'portfolio_v1';
const LS_WIN_SESSION = 'win-session-v1';
let siteAv = 0;   /* 0 = Shrek (default) */

function getPortfolioUser(){try{return JSON.parse(localStorage.getItem(PORTFOLIO_KEY)||'null');}catch{return null;}}

const NONE_SVG = `<svg width="38" height="38" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="28" height="28" rx="5" fill="none" stroke="#9292C8" stroke-width="2" stroke-dasharray="4,2.5"/><line x1="6" y1="6" x2="26" y2="26" stroke="#9292C8" stroke-width="2.5" stroke-linecap="round"/></svg>`;

function buildModalAvGrid(){
  const grid = document.getElementById('m-av-grid'); if(!grid) return;
  const avCells = SITE_AVATARS.map((av,i)=>{
    const sel = i===siteAv;
    // Fill wrap 100%; inject bg rect to cover the full viewBox
    let svg = (PORTRAITS[av.key]||'').replace(/width="28" height="28"/, 'width="100%" height="100%"');
    return `<div class="m-av-opt${sel?' sel':''}" style="background:${av.bg}" onclick="pickSiteAv(${i})" onmouseenter="jTipShow(this,'${av.name}')" onmouseleave="jTipHide()"><div class="m-av-img-wrap">${svg}</div></div>`;
  }).join('');
  grid.innerHTML = avCells;
}

function updateVisitorPresenceAv(id){
  const avEl = document.getElementById('rp-av-visitor'); if(!avEl) return;
  if(id!=null && SITE_AVATARS){
    const d = SITE_AVATARS[id]||SITE_AVATARS[0];
    avEl.style.background = d.color;
    const svg = (PORTRAITS[d.key]||'').replace(/width="28" height="28"/,'width="20" height="20"');
    avEl.innerHTML = `${svg}<div class="rp-av-dot"></div>`;
  } else {
    const name = (document.getElementById('name-input')||{}).value||'';
    const init = (name.trim()[0]||'?').toUpperCase();
    avEl.style.background = '#DD2590'; avEl.innerHTML = `<span style="font-size:11px;font-weight:900;position:relative;z-index:1">${init}</span><div class="rp-av-dot"></div>`;
  }
}

window.pickSiteAv = function(id){ siteAv=(siteAv===id)?null:id; buildModalAvGrid(); updateVisitorPresenceAv(siteAv); };

if (isDesktop) setTimeout(() => {
  const u = getPortfolioUser();
  if(u){
    siteAv = (u.avatarId !== null && u.avatarId !== undefined) ? u.avatarId : 0;
    if(u.name && u.name !== 'Recruiter'){ nIn.value = u.name; bGo.disabled=false; bGo.classList.add('ready'); }
  }
  buildModalAvGrid();
  mBg.classList.add('show');
  nIn.focus();
}, 450);

nIn.addEventListener('input', () => {
  const ok = nIn.value.trim().length > 0;
  bGo.classList.toggle('ready', ok);
  bGo.disabled = !ok;
});
nIn.addEventListener('keydown', e => { if (e.key === 'Enter' && !bGo.disabled) doName(); });
bGo.addEventListener('click', doName);
document.getElementById('btn-skip').addEventListener('click', () => {
  try{ localStorage.setItem(PORTFOLIO_KEY, JSON.stringify({name:'Recruiter', avatarId:siteAv})); }catch{}
  closeModal(() => setName('Recruiter (hopefully)'));
});
function doName() {
  const n = nIn.value.trim().slice(0,20) || 'Visitor';
  try{ localStorage.setItem(PORTFOLIO_KEY, JSON.stringify({name:n, avatarId:siteAv})); }catch{}
  closeModal(() => setName(n));
}
function closeModal(cb) { mBg.classList.add('hide'); setTimeout(() => { mBg.style.display='none'; if(cb) cb(); startIdleDemo(); }, 280); }
window.reopenModal = function(){
  const u = getPortfolioUser();
  if(u){ siteAv = (u.avatarId !== null && u.avatarId !== undefined) ? u.avatarId : 0; }
  buildModalAvGrid();
  mBg.style.display = '';
  requestAnimationFrame(()=>{ mBg.classList.remove('hide'); mBg.classList.add('show'); if(nIn) nIn.focus(); });
};

/* ── Idle cursor demo ── */
let demoDone  = false;
let demoTimer = null;

function startIdleDemo() {
  if (!isDesktop || demoDone) return;
  demoDone = true;
  /* Runs automatically ~5 s after modal close */
  demoTimer = setTimeout(runGhostScript, 5000);
}

/* ── Toast ── */
const tEl = document.getElementById('toast');
let tTimer;
function showToast(msg, dur=2400) {
  clearTimeout(tTimer);
  document.getElementById('tmsg').textContent = msg;
  tEl.classList.add('show');
  tTimer = setTimeout(() => tEl.classList.remove('show'), dur);
}

/* ════════════════════════════════════
   CANVAS: pan + zoom
════════════════════════════════════ */
const cvpEl     = document.getElementById('cvp');
const canvasEl  = document.getElementById('canvas-area');
const zoomEl    = document.getElementById('bb-zoom');
let zoom = 1, panX = 0, panY = 0;

function applyCanvas() {
  cvpEl.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
  zoomEl.textContent = Math.round(zoom * 100) + '%';
}

function setZoom(z, cx, cy) {
  const ca = canvasEl.getBoundingClientRect();
  const ox = (cx != null ? cx : ca.width  / 2);
  const oy = (cy != null ? cy : ca.height / 2);
  const oldZ = zoom;
  /* No rounding on the internal value — rounding caused 6% to be a trap where you
     couldn't zoom out further (0.0556 rounded back to 0.06 every frame). Display
     rounding happens in applyCanvas(). */
  zoom = Math.min(8, Math.max(0.05, z));
  panX = ox - (ox - panX) * (zoom / oldZ);
  panY = oy - (oy - panY) * (zoom / oldZ);
  applyCanvas();
}

/* Wheel / trackpad:
   - Pinch (ctrlKey) = zoom, more responsive
   - Two-finger scroll / mouse wheel = blocked (no pan, no zoom) */
canvasEl.addEventListener('wheel', e => {
  e.preventDefault();
  if (!e.ctrlKey) return;
  const r = canvasEl.getBoundingClientRect();
  const factor = Math.exp(-e.deltaY / 180);
  setZoom(zoom * factor, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

/* Keyboard */
window.addEventListener('keydown', e => {
  if (!e.metaKey && !e.ctrlKey) return;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(zoom * 1.25); }
  if (e.key === '-')                  { e.preventDefault(); setZoom(zoom / 1.25); }
  if (e.key === '0')                  { e.preventDefault(); centerFrame(); }
});

/* ── Anti-browser-zoom ──────────────────────────────────────
   The canvas uses its own zoom system. Browser zoom breaks the
   fixed-canvas layout. Two layers of protection:
   1. Block ctrl+wheel globally (the canvas listener only caught
      events over the canvas; modals/panels were unprotected).
   2. visualViewport counter-scale: if the browser zoom slips
      through (e.g. via View menu), scale #app back to 1:1.
   ──────────────────────────────────────────────────────────── */
window.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

(function() {
  const vv = window.visualViewport;
  if (!vv) return;
  const appEl = document.getElementById('app');
  function counterBrowserZoom() {
    const s = vv.scale;
    if (s > 1.02) {
      appEl.style.transform      = 'scale(' + (1/s) + ')';
      appEl.style.transformOrigin = '0 0';
      appEl.style.width          = (vv.width  * s) + 'px';
      appEl.style.height         = (vv.height * s) + 'px';
    } else {
      appEl.style.transform = appEl.style.transformOrigin =
      appEl.style.width     = appEl.style.height = '';
    }
  }
  vv.addEventListener('resize', counterBrowserZoom);
  vv.addEventListener('scroll', counterBrowserZoom);
})();

/* Space + drag = pan — Figma cursor states */
let spaceDown = false, panDrag = null;
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.target.matches('input,textarea,select')) {
    e.preventDefault();
    if (!spaceDown) { spaceDown = true; if (!panDrag) setCursorState('hand'); }
  }
});
document.addEventListener('keyup', e => {
  if (e.code === 'Space') {
    spaceDown = false;
    if (!panDrag) setCursorState('arrow');
  }
});

canvasEl.addEventListener('mousedown', e => {
  if (spaceDown || e.button === 1) {
    panDrag = { sx: e.clientX, sy: e.clientY, px: panX, py: panY };
    e.preventDefault();
    setCursorState('grab');
  }
});

/* ════════════════════════════════════
   FRAME: drag + resize
════════════════════════════════════ */
const fwEl   = document.getElementById('fw');
const fBord  = document.getElementById('fborder');
const wEl    = document.getElementById('welcome');
const F_MIN_W = 440, F_MAX_W = 860, F_MIN_H = 340, F_MAX_H = 640;
let fX = 0, fY = 0, fW = 600, fH = 420;
let frameDrag = null;

function applyFrame() {
  fwEl.style.left  = fX + 'px'; fwEl.style.top = fY + 'px';
  fBord.style.width  = fW + 'px'; fBord.style.height = fH + 'px';
  wEl.style.width  = '100%'; wEl.style.height = '100%';
  document.getElementById('rp-w').textContent = Math.round(fW);
  document.getElementById('rp-h').textContent = Math.round(fH);
  document.getElementById('rp-x').textContent = Math.round(fX);
  document.getElementById('rp-y').textContent = Math.round(fY);
}

function centerFrame() {
  const ca = canvasEl.getBoundingClientRect();
  const workW = ca.width - 228; // canvas minus right panel (220px + 8px margin)
  zoom = 1;
  panX = (workW - fW) / 2;
  panY = (ca.height - fH) / 2;
  applyCanvas();
}

/* Drag frame by label */
document.getElementById('flabel').addEventListener('mousedown', e => {
  frameDrag = { type:'move', sx:e.clientX, sy:e.clientY, fx:fX, fy:fY };
  e.preventDefault(); e.stopPropagation();
});

/* Resize handles */
document.querySelectorAll('.rh').forEach(h => {
  h.addEventListener('mousedown', e => {
    const t = h.dataset.rh;
    frameDrag = { type:t, sx:e.clientX, sy:e.clientY, fx:fX, fy:fY, fw:fW, fh:fH };
    e.preventDefault(); e.stopPropagation();
  });
});

/* Unified mousemove for pan + frame */
document.addEventListener('mousemove', e => {
  if (panDrag) {
    panX = panDrag.px + (e.clientX - panDrag.sx);
    panY = panDrag.py + (e.clientY - panDrag.sy);
    applyCanvas();
  }
  if (frameDrag) {
    const dx = (e.clientX - frameDrag.sx) / zoom;
    const dy = (e.clientY - frameDrag.sy) / zoom;
    if (frameDrag.type === 'move') {
      fX = frameDrag.fx + dx; fY = frameDrag.fy + dy;
    } else {
      let nx=frameDrag.fx, ny=frameDrag.fy, nw=frameDrag.fw, nh=frameDrag.fh;
      const t = frameDrag.type;
      if (t.includes('r')) nw = clamp(frameDrag.fw + dx, F_MIN_W, F_MAX_W);
      if (t.includes('l')) { nw = clamp(frameDrag.fw - dx, F_MIN_W, F_MAX_W); nx = frameDrag.fx + (frameDrag.fw - nw); }
      if (t.includes('b')) nh = clamp(frameDrag.fh + dy, F_MIN_H, F_MAX_H);
      if (t.includes('t')) { nh = clamp(frameDrag.fh - dy, F_MIN_H, F_MAX_H); ny = frameDrag.fy + (frameDrag.fh - nh); }
      fX=nx; fY=ny; fW=nw; fH=nh;
    }
    applyFrame();
  }
});

document.addEventListener('mouseup', () => {
  panDrag = null; frameDrag = null;
  const wasDrag = drag, wasResize = winResize;
  drag = null; winResize = null;
  setIframePointerEvents('');
  showCustomCursor();
  setCursorState(spaceDown ? 'hand' : 'arrow');
  if (wasDrag || wasResize) saveWinSession();
});
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* Init */
window.addEventListener('load', () => {
  applyFrame();
  centerFrame();
  restoreWinSession();
});

/* ════════════════════════════════════
   WINDOW SYSTEM
════════════════════════════════════ */
let wZ = 200, drag = null, dox = 0, doy = 0;
let cascadeX = 60, cascadeY = 50;
const STEP = 28;
const WIN_IDS = ['projects','about','contact','proj-lux','proj-myverint','proj-copilot','proj-plugins','proj-supervisor','a11y','lux-viewer'];

function updateCloseAll() {
  const anyOpen = WIN_IDS.some(id => {
    const w = document.getElementById('win-' + id);
    return w && w.style.display && w.style.display !== 'none';
  });
  document.getElementById('nav-closeall').classList.toggle('inactive', !anyOpen);
}

function sortProjectTable(btn) {
  const table = document.querySelector('.pl-table');
  const rows = Array.from(table.querySelectorAll('.pl-row'));
  const icon = btn.querySelector('i');
  const asc = btn.dataset.sort !== 'asc';
  rows.sort((a, b) => {
    const na = a.querySelector('.pl-name').textContent.trim();
    const nb = b.querySelector('.pl-name').textContent.trim();
    return asc ? na.localeCompare(nb) : nb.localeCompare(na);
  });
  rows.forEach(r => table.appendChild(r));
  btn.dataset.sort = asc ? 'asc' : 'desc';
  if (icon) icon.className = 'ph ' + (asc ? 'ph-arrow-up' : 'ph-arrow-down');
}

function openWin(id) {
  const w = document.getElementById('win-' + id);
  if (!w) return;
  w._opener = document.activeElement;
  if (!w._placed) {
    w.style.left = cascadeX + 'px'; w.style.top = cascadeY + 'px';
    w.style.right = w.style.bottom = 'auto'; w.style.transform = '';
    w._placed = true;
    cascadeX += STEP; cascadeY += STEP;
    if (cascadeX > window.innerWidth  - 500) cascadeX = 60;
    if (cascadeY > window.innerHeight - 220) cascadeY = 50;
  }
  w.style.display = 'flex';
  requestAnimationFrame(() => {
    w.classList.add('show');
    w.focus();
  });
  front(w);
  const b = document.getElementById('nav-' + id);
  if (b) b.classList.add('on');
  if (id === 'about' && !window._termStarted) startTerm();
  /* Load Press Start 2P font on first A11y game open */
  if (id === 'a11y' && !window._psfLoaded) {
    window._psfLoaded = true;
    const lk = document.createElement('link');
    lk.rel = 'stylesheet'; lk.crossOrigin = 'anonymous';
    lk.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    document.head.appendChild(lk);
  }
  /* Case study windows open maximized on first launch */
  const CASE_STUDIES = ['proj-lux', 'proj-myverint', 'proj-supervisor', 'proj-plugins', 'proj-copilot', 'lux-viewer'];
  if (CASE_STUDIES.includes(id) && !w._everMaximized) {
    w._everMaximized = true;
    requestAnimationFrame(() => maximizeWin(id));
  }
  updateCloseAll();
  saveWinSession();
}

function closeWin(id) {
  const w = document.getElementById('win-' + id);
  if (!w) return;
  w.classList.remove('show','collapsed');
  setTimeout(() => { w.style.display = 'none'; updateCloseAll(); saveWinSession(); }, 200);
  const b = document.getElementById('nav-' + id);
  if (b) b.classList.remove('on');
  if (w._opener && w._opener.focus) w._opener.focus();
}

function toggleWin(id) {
  const w = document.getElementById('win-' + id);
  (!w || !w.style.display || w.style.display==='none') ? openWin(id) : closeWin(id);
}

function minimizeWin(id) {
  const w = document.getElementById('win-'+id); if (!w) return;
  if (w._maximized) {
    /* iOS / macOS full-screen behaviour: yellow restores the window */
    maximizeWin(id);
  } else {
    w.classList.toggle('collapsed');
  }
}

function maximizeWin(id) {
  const w = document.getElementById('win-'+id); if (!w) return;
  front(w);

  if (w._maximized) {
    /* ── Restore: animate back to saved position ── */
    w.classList.add('mac-anim');
    w.classList.remove('maximized');
    w.style.left = w._mL; w.style.top  = w._mT;
    w.style.width = w._mW; w.style.height = w._mH;
    w.style.right = w.style.bottom = 'auto';
    w._maximized = false;
    setTimeout(() => { w.classList.remove('mac-anim'); saveWinSession(); }, 380);
  } else {
    /* ── Maximize: snapshot current rect as explicit px so we have a
       start value, then transition to fullscreen in the next paint ── */
    const r = w.getBoundingClientRect();
    w._mL = r.left + 'px';  w._mT = r.top    + 'px';
    w._mW = r.width + 'px'; w._mH = r.height + 'px';
    /* Lock current dimensions explicitly */
    w.style.left = w._mL; w.style.top  = w._mT;
    w.style.width = w._mW; w.style.height = w._mH;
    w.style.right = w.style.bottom = 'auto';
    /* Double-rAF: ensures the browser commits the start values before
       the transition to the end state kicks off */
    w.classList.add('mac-anim');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      w.style.left = '220px'; w.style.top  = '0px';
      w.style.width = 'calc(100vw - 440px)'; w.style.height = 'calc(100vh - 58px)';
      w.classList.add('maximized');
      w._maximized = true;
      setTimeout(() => { w.classList.remove('mac-anim'); saveWinSession(); }, 380);
    }));
  }
}

function closeAllWins() {
  WIN_IDS.forEach(closeWin);
  setTimeout(() => { WIN_IDS.forEach(id=>{ const w=document.getElementById('win-'+id); if(w) delete w._placed; }); cascadeX=60; cascadeY=50; }, 220);
}

function front(w) { w.style.zIndex = ++wZ; }

/* ════════════════════════════════════
   WINDOW SESSION PERSISTENCE
   Save open windows + positions to localStorage so a
   page refresh restores where the user left off.
════════════════════════════════════ */
function saveWinSession() {
  const windows = WIN_IDS.map(id => {
    const w = document.getElementById('win-' + id);
    if (!w || !w.style.display || w.style.display === 'none') return null;
    return {
      id,
      left:   w._maximized ? (w._mL || w.style.left)   : w.style.left,
      top:    w._maximized ? (w._mT || w.style.top)    : w.style.top,
      width:  w._maximized ? (w._mW || w.style.width)  : w.style.width,
      height: w._maximized ? (w._mH || w.style.height) : w.style.height,
      z:      parseInt(w.style.zIndex) || 0,
      maximized: !!w._maximized,
      preMaxL: w._mL, preMaxT: w._mT,
      preMaxW: w._mW, preMaxH: w._mH,
    };
  }).filter(Boolean);
  try { localStorage.setItem(LS_WIN_SESSION, JSON.stringify({windows})); } catch {}
}

function restoreWinSession() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(LS_WIN_SESSION) || 'null'); } catch {}
  if (!saved || !saved.windows || !saved.windows.length) return;
  /* Restore in z-index order so stacking is correct */
  saved.windows.sort((a, b) => (a.z || 0) - (b.z || 0));
  saved.windows.forEach(s => {
    const w = document.getElementById('win-' + s.id);
    if (!w) return;
    /* Pre-position so openWin skips cascade */
    w._placed = true;
    w._everMaximized = true; /* skip auto-maximize on case studies */
    w.style.left = s.left; w.style.top = s.top;
    w.style.right = w.style.bottom = 'auto';
    if (s.width)  w.style.width  = s.width;
    if (s.height) w.style.height = s.height;
    if (s.maximized) {
      w._mL = s.preMaxL; w._mT = s.preMaxT;
      w._mW = s.preMaxW; w._mH = s.preMaxH;
    }
    openWin(s.id);
    if (s.maximized) {
      w.style.left = '220px'; w.style.top = '0px';
      w.style.width = 'calc(100vw - 440px)';
      w.style.height = 'calc(100vh - 58px)';
      w.classList.add('maximized');
      w._maximized = true;
    }
  });
}

/* ════════════════════════════════════
   WINDOW RESIZE (border drag)
════════════════════════════════════ */
const WIN_MIN_W = 280, WIN_MAX_W = 1400, WIN_MIN_H = 180, WIN_MAX_H = 900;
let winResize = null;

function showNativeCursor() { curEl.style.display = 'none'; }
function showCustomCursor() { curEl.style.display = ''; }

/* Inject resize handles into every .win */
document.querySelectorAll('.win:not([data-no-resize])').forEach(w => {
  ['nw','n','ne','e','se','s','sw','w'].forEach(dir => {
    const h = document.createElement('div');
    h.className = `win-rh ${dir}`;
    h.addEventListener('mouseenter', showNativeCursor);
    h.addEventListener('mouseleave', () => { if (!winResize) showCustomCursor(); });
    h.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      front(w);
      const r = w.getBoundingClientRect();
      winResize = { win: w, dir, sx: e.clientX, sy: e.clientY,
        ox: r.left, oy: r.top, ow: r.width, oh: r.height };
      setIframePointerEvents('none');
    });
    w.appendChild(h);
  });
});

/* Frame label: hide custom cursor so grab cursor shows */
document.getElementById('flabel').addEventListener('mouseenter', showNativeCursor);
document.getElementById('flabel').addEventListener('mouseleave', () => { if (!frameDrag) showCustomCursor(); });

function setIframePointerEvents(val) {
  document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = val);
}

function startDrag(e, id) {
  if (e.button !== 0) return;
  const w = document.getElementById(id);
  front(w); drag = w;
  const r = w.getBoundingClientRect();
  dox = e.clientX - r.left; doy = e.clientY - r.top;
  setIframePointerEvents('none');
  e.preventDefault();
}

document.addEventListener('mousemove', e => {
  if (drag) {
    const ww = drag.offsetWidth, wh = drag.offsetHeight;
    const nx = Math.max(0, Math.min(window.innerWidth  - Math.min(ww, 120), e.clientX - dox));
    const ny = Math.max(0, Math.min(window.innerHeight - 44, e.clientY - doy));
    drag.style.left = nx + 'px'; drag.style.top = ny + 'px';
    drag.style.right=drag.style.bottom='auto'; drag.style.transform='';
    e.preventDefault();
  }
  if (winResize) {
    const { win: rw, dir: rd, sx, sy, ox, oy, ow, oh } = winResize;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    let nx = ox, ny = oy, nw = ow, nh = oh;
    if (rd.includes('e')) nw = clamp(ow + dx, WIN_MIN_W, WIN_MAX_W);
    if (rd.includes('w')) { nw = clamp(ow - dx, WIN_MIN_W, WIN_MAX_W); nx = ox + ow - nw; }
    if (rd.includes('s')) nh = clamp(oh + dy, WIN_MIN_H, WIN_MAX_H);
    if (rd.includes('n')) { nh = clamp(oh - dy, WIN_MIN_H, WIN_MAX_H); ny = oy + oh - nh; }
    rw.style.width  = nw + 'px'; rw.style.height = nh + 'px';
    rw.style.left   = nx + 'px'; rw.style.top    = ny + 'px';
    rw.style.right  = rw.style.bottom = 'auto';
    e.preventDefault();
  }
});
document.querySelectorAll('.win').forEach(w => w.addEventListener('mousedown', () => front(w)));

/* ── Projects view toggle ── */
function setView(v) {
  document.getElementById('view-grid').style.display = v==='grid' ? 'grid' : 'none';
  document.getElementById('view-list').style.display = v==='list' ? 'block' : 'none';
  document.getElementById('vt-grid').classList.toggle('on', v==='grid');
  document.getElementById('vt-list').classList.toggle('on', v==='list');
}

/* ════════════════════════════════════
   TERMINAL TYPEWRITER
════════════════════════════════════ */
window._termStarted = false;

const TERM = [
  {h:'<span class="t-login">Last login: Wed Jul 22 11:42:33 on ttys003</span>'},
  {h:''},
  {h:'<span class="t-prompt">ori@portfolio</span> <span class="t-grey">~</span> <span class="t-prompt">%</span> <span class="t-cmd">cat about.txt</span>', pause:120},
  {h:'<span style="font-size:28px;font-weight:700;letter-spacing:3px;color:var(--ttx)">ORI COHEN</span>'},
  {h:''},
  {h:'Product Design Lead with <span class="t-num">5+</span> years shipping enterprise SaaS at scale.'},
  {h:'Systems thinker, hands-on maker - the person who closes'},
  {h:'the gap between design and engineering.'},
  {h:''},
  {h:'<span class="t-prompt">ori@portfolio</span> <span class="t-grey">~</span> <span class="t-prompt">%</span> <span class="t-cmd">cat background.txt</span>', pause:90},
  {h:'<span class="t-dir" style="font-size:13px;letter-spacing:2px">── BACKGROUND ─────────────────────────────────</span>'},
  {h:''},
  {h:'<span class="t-prompt">Security Specialist · Office of the Prime Minister of Israel</span>'},
  {h:'<span class="t-grey">Jan 2017 – Oct 2020</span>'},
  {h:'Classified role requiring high-level security clearance,'},
  {h:'discretion, and close attention to detail.'},
  {h:''},
  {h:'<span class="t-prompt">UX/UI Designer · Ori Mintz Media</span>'},
  {h:'<span class="t-grey">2020–2022</span>'},
  {h:'Built client websites end-to-end: research, prototyping,'},
  {h:'development, and QA.'},
  {h:''},
  {h:'<span class="t-prompt">Product Designer → Design Team Lead · Verint</span>'},
  {h:'<span class="t-grey">2022–Present</span>'},
  {h:'Designed enterprise SaaS products for contact center teams -'},
  {h:'real workflows, real constraints, real users making hundreds'},
  {h:'of decisions a day. Progressed from IC to senior in two years.'},
  {h:''},
  {h:'Also built Verint\'s design system from scratch: running across'},
  {h:'<span class="t-num">40+</span> products used by <span class="t-num">10,000+</span> customers, with a Figma-to-Storybook'},
  {h:'pipeline that ships to production in under <span class="t-num">60 seconds</span>.'},
  {h:''},
  {h:'<span class="t-prompt">ori@portfolio</span> <span class="t-grey">~</span> <span class="t-prompt">%</span> <span class="t-cmd">cat currently.txt</span>', pause:90},
  {h:'<span class="t-dir" style="font-size:13px;letter-spacing:2px">── CURRENTLY ──────────────────────────────────</span>'},
  {h:''},
  {h:'Design Team Lead at <a class="tlink" href="https://verint.com" target="_blank">Verint</a>. I design for contact center agents'},
  {h:'by day and build internal tools and AI workflows for my team'},
  {h:'the rest of the time. Same problem at different scales -'},
  {h:'how do people get complex work done faster.'},
  {h:''},
  {h:'<span class="t-prompt">ori@portfolio</span> <span class="t-grey">~</span> <span class="t-prompt">%</span> ', final:true},
];

function startTerm() {
  window._termStarted = true;
  const con = document.getElementById('tcon');
  const wb  = document.getElementById('term-wb');
  let i = 0;
  function next() {
    if (i >= TERM.length) return;
    const item = TERM[i++];
    const div = document.createElement('div');
    div.className = item.h === '' ? 'tline empty' : 'tline';
    div.innerHTML = item.h;
    if (item.final) {
      const cur = document.createElement('span');
      cur.className = 'tcur'; div.appendChild(cur);
    }
    con.appendChild(div);
    wb.scrollTop = wb.scrollHeight;
    const delay = item.h === '' ? 35 : item.pause || 45;
    setTimeout(next, delay);
  }
  setTimeout(next, 300);
}

/* ════════════════════════════════════
   MOBILE TERMINAL (About page)
════════════════════════════════════ */
window._mvTermStarted = false;

function startMvTerm() {
  if (window._mvTermStarted) return;
  window._mvTermStarted = true;
  const con = document.getElementById('mv-tcon');
  const wb  = document.getElementById('mv-term');
  if (!con || !wb) return;
  let i = 0;
  function next() {
    if (i >= TERM.length) return;
    const item = TERM[i++];
    const div = document.createElement('div');
    div.className = item.h === '' ? 'tline empty' : 'tline';
    div.innerHTML = item.h;
    if (item.final) {
      const cur = document.createElement('span');
      cur.className = 'tcur'; div.appendChild(cur);
    }
    con.appendChild(div);
    wb.scrollTop = wb.scrollHeight;
    const delay = item.h === '' ? 35 : item.pause || 45;
    setTimeout(next, delay);
  }
  setTimeout(next, 300);
}

/* ════════════════════════════════════
   PORTRAIT SVGs — 28×28 illustrated faces
════════════════════════════════════ */
const ORI_PHOTO = "Assets/Media/general/ori-profile.webp";
const PORTRAITS = {
  ori: `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="14" cy="9" rx="11.5" ry="8.5" fill="#1C1208"/>
    <rect x="11" y="24" width="6" height="5" rx="1" fill="#B8895A"/>
    <ellipse cx="14" cy="16" rx="10" ry="10.5" fill="#C49A6C"/>
    <path d="M3.5 13.5 Q3.5 5 14 5 Q24.5 5 24.5 13.5 Q20.5 10 14 10.5 Q7.5 10 3.5 13.5Z" fill="#1C1208"/>
    <ellipse cx="4.5" cy="17" rx="1.7" ry="3.5" fill="#1C1208"/>
    <ellipse cx="23.5" cy="17" rx="1.7" ry="3.5" fill="#1C1208"/>
    <path d="M7.5 13 Q11 11.5 13 12.5" stroke="#1C1208" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M20.5 13 Q17 11.5 15 12.5" stroke="#1C1208" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="11" cy="15" rx="2.3" ry="2" fill="#fff"/>
    <ellipse cx="17" cy="15" rx="2.3" ry="2" fill="#fff"/>
    <circle cx="11.3" cy="15.2" r="1.4" fill="#2C1A0E"/>
    <circle cx="17.3" cy="15.2" r="1.4" fill="#2C1A0E"/>
    <circle cx="11.9" cy="14.7" r="0.5" fill="#fff"/>
    <circle cx="17.9" cy="14.7" r="0.5" fill="#fff"/>
    <path d="M14 16 L12.5 19 Q14 19.8 15.5 19 Z" fill="#A87848"/>
    <path d="M5.5 20 Q6 27 14 28.5 Q22 27 22.5 20 Q19 23.5 14 24 Q9 23.5 5.5 20Z" fill="#1C1208"/>
    <rect x="10.5" y="19" width="7" height="2.5" rx="1.2" fill="#1C1208"/>
    <path d="M10.5 21.5 Q14 23.5 17.5 21.5" fill="white" opacity="0.7"/>
  </svg>`,
  shrek: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="2" y="0" width="12" height="15" fill="#7ABF3A"/><rect x="1" y="1" width="1" height="13" fill="#7ABF3A"/><rect x="14" y="1" width="1" height="13" fill="#7ABF3A"/><rect x="2" y="0" width="6" height="2" fill="#9EE048"/><rect x="0" y="3" width="1" height="3" fill="#7ABF3A"/><rect x="15" y="3" width="1" height="3" fill="#7ABF3A"/><rect x="2" y="3" width="12" height="3" fill="#2A1800"/><rect x="2" y="6" width="4" height="3" fill="#F0EED8"/><rect x="10" y="6" width="4" height="3" fill="#F0EED8"/><rect x="3" y="7" width="2" height="2" fill="#2A1800"/><rect x="11" y="7" width="2" height="2" fill="#2A1800"/><rect x="5" y="9" width="6" height="2" fill="#4A8018"/><rect x="5" y="10" width="2" height="1" fill="#2A1800"/><rect x="9" y="10" width="2" height="1" fill="#2A1800"/><rect x="3" y="12" width="10" height="2" fill="#2A1800"/><rect x="4" y="12" width="8" height="1" fill="#E8E8D0"/></svg>`,
  donkey: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="2" y="0" width="3" height="5" fill="#9B8B78"/><rect x="11" y="0" width="3" height="5" fill="#9B8B78"/><rect x="3" y="0" width="1" height="4" fill="#D4A880"/><rect x="12" y="0" width="1" height="4" fill="#D4A880"/><rect x="1" y="4" width="14" height="11" fill="#9B8B78"/><rect x="2" y="4" width="5" height="2" fill="#B89C8A"/><rect x="2" y="6" width="4" height="3" fill="#F0EED8"/><rect x="10" y="6" width="4" height="3" fill="#F0EED8"/><rect x="4" y="7" width="2" height="2" fill="#2A1808"/><rect x="11" y="7" width="2" height="2" fill="#2A1808"/><rect x="2" y="9" width="12" height="6" fill="#D4A880"/><rect x="4" y="10" width="2" height="1" fill="#9B8B78"/><rect x="10" y="10" width="2" height="1" fill="#9B8B78"/><rect x="3" y="12" width="10" height="1" fill="#7B6555"/><rect x="4" y="12" width="8" height="2" fill="#FFFAF0"/></svg>`,
  puss: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="1" y="0" width="3" height="4" fill="#C86818"/><rect x="12" y="0" width="3" height="4" fill="#C86818"/><rect x="2" y="1" width="1" height="2" fill="#E89040"/><rect x="13" y="1" width="1" height="2" fill="#E89040"/><rect x="1" y="3" width="14" height="12" fill="#C86818"/><rect x="2" y="3" width="5" height="2" fill="#E09040"/><rect x="2" y="4" width="5" height="1" fill="#A85010"/><rect x="9" y="4" width="5" height="1" fill="#A85010"/><rect x="2" y="5" width="5" height="5" fill="#FFE030"/><rect x="9" y="5" width="5" height="5" fill="#FFE030"/><rect x="4" y="5" width="1" height="5" fill="#180800"/><rect x="11" y="5" width="1" height="5" fill="#180800"/><rect x="2" y="5" width="1" height="2" fill="#FFF878"/><rect x="9" y="5" width="1" height="2" fill="#FFF878"/><rect x="4" y="10" width="8" height="4" fill="#E89040"/><rect x="7" y="10" width="2" height="1" fill="#C06830"/><rect x="0" y="11" width="4" height="1" fill="#7A4010"/><rect x="0" y="12" width="4" height="1" fill="#7A4010"/><rect x="12" y="11" width="4" height="1" fill="#7A4010"/><rect x="12" y="12" width="4" height="1" fill="#7A4010"/></svg>`,
  fiona: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="0" y="0" width="16" height="5" fill="#CC4808"/><rect x="0" y="5" width="2" height="6" fill="#CC4808"/><rect x="14" y="5" width="2" height="6" fill="#CC4808"/><rect x="2" y="0" width="12" height="1" fill="#8B2A00"/><rect x="4" y="1" width="8" height="2" fill="#FFD700"/><rect x="7" y="0" width="2" height="2" fill="#FFD700"/><rect x="7" y="0" width="2" height="1" fill="#88CCFF"/><rect x="2" y="4" width="12" height="11" fill="#F5DCA0"/><rect x="3" y="6" width="4" height="1" fill="#8B3400"/><rect x="9" y="6" width="4" height="1" fill="#8B3400"/><rect x="3" y="7" width="4" height="3" fill="#F0EED8"/><rect x="9" y="7" width="4" height="3" fill="#F0EED8"/><rect x="5" y="8" width="2" height="2" fill="#3A7030"/><rect x="11" y="8" width="2" height="2" fill="#3A7030"/><rect x="7" y="10" width="2" height="1" fill="#C8A070"/><rect x="4" y="13" width="8" height="1" fill="#8B3400"/><rect x="5" y="13" width="6" height="1" fill="#EEEECC"/></svg>`,
  farquaad: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="0" y="0" width="16" height="7" fill="#0A0808"/><rect x="0" y="7" width="2" height="7" fill="#0A0808"/><rect x="14" y="7" width="2" height="7" fill="#0A0808"/><rect x="2" y="6" width="12" height="8" fill="#F5D0A0"/><rect x="4" y="7" width="3" height="1" fill="#3A1000"/><rect x="9" y="7" width="3" height="1" fill="#3A1000"/><rect x="4" y="8" width="3" height="2" fill="#F0EED8"/><rect x="9" y="8" width="3" height="2" fill="#F0EED8"/><rect x="5" y="9" width="1" height="1" fill="#1A0808"/><rect x="10" y="9" width="1" height="1" fill="#1A0808"/><rect x="7" y="11" width="2" height="1" fill="#D4A070"/><rect x="5" y="12" width="6" height="1" fill="#8B5030"/><rect x="2" y="14" width="12" height="2" fill="#8B0000"/><rect x="5" y="13" width="6" height="2" fill="#CC1010"/></svg>`,
  gingy: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="1" y="2" width="14" height="12" fill="#C07838"/><rect x="2" y="1" width="12" height="14" fill="#C07838"/><rect x="2" y="9" width="3" height="2" fill="#C05028"/><rect x="11" y="9" width="3" height="2" fill="#C05028"/><rect x="7" y="3" width="2" height="2" fill="#CC1818"/><rect x="4" y="6" width="3" height="3" fill="#EEEEEE"/><rect x="9" y="6" width="3" height="3" fill="#EEEEEE"/><rect x="5" y="7" width="1" height="1" fill="#3A1800"/><rect x="10" y="7" width="1" height="1" fill="#3A1800"/><rect x="3" y="10" width="1" height="1" fill="#EEEEEE"/><rect x="12" y="10" width="1" height="1" fill="#EEEEEE"/><rect x="4" y="11" width="8" height="1" fill="#EEEEEE"/></svg>`,
  fairy: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="0" y="0" width="16" height="7" fill="#E8C018"/><rect x="0" y="7" width="2" height="5" fill="#E8C018"/><rect x="14" y="7" width="2" height="5" fill="#E8C018"/><rect x="2" y="4" width="1" height="1" fill="#FFFFF0"/><rect x="4" y="2" width="1" height="1" fill="#FFFFF0"/><rect x="11" y="1" width="1" height="1" fill="#FFFFF0"/><rect x="7" y="0" width="2" height="1" fill="#FFFFF0"/><rect x="2" y="6" width="12" height="9" fill="#FFE8C0"/><rect x="2" y="9" width="3" height="2" fill="#FF8888"/><rect x="11" y="9" width="3" height="2" fill="#FF8888"/><rect x="3" y="7" width="5" height="3" fill="#FF3888"/><rect x="4" y="8" width="3" height="1" fill="#FFE8C0"/><rect x="5" y="8" width="1" height="1" fill="#3860A0"/><rect x="9" y="7" width="5" height="3" fill="#FF3888"/><rect x="10" y="8" width="3" height="1" fill="#FFE8C0"/><rect x="11" y="8" width="1" height="1" fill="#3860A0"/><rect x="8" y="8" width="1" height="1" fill="#FF3888"/><rect x="5" y="12" width="6" height="1" fill="#CC6888"/><rect x="6" y="12" width="4" height="1" fill="#EEEECC"/></svg>`,
  dragon: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="0" y="0" width="3" height="5" fill="#780070"/><rect x="13" y="0" width="3" height="5" fill="#780070"/><rect x="1" y="0" width="1" height="4" fill="#C030B0"/><rect x="14" y="0" width="1" height="4" fill="#C030B0"/><rect x="1" y="4" width="14" height="11" fill="#9A0090"/><rect x="2" y="4" width="7" height="3" fill="#B018A8"/><rect x="2" y="7" width="6" height="1" fill="#C030B0"/><rect x="8" y="7" width="6" height="1" fill="#C030B0"/><rect x="2" y="8" width="5" height="3" fill="#FFE030"/><rect x="9" y="8" width="5" height="3" fill="#FFE030"/><rect x="4" y="8" width="1" height="3" fill="#180015"/><rect x="11" y="8" width="1" height="3" fill="#180015"/><rect x="3" y="11" width="10" height="4" fill="#C030B0"/><rect x="4" y="12" width="2" height="1" fill="#780070"/><rect x="10" y="12" width="2" height="1" fill="#780070"/><rect x="5" y="14" width="2" height="1" fill="#FFFFFF"/><rect x="9" y="14" width="2" height="1" fill="#FFFFFF"/></svg>`,
  pino: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="7" y="0" width="2" height="1" fill="#CC1818"/><rect x="6" y="1" width="4" height="1" fill="#CC1818"/><rect x="5" y="2" width="6" height="1" fill="#CC1818"/><rect x="4" y="3" width="8" height="2" fill="#CC1818"/><rect x="1" y="5" width="14" height="1" fill="#AA0808"/><rect x="13" y="1" width="3" height="1" fill="#F0C818"/><rect x="14" y="2" width="2" height="1" fill="#F0C818"/><rect x="2" y="5" width="12" height="10" fill="#D4A050"/><rect x="3" y="8" width="10" height="1" fill="#C08030"/><rect x="3" y="6" width="4" height="1" fill="#8B5820"/><rect x="9" y="6" width="4" height="1" fill="#8B5820"/><rect x="3" y="7" width="4" height="3" fill="#F0EED8"/><rect x="9" y="7" width="4" height="3" fill="#F0EED8"/><rect x="5" y="8" width="2" height="2" fill="#2A50A0"/><rect x="11" y="8" width="2" height="2" fill="#2A50A0"/><rect x="7" y="10" width="9" height="1" fill="#A87030"/><rect x="8" y="11" width="7" height="1" fill="#9B6020"/><rect x="3" y="12" width="8" height="1" fill="#8B5820"/><rect x="6" y="14" width="4" height="1" fill="#CC1818"/><rect x="7" y="13" width="2" height="3" fill="#CC1818"/></svg>`,
  humpty: `<svg width="28" height="28" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="3" y="0" width="10" height="1" fill="#1A1828"/><rect x="5" y="1" width="6" height="3" fill="#1A1828"/><rect x="3" y="3" width="10" height="12" fill="#FFF5C0"/><rect x="2" y="5" width="1" height="8" fill="#FFF5C0"/><rect x="13" y="5" width="1" height="8" fill="#FFF5C0"/><rect x="4" y="4" width="4" height="3" fill="#FFFFF0"/><rect x="9" y="6" width="1" height="1" fill="#A88830"/><rect x="8" y="7" width="1" height="1" fill="#A88830"/><rect x="9" y="8" width="1" height="1" fill="#A88830"/><rect x="3" y="8" width="4" height="3" fill="#F0EED8"/><rect x="4" y="9" width="2" height="2" fill="#2A1800"/><rect x="10" y="7" width="5" height="5" fill="#C8A000"/><rect x="11" y="8" width="3" height="3" fill="#F0EED8"/><rect x="12" y="9" width="1" height="1" fill="#2A1800"/><rect x="4" y="12" width="8" height="1" fill="#C8A000"/><rect x="5" y="14" width="6" height="1" fill="#CC1818"/><rect x="7" y="13" width="2" height="3" fill="#CC1818"/><rect x="7" y="14" width="2" height="1" fill="#FF4444"/></svg>`,
};

const SITE_AVATARS=[
  {key:'shrek',    name:'Shrek',    color:'#4a7020', bg:'#F0E8C0'},  /* swamp fog / fen mist */
  {key:'donkey',   name:'Donkey',   color:'#7B6555', bg:'#E8C8D8'},  /* dusty rose — warm & goofy */
  {key:'puss',     name:'Puss',     color:'#D07020', bg:'#A8C8E0'},  /* Zorro velvet blue */
  {key:'fiona',    name:'Fiona',    color:'#A03060', bg:'#FFD8EC'},  /* princess rose */
  {key:'farquaad', name:'Farquaad', color:'#8B0000', bg:'#DDD8CC'},  /* castle stone */
  {key:'gingy',    name:'Gingy',    color:'#C87941', bg:'#C8ECD8'},  /* Christmas sage */
  {key:'fairy',    name:'Fairy GM', color:'#C050A0', bg:'#DDD0FF'},  /* fairy dust lavender */
  {key:'dragon',   name:'Dragon',   color:'#8B0090', bg:'#FFCCA8'},  /* dragon fire / ember */
  {key:'pino',     name:'Pino',     color:'#CC2020', bg:'#C4E4FF'},  /* Italian sky */
  {key:'humpty',   name:'Humpty',   color:'#C8A000', bg:'#C8E0F0'},  /* nursery wall blue */
];

/* ════════════════════════════════════
   GHOST CURSORS — rebuild (works on desktop + mobile)
   Strategy: dedicated fixed overlay div, position children
   with left/top % (no transforms, no opacity tricks).
════════════════════════════════════ */
const GHOST_USERS = [
  { id:'shrek',  name:'Shrek',  color:'#2e7a18' },
  { id:'donkey', name:'Donkey', color:'#b85c10' },
];

function initGhosts() {
  /* Idempotent — bail if already built */
  if (document.getElementById('ghost-layer')) return;

  /* Create the fullscreen overlay that ghosts live inside */
  const layer = document.createElement('div');
  layer.id = 'ghost-layer';
  document.body.appendChild(layer);

  GHOST_USERS.forEach((g, i) => {
    const el = document.createElement('div');
    el.className = 'gcur';
    el.id = 'gcur-' + g.id;

    el.innerHTML =
      `<svg width="20" height="22" viewBox="3 2 27 27" fill="none">` +
      `<path d="M12.5448 26L6.72762 5.59339L26 14.8132L17.1816 17.9377L12.5448 26Z" fill="${g.color}"/>` +
      `<path d="M6.9457 5.14539L26.2178 14.3651L27.2985 14.8826L26.1697 15.2813L17.5259 18.3444L12.9812 26.2464L12.3881 27.2792L12.0614 26.1349L6.24434 5.72851L5.94119 4.66488L6.9457 5.14539Z" fill="none" stroke="#fff" stroke-width="1"/>` +
      `</svg>` +
      `<div class="gtag" style="background:${g.color}">${g.name}</div>`;

    /* Start positions: staggered so they aren't stacked */
    el.style.left = (22 + i * 35) + '%';
    el.style.top  = (28 + i * 22) + '%';

    layer.appendChild(el);
    g.el = el;

    /* Kick off drifting — immediate, tiny stagger */
    setTimeout(() => driftGhost(g), i * 80);
  });
}

function driftGhost(g) {
  if (!g.el) return;
  /* New target: random position within safe viewport bounds */
  const newLeft = 8  + Math.random() * 72; /* 8%-80% */
  const newTop  = 8  + Math.random() * 68; /* 8%-76% */
  const dur     = 3  + Math.random() * 4;  /* 3-7 s   */
  const pause   = 1200 + Math.random() * 3200; /* 1.2-4.4 s pause */

  /* Override the CSS transition duration for this move */
  g.el.style.transitionDuration = dur.toFixed(2) + 's';
  g.el.style.left = newLeft.toFixed(1) + '%';
  g.el.style.top  = newTop.toFixed(1) + '%';

  clearTimeout(g._driftTimer);
  g._driftTimer = setTimeout(() => driftGhost(g), dur * 1000 + pause);
}

/* ── Move a ghost to specific viewport % coords ── */
function moveGhostTo(g, leftPct, topPct, durSec) {
  if (!g.el) return;
  clearTimeout(g._driftTimer);
  g._driftTimer = null;
  g.el.style.transitionDuration = durSec.toFixed(2) + 's';
  g.el.style.left = leftPct.toFixed(1) + '%';
  g.el.style.top  = topPct.toFixed(1)  + '%';
}

/* ── Show Figma-style speech bubble on a ghost cursor.
   The bubble replaces the name tag visually — gtag hides while active. ── */
function showGhostChat(g, text) {
  if (!g.el) return;
  /* hide name tag while chatting */
  const tag = g.el.querySelector('.gtag');
  if (tag) tag.style.opacity = '0';

  let chat = g.el.querySelector('.gchat');
  if (!chat) {
    chat = document.createElement('div');
    chat.className = 'gchat';
    chat.style.background = g.color; /* bubble = cursor color */
    g.el.appendChild(chat);
  }
  chat.textContent = '';
  chat.style.opacity = '1';
  let i = 0;
  function typeNext() {
    if (i <= text.length) {
      chat.textContent = text.slice(0, i++);
      chat._tt = setTimeout(typeNext, 38 + Math.random() * 22);
    }
  }
  typeNext();
}

function hideGhostChat(g) {
  if (!g.el) return;
  const chat = g.el.querySelector('.gchat');
  if (!chat) return;
  clearTimeout(chat._tt);
  chat.style.opacity = '0';
  setTimeout(() => {
    try { chat.remove(); } catch(e){}
    /* restore name tag */
    const tag = g.el?.querySelector('.gtag');
    if (tag) tag.style.opacity = '1';
  }, 250);
}

/* ════════════════════════════════════
   GHOST ONBOARDING SCRIPT
   Runs once automatically after modal close (desktop only).
   Phase 1 — Shrek alone drifts to toolbar, casually hovers 2 nav buttons.
             Donkey keeps drifting randomly in the background.
   Phase 2 — Figma cursor-chat conversation between Shrek + Donkey,
             with natural gaps so it feels like a real exchange.
════════════════════════════════════ */
function runGhostScript() {
  const shrek  = GHOST_USERS.find(g => g.id === 'shrek');
  const donkey = GHOST_USERS.find(g => g.id === 'donkey');
  if (!shrek?.el || !donkey?.el) return;

  /* Freeze both ghosts immediately — snap to current mid-transition position */
  [shrek, donkey].forEach(g => {
    clearTimeout(g._driftTimer);
    g._driftTimer = null;
    const cs = getComputedStyle(g.el);
    g.el.style.transitionDuration = '0s';
    g.el.style.left = cs.left;
    g.el.style.top  = cs.top;
  });

  setTimeout(() => showGhostChat(shrek,  "What are you doing in my swamp?!"),  500);
  setTimeout(() => hideGhostChat(shrek),                                        5000);

  setTimeout(() => showGhostChat(donkey, "...this is a portfolio Shrek \u{1F434}"), 6500);
  setTimeout(() => {
    hideGhostChat(donkey);
    /* Resume drifting for both after the full exchange */
    setTimeout(() => { driftGhost(shrek); driftGhost(donkey); }, 400);
  }, 11500);
}

/* ════════════════════════════════════
   COMMENTS  — seed + localStorage
════════════════════════════════════ */
const SEED_CMTS = [
  { id:'s1', name:'Shrek',         color:'#4a7020',
    text:`Onions have layers. Ogres have layers. Why doesn't your nav have layers?! I got lost in your dropdown menu and had to build a new swamp.`,
    ts: Date.now() - 2*86400000 },
  { id:'s2', name:'Donkey',        color:'#7B6555',
    text:`Pick me! Pick me! I asked the developer if this was feasible and he just stared at me like I asked him to fly.`,
    ts: Date.now() - 2*86400000 + 360000 },
  { id:'s3', name:'Fiona',         color:'#A03060',
    text:'By day it looks professional, by night it turns into a monster, just like your Dark Mode that breaks on mobile. Fix it before someone discovers the black magic.',
    ts: Date.now() - 86400000 },
  { id:'s4', name:'Puss in Boots', color:'#D07020',
    text:`My big innocent eyes can't find the CTA button. You hid it too well, señor, almost like my sword, pretty but unclear how to draw.`,
    ts: Date.now() - 8*3600000 },
  { id:'s7', name:'Ori Cohen',     color:'#7B61FF', initials:'OC',
    text:'filed under: valid feedback. will revisit in Q3.',
    ts: Date.now() - 2*3600000 },
];

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)   return 'just now';
  if (d < 3600000) return Math.floor(d/60000)   + 'm ago';
  if (d < 86400000)return Math.floor(d/3600000)  + 'h ago';
  return Math.floor(d/86400000) + 'd ago';
}

/* User comments — in-memory array, persisted to localStorage.
   Comments expire after 1 hour (TTL_CMTS). */
const _userCmts = [];
const LS_CMTS   = 'ori-comments-v3';
const TTL_CMTS  = 60 * 60 * 1000; /* 1 hour in ms */
(function(){
  try {
    const saved = JSON.parse(localStorage.getItem(LS_CMTS) || '[]');
    const now = Date.now();
    if (Array.isArray(saved)) {
      const fresh = saved.filter(c => now - c.ts < TTL_CMTS);
      fresh.forEach(c => _userCmts.push(c));
      /* write back immediately so stale entries are pruned from storage */
      localStorage.setItem(LS_CMTS, JSON.stringify(fresh));
    }
  } catch(e) {}
})();
function _saveCmts() {
  try {
    const now = Date.now();
    localStorage.setItem(LS_CMTS, JSON.stringify(_userCmts.filter(c => now - c.ts < TTL_CMTS).slice(-50)));
  } catch(e) {}
}

function renderComments() {
  const cl = document.getElementById('rp-cl'); if (!cl) return;
  const all = [...SEED_CMTS, ..._userCmts].sort((a,b)=>a.ts-b.ts);
  const cc  = document.getElementById('rp-cc');
  if (cc) cc.textContent = all.length;
  cl.innerHTML = '';
  all.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'rpc';
    const portraitKey = {shrek:'shrek',donkey:'donkey','ori cohen':'ori',fiona:'fiona','puss in boots':'puss','lord farquaad':'farquaad',gingy:'gingy',fairy:'fairy',dragon:'dragon',pino:'pino',humpty:'humpty'}[c.name.toLowerCase()];
    let facePart;
    if (portraitKey === 'ori') {
      facePart = `<img src="${ORI_PHOTO}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block" alt="Ori Cohen">`;
    } else if (portraitKey && PORTRAITS[portraitKey]) {
      facePart = PORTRAITS[portraitKey].replace('width="28" height="28"', 'width="22" height="22"');
    } else {
      facePart = `<span style="font-size:8px;font-weight:800">${(c.initials||c.name.slice(0,2)).toUpperCase()}</span>`;
    }
    div.innerHTML = `
      <div class="rpc-header">
        <div class="rpc-av" style="background:${c.color}">${facePart}</div>
        <span class="rpc-author">${c.name}</span>
        <span class="rpc-time">${timeAgo(c.ts)}</span>
      </div>
      <div class="rpc-text">${c.text.replace(/</g,'&lt;')}</div>`;
    cl.appendChild(div);
  });
  cl.scrollTop = cl.scrollHeight;
}

function postComment() {
  const ta = document.getElementById('rp-ta');
  const txt = ta.value.trim(); if (!txt) return;
  const name = (ctagEl ? ctagEl.textContent.trim() : '') || 'Visitor';
  const cmt = { id:'u'+Date.now(), name, color:'#DD2590', face:null,
    initials:name.slice(0,2).toUpperCase(), text:txt, ts:Date.now() };
  _userCmts.push(cmt);
  _saveCmts();
  ta.value = ''; ta.style.height = '';
  syncSendBtn();
  renderComments();
  showToast('Comment posted 💬');
  /* Email notification — fire-and-forget, silent on error */
  fetch('https://formsubmit.co/ajax/oricohenw@gmail.com', {
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body: JSON.stringify({
      _subject: 'New portfolio comment from ' + name,
      name, message: txt,
      _captcha: 'false'
    })
  }).catch(()=>{});
}

function syncSendBtn() {
  const ta = document.getElementById('rp-ta');
  const sb = document.getElementById('rp-sb');
  if (ta && sb) sb.disabled = ta.value.trim().length === 0;
}

function initComments() {
  renderComments();
  const ta = document.getElementById('rp-ta');
  const sb = document.getElementById('rp-sb');
  if (!ta||!sb) return;
  ta.addEventListener('input', () => {
    syncSendBtn();
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 72) + 'px';
  });
  ta.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && e.key==='Enter' && !sb.disabled) { e.preventDefault(); postComment(); }
  });
}

/* ── JS tooltip (works inside overflow:hidden panels) ── */
let _jtip = null;
function jTipShow(el, text) {
  if (!_jtip) {
    _jtip = document.createElement('div');
    _jtip.style.cssText = 'position:fixed;background:#1C1C1C;color:#fff;font-size:11px;font-weight:500;font-family:Inter,system-ui,sans-serif;padding:5px 9px;border-radius:6px;white-space:nowrap;pointer-events:none;z-index:9500;opacity:0;transition:opacity .15s;transform:translateX(-50%)';
    document.body.appendChild(_jtip);
  }
  const r = el.getBoundingClientRect();
  _jtip.textContent = text;
  _jtip.style.left  = (r.left + r.width / 2) + 'px';
  _jtip.style.top   = (r.top - 10) + 'px';
  _jtip.style.transform = 'translateX(-50%) translateY(-100%)';
  requestAnimationFrame(() => { _jtip.style.opacity = '1'; });
}
function jTipHide() {
  if (_jtip) _jtip.style.opacity = '0';
}
function attachJTip(el, text) {
  el.addEventListener('mouseenter', () => jTipShow(el, text));
  el.addEventListener('mouseleave', jTipHide);
}

function initPortraitAvatars() {
  const container = document.getElementById('rp-avatars');
  if (!container) return;
  const ORI_PHOTO = "Assets/Media/general/ori-profile.webp";
  const members = [
    { id:'ori',    name:'Ori Cohen', color:'#7B61FF', portrait:`<img src="${ORI_PHOTO}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block" alt="Ori Cohen" onerror="this.style.display='none'">` },
    { id:'shrek',  name:'Shrek',     color:'#2e7a18', portrait: PORTRAITS.shrek  },
    { id:'donkey', name:'Donkey',    color:'#b85c10', portrait: PORTRAITS.donkey },
  ];
  container.innerHTML = '';
  members.forEach(m => {
    const av = document.createElement('div');
    av.className = 'rp-av';
    av.style.background = m.color;
    av.innerHTML = `${m.portrait}<div class="rp-av-dot"></div>`;
    attachJTip(av, m.name);
    container.appendChild(av);
  });
}

function addVisitorPresence(name, avatarId) {
  const container = document.getElementById('rp-avatars');
  if (!container || document.getElementById('rp-av-visitor')) return;
  const av = document.createElement('div');
  av.className = 'rp-av'; av.id = 'rp-av-visitor';
  if (avatarId != null && typeof SITE_AVATARS !== 'undefined') {
    const d = SITE_AVATARS[avatarId]||SITE_AVATARS[0];
    av.style.background = d.color;
    const svg = (PORTRAITS[d.key]||'').replace(/width="28" height="28"/,'width="20" height="20"');
    av.innerHTML = `${svg}<div class="rp-av-dot"></div>`;
  } else {
    const initial = (name.trim()[0] || '?').toUpperCase();
    av.style.background = '#DD2590';
    av.innerHTML = `<span style="font-size:11px;font-weight:900;position:relative;z-index:1">${initial}</span><div class="rp-av-dot"></div>`;
  }
  attachJTip(av, name + ' (you)');
  container.appendChild(av);
  const cnt = document.getElementById('rp-online-count');
  if (cnt) cnt.textContent = parseInt(cnt.textContent||3) + 1;
}

/* Ghosts only on desktop — touch devices don't need cursor presence */
initGhosts();

window.addEventListener('load', () => {
  initPortraitAvatars();
  initComments();
});

/* ════════════════════════════════════
   CONTRAST QUEST v2 — PIXEL EDITION
════════════════════════════════════ */
(function(){

  /* ── WCAG helpers ── */
  function chan(c){c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4);}
  function lum(r,g,b){return .2126*chan(r)+.7152*chan(g)+.0722*chan(b);}
  function hex2rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};}
  function contrast(h1,h2){const c1=hex2rgb(h1),c2=hex2rgb(h2),l1=lum(c1.r,c1.g,c1.b),l2=lum(c2.r,c2.g,c2.b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return(hi+.05)/(lo+.05);}
  function lightnessHex(l){const v=Math.round(l*2.55).toString(16).padStart(2,'0');return '#'+v+v+v;}

  /* ── Avatar helpers (use global SITE_AVATARS + PORTRAITS) ── */
  function avData(id){ if(id===null||id===undefined) return null; return SITE_AVATARS[id]||SITE_AVATARS[0]; }
  function avSvg(id,sz){ const d=avData(id); if(!d) return ''; return (PORTRAITS[d.key]||'').replace(/width="28" height="28"/,`width="${sz}" height="${sz}"`); }
  function avBox(id,sz,border,fallbackInit){
    const d=avData(id);
    if(!d) return `<div style="width:${sz}px;height:${sz}px;border:2px solid ${border||'#1A1A3A'};background:#1A1A3A;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Press Start 2P',monospace;font-size:${Math.max(7,Math.floor(sz*0.35))}px;color:#9292C8">${(fallbackInit||'?')}</div>`;
    return `<div style="width:${sz}px;height:${sz}px;background:${d.bg};border:2px solid ${border||d.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${avSvg(id,sz-4)}</div>`;
  }

  /* ── Ranks (English) ── */
  const RANKS=[
    [240,301,'★ WCAG MASTER ★',  '#FFD700','WCAG MASTER!<br>4.5:1 flows in your veins.<br>The design gods are proud. 🏆'],
    [150,240,'◆ DESIGN PRO ◆',   '#00F5FF','YOU KNOW THE GAME.<br>The WCAG council is watching. 💪'],
    [90, 150,'○ ALMOST THERE ○', '#FF00FF','SO CLOSE!<br>Your eyes are learning. Keep going! 🎯'],
    [0,  90, '× KEEP GOING ×',   '#FF6B35', "GOOD EFFORT!<br>Your eyes are calibrating.<br>Play again! 💙"],
  ];

  const BG_POOL=['#FF6B35','#7B2D8B','#2E86AB','#A23B72','#C87941','#C73E1D','#1B4332','#44BBA4','#E94F37','#2C3E6B','#6A0572','#1D3557','#8B4513','#006994'];

  function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

  /* ── State ── */
  let ST={};

  /* ── localStorage ── */
  const LS_USER='portfolio_v1',LS_SCORES='cq_v3';
  function getUser(){try{return JSON.parse(localStorage.getItem(LS_USER)||'null');}catch{return null;}}
  function putUser(u){try{localStorage.setItem(LS_USER,JSON.stringify(u));}catch{}}
  function getScores(){try{return JSON.parse(localStorage.getItem(LS_SCORES)||'[]');}catch{return[];}}
  function putScores(s){try{localStorage.setItem(LS_SCORES,JSON.stringify(s));}catch{}}

  /* ── Screen helper ── */
  function show(id){
    ['px-title','px-play','px-result','px-end','px-board'].forEach(s=>{
      const e=document.getElementById(s);if(e)e.style.display='none';
    });
    const e=document.getElementById(id);if(e)e.style.display='flex';
  }

  window.pxGoSetup=function(){
    if(typeof window.reopenModal==='function') window.reopenModal();
  };

  /* ── Title ── */
  function refreshTitle(){
    const u=getUser();
    const hi=getScores().reduce((m,s)=>Math.max(m,s.score),0);
    const avId=(u&&u.avatarId!=null)?u.avatarId:null;
    const d=avData(avId);
    const cardAv=document.getElementById('px-card-av');
    const cardName=document.getElementById('px-card-name');
    const hiEl=document.getElementById('px-hiscore');
    const initLetter=(u&&u.name?u.name.trim()[0]:'?').toUpperCase();
    if(cardAv){
      if(d){cardAv.innerHTML=avSvg(avId,24);cardAv.style.borderColor=d.color;cardAv.style.background=d.bg;}
      else{cardAv.innerHTML=`<span style="font-family:'Press Start 2P',monospace;font-size:9px;color:#9292C8">${initLetter}</span>`;cardAv.style.borderColor='#1A1A3A';cardAv.style.background='#0E0E22';}
    }
    if(cardName)cardName.textContent=(u?u.name:'PLAYER ONE').toUpperCase();
    if(hiEl)hiEl.textContent='BEST: '+hi+' PTS';
  }

  window.pxGoTitle=function(){refreshTitle();show('px-title');};

  /* ── Leaderboard ── */
  window.pxShowBoard=function(){
    const allScores=getScores().slice().sort((a,b)=>b.score-a.score);
    const list=document.getElementById('px-board-list');if(!list)return;
    if(!allScores.length){
      list.innerHTML='<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:#9292C8;text-align:center;padding:80px 20px">NO SCORES YET.<br><br>BE THE FIRST!</div>';
      show('px-board');return;
    }
    const u=getUser();
    const userName=u?u.name:null;
    /* find best score entry for current user */
    const myIdx=userName?allScores.findIndex(s=>s.name===userName):-1;
    function scoreRow(s,rank,highlight){
      const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':`#${rank}`;
      /* border fades with rank; highlight overrides with cyan */
      const borderColor=highlight?'#00F5FF':rank===1?'#FFD700':rank===2?'#C8C8C8':rank===3?'#CD7F32':rank===4?'#2A2A4A':'#1A1A28';
      const borderW=highlight?2:rank===1?2:rank===2?2:rank===3?1:rank===4?1:1;
      const borderLW=highlight?4:rank===1?4:rank===2?3:rank===3?2:rank===4?2:1;
      const bg=highlight?'#081820':rank===1?'#0F0F24':rank===2?'#0C0C1E':rank===3?'#0A0A1A':rank===4?'#090914':'#080810';
      const rankColor=rank<=3?'#9292C8':'#D0D0FF';
      const avHtml=avBox(s.avatarId,34,borderColor,(s.name||'?')[0].toUpperCase());
      const pct=Math.round((s.score/300)*100);
      return `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:${bg};border:${borderW}px solid ${borderColor};border-left:${borderLW}px solid ${borderColor}">
        <div style="font-family:'Press Start 2P',monospace;font-size:${rank<=3?'14':'9'}px;color:${rankColor};width:24px;flex-shrink:0;text-align:center;line-height:1">${medal}</div>
        ${avHtml}
        <div style="flex:1;min-width:0">
          <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:${highlight?'#00F5FF':'#E0E0FF'};margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name||'???'}</div>
          <div style="height:3px;background:#080816"><div style="height:100%;background:linear-gradient(90deg,#00F5FF,#FF00FF);width:${pct}%"></div></div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:#FFD700">${s.score}</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:6px;color:#7878AA;margin-top:3px">${s.date||''}</div>
        </div>
      </div>`;
    }
    const top5=allScores.slice(0,5);
    let html=top5.map((s,i)=>scoreRow(s,i+1,false)).join('');
    /* always show current player below divider */
    if(myIdx>=0){
      const myEntry=allScores[myIdx];
      html+=`<div style="display:flex;align-items:center;gap:6px;padding:8px 12px">
        <div style="flex:1;height:1px;background:#2A2A4A"></div>
        <div style="font-family:'Press Start 2P',monospace;font-size:6px;color:#5A5A8A;letter-spacing:1px">YOUR RANK</div>
        <div style="flex:1;height:1px;background:#2A2A4A"></div>
      </div>`;
      html+=scoreRow(myEntry,myIdx+1,true);
    }
    list.innerHTML=html;
    show('px-board');
  };

  /* ── Game ── */
  window.pxStartGame=function(){
    const bgs=shuffle(BG_POOL).slice(0,3);
    ST={round:0,score:0,bgs,curBg:'',curFg:'',roundScores:[0,0,0]};
    loadRound();
  };

  function loadRound(){
    ST.curBg=ST.bgs[ST.round];
    document.getElementById('px-sl').value=50;
    document.getElementById('px-preview').style.background=ST.curBg;
    document.getElementById('px-rnd-lbl').textContent=`ROUND ${ST.round+1}/3`;
    document.getElementById('px-pts-lbl').textContent=`${ST.score} PTS`;
    show('px-play');
    pxUpdate();
  }

  window.pxUpdate=function(){
    const fg=lightnessHex(parseInt(document.getElementById('px-sl').value));
    ST.curFg=fg;
    ['px-txt-a','px-txt-b','px-txt-c'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.color=fg;});
  };

  window.pxLockIn=function(){
    const ratio=contrast(ST.curBg,ST.curFg);
    const dist=Math.abs(ratio-4.5);
    const pts=Math.max(0,Math.round(100-dist*50));
    ST.roundScores[ST.round]=pts;
    ST.score+=pts;
    showResult(ratio,dist,pts);
  };

  function showResult(ratio,dist,pts){
    document.getElementById('px-r-ratio').textContent=ratio.toFixed(2)+':1';
    const diffEl=document.getElementById('px-r-diff');
    const perfect=dist<0.05;
    diffEl.textContent=perfect?'✓ PERFECT!':dist.toFixed(2);
    diffEl.style.color=perfect?'#00FF7F':dist<0.3?'#FFD700':dist<0.8?'#FF6B35':'#FF3355';
    document.getElementById('px-r-pts').textContent='+'+pts;
    document.getElementById('px-pts-lbl').textContent=`${ST.score} PTS`;
    const totalEl=document.getElementById('px-r-total');
    if(totalEl)totalEl.innerHTML=`TOTAL: <span style="color:#FFD700">${ST.score}</span> PTS`;
    const btn=document.getElementById('px-next-btn');
    if(btn){
      if(ST.round>=2){btn.textContent='SEE RESULTS';btn.onclick=pxShowEnd;}
      else{btn.textContent=`ROUND ${ST.round+2}`;btn.onclick=pxNextRound;}
    }
    show('px-result');
  }

  window.pxNextRound=function(){ST.round++;loadRound();};

  window.pxShowEnd=function(){
    const s=ST.score;
    const u=getUser()||{name:'PLAYER ONE',avatarId:0};
    const d=avData(u.avatarId);

    const scoreEl=document.getElementById('px-end-score');
    if(scoreEl)scoreEl.textContent='0';

    const endAv=document.getElementById('px-end-av');
    if(endAv){
      if(d){endAv.innerHTML=avSvg(u.avatarId,66);endAv.style.background=d.bg;endAv.style.borderColor=d.color;}
      else{const init=(u.name||'?')[0].toUpperCase();endAv.innerHTML=`<span style="font-family:'Press Start 2P',monospace;font-size:20px;color:#9292C8">${init}</span>`;endAv.style.background='#0E0E22';endAv.style.borderColor='#1A1A3A';}
    }
    const endName=document.getElementById('px-end-name');
    if(endName)endName.textContent=u.name||'PLAYER ONE';

    /* auto-save score to leaderboard */
    const scores=getScores();
    scores.push({name:u.name,avatarId:u.avatarId,score:ST.score,date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'2-digit'})});
    scores.sort((a,b)=>b.score-a.score);
    if(scores.length>20)scores.length=20;
    putScores(scores);

    show('px-end');

    /* count-up animation */
    setTimeout(()=>{
      const el=document.getElementById('px-end-score');if(!el)return;
      let cur=0;const step=Math.max(1,Math.ceil(s/30));
      const iv=setInterval(()=>{cur=Math.min(cur+step,s);el.textContent=cur;if(cur>=s)clearInterval(iv);},30);
    },300);

    setTimeout(pxConfetti,500);
  };

  /* ── Save score ── */
  window.pxSaveScore=function(){
    const u=getUser()||{name:'PLAYER ONE',avatarId:0};
    const scores=getScores();
    scores.push({name:u.name,avatarId:u.avatarId,score:ST.score,date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'2-digit'})});
    scores.sort((a,b)=>b.score-a.score);
    if(scores.length>20)scores.length=20;
    putScores(scores);
    pxShowBoard();
  };

  /* ── Pixel confetti ── */
  function pxConfetti(){
    const cv=document.getElementById('px-cvc');if(!cv)return;
    const ctx=cv.getContext('2d');
    const dpr=window.devicePixelRatio||1;
    cv.width=cv.offsetWidth*dpr;cv.height=cv.offsetHeight*dpr;
    ctx.scale(dpr,dpr);
    const W=cv.offsetWidth,H=cv.offsetHeight;
    const cols=['#00F5FF','#FF00FF','#00FF7F','#FFD700','#FF6B35','#FF3399'];
    const ps=Array.from({length:100},()=>({x:W*.5+(Math.random()-.5)*W*.6,y:H*.3,vx:(Math.random()-.5)*9,vy:-Math.random()*13-3,sz:(Math.floor(Math.random()*3)+2)*4,c:cols[Math.floor(Math.random()*cols.length)]}));
    (function draw(){
      ctx.clearRect(0,0,W,H);let alive=false;
      ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.28;p.vx*=.99;if(p.y<H+20)alive=true;ctx.globalAlpha=Math.max(0,1-p.y/(H*1.1));ctx.fillStyle=p.c;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.sz,p.sz);});
      if(alive)requestAnimationFrame(draw);
    })();
  }

  /* ── Boot ── */
  (function init(){
    refreshTitle();
    show('px-title');
  })();

})();

/* ════════════════════════════════════
   IFRAME CURSOR FIX
   When the mouse moves over an embedded iframe the parent
   document stops receiving mousemove, freezing the custom
   cursor.  We detect hover position relative to the iframe
   bounds and hide/show accordingly.
════════════════════════════════════ */
(function() {
  function setupIframeCursor(winEl) {
    const iframe = winEl.querySelector('.proj-iframe');
    if (!iframe || winEl._iframeListeners) return;
    winEl._iframeListeners = true;
    const c = () => document.getElementById('cursor');

    /* The iframe relays mousemove via postMessage (see IFRAME MOUSEMOVE handler below).
       On mouseleave restore visibility in case it was hidden by any other path. */
    iframe.addEventListener('mouseleave', () => {
      const el = c(); if (el) el.style.visibility = '';
    });
  }

  /* Attach to all current & future project windows */
  document.querySelectorAll('.win').forEach(setupIframeCursor);
  /* Also re-run whenever openWin is called (just to be safe) */
  const _orig = window.openWin;
  window.openWin = function(id) {
    _orig(id);
    const w = document.getElementById('win-' + id);
    if (w) setupIframeCursor(w);
  };
})();

/* ════════════════════════════════════
   IFRAME MOUSEMOVE — keep custom cursor alive inside project iframes
   The iframe sends its local clientX/Y; we offset by the iframe's
   bounding rect to get absolute coordinates in the parent viewport.
════════════════════════════════════ */
window.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'iframe-mm') return;
  /* Find which iframe sent the message */
  const iframes = document.querySelectorAll('.proj-iframe');
  let src = null;
  for (const f of iframes) { try { if (f.contentWindow === e.source) { src = f; break; } } catch(_){} }
  if (!src) return;
  const r = src.getBoundingClientRect();
  const absX = r.left + e.data.x;
  const absY = r.top  + e.data.y;
  const el = document.getElementById('cursor');
  if (!el) return;
  el.style.visibility = '';
  const [ox, oy] = CUR_OFFSET[curState] || [4, 4];
  el.style.transform = `translate(${absX - ox}px,${absY - oy}px)`;
});

/* ════════════════════════════════════
   SITE MENU DROPDOWN
════════════════════════════════════ */
function toggleSiteMenu(trigger) {
  const menu = document.getElementById('site-menu');
  const wasOpen = menu.classList.contains('open');
  // Close everything first
  closeSiteMenu();
  if (wasOpen) return;
  // Position below trigger
  const rect = trigger.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.top  = (rect.bottom + 6) + 'px';
  // Make sure it doesn't overflow right edge
  requestAnimationFrame(() => {
    const mw = menu.offsetWidth;
    const vw = window.innerWidth;
    if (rect.left + mw + 8 > vw) {
      menu.style.left = Math.max(8, vw - mw - 8) + 'px';
    }
  });
  menu.classList.add('open');
  trigger.classList.add('open');
}

function closeSiteMenu() {
  document.getElementById('site-menu').classList.remove('open');
  const tp = document.getElementById('title-pill');
  const mv = document.getElementById('mv-logo-trigger');
  if (tp) tp.classList.remove('open');
  if (mv) mv.classList.remove('open');
}

function sharePortfolio(el) {
  const url = 'https://oricohen.co/';
  const doShare = () => {
    const savedHTML = el.innerHTML;
    el.classList.add('share-copied');
    el.innerHTML = `<i class="ph ph-check" style="font-size:16px;color:var(--figma)"></i>Copied to clipboard`;
    setTimeout(() => { el.innerHTML = savedHTML; el.classList.remove('share-copied'); }, 2200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(doShare).catch(doShare);
  } else {
    try { const ta = Object.assign(document.createElement('textarea'), {value:url,style:'position:fixed;opacity:0'}); document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch(e) {}
    doShare();
  }
}

// Close menu on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('#site-menu') && !e.target.closest('#title-pill') && !e.target.closest('#mv-logo-trigger')) {
    closeSiteMenu();
  }
}, true);

/* ── Keyboard accessibility for primary clickable UI ──
   Window chrome, toolbar buttons, project cards/rows, and view toggles are
   plain divs with onclick — this makes them reachable and operable by keyboard
   without changing their markup/styling. */
(function () {
  const SELECTOR = '.wc, .bb-btn, .pg-card, .pl-row, #vt-grid, #vt-list';
  document.querySelectorAll(SELECTOR).forEach(function (el) {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role') && el.hasAttribute('onclick')) el.setAttribute('role', 'button');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target.closest(SELECTOR);
    if (!el) return;
    e.preventDefault();
    el.click();
  });
})();
