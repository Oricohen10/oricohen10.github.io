/*
 * perf-hud.js - opt-in performance overlay. Loaded ONLY when the URL contains
 * "perf" (see the guard in index.html), so it costs nothing in normal use: no
 * script fetched, no listeners, no observers.
 *
 * Why this exists. The site was reported as heavy and laggy, and four separate
 * static theories for it were wrong when actually checked:
 *
 *   - "all four plugin videos preload"      -> they are preload="none", so
 *                                              assigning src downloads nothing
 *   - "the custom cursor sits under the
 *      modal's backdrop-filter, so every
 *      mousemove re-blurs the viewport"     -> #cursor is z-index 99999, the
 *                                              backdrop is 2000. It is above.
 *   - "shrink the ambient wash layers,
 *      72% less GPU texture"                -> Chromium rasterises an animated
 *                                              layer at its MAXIMUM animated
 *                                              scale, so it saves nothing
 *   - "a runaway requestAnimationFrame
 *      loop"                                -> the only self-scheduling one is
 *                                              the game's confetti, guarded
 *
 * Reasoning about paint costs from source is how all four of those happened.
 * This measures instead, and more importantly the toggles let you bisect: turn
 * one subsystem off, see if the number moves. That answers in ten seconds what
 * source-reading got wrong four times.
 *
 * Usage:  https://oricohen.co/?perf=1
 */
(function () {
  'use strict';

  /* ── measurement ──────────────────────────────────────────────────────── */
  var frames = 0, worst = 0, last = performance.now(), fps = 0;
  var longTasks = 0, longWorst = 0;

  /* Long tasks are the thing that actually reads as "stuck": anything over
     50ms on the main thread blocks input. Not supported everywhere, hence the
     try - Safari has no longtask observer. */
  var haveLT = false;
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) {
        longTasks++;
        if (e.duration > longWorst) longWorst = e.duration;
      });
    }).observe({ entryTypes: ['longtask'] });
    haveLT = true;
  } catch (_) {}

  function tick(now) {
    var dt = now - last;
    last = now;
    frames++;
    if (dt > worst) worst = dt;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ── the panel ────────────────────────────────────────────────────────── */
  var box = document.createElement('div');
  box.style.cssText =
    'position:fixed;top:10px;left:10px;z-index:2147483647;' +
    'font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;' +
    'background:rgba(12,12,14,.92);color:#eaeaea;padding:10px 12px;' +
    'border:1px solid #444;border-radius:8px;min-width:232px;' +
    'pointer-events:auto;white-space:pre;user-select:text';
  document.body.appendChild(box);

  var out = document.createElement('div');
  box.appendChild(out);

  /* ── bisect toggles ───────────────────────────────────────────────────────
     Each one disables a suspect across the parent page AND every loaded
     case-study iframe. Same-origin, so reaching into contentDocument works;
     wrapped anyway because a frame that has not loaded has no document. */
  function eachFrameDoc(fn) {
    document.querySelectorAll('.proj-iframe').forEach(function (f) {
      try { if (f.contentDocument) fn(f.contentDocument); } catch (_) {}
    });
  }
  function styleInto(doc, id, css) {
    var el = doc.getElementById(id);
    if (!el) {
      el = doc.createElement('style');
      el.id = id;
      doc.head.appendChild(el);
    }
    el.textContent = css;
  }

  var KILL = [
    ['ambient field', function (on) {
      var css = on ? '.cs-field{display:none!important}' : '';
      eachFrameDoc(function (d) { styleInto(d, '_perf_field', css); });
    }],
    ['custom cursor', function (on) {
      styleInto(document, '_perf_cur',
        on ? '#cursor,#ctag,#ghost-layer{display:none!important}' : '');
    }],
    ['all video', function (on) {
      eachFrameDoc(function (d) {
        d.querySelectorAll('video').forEach(function (v) {
          if (on) { v.pause(); v.dataset._perfPaused = '1'; }
          else if (v.dataset._perfPaused) { delete v.dataset._perfPaused; v.play().catch(function(){}); }
        });
      });
    }],
    ['iframe contents', function (on) {
      document.querySelectorAll('.proj-iframe').forEach(function (f) {
        f.style.visibility = on ? 'hidden' : '';
      });
    }]
  ];

  KILL.forEach(function (pair) {
    var lab = document.createElement('label');
    lab.style.cssText = 'display:flex;gap:6px;align-items:center;cursor:pointer;margin-top:3px';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.style.cssText = 'margin:0;cursor:pointer';
    cb.addEventListener('change', function () {
      pair[1](cb.checked);
      /* reset the counters so the next second measures the new state only */
      frames = 0; worst = 0; longTasks = 0; longWorst = 0;
    });
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode('disable ' + pair[0]));
    box.appendChild(lab);
  });

  var hint = document.createElement('div');
  hint.style.cssText = 'margin-top:7px;color:#9a9a9a;max-width:220px;white-space:normal';
  hint.textContent = 'Tick one at a time and watch FPS / long tasks. Whichever ' +
                     'one moves the numbers is the culprit.';
  box.appendChild(hint);

  /* ── report once a second ─────────────────────────────────────────────── */
  setInterval(function () {
    fps = frames; frames = 0;
    var openWins = [].filter.call(document.querySelectorAll('.win'), function (w) {
      return w.style.display && w.style.display !== 'none';
    }).length;
    var loaded = 0;
    eachFrameDoc(function () { loaded++; });

    var mem = '';
    if (performance.memory) {
      mem = '\nJS heap    ' + (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB';
    }
    out.textContent =
      'FPS        ' + fps + (fps < 50 ? '   <-- low' : '') +
      '\nworst frame ' + worst.toFixed(0) + ' ms' + (worst > 50 ? '  <-- jank' : '') +
      '\nlong tasks  ' + (haveLT ? longTasks + ' (worst ' + longWorst.toFixed(0) + ' ms)'
                                 : 'not supported here') +
      '\nopen windows ' + openWins +
      '\nloaded frames ' + loaded +
      mem;
    worst = 0; longTasks = 0; longWorst = 0;
  }, 1000);
})();
