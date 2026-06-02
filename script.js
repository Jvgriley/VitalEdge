/* ============================================================
   CONVERGE GROUP — script.js
   Animations, interactions, canvas, counters, form handling
   ============================================================ */

'use strict';

/* ── Utilities ─────────────────────────────────────────────── */

/**
 * Throttle a function to run at most once per `ms` milliseconds.
 * @param {Function} fn
 * @param {number} ms
 */
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

/**
 * Ease-out cubic interpolation.
 * @param {number} t 0–1
 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/* ── DOM Ready ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initIntro();   // Must run first — blocks interaction until dismissed
  initNav();
  initHeroCanvas();
  initReveal();
  initCounters();
  initContactForm();
  initYear();
  initSmoothScroll();
});

/* ── Click-to-Enter Intro Screen ────────────────────────────── */
/**
 * Displays a full-screen intro overlay on first visit per session.
 *
 * To disable the intro permanently:
 *   Set INTRO_ENABLED = false below.
 *
 * The intro will not appear again during the same browser session
 * (uses sessionStorage key "ve_intro_seen").
 */
function initIntro() {
  /* ---- Configuration ---- */
  const INTRO_ENABLED = true;   // Set to false to disable the intro entirely
  const SESSION_KEY   = 've_intro_seen';

  const overlay = document.getElementById('introOverlay');
  if (!overlay) return;

  // Disable switch: skip intro completely
  if (!INTRO_ENABLED) {
    overlay.classList.add('is-hidden');
    return;
  }

  // Already seen this session: skip immediately (no flash)
  if (sessionStorage.getItem(SESSION_KEY)) {
    overlay.classList.add('is-hidden');
    return;
  }

  // Lock scrolling while intro is showing
  document.body.style.overflow = 'hidden';

  // Make overlay focusable and focused for keyboard users
  overlay.setAttribute('tabindex', '0');
  overlay.focus();

  /**
   * Dismiss the intro: fade out, then hide and restore scroll.
   */
  function dismissIntro() {
    sessionStorage.setItem(SESSION_KEY, '1');
    overlay.classList.add('is-fading');
    document.body.style.overflow = '';

    // Remove from DOM after transition completes (prevents re-focus issues)
    overlay.addEventListener('transitionend', () => {
      overlay.classList.add('is-hidden');
    }, { once: true });

    // Fallback in case transitionend does not fire
    setTimeout(() => {
      overlay.classList.add('is-hidden');
    }, 1200);
  }

  // Click / tap anywhere on overlay
  overlay.addEventListener('click', dismissIntro);

  // Keyboard: Enter or Escape
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      dismissIntro();
    }
  });

  // Fallback: also listen on document for Escape (in case focus moves)
  document.addEventListener('keydown', function onDocKey(e) {
    if (e.key === 'Escape' && !overlay.classList.contains('is-fading')) {
      dismissIntro();
      document.removeEventListener('keydown', onDocKey);
    }
  });
}

/* ── Navigation ─────────────────────────────────────────────── */
function initNav() {
  const nav        = document.getElementById('nav');
  const toggle     = document.getElementById('navToggle');
  const links      = document.getElementById('navLinks');
  const closeBtn   = document.getElementById('navClose');
  const backdrop   = document.getElementById('navBackdrop');
  const navAnchors = links ? links.querySelectorAll('a[href^="#"]') : [];

  if (!nav) return;

  // Scroll: add/remove .scrolled class
  const onScroll = throttle(() => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, 80);

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Initial check

  // Mobile toggle
  if (toggle && links) {
    /**
     * Scroll-lock: use overflow:hidden on body + padding compensation.
     * We do NOT use position:fixed on body because that would create a new
     * containing block and break the menu's own position:fixed (the menu
     * would become fixed relative to the body instead of the viewport).
     */
    let scrollbarWidth = 0;

    function lockScroll() {
      // Measure scrollbar width so content does not shift
      scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow        = 'hidden';
      document.body.style.paddingRight    = scrollbarWidth + 'px';
    }

    function unlockScroll() {
      document.body.style.overflow     = '';
      document.body.style.paddingRight = '';
    }

    function openMenu() {
      links.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (backdrop) backdrop.classList.add('is-open');
      lockScroll();
      // Move focus into the menu for accessibility
      if (closeBtn) closeBtn.focus();
    }

    function closeMenu() {
      links.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (backdrop) backdrop.classList.remove('is-open');
      unlockScroll();
    }

    // Hamburger toggle
    toggle.addEventListener('click', () => {
      links.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    // Close button (X) inside mobile menu
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeMenu();
        toggle.focus();
      });
    }

    // Backdrop tap-outside
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        closeMenu();
        toggle.focus();
      });
    }

    // Close on nav link click
    navAnchors.forEach(a => a.addEventListener('click', closeMenu));

    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && links.classList.contains('is-open')) {
        closeMenu();
        toggle.focus();
      }
    });
  }
}

/* ── Hero Canvas — Particle Field ──────────────────────────── */
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, animId;

  /* ---- Resize ---- */
  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    if (particles) {
      // Reposition particles proportionally
      particles.forEach(p => {
        p.x = Math.random() * W;
        p.y = Math.random() * H;
      });
    }
  }

  const resizeObs = new ResizeObserver(throttle(resize, 200));
  resizeObs.observe(canvas.parentElement);
  resize();

  /* ---- Particle constructor ---- */
  const COLOURS = [
    'rgba(59,130,246,',   // blue
    'rgba(139,92,246,',   // violet
    'rgba(16,185,129,',   // emerald
    'rgba(255,255,255,',  // white
  ];

  function createParticle() {
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      vx:   (Math.random() - 0.5) * 0.3,
      vy:   (Math.random() - 0.5) * 0.3,
      r:    Math.random() * 1.5 + 0.3,
      a:    Math.random() * 0.5 + 0.1,
      col:  COLOURS[Math.floor(Math.random() * COLOURS.length)],
      pulse: Math.random() * Math.PI * 2,   // phase offset for pulsing
      pulseSpeed: 0.015 + Math.random() * 0.01,
    };
  }

  const COUNT = Math.min(window.innerWidth < 768 ? 60 : 110, 120);
  particles = Array.from({ length: COUNT }, createParticle);

  /* ---- Connection lines ---- */
  const MAX_DIST = 140;

  /* ---- Render loop ---- */
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    // Update
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += p.pulseSpeed;

      // Wrap edges with a small margin
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      if (p.y < -5) p.y = H + 5;
      if (p.y > H + 5) p.y = -5;
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      const opacity = p.a * (0.6 + 0.4 * Math.sin(p.pulse));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${p.col}${opacity})`;
      ctx.fill();
    });

    animId = requestAnimationFrame(draw);
  }

  // Pause when tab not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(draw);
    }
  });

  animId = requestAnimationFrame(draw);
}

/* ── Reveal on Scroll (IntersectionObserver) ─────────────── */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px',
  });

  targets.forEach(el => observer.observe(el));
}

/* ── Animated Counters ──────────────────────────────────────── */
function initCounters() {
  const stats = document.querySelectorAll('.stat__number');
  if (!stats.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(el => observer.observe(el));
}

/**
 * Animate a counter element from 0 to its data-target value.
 * @param {HTMLElement} el
 */
function animateCounter(el) {
  const target   = parseInt(el.dataset.target, 10);
  const suffix   = el.dataset.suffix || '';
  const prefix   = el.dataset.prefix || '';
  const duration = 1800; // ms
  const start    = performance.now();

  function step(ts) {
    const elapsed  = ts - start;
    const progress = Math.min(elapsed / duration, 1);
    const value    = Math.floor(easeOutCubic(progress) * target);
    el.textContent = prefix + value + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ── Contact Form ───────────────────────────────────────────── */
function initContactForm() {
  const form    = document.getElementById('contactForm');
  const btn     = document.getElementById('submitBtn');
  const success = document.getElementById('formSuccess');
  if (!form || !btn || !success) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (!validateForm(form)) return;

    // Loading state
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      // Simulate async submission (replace with actual fetch/API call)
      await simulateSubmit();

      // Success
      form.reset();
      success.hidden = false;
      btn.hidden = true;

      // Scroll success into view
      success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      console.error('Form submission error:', err);
      btn.classList.remove('loading');
      btn.disabled = false;
      showFormError(form, 'Something went wrong. Please try again.');
    }
  });

  // Real-time validation styling
  form.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
    input.addEventListener('blur', () => {
      if (input.required && !input.value.trim()) {
        input.style.borderColor = 'rgba(239,68,68,0.5)';
      } else {
        input.style.borderColor = '';
      }
    });
    input.addEventListener('input', () => {
      input.style.borderColor = '';
    });
  });
}

/**
 * Simple client-side form validation.
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
function validateForm(form) {
  let valid = true;
  const required = form.querySelectorAll('[required]');

  required.forEach(field => {
    if (!field.value.trim()) {
      field.style.borderColor = 'rgba(239,68,68,0.5)';
      if (valid) field.focus();
      valid = false;
    }
  });

  // Email format
  const emailField = form.querySelector('#email');
  if (emailField && emailField.value.trim()) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(emailField.value.trim())) {
      emailField.style.borderColor = 'rgba(239,68,68,0.5)';
      if (valid) emailField.focus();
      valid = false;
    }
  }

  return valid;
}

/**
 * Simulate an async form submission (replace with real API call).
 * @returns {Promise<void>}
 */
function simulateSubmit() {
  return new Promise((resolve) => setTimeout(resolve, 1200));
}

/**
 * Display a form-level error message.
 * @param {HTMLFormElement} form
 * @param {string} message
 */
function showFormError(form, message) {
  let errorEl = form.querySelector('.form-error');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    errorEl.style.cssText = [
      'padding:12px 16px',
      'background:rgba(239,68,68,0.08)',
      'border:1px solid rgba(239,68,68,0.25)',
      'border-radius:4px',
      'color:rgba(239,68,68,0.9)',
      'font-size:13px',
    ].join(';');
    form.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

/* ── Copyright Year ─────────────────────────────────────────── */
function initYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ── Smooth Scroll — polyfill for anchor links ──────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ── Card hover: subtle tilt effect ────────────────────────── */
(function initCardTilt() {
  // Only on non-touch devices
  if ('ontouchstart' in window) return;

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2);
      const dy   = (e.clientY - cy) / (rect.height / 2);
      // Cap tilt at ±4deg
      const tiltX = dy * -4;
      const tiltY = dx *  4;
      card.style.transform = `translateY(-4px) perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1)';
    });

    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.1s ease';
    });
  });
})();

/* ── Stat number: hover gradient shift ──────────────────────── */
(function initStatInteraction() {
  document.querySelectorAll('.stat').forEach((stat, i) => {
    const colours = [
      'var(--blue-light)',
      'var(--violet-light)',
      'var(--emerald)',
      'var(--gold-light)',
    ];
    const colour = colours[i % colours.length];

    stat.addEventListener('mouseenter', () => {
      const num = stat.querySelector('.stat__number');
      if (num) {
        num.style.background = `linear-gradient(135deg, var(--text-primary), ${colour})`;
        num.style.webkitBackgroundClip = 'text';
        num.style.backgroundClip = 'text';
      }
    });
    stat.addEventListener('mouseleave', () => {
      const num = stat.querySelector('.stat__number');
      if (num) {
        num.style.background = 'linear-gradient(135deg, var(--text-primary), var(--blue-light))';
        num.style.webkitBackgroundClip = 'text';
        num.style.backgroundClip = 'text';
      }
    });
  });
})();

/* ── Minimal page-transition fade on load ───────────────────── */
(function initPageFade() {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s ease';
  window.addEventListener('load', () => {
    document.body.style.opacity = '1';
  });
  // Fallback in case load is slow
  setTimeout(() => { document.body.style.opacity = '1'; }, 1000);
})();
