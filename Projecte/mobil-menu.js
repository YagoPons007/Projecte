document.addEventListener('DOMContentLoaded', () => {
  console.log('[mobile-menu] init');
  const overlay = document.getElementById('mobile-overlay');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('mobile-close');
  const menuBtns = Array.from(document.querySelectorAll('#menu, #menu-btn'));
  console.log('[mobile-menu] menuBtns found:', menuBtns.length, menuBtns);

  if (!drawer || !overlay) {
    console.warn('[mobile-menu] drawer o overlay no encontrados:', { drawerExists: !!drawer, overlayExists: !!overlay });
    return;
  }
  const cloneNav = () => {
    const mobileNav = drawer.querySelector('.mobile-nav');
    if (!mobileNav) return;
    if (mobileNav.dataset.cloned === '1') return;

    const mainNav = document.querySelector('.main-nav');
    if (!mainNav) {
      mobileNav.innerHTML = `
        <ul style="list-style:none;padding:0;margin:0;">
          <li><a href="./index.html">Inici</a></li>
          <li><a href="./tasques.html">Tasques</a></li>
          <li><a href="./agenda.html">Agenda</a></li>
          <li><a href="./metodes.html">Mètodes d'estudi</a></li>
          <li><a href="./stats.html">Estadístiques</a></li>
          <li><a href="./perfil.html">Perfil</a></li>
        </ul>`;
      mobileNav.dataset.cloned = '1';
      return;
    }

    const ul = mainNav.querySelector('ul');
    if (!ul) return;
    const clone = ul.cloneNode(true);
    const links = Array.from(clone.querySelectorAll('a'));
    mobileNav.innerHTML = '';
    links.forEach(a => {
      const href = a.getAttribute('href') || '#';
      const text = a.textContent || a.innerText || 'Enllaç';
      const item = document.createElement('a');
      item.href = href;
      item.innerHTML = text;
      mobileNav.appendChild(item);
    });

    mobileNav.dataset.cloned = '1';
    console.log('[mobile-menu] nav cloned');
  };

  const openMenu = () => {
    cloneNav();
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('mobile-menu-open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    menuBtns.forEach(b => b.setAttribute('aria-expanded', 'true'));
    trapFocus(drawer);
    console.log('[mobile-menu] opened');
  };

  const closeMenu = (focusBack = true) => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('mobile-menu-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    menuBtns.forEach(b => b.setAttribute('aria-expanded', 'false'));
    releaseFocusTrap();
    if (focusBack && menuBtns[0]) menuBtns[0].focus();
    console.log('[mobile-menu] closed');
  };
  if (menuBtns.length === 0) {
    console.warn('[mobile-menu] no se encontraron botones #menu ni #menu-btn');
  }
  menuBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (drawer.classList.contains('open')) closeMenu();
      else openMenu();
    });
  });
  overlay.addEventListener('click', () => closeMenu());
  if (closeBtn) closeBtn.addEventListener('click', () => closeMenu());
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && drawer.classList.contains('open')) {
      closeMenu();
    }
  });
  let leaveTimer = null;
  drawer.addEventListener('mouseleave', () => {
    leaveTimer = setTimeout(() => {
      if (drawer.classList.contains('open')) closeMenu(false);
    }, 700);
  });
  drawer.addEventListener('mouseenter', () => {
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
  });
  drawer.addEventListener('click', (ev) => {
    const a = ev.target.closest('a');
    if (!a) return;
    closeMenu(false);
  });

  /* Focus trap */
  let lastFocusedElem = null;
  let focusableElements = [];
  let firstFocusable = null;
  let lastFocusable = null;

  function trapFocus(container) {
    lastFocusedElem = document.activeElement;
    focusableElements = Array.from(container.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled'));
    if (!focusableElements.length) return;
    firstFocusable = focusableElements[0];
    lastFocusable = focusableElements[focusableElements.length - 1];
    firstFocusable.focus();
    document.addEventListener('keydown', handleKeyTrap);
  }

  function handleKeyTrap(e) {
    if (e.key !== 'Tab') return;
    if (!firstFocusable) return;
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  function releaseFocusTrap() {
    document.removeEventListener('keydown', handleKeyTrap);
    if (lastFocusedElem) { try { lastFocusedElem.focus(); } catch(e){} }
  }
});
