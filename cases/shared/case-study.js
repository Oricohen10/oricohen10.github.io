/*
 * case-study.js — shared JS for all case study pages
 *
 * Carousel is configured via attributes on #carousel:
 *   data-total="4"           — number of slides
 *   data-lightbox="image"    — inject image lightbox  (default)
 *   data-lightbox="video"    — inject video lightbox
 *   data-lightbox="none"     — no lightbox
 *
 * initCarousel() builds and injects all carousel chrome (arrows, zoom,
 * counter, lightbox) so each page only needs the slides themselves.
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

/* ── Carousel state ──────────────────────────────────────────────────────── */
var carIdx   = 0;
var CAR_TOTAL = 4;

/* ── Parallax state ──────────────────────────────────────────────────────── */
var parTX = 0, parTY = 0; /* target  */
var parCX = 0, parCY = 0; /* current (lerped) */
var parRAF = null;

function parTick() {
  parCX += (parTX - parCX) * 0.08;
  parCY += (parTY - parCY) * 0.08;
  var slide = document.querySelectorAll('.carousel-slide')[carIdx];
  if (slide) {
    slide.style.setProperty('--px', parCX.toFixed(2) + 'px');
    slide.style.setProperty('--py', parCY.toFixed(2) + 'px');
  }
  var settled = Math.abs(parCX) < 0.05 && Math.abs(parCY) < 0.05 && parTX === 0 && parTY === 0;
  if (settled) {
    parCX = 0; parCY = 0;
    if (slide) { slide.style.setProperty('--px','0px'); slide.style.setProperty('--py','0px'); }
    parRAF = null;
  } else {
    parRAF = requestAnimationFrame(parTick);
  }
}

function parStart() {
  if (!parRAF) parRAF = requestAnimationFrame(parTick);
}

function initParallax(wrap) {
  wrap.addEventListener('mousemove', function(e) {
    var r = wrap.getBoundingClientRect();
    parTX = (e.clientX - (r.left + r.width  * 0.5)) / 28;
    parTY = (e.clientY - (r.top  + r.height * 0.5)) / 28;
    parStart();
  }, { passive: true });
  wrap.addEventListener('mouseleave', function() {
    parTX = 0; parTY = 0;
    parStart();
  });
}

/* ── Carousel init — inject arrows, zoom button, counter, lightbox ──────── */
function initCarousel() {
  var wrap = document.getElementById('carousel');
  if (!wrap) return;

  var lightboxType = wrap.getAttribute('data-lightbox') || 'image';
  CAR_TOTAL = parseInt(wrap.getAttribute('data-total') || '4', 10);

  var ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
  var ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';
  var ZOOM_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  var CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  /* Prev button */
  var prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-btn prev';
  prevBtn.id = 'car-prev';
  prevBtn.setAttribute('aria-label', 'Previous slide');
  prevBtn.innerHTML = ARROW_L;
  prevBtn.onclick = function() { carMove(-1); };
  wrap.appendChild(prevBtn);

  /* Next button */
  var nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-btn next';
  nextBtn.id = 'car-next';
  nextBtn.setAttribute('aria-label', 'Next slide');
  nextBtn.innerHTML = ARROW_R;
  nextBtn.onclick = function() { carMove(1); };
  wrap.appendChild(nextBtn);

  /* Zoom button */
  if (lightboxType !== 'none') {
    var zoomBtn = document.createElement('button');
    zoomBtn.className = 'carousel-zoom';
    if (lightboxType === 'video') {
      zoomBtn.setAttribute('aria-label', 'View fullscreen');
      zoomBtn.onclick = function() { openVideoLightbox(); };
    } else {
      zoomBtn.setAttribute('aria-label', 'Expand image');
      zoomBtn.onclick = function() { openLightbox(carIdx); };
    }
    zoomBtn.innerHTML = ZOOM_SVG;
    wrap.appendChild(zoomBtn);
  }

  /* Counter */
  var footer = document.createElement('div');
  footer.className = 'carousel-footer';
  footer.innerHTML = '<span class="carousel-counter" id="car-counter">1 / ' + CAR_TOTAL + '</span>';
  wrap.appendChild(footer);

  /* Parallax */
  initParallax(wrap);

  /* Lightbox HTML */
  if (lightboxType === 'image') {
    var lbx = document.createElement('div');
    lbx.className = 'lbx';
    lbx.id = 'lightbox';
    lbx.setAttribute('role', 'dialog');
    lbx.setAttribute('aria-modal', 'true');
    lbx.setAttribute('aria-label', 'Image fullscreen');
    lbx.onclick = function(e) { closeLightbox(e); };
    lbx.innerHTML =
      '<div class="lbx-inner" id="lbx-inner"></div>' +
      '<button class="lbx-close" onclick="closeLightbox()" aria-label="Close">' + CLOSE_SVG + '</button>' +
      '<button class="lbx-btn lbx-prev" onclick="lbxMove(-1)" aria-label="Previous">' + ARROW_L + '</button>' +
      '<button class="lbx-btn lbx-next" onclick="lbxMove(1)" aria-label="Next">' + ARROW_R + '</button>' +
      '<div class="lbx-counter" id="lbx-counter"></div>';
    document.body.appendChild(lbx);
  } else if (lightboxType === 'video') {
    var vlbx = document.createElement('div');
    vlbx.className = 'vlbx';
    vlbx.id = 'vlbx';
    vlbx.setAttribute('role', 'dialog');
    vlbx.setAttribute('aria-modal', 'true');
    vlbx.setAttribute('aria-label', 'Video fullscreen');
    vlbx.onclick = function() { closeVideoLightbox(); };
    vlbx.innerHTML =
      '<button class="vlbx-close" onclick="closeVideoLightbox()" aria-label="Close fullscreen">' + CLOSE_SVG + '</button>' +
      '<div class="vlbx-inner" onclick="event.stopPropagation()"><video id="vlbx-vid" muted playsinline controls></video></div>';
    document.body.appendChild(vlbx);
  }
}

/* ── Carousel update ─────────────────────────────────────────────────────── */
function carUpdate() {
  var track = document.getElementById('carousel-track');
  var counter = document.getElementById('car-counter');
  if (track)   track.style.transform = 'translateX(-' + (carIdx * 100) + '%)';
  if (counter) counter.textContent = (carIdx + 1) + ' / ' + CAR_TOTAL;

  /* is-active class + parallax reset on slide change */
  var slides = document.querySelectorAll('.carousel-slide');
  slides.forEach(function(s, i) {
    var becoming = (i === carIdx);
    var was = s.classList.contains('is-active');
    s.classList.toggle('is-active', becoming);
    if (becoming && !was) {
      /* Reset parallax so new slide doesn't inherit old position */
      parTX = 0; parTY = 0; parCX = 0; parCY = 0;
      s.style.setProperty('--px', '0px');
      s.style.setProperty('--py', '0px');
    }
  });

  /* Show zoom button based on slide content + available lightbox */
  var zoomBtn = document.querySelector('.carousel-zoom');
  if (zoomBtn) {
    var slide = slides[carIdx];
    var hasVideo  = slide && slide.querySelector('video');
    var hasImgLbx = !!document.getElementById('lightbox');
    var hasVidLbx = !!document.getElementById('vlbx');
    var show = hasImgLbx || (hasVidLbx && hasVideo);
    zoomBtn.style.display = show ? 'flex' : 'none';
  }
}

function carMove(dir) {
  /* Pause all videos and reset play/pause state */
  document.querySelectorAll('.carousel-slide').forEach(function(slide) {
    var vid     = slide.querySelector('video');
    var playBtn = slide.querySelector('.car-play');
    var pauseBtn = slide.querySelector('.car-pause');
    if (vid) { vid.pause(); vid.currentTime = 0; }
    if (playBtn)  playBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.remove('playing');
  });
  carIdx = (carIdx + dir + CAR_TOTAL) % CAR_TOTAL;
  carUpdate();
}

/* ── Video play / pause ──────────────────────────────────────────────────── */
function playVid(idx) {
  var slide = document.querySelectorAll('.carousel-slide')[idx];
  var vid   = slide ? slide.querySelector('video') : null;
  if (!vid) return;
  var playBtn  = slide.querySelector('.car-play');
  var pauseBtn = slide.querySelector('.car-pause');
  vid.play();
  if (playBtn)  playBtn.classList.add('hidden');
  if (pauseBtn) pauseBtn.classList.add('playing');
  vid.onended = function() {
    vid.currentTime = 0;
    if (playBtn)  playBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.remove('playing');
  };
}

function pauseVid(idx) {
  var slide = document.querySelectorAll('.carousel-slide')[idx];
  var vid   = slide ? slide.querySelector('video') : null;
  if (!vid) return;
  var playBtn  = slide.querySelector('.car-play');
  var pauseBtn = slide.querySelector('.car-pause');
  vid.pause();
  if (playBtn)  playBtn.classList.remove('hidden');
  if (pauseBtn) pauseBtn.classList.remove('playing');
}

/* ── Video lightbox ──────────────────────────────────────────────────────── */
function openVideoLightbox() {
  var slide  = document.querySelectorAll('.carousel-slide')[carIdx];
  if (!slide) return;
  var srcEl  = slide.querySelector('video source');
  if (!srcEl) return;
  var src    = srcEl.getAttribute('src');
  var lbx    = document.getElementById('vlbx');
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
  var lbx    = document.getElementById('vlbx');
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
  var slides  = document.querySelectorAll('.carousel-slide');
  var inner   = document.getElementById('lbx-inner');
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
  var lbx  = document.getElementById('lightbox');
  var vlbx = document.getElementById('vlbx');
  if (lbx && lbx.classList.contains('open')) {
    if (e.key === 'Escape')     { lbx.classList.remove('open'); document.body.style.overflow = ''; }
    if (e.key === 'ArrowLeft')  lbxMove(-1);
    if (e.key === 'ArrowRight') lbxMove(1);
    return;
  }
  if (vlbx && vlbx.classList.contains('open')) {
    if (e.key === 'Escape') closeVideoLightbox();
    return;
  }
  if (e.key === 'ArrowLeft')  carMove(-1);
  if (e.key === 'ArrowRight') carMove(1);
});

/* ── Touch swipe ─────────────────────────────────────────────────────────── */
(function() {
  var wrap = document.getElementById('carousel');
  if (!wrap) return;
  var sx = 0;
  wrap.addEventListener('touchstart', function(e) { sx = e.touches[0].clientX; }, {passive:true});
  wrap.addEventListener('touchend',   function(e) {
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) carMove(dx < 0 ? 1 : -1);
  }, {passive:true});
})();

/* ── Bootstrap ───────────────────────────────────────────────────────────── */
initCarousel();
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
