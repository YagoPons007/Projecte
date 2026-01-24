import { auth, onAuthStateChanged } from './firebase-client.js';

const PUBLIC_PAGES = [
  '/login.html',
  '/index.html',
  '/',  
];

function isPublicPage() {
  const p = location.pathname;
  return PUBLIC_PAGES.some(pub => p.endsWith(pub));
}

onAuthStateChanged(auth, (user) => {
  console.log('[auth-guard] user =', user, 'path=', location.pathname);
   
  if (!user && !isPublicPage()) {
    window.location.replace('login.html');
  }
});
