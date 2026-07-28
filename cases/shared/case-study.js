/*
 * case-study.js — shared JS for all case study pages
 *
 * Carousel config is read from the DOM at runtime:
 *   - CAR_TOTAL: <div id="carousel" data-total="4">
 *   - Video src for lightbox: read from each slide's <video><source src="">
 *
 * Each page includes whichever lightbox HTML it needs:
 *   Image lightbox: <div class="lbx" id="lightbox"> ... </div>
 *   Video lightbox: <div class="vlbx" id="vlbx"> ... </div>
 */

/* ── Theme sync — parent portfolio sends postMessage ─────────────────────── */
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'theme') {
    document.documentElement.setAttribute('data-theme', e.data.dark ? 'dark' : 'light');
  }
});

/* ── Relay mousemove so the portfolio's custom cursor tracks inside iframes ─ */
document.addEventListener('mousemove', function(e) {
  try { window.parent.postMessage({type:'iframe-mm', x:e.clientX, y:e.clientY}, '*'); } catch(err){}
}, { passive: true });

/* ── Carousel ────────────────────────────────────────────────────────────── */
var carIdx = 0;
var carEl = document.getElementById('carousel');
var CAR_TOTAL = carEl ? parseInt(carEl.getAttribute('data-total') || '4', 10) : 4;

function carUpdate() {
  document.getElementById('carousel-track').style.transform = 'translateX(-' + (carIdx * 100) + '%)';
  document.getElementById('car-counter').textContent = (carIdx + 1) + ' / ' + CAR_TOTAL;
  /* Show zoom button only when the current slide has media worth zooming */
  var zoomBtn = document.querySelector('.carousel-zoom');
  if (zoomBtn) {
    var slide = document.querySelectorAll('.carousel-slide')[carIdx];
    var hasVideo = slide && slide.querySelector('video');
    var hasImgLightbox = slide && slide.getAttribute('onclick');
    zoomBtn.style.display = (hasVideo || hasImgLightbox) ? 'flex' : 'none';
  }
}

function carMove(dir) {
  /* Pause all videos and reset play/pause state */
  document.querySelectorAll('.carousel-slide').forEach(function(slide) {
    var vid = slide.querySelector('video');
    var playBtn = slide.querySelector('.car-play');
    var pauseBtn = slide.querySelector('.car-pause');
    if (vid) { vid.pause(); vid.currentTime = 0; }
    if (playBtn) playBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.remove('playing');
  });
  carIdx = (carIdx + dir + CAR_TOTAL) % CAR_TOTAL;
  carUpdate();
}

/* ── Video play / pause ──────────────────────────────────────────────────── */
function playVid(idx) {
  var slide = document.querySelectorAll('.carousel-slide')[idx];
  var vid = slide ? slide.querySelector('video') : null;
  if (!vid) return;
  var playBtn = slide.querySelector('.car-play');
  var pauseBtn = slide.querySelector('.car-pause');
  vid.play();
  if (playBtn) playBtn.classList.add('hidden');
  if (pauseBtn) pauseBtn.classList.add('playing');
  vid.onended = function() {
    vid.currentTime = 0;
    if (playBtn) playBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.remove('playing');
  };
}

function pauseVid(idx) {
  var slide = document.querySelectorAll('.carousel-slide')[idx];
  var vid = slide ? slide.querySelector('video') : null;
  if (!vid) return;
  var playBtn = slide.querySelector('.car-play');
  var pauseBtn = slide.querySelector('.car-pause');
  vid.pause();
  if (playBtn) playBtn.classList.remove('hidden');
  if (pauseBtn) pauseBtn.classList.remove('playing');
}

/* ── Video lightbox ──────────────────────────────────────────────────────── */
function openVideoLightbox() {
  var slide = document.querySelectorAll('.carousel-slide')[carIdx];
  if (!slide) return;
  var srcEl = slide.querySelector('video source');
  if (!srcEl) return;
  var src = srcEl.getAttribute('src');
  var lbx = document.getElementById('vlbx');
  var lbxVid = document.getElementById('vlbx-vid');
  if (!lbx || !lbxVid || !src) return;
  var srcVid = slide.querySelector('video');
  lbxVid.src = src;
  lbxVid.load();
  if (srcVid && !srcVid.paused) {
    lbxVid.addEventListener('canplay', function onCanPlay() {
      lbxVid.currentTime = srcVid.currentTime;
      lbxVid.play();
      lbxVid.removeEventListener('canplay', onCanPlay);
    });
  }
  lbx.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeVideoLightbox() {
  var lbx = document.getElementById('vlbx');
  var lbxVid = document.getElementById('vlbx-vid');
  if (!lbx) return;
  if (lbxVid) { lbxVid.pause(); lbxVid.src = ''; }
  lbx.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Image lightbox ──────────────────────────────────────────────────────── */
var lbxIdx = 0;

function openLightbox(idx) {
  lbxIdx = idx;
  lbxRender();
  var lbx = document.getElementById('lightbox');
  if (!lbx) return;
  lbx.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(e) {
  var lbx = document.getElementById('lightbox');
  if (!lbx) return;
  if (e && e.target !== lbx) return;
  lbx.classList.remove('open');
  document.body.style.overflow = '';
}

function lbxMove(dir) {
  lbxIdx = (lbxIdx + dir + CAR_TOTAL) % CAR_TOTAL;
  lbxRender();
  carIdx = lbxIdx;
  carUpdate();
}

function lbxRender() {
  var slides = document.querySelectorAll('.carousel-slide');
  var inner = document.getElementById('lbx-inner');
  var counter = document.getElementById('lbx-counter');
  if (!inner) return;
  var slide = slides[lbxIdx];
  var el = slide && slide.firstElementChild ? slide.firstElementChild.cloneNode(true) : null;
  inner.innerHTML = '';
  if (el) inner.appendChild(el);
  if (counter) counter.textContent = (lbxIdx + 1) + ' / ' + CAR_TOTAL;
}

/* ── Keyboard navigation ─────────────────────────────────────────────────── */
document.addEventListener('keydown', function(e) {
  var lbx = document.getElementById('lightbox');
  var vlbx = document.getElementById('vlbx');
  /* Image lightbox open */
  if (lbx && lbx.classList.contains('open')) {
    if (e.key === 'Escape') { lbx.classList.remove('open'); document.body.style.overflow = ''; }
    if (e.key === 'ArrowLeft') lbxMove(-1);
    if (e.key === 'ArrowRight') lbxMove(1);
    return;
  }
  /* Video lightbox open */
  if (vlbx && vlbx.classList.contains('open')) {
    if (e.key === 'Escape') closeVideoLightbox();
    return;
  }
  /* Carousel navigation */
  if (e.key === 'ArrowLeft') carMove(-1);
  if (e.key === 'ArrowRight') carMove(1);
});

/* ── Touch swipe ─────────────────────────────────────────────────────────── */
(function() {
  var wrap = document.getElementById('carousel');
  if (!wrap) return;
  var sx = 0;
  wrap.addEventListener('touchstart', function(e) { sx = e.touches[0].clientX; }, {passive:true});
  wrap.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) carMove(dx < 0 ? 1 : -1);
  }, {passive:true});
})();

/* Init */
carUpdate();

/* ── Scroll reveal ───────────────────────────────────────────────────────── */
var revealObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.cs-reveal').forEach(function(el) { revealObserver.observe(el); });

/* ── Scroll to top ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  var scrollBtn = document.getElementById('scroll-top');
  if (!scrollBtn) return;
  window.addEventListener('scroll', function() {
    scrollBtn.classList.toggle('show', window.scrollY > 320);
  }, { passive: true });
  scrollBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
