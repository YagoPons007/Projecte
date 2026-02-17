import { auth, onAuthStateChanged, doSignOut } from './firebase-client.js';

const logoutBtn = document.getElementById('logout-btn');

onAuthStateChanged(auth, (user) => {
  if (!logoutBtn) return;
  if (user) {
    logoutBtn.style.display = 'inline-flex';  
  } else {
    logoutBtn.style.display = 'none';        
  }
});

 
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await doSignOut();
      window.location.href = 'login.html';  
    } catch (err) {
      console.error('Error cerrando sesión:', err);
      alert('Error tancant sessió');
    }
  });

   
  logoutBtn.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      logoutBtn.click();
    }
  });
}
