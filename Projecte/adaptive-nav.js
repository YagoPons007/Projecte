const BREAKPOINT_PX = 856; 
const BUFFER = 8; 

function rectsOverlap(a, b, buffer = 0) {
  
  return !(a.right < b.left + buffer || a.left > b.right - buffer);
}

function showAllNavItems(navItems) {
  navItems.forEach(li => {
    li.classList.remove('nav-eaten');
    li.removeAttribute('aria-hidden');
  });
}

function computeDistanceToTitleRect(itemRect, titleRect) {
  
  const dx = Math.max(0, Math.max(titleRect.left - itemRect.right, itemRect.left - titleRect.right));
  const dy = Math.max(0, Math.max(titleRect.top - itemRect.bottom, itemRect.top - titleRect.bottom));
  return Math.sqrt(dx*dx + dy*dy);
}

function adaptNavToTitle() {
  const title = document.getElementById('titulo');
  const nav = document.querySelector('.main-nav');
  if (!title || !nav) return;

   
  if (window.innerWidth <= BREAKPOINT_PX) {
     
    const allItems = Array.from(nav.querySelectorAll('li'));
    showAllNavItems(allItems);
    return;
  }

   
  const items = Array.from(nav.querySelectorAll('li'));
  if (items.length === 0) return;

   
  showAllNavItems(items);

  const titleRect = title.getBoundingClientRect();

   
  let itemRects = items.map(li => ({ li, rect: li.getBoundingClientRect() }));

   
  let loopGuard = 0;
  while (true) {
    loopGuard++;
    if (loopGuard > items.length + 2) break;  

     
    itemRects = itemRects.map(o => ({ li: o.li, rect: o.li.getBoundingClientRect() }));

     
    const overlapping = itemRects.filter(o => rectsOverlap(o.rect, titleRect, BUFFER));

    if (overlapping.length === 0) break;  

     
    overlapping.sort((a, b) => {
      const da = computeDistanceToTitleRect(a.rect, titleRect);
      const db = computeDistanceToTitleRect(b.rect, titleRect);
      return da - db;
    });

    const toEat = overlapping[0];
    if (!toEat) break;

     
    toEat.li.classList.add('nav-eaten');
    toEat.li.setAttribute('aria-hidden', 'true');

     
  }
}

 
function debounce(fn, wait = 80) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const runAdaptive = debounce(() => {
  try { adaptNavToTitle(); } catch (e) { console.error('adaptive-nav error', e); }
}, 80);

 
window.addEventListener('DOMContentLoaded', runAdaptive);
window.addEventListener('load', runAdaptive);
window.addEventListener('resize', runAdaptive);

 
const header = document.querySelector('header');
if (header) {
  const mo = new MutationObserver(runAdaptive);
  mo.observe(header, { attributes: true, subtree: true, childList: true, characterData: true });
}
