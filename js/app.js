/* ============================================================
   Valkjin — Portfolio 2026 · interactions
   Theme, reveal, progress, nav, mobile menu, signature, dialog
   ============================================================ */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const THEME_KEY = 'vj-theme';

  let signatureGradient = null;

  /* ---------------- Theme ---------------- */
  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function paintSignatureGradient() {
    if (!signatureGradient) return;
    const stops = signatureGradient.querySelectorAll('stop');
    const ink = cssVar('--ink');
    const accent = cssVar('--accent');
    if (stops[0]) stops[0].setAttribute('stop-color', ink);
    if (stops[1]) stops[1].setAttribute('stop-color', ink);
    if (stops[2]) stops[2].setAttribute('stop-color', accent);
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e0f11' : '#f7f5f0');
    const btn = $('#themeToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      btn.setAttribute('aria-label', theme === 'dark' ? '切换浅色模式' : '切换深色模式');
    }
    paintSignatureGradient();
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (_) { /* storage blocked */ }
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (systemDark ? 'dark' : 'light'));

    const btn = $('#themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* storage blocked */ }
      if (document.startViewTransition && !reduceMotion) {
        document.startViewTransition(() => applyTheme(next));
      } else {
        applyTheme(next);
      }
    });
  }

  /* ---------------- Handwritten signature ----------------
     The SVG is inlined in the HTML. Each filled path is revealed
     by a white stroke inside a mask, drawn one stroke at a time.
     The gradient follows the active theme.                       */
  function initSignature() {
    const host = $('#heroSignature');
    if (!host) return;
    const svg = host.querySelector('svg');
    host.classList.add('is-visible');
    if (!svg) return;

    const paths = $$('path', svg);
    if (!paths.length) return;

    const defs = document.createElementNS(SVG_NS, 'defs');
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', 'vj-signature-gradient');
    grad.setAttribute('x1', '0%');
    grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%');
    grad.setAttribute('y2', '0%');
    ['0%', '58%', '100%'].forEach(offset => {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', '#16171a');
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
    svg.insertBefore(defs, svg.firstChild);
    signatureGradient = grad;
    paintSignatureGradient();

    paths.forEach(path => {
      path.removeAttribute('style');
      path.removeAttribute('stroke');
      path.removeAttribute('fill');
      path.style.fill = 'url(#vj-signature-gradient)';
    });

    if (reduceMotion) {
      svg.classList.add('svg-glow');
      return;
    }

    const strokes = [];
    let cursor = 0;

    paths.forEach((path, i) => {
      const mask = document.createElementNS(SVG_NS, 'mask');
      const id = 'vj-sig-mask-' + i;
      mask.setAttribute('id', id);
      mask.setAttribute('maskUnits', 'userSpaceOnUse');
      mask.setAttribute('x', '0');
      mask.setAttribute('y', '0');
      mask.setAttribute('width', '1200');
      mask.setAttribute('height', '700');

      const backdrop = document.createElementNS(SVG_NS, 'rect');
      backdrop.setAttribute('x', '0');
      backdrop.setAttribute('y', '0');
      backdrop.setAttribute('width', '1200');
      backdrop.setAttribute('height', '700');
      backdrop.setAttribute('fill', 'black');
      mask.appendChild(backdrop);

      const stroke = document.createElementNS(SVG_NS, 'path');
      stroke.setAttribute('d', path.getAttribute('d') || '');
      stroke.setAttribute('fill', 'none');
      stroke.setAttribute('stroke', 'white');
      stroke.setAttribute('stroke-width', '30');
      stroke.setAttribute('stroke-linecap', 'round');
      stroke.setAttribute('stroke-linejoin', 'round');
      mask.appendChild(stroke);
      defs.appendChild(mask);
      path.setAttribute('mask', 'url(#' + id + ')');

      let length = 400;
      try { length = stroke.getTotalLength() || 400; } catch (_) { /* fallback */ }
      stroke.style.strokeDasharray = String(length);
      stroke.style.strokeDashoffset = String(length);

      const duration = Math.max(0.4, Math.min(length / 150, 1.2));
      strokes.push({ stroke, duration, at: cursor });
      cursor += duration * 1000 * 0.55;
    });

    strokes.forEach(({ stroke, duration, at }) => {
      window.setTimeout(() => {
        stroke.style.transition = 'stroke-dashoffset ' + duration + 's ease-in-out';
        stroke.style.strokeDashoffset = '0';
      }, at + 140);
    });

    window.setTimeout(() => {
      paths.forEach(path => path.removeAttribute('mask'));
      svg.classList.add('svg-glow');
    }, cursor + 900);
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    const items = $$('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => io.observe(el));
  }

  /* ---------------- Scroll progress ---------------- */
  function initProgress() {
    const bar = $('#progressBar');
    if (!bar) return;
    let queued = false;
    const update = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const pct = available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0;
      bar.style.width = pct.toFixed(2) + '%';
      queued = false;
    };
    window.addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------------- Active nav state ---------------- */
  function initNavState() {
    const links = $$('#desktopNav a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const sections = links
      .map(link => document.getElementById(link.getAttribute('href').slice(1)))
      .filter(Boolean);
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          const active = link.getAttribute('href') === '#' + entry.target.id;
          if (active) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    sections.forEach(section => io.observe(section));
  }

  /* ---------------- Mobile menu ---------------- */
  function initMobileMenu() {
    const btn = $('#menuBtn');
    const panel = $('#mobilePanel');
    if (!btn || !panel) return;
    const setOpen = open => {
      panel.dataset.open = String(open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    };
    btn.addEventListener('click', () => setOpen(panel.dataset.open !== 'true'));
    $$('a', panel).forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.dataset.open === 'true') setOpen(false);
    });
  }

  /* ---------------- Toast + copy ---------------- */
  let toastTimer = null;
  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.show = 'true';
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.dataset.show = 'false'; }, 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(field);
      field.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { /* unsupported */ }
      field.remove();
      return ok;
    }
  }

  function initCopy() {
    const btn = $('#copyEmail');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const ok = await copyText(btn.dataset.email || '');
      showToast(ok ? '邮箱已复制到剪贴板' : '复制失败，请手动选择邮箱地址');
    });
  }

  /* ---------------- Easter egg dialog ---------------- */
  function initDialog() {
    const dlg = $('#eggDialog');
    const open = $('#eggBtn');
    const close = $('#eggClose');
    if (!dlg || !open) return;
    open.addEventListener('click', () => {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    });
    if (close) close.addEventListener('click', () => {
      if (typeof dlg.close === 'function') dlg.close();
      else dlg.removeAttribute('open');
    });
    dlg.addEventListener('click', event => {
      if (event.target === dlg && typeof dlg.close === 'function') dlg.close();
    });
  }

  /* ---------------- Ambient loop ----------------
     Decorative only: never autoplays on load, never has audio,
     and respects reduced-motion by leaving the poster visible. */
  function initAmbientVideo() {
    const video = $('#ambientVideo');
    if (!video) return;
    const hint = $('#videoHint');
    video.muted = true;

    if (reduceMotion) {
      if (hint) hint.textContent = '静态画面 · 已按系统偏好减少动效';
      return;
    }
    if (!('IntersectionObserver' in window)) {
      video.play().catch(() => {});
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const attempt = video.play();
          if (attempt && typeof attempt.then === 'function') {
            attempt.then(() => {
              if (hint) hint.textContent = '静音循环中 · 5 秒循环';
            }).catch(() => {});
          }
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.35 });
    io.observe(video);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) video.pause();
    });
  }

  /* ---------------- Boot ---------------- */
  initTheme();
  initSignature();
  initReveal();
  initProgress();
  initNavState();
  initMobileMenu();
  initCopy();
  initDialog();
  initAmbientVideo();
})();
