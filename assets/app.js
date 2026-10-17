(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  function closeMenu() { if (!menu || !nav) return; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Menü öffnen'); nav.classList.remove('is-open'); }
  menu?.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen'); nav.classList.toggle('is-open', open); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
  nav?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  window.matchMedia('(min-width: 851px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  const filters = [...document.querySelectorAll('[data-filter]')];
  const groups = [...document.querySelectorAll('[data-category]')];
  filters.forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.filter;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    groups.forEach(group => { group.hidden = value !== 'alle' && group.dataset.category !== value; });
    const status = document.querySelector('#filter-status');
    if (status) status.textContent = value === 'alle' ? 'Alle Behandlungen werden angezeigt.' : button.textContent.trim() + ' wird angezeigt.';
  }));
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
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('reveal'); observer.unobserve(entry.target); } }), { threshold: .08 });
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
  }
})();
