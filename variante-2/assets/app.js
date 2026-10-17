(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  const header = document.querySelector('.site-header');
  const backdrop = document.querySelector('.menu-backdrop');
  const desktop = window.matchMedia('(min-width: 851px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = () => !reducedMotion.matches && !navigator.connection?.saveData;

  function setMenu(open, restoreFocus = false) {
    if (!menu || !nav) return;
    open = open && !desktop.matches;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    nav.classList.toggle('is-open', open);
    nav.inert = !desktop.matches && !open;
    document.body.classList.toggle('menu-open', open);
    if (backdrop) backdrop.hidden = !open;
    if (restoreFocus) menu.focus({ preventScroll: true });
    if (open) nav.querySelector('a')?.focus({ preventScroll: true });
    scrollController?.sync();
  }
  menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });
  nav?.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  backdrop?.addEventListener('click', () => setMenu(false, true));
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) setMenu(false); });
  document.addEventListener('focusin', event => {
    if (!header?.contains(event.target)) setMenu(false);
    scrollController?.request();
  });
  desktop.addEventListener('change', () => setMenu(false));
  window.addEventListener('pageshow', () => setMenu(false));
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 16);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const filters = [...document.querySelectorAll('[data-filter]')];
  const groups = [...document.querySelectorAll('[data-category]')];
  const category = document.querySelector('#treatment-category');
  function filterTreatments(value) {
    const active = filters.find(item => item.dataset.filter === value);
    if (!active) return;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === active)));
    if (category) category.value = value;
    groups.forEach(group => {
      group.hidden = value !== 'alle' && group.dataset.category !== value;
      group.classList.remove('filter-enter');
    });
    if (canAnimate()) requestAnimationFrame(() => {
      groups.filter(group => !group.hidden).forEach(group => group.classList.add('filter-enter'));
    });
    const status = document.querySelector('#filter-status');
    if (status) status.textContent = value === 'alle' ? 'Alle Behandlungen werden angezeigt.' : active.textContent.trim() + ' wird angezeigt.';
    scrollController?.request();
  }
  filters.forEach(button => button.addEventListener('click', () => filterTreatments(button.dataset.filter)));
  category?.addEventListener('change', () => filterTreatments(category.value));
  // Restore consistent controls after browser back/forward form restoration.
  window.addEventListener('pageshow', () => { if (category) filterTreatments(category.value); });
  const form = document.querySelector('#inquiry-form');
  if (form) {
    const selection = form.querySelector('#treatment');
    const requested = new URLSearchParams(window.location.search).get('behandlung');
    if (requested && [...selection.options].some(option => option.value === requested)) selection.value = requested;
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const name = form.querySelector('#name').value.trim();
      const note = form.querySelector('#message').value.trim();
      const treatment = selection.value;
      const subject = 'Terminanfrage · ' + treatment;
      const body = 'Hallo Isabella,\n\nich interessiere mich für: ' + treatment + '.\n\n' + (note ? note + '\n\n' : '') + 'Ich freue mich über eine Rückmeldung.\n\nLiebe Grüße\n' + name;
      const url = 'mailto:info@natuerlichbella.de?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      const status = form.querySelector('.form-status');
      status.hidden = false;
      status.replaceChildren(document.createTextNode('Deine Nachricht ist vorbereitet. Bitte sende sie in deinem E-Mail-Programm ab. Falls es sich nicht öffnet: '));
      const link = document.createElement('a'); link.href = url; link.textContent = 'E-Mail erneut öffnen'; link.className = 'text-link'; status.append(link);
      window.location.href = url;
    });
  }
  const pictures = [...document.querySelectorAll('[data-motion]')];
  const motionToggle = document.querySelector('.motion-toggle');
  const visiblePictures = new Set();
  let pictureObserver;
  let pictureMotion = false;
  let userPaused = false;
  let printing = false;
  let scrollController = null;
  try { userPaused = sessionStorage.getItem('bella-picture-motion') === 'paused'; } catch {}

  function syncPicturePlayback() {
    document.body.classList.toggle('cinema-paused', userPaused || document.hidden || printing);
    scrollController?.sync();
    if (!motionToggle) return;
    motionToggle.hidden = !(pictureMotion || scrollController?.available) || !canAnimate() || printing;
    motionToggle.setAttribute('aria-pressed', String(userPaused));
    motionToggle.setAttribute('aria-label', userPaused ? 'Bewegung fortsetzen' : 'Bewegung pausieren');
    motionToggle.querySelector('span').textContent = userPaused ? 'Bewegung starten' : 'Bewegung pausieren';
  }
  function setupPictureMotion() {
    pictureObserver?.disconnect();
    visiblePictures.clear();
    pictures.forEach(frame => frame.classList.remove('is-in-view'));
    pictureMotion = canAnimate() && pictures.length > 0;
    document.body.classList.toggle('cinema-enabled', pictureMotion);
    if (pictureMotion) {
      // Start immediately for images in the first viewport, without waiting for a callback.
      pictures.forEach(frame => {
        const box = frame.getBoundingClientRect();
        if (box.bottom > 0 && box.top < window.innerHeight) {
          visiblePictures.add(frame);
          frame.classList.add('is-in-view');
        }
      });
      if ('IntersectionObserver' in window) {
        pictureObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            entry.target.classList.toggle('is-in-view', entry.isIntersecting);
            if (entry.isIntersecting) visiblePictures.add(entry.target);
            else visiblePictures.delete(entry.target);
          });
          syncPicturePlayback();
        }, { threshold: 0 });
        pictures.forEach(frame => pictureObserver.observe(frame));
      } else {
        pictures.forEach(frame => { visiblePictures.add(frame); frame.classList.add('is-in-view'); });
      }
    }
    syncPicturePlayback();
  }
  motionToggle?.addEventListener('click', () => {
    userPaused = !userPaused;
    try { sessionStorage.setItem('bella-picture-motion', userPaused ? 'paused' : 'playing'); } catch {}
    syncPicturePlayback();
  });
  document.addEventListener('visibilitychange', syncPicturePlayback);
  window.addEventListener('pageshow', setupPictureMotion);
  window.addEventListener('beforeprint', () => { printing = true; syncPicturePlayback(); });
  window.addEventListener('afterprint', () => { printing = false; syncPicturePlayback(); });
  reducedMotion.addEventListener('change', setupPictureMotion);
  navigator.connection?.addEventListener('change', setupPictureMotion);
  setupPictureMotion();

  // The page itself keeps native scrolling. Only visual layers follow with a short easing.
  // Every position comes from current scroll progress, so the choreography reverses on scroll-up.
  scrollController = (() => {
    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
    const selector = '[data-reveal], .hero-copy, .page-hero .wrap, .first-visit, .detail-copy > h2, .detail-copy > h3, .detail-copy > p, .intro-quote, .price-table, .price-aside, .contact-item, .contact-form, .faq-intro, .faq-list, .gift-strip .wrap, .catalog-section > h2, .service-item, .information';
    const units = [];
    document.querySelectorAll(selector).forEach(element => {
      if (element.parentElement.closest('.flow-item')) return;
      element.classList.add('flow-item');
      const isCard = element.matches('.treatment-card');
      const isPortrait = element.matches('.portrait-wrap');
      const isCopy = element.matches('.about-copy, .studio-copy');
      const isHero = element.matches('.hero-copy, .page-hero .wrap');
      const index = [...element.parentElement.children].indexOf(element);
      units.push({ element, y: 0, isHero, travel: isCard ? 100 + (index % 3) * 32 : isPortrait ? 94 : isCopy ? -36 : 42, stagger: isCard ? (index % 3) * .045 : 0 });
    });
    const scenes = [...document.querySelectorAll('.studio-band, .contact-band')];
    const hero = document.querySelector('.hero');
    const stamp = document.querySelector('.hero-stamp');
    let raf = 0;
    let lastTime = 0;
    let smoothY = window.scrollY;
    let enabled = false;
    const running = () => enabled && !document.hidden && !document.body.classList.contains('menu-open');

    function request() {
      if (!raf && running()) raf = requestAnimationFrame(draw);
    }
    function draw(time) {
      raf = 0;
      if (!running()) return;
      const viewport = window.innerHeight;
      const mobile = window.innerWidth <= 620;
      const realY = window.scrollY;
      const dt = lastTime ? Math.min(50, time - lastTime) : 16;
      lastTime = time;
      smoothY += (realY - smoothY) * (1 - Math.exp(-dt / 80));
      if (Math.abs(realY - smoothY) < .1) smoothY = realY;
      const lag = realY - smoothY;
      const writes = [];

      // Read geometry first, then apply all styles together to avoid layout thrashing.
      for (const unit of units) {
        const rect = unit.element.getBoundingClientRect();
        if (!rect.height) continue;
        const top = rect.top - unit.y + lag;
        const bottom = top + rect.height;
        if (top > viewport + 220 || bottom < -220) continue;
        const phase = clamp((viewport / 2 - top - rect.height / 2) / ((viewport + rect.height) / 2), -1, 1);
        const enter = ease((viewport - top) / (viewport * .34 + Math.min(rect.height, viewport) * .28) - unit.stagger);
        const leave = ease(bottom / Math.min(170, rect.height * .65));
        const visibility = Math.min(enter, leave);
        const focused = unit.element.contains(document.activeElement);
        const travel = unit.travel * (mobile ? .55 : 1);
        const y = focused ? 0 : unit.isHero ? clamp(smoothY * -.075, -48, 0) : -phase * travel / 2 + (1 - enter) * (mobile ? 30 : 52);
        const opacity = focused || unit.isHero ? 1 : .28 + .72 * visibility;
        writes.push(() => {
          unit.y = y;
          unit.element.style.setProperty('--flow-y', `${y.toFixed(2)}px`);
          unit.element.style.setProperty('--flow-opacity', opacity.toFixed(3));
          unit.element.style.setProperty('--flow-enter', enter.toFixed(3));
        });
      }

      for (const frame of pictures) {
        const rect = frame.getBoundingClientRect();
        if (!rect.height || rect.top > viewport + 180 || rect.bottom < -180) continue;
        const top = rect.top + lag;
        const phase = clamp((viewport / 2 - top - rect.height / 2) / ((viewport + rect.height) / 2), -1, 1);
        const portrait = frame.dataset.motion.startsWith('portrait');
        const range = Math.min(rect.height * (portrait ? .055 : .115), mobile ? 48 : 88);
        const shift = phase * range;
        const scale = (portrait ? 1.14 : 1.25) + .045 * Math.abs(phase);
        const enter = ease((viewport - top) / Math.min(viewport * .6, rect.height * .85));
        const inset = (1 - enter) * (portrait ? 5 : 8);
        writes.push(() => {
          frame.style.setProperty('--scroll-image-y', `${shift.toFixed(2)}px`);
          frame.style.setProperty('--scroll-image-scale', scale.toFixed(4));
          frame.style.setProperty('--scroll-frame-inset', `${inset.toFixed(3)}%`);
        });
      }

      for (const scene of scenes) {
        const rect = scene.getBoundingClientRect();
        if (rect.top > viewport + 100 || rect.bottom < -100) continue;
        const enter = ease((viewport - rect.top - lag) / (viewport * .65));
        writes.push(() => {
          scene.style.setProperty('--scene-inset', `${((1 - enter) * (mobile ? 2.5 : 4)).toFixed(3)}%`);
          scene.style.setProperty('--scene-radius', `${((1 - enter) * 68).toFixed(2)}px`);
        });
      }
      if (hero && stamp) {
        const progress = clamp(smoothY / Math.max(1, hero.offsetHeight));
        writes.push(() => {
          stamp.style.setProperty('--stamp-shift', `${(-progress * 64).toFixed(2)}px`);
          stamp.style.setProperty('--stamp-turn', `${(-progress * 18).toFixed(2)}deg`);
        });
      }
      const progress = clamp(realY / Math.max(1, document.documentElement.scrollHeight - viewport));
      writes.push(() => document.body.style.setProperty('--reading-progress', progress.toFixed(4)));
      writes.forEach(write => write());
      if (Math.abs(realY - smoothY) > .1) request();
    }
    function sync() {
      const next = canAnimate() && !userPaused && !printing;
      document.body.classList.toggle('has-motion', canAnimate() && !printing);
      if (next !== enabled) {
        enabled = next;
        document.body.classList.toggle('scroll-flow', enabled);
        units.forEach(unit => { unit.y = 0; unit.element.style.setProperty('--flow-y', '0px'); });
        smoothY = window.scrollY;
      }
      if (!running()) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else request();
      lastTime = 0;
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    window.addEventListener('pageshow', () => { smoothY = window.scrollY; request(); });
    document.addEventListener('focusout', request);
    document.querySelectorAll('img').forEach(img => img.addEventListener('load', request, { once: true }));
    document.fonts?.ready.then(request);
    if ('ResizeObserver' in window) new ResizeObserver(request).observe(document.querySelector('main'));
    sync();
    return { request, sync, available: units.length > 0 };
  })();
  syncPicturePlayback();
  setMenu(false);
})();
