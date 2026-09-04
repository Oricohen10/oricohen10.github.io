/*
 * case-study.js - shared JS for all case study pages
 *
 * The carousel and both lightboxes lived here until Sept 2026. Every case
 * study now places its media inline (.cs-media, or a page-specific module),
 * so all of it - initCarousel, carUpdate, carMove, playVid, pauseVid, the
 * image and video lightboxes and the touch-swipe handler - was dead and has
 * been removed.
 *
 * One piece of it was not merely dead. A document-level keydown handler
 * mapped ArrowLeft/ArrowRight to carMove() unconditionally on every page.
 * It never threw, because carMove is guarded at every step, but it did
 * swallow arrow keys - and it collided with the plugins reel's own rail
 * navigation, which is bound to the same keys.
 */

/* ── Back nav: on mobile, append #projects so main.js opens the projects page */
document.addEventListener('DOMContentLoaded', function() {
  var backNav = document.querySelector('.back-nav');
  if (backNav && window.innerWidth < 768) {
    backNav.href = backNav.href.replace(/index\.html(#.*)?$/, 'index.html#projects');
  }
});

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

/* ── Inline media ──────────────────────────────────────────────────────────
   Drives <video class="cs-media-vid" data-src="..."> in .cs-media figures.
   Every rule here was paid for on the myverint rebuild:

   - Nothing is fetched until the figure is near the viewport. data-src, not
     src, so a page with five clips costs one poster at first paint.
   - Never call load() in the same tick as play(). Assigning src already runs
     the resource selection algorithm; load() re-runs it, fires abort/emptied,
     and the play() promise rejects with AbortError - which an empty .catch()
     then swallows, leaving the video paused on frame 0 with no console error.
     A rejected play() is retried on canplay instead.
   - Under prefers-reduced-motion, src is never assigned at all, so the poster
     stays. Assigning it would replace a good still with frame 0, and any clip
     that opens on a fade from black then renders as a dead black rectangle.
   - Only what is on screen plays. Off-screen clips are paused, not unloaded,
     so currentTime survives and resuming is a keyframe away.               */
(function() {
  var vids = document.querySelectorAll('.cs-media-vid');
  if (!vids.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tryPlay(v) {
    var pr = v.play();
    if (!pr || !pr.catch) return;
    pr.catch(function() {
      v.addEventListener('canplay', function once() {
        v.removeEventListener('canplay', once);
        var p2 = v.play();
        if (p2 && p2.catch) p2.catch(function() {});
      });
    });
  }

  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      var v = e.target;
      if (!e.isIntersecting) { if (!v.paused) v.pause(); return; }
      if (reduce) return;                      /* keep the poster */
      if (!v.src && v.dataset.src) v.src = v.dataset.src;
      tryPlay(v);
    });
  }, { threshold: 0.25 });

  Array.prototype.forEach.call(vids, function(v) { io.observe(v); });
})();
