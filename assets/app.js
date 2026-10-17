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
    // Keyboard navigation must never land on an element waiting for a reveal.
    event.target.closest('.will-reveal')?.classList.add('is-visible');
  });
  desktop.addEventListener('change', () => setMenu(false));
  window.addEventListener('pageshow', () => setMenu(false));
  setMenu(false);
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
  let observer;
  function stopMotion() {
    document.body.classList.remove('has-motion');
    observer?.disconnect();
    document.querySelectorAll('.will-reveal').forEach(element => element.classList.add('is-visible'));
  }
  if (canAnimate()) {
    document.body.classList.add('has-motion');
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }), { threshold: .06, rootMargin: '0px 0px -24px 0px' });
      const targets = document.querySelectorAll('[data-reveal], .detail-copy > h2, .detail-copy > p, .detail-grid > aside, .price-table, .price-aside, .contact-item, .contact-form, .faq-list, .gift-strip .wrap');
      targets.forEach(element => {
        // Leave the first viewport and deeply nested content visible from the outset.
        if (element.getBoundingClientRect().top < window.innerHeight * .92 || element.parentElement.closest('[data-reveal]')) return;
        if (element.matches('.treatment-card, .process-card')) {
          const index = [...element.parentElement.children].indexOf(element);
          element.style.setProperty('--reveal-delay', `${Math.min(index, 2) * 90}ms`);
        }
        element.classList.add('will-reveal');
        observer.observe(element);
      });
    }
  }
  reducedMotion.addEventListener('change', event => { if (event.matches) stopMotion(); });
  navigator.connection?.addEventListener('change', () => { if (navigator.connection.saveData) stopMotion(); });
  window.addEventListener('beforeprint', stopMotion);
})();
