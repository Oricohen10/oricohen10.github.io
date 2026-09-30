/* ══ Analytics: PostHog, cookieless ═══════════════════════════════════════
   One file for every page. Loaded with defer, never blocks paint, and does
   nothing at all until POSTHOG_KEY is set.

   Cookieless on purpose: persistence 'memory' keeps the anonymous id in the
   page, not in a cookie or localStorage, so there is no consent banner in
   front of the first impression. The trade: a visitor who comes back
   tomorrow counts as a new visitor. For a portfolio that is the right trade.

   Frames. The homepage opens each case study in an iframe. If every frame
   ran its own PostHog, one visitor would appear as several people, each with
   one page. So only the TOP window runs PostHog. A case study inside a
   homepage window posts its events up to the homepage, which captures them
   in the visitor's one stream. A case study opened directly (a LinkedIn
   link) is the top window and tracks itself.

   Events, beyond PostHog's own pageviews and link autocapture:
     window_opened          homepage window, {window}
     case_study_viewed      {case_study}, direct visits only
     case_study_scrolled    {case_study, depth: 25|50|75|100}
     comparison_used        Copilot hackathon/shipped seam, first drag only
     comparison_fullscreen  Copilot full screen opened
     player_chapter         Copilot player chapter button, {chapter}
     cv_downloaded, contact_clicked {method}                              */
(function () {
  var POSTHOG_KEY  = 'phc_kqzmEGfSt4XaerpkYDHgHdzTHCU8tJqtivG6AtQdyKii';  // public by design
  var POSTHOG_HOST = 'https://eu.i.posthog.com';

  var framed = window.top !== window.self;
  var path = location.pathname;
  var m = path.match(/\/cases\/([^/]+)\//);
  var caseId = m ? m[1] + (/viewer\.html$/.test(path) ? '-viewer' : '') : null;

  /* capture(): straight to PostHog at the top, up to the parent in a frame. */
  function capture(event, props) {
    props = props || {};
    if (framed) {
      try { window.parent.postMessage({ type: 'oc-analytics', event: event, props: props }, location.origin); } catch (e) {}
      return;
    }
    if (window.posthog && window.posthog.capture) window.posthog.capture(event, props);
  }
  window.ocTrack = capture;

  /* ── top window: load PostHog ───────────────────────────────────────── */
  if (!framed && POSTHOG_KEY) {
    /* PostHog's standard loader, queueing calls until the library arrives. */
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify alias set_config reset opt_in_capturing opt_out_capturing has_opted_out_capturing get_distinct_id get_property getFeatureFlag isFeatureEnabled onFeatureFlags".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    window.posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      persistence: 'memory',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      session_recording: { maskAllInputs: true }
    });
    /* Events relayed up from case studies in homepage windows. */
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'oc-analytics') return;
      capture(e.data.event, Object.assign({}, e.data.props, { framed: true }));
    });
  }

  /* ── homepage: which window was opened ──────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.openWin === 'function') {
      var orig = window.openWin;
      window.openWin = function (id) { capture('window_opened', { window: id }); return orig.apply(this, arguments); };
    }

    /* CV and contact, on every page */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var h = a.getAttribute('href');
      if (/\/CV\//.test(h)) capture('cv_downloaded');
      else if (/^mailto:/.test(h)) capture('contact_clicked', { method: 'email' });
      else if (/^tel:/.test(h)) capture('contact_clicked', { method: 'phone' });
      else if (/linkedin\.com/.test(h)) capture('contact_clicked', { method: 'linkedin' });
    }, true);

    if (!caseId) return;

    /* ── case studies ─────────────────────────────────────────────────── */
    /* Direct visits only. The homepage preloads every case-study window in
       the background so they open instantly, and a view counted at load time
       fired for all five on every homepage visit. In a frame, the homepage's
       window_opened is the real "viewed" signal. */
    if (!framed) capture('case_study_viewed', { case_study: caseId, framed: false });

    var marks = [25, 50, 75, 100], hit = {}, rq = false;
    function depth() {
      rq = false;
      var d = document.documentElement, max = d.scrollHeight - innerHeight;
      var pct = max <= 0 ? 100 : Math.round(scrollY / max * 100);
      marks.forEach(function (k) {
        if (pct >= k && !hit[k]) { hit[k] = 1; capture('case_study_scrolled', { case_study: caseId, depth: k }); }
      });
    }
    addEventListener('scroll', function () { if (!rq) { rq = true; requestAnimationFrame(depth); } }, { passive: true });

    /* Copilot: the comparison and the player */
    var seam = document.querySelector('#cmp-wrapup .cmp-input');
    if (seam) seam.addEventListener('input', function once() { capture('comparison_used', { case_study: caseId }); seam.removeEventListener('input', once); });
    var full = document.querySelector('.cmp-expand');
    if (full) full.addEventListener('click', function () { capture('comparison_fullscreen', { case_study: caseId }); });
    var chapters = document.getElementById('cpChapters');
    if (chapters) chapters.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (b) capture('player_chapter', { case_study: caseId, chapter: b.textContent.trim() });
    });
  });
})();
