 
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";


 
const firebaseConfig = {
  apiKey: "AIzaSyDRQr1oiNxaA-sSp9nR9AZEhIQQiUOwbkc",
  authDomain: "fet-4f7a2.firebaseapp.com",
  projectId: "fet-4f7a2",
  storageBucket: "fet-4f7a2.firebasestorage.app",
  messagingSenderId: "528604547004",
  appId: "1:528604547004:web:ff62345bdba87c84b98db9",
  measurementId: "G-7SQFB58S75"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set auth persistence to local (survives browser restart)
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log('[firebase-client] Persistence set to LOCAL'))
  .catch(err => console.error('[firebase-client] Persistence error:', err));

  export async function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}
export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export async function doSignOut() {
  return signOut(auth);
}

 onAuthStateChanged(auth, async (user) => {
  console.log('[firebase-client] onAuthStateChanged ->', user);  

  if (!user) return;  
  const uid = user.uid;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const nameEl = document.getElementById("name");
      const emailEl = document.getElementById("email");
      const profEl = document.getElementById("profession");
      if (nameEl) nameEl.value = data.name || "";
      if (emailEl) emailEl.value = data.email || "";
      if (profEl) profEl.value = data.profession || "";
    }
  } catch (err) {
    console.error("Error cargando perfil:", err);
  }
});


 export function setupProfileForm() {
  const form = document.getElementById("profile-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) { alert("No estás autenticado."); return; }
    const uid = user.uid;
    const userRef = doc(db, "users", uid);
    const name = document.getElementById("name")?.value?.trim() || "";
    const weekly_target = document.getElementById("weekly_target")?.value?.trim() || "";
    const profession = document.getElementById("profession")?.value?.trim() || "";
    try {
      await setDoc(userRef, {
        name,
        weekly_target,
        profession,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("Perfil guardado ✅");
    } catch (err) {
      console.error("Error guardando perfil:", err);
      alert("Error guardando perfil");
    }
  });
}

export function setupTaskForm() {
  const taskForm = document.getElementById("task-form");
  if (!taskForm) return;
  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) { alert("No estás autenticado."); return; }
    const uid = user.uid;

    const title = document.getElementById("task-title")?.value?.trim() || "";
    const due = document.getElementById("task-due")?.value || null;
    const duration = parseInt(document.getElementById("task-duration")?.value || "0", 10);
    const desc = document.getElementById("task-desc")?.value?.trim() || "";
    const method = document.getElementById("task-method")?.value || "normal";
    const pomodoro_length = parseInt(document.getElementById("pomodoro_length")?.value || "", 10) || null;
    const short_break = parseInt(document.getElementById("short_break")?.value || "", 10) || null;
    const long_break = parseInt(document.getElementById("long_break")?.value || "", 10) || null;
    const cycles_before_long = parseInt(document.getElementById("cycles_before_long")?.value || "", 10) || null;
    const newTask = {
      title,
      due,
      duration,
      desc,
      method: method || "normal",
      createdAt: serverTimestamp(),
      timeSpent: 0,
      completed: false
    };
    if (method === "pomodoro") {
      if (pomodoro_length) newTask.pomodoro_length = pomodoro_length;
      if (short_break) newTask.short_break = short_break;
      if (long_break) newTask.long_break = long_break;
      if (cycles_before_long) newTask.cycles_before_long = cycles_before_long;
    }

    try {
      await addDoc(collection(db, "users", uid, "tasks"), newTask);
      alert("Tasca creada ✅");
      taskForm.reset();
    } catch (err) {
      console.error("Error creant tasca", err);
      alert("Error creant tasca");
    }
  });
}

 
export function setupTaskList() {
  const container = document.getElementById('task-list');
  if (!container) return;

   
  const placeholderHTML = `
    <div class="task-placeholder">
      <p>No tens tasques cadastrades. Crea la primera tasca al formulari.</p>
    </div>`;

  let unsubscribe = null;

   
  onAuthStateChanged(auth, (user) => {
     
    if (typeof unsubscribe === 'function') {
      unsubscribe();
      unsubscribe = null;
    }

    if (!user) {
      console.log('[setupTaskList] No user logged in');
      container.innerHTML = placeholderHTML;
      return;
    }

    const uid = user.uid;
    console.log('[setupTaskList] Loading tasks for user:', uid);
    const tasksCol = collection(db, "users", uid, "tasks");
    const q = query(tasksCol, orderBy("createdAt", "desc"));

     
    unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('[setupTaskList] onSnapshot triggered, docs count:', snapshot?.docs?.length || 0);
      if (!snapshot || snapshot.empty) {
        container.innerHTML = placeholderHTML;
        return;
      }

       
      const listHTML = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;
        const title = data.title || '(Sense títol)';
        const due = data.due || '';
        const duration = data.duration || '';
        const completed = !!data.completed;
         
        const method = data.method || '';
         
        let created = '';
        if (data.createdAt && data.createdAt.toDate) {
          created = data.createdAt.toDate().toLocaleString();
        }
        return `
          <article class="task-item card" data-task-id="${id}" style="display:flex; gap:12px; align-items:flex-start;">
            <div style="flex:1;">
              <h3 style="margin:0 0 6px 0; text-decoration:${completed ? 'line-through' : 'none'};">${escapeHtml(title)}</h3>
              <div style="color:#6b7280; font-size:0.95rem; margin-bottom:6px;">
                ${due ? `<strong>Venciment:</strong> ${escapeHtml(due)} • ` : ''}
                ${duration ? `<strong>Durada:</strong> ${escapeHtml(String(duration))} min • ` : ''}
                ${method ? `<strong>Mètode:</strong> ${escapeHtml(method)}` : ''}
              </div>
              ${data.desc ? `<p style="margin:6px 0 0 0; color:#374151;">${escapeHtml(data.desc)}</p>` : ''}
            </div>

            <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
              <!-- BOTÓN MARCAR -->
              <div class="uiv-wrap">
                <button
                  class="uiv-btn mark-btn toggle-complete ${completed ? 'completed' : ''}"
                  data-id="${id}"
                  data-completed="${completed}"
                  aria-pressed="${completed}"
                  aria-label="Marcar com a completada"
                >
                  <div class="uiv-inner">
                    <span class="uiv-text">${completed ? '✓ Fet' : 'Marcar'}</span>
                  </div>
                </button>
              </div>

              <!-- BOTÓN ELIMINAR -->
              <div class="uiv-wrap">
                <button
                  class="uiv-btn delete-btn delete-task"
                  data-id="${id}"
                  aria-label="Eliminar tasca"
                >
                  <div class="uiv-inner">
                    <span class="uiv-text">Eliminar</span>
                  </div>
                </button>
              </div>
            </div>
          </article>
        `;
      }).join('');

      container.innerHTML = `<div class="tasks-list">${listHTML}</div>`;
       
      attachTaskHandlers(container);
    }, (err) => {
      console.error('onSnapshot tasks error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      let errorMsg = 'Error carregant tasques.';
      if (err.code === 'permission-denied') {
        errorMsg = 'Error: No tens permisos per veure les tasques.';
      } else if (err.code === 'failed-precondition') {
        errorMsg = 'Error: Falta crear un índex a Firebase. Mira la consola per més detalls.';
      } else if (err.message && err.message.includes('index')) {
        errorMsg = 'Error: Falta un índex de Firestore. Mira la consola.';
      }
      container.innerHTML = `<div class="task-placeholder"><p>${errorMsg}</p><p style="font-size:0.8rem;color:#666;">(${err.code || 'unknown'})</p></div>`;
    });
  });

   
  window.addEventListener('beforeunload', () => {
    if (typeof unsubscribe === 'function') unsubscribe();
  });
}

 
function attachTaskHandlers(container) {
   
  container.querySelectorAll('.toggle-complete').forEach(btn => {
    btn.removeEventListener('click', onToggleClick);
    btn.addEventListener('click', onToggleClick);
  });

   
  container.querySelectorAll('.delete-task').forEach(btn => {
    btn.removeEventListener('click', onDeleteClick);
    btn.addEventListener('click', onDeleteClick);
  });
}

 
async function onToggleClick(e) {
  const id = e.currentTarget.dataset.id;
  if (!id) return;
  try {
    const user = auth.currentUser;
    if (!user) { alert('No estàs autenticat'); return; }
    const uid = user.uid;
    const docRef = doc(db, 'users', uid, 'tasks', id);
     
    const snap = await getDoc(docRef);
    const current = snap.exists() ? snap.data().completed : false;
    await updateDoc(docRef, { completed: !current });
  } catch (err) {
    console.error('Error toggling complete:', err);
    alert('Error actualitzant tasca');
  }
}

 
async function onDeleteClick(e) {
  const id = e.currentTarget.dataset.id;
  if (!id) return;
  if (!confirm('Eliminar tasca?')) return;
  try {
    const user = auth.currentUser;
    if (!user) { alert('No estàs autenticat'); return; }
    const uid = user.uid;
    const docRef = doc(db, 'users', uid, 'tasks', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting task:', err);
    alert('Error eliminant tasca');
  }
}

 
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}


window.auth = auth;
window.onAuthStateChanged = onAuthStateChanged;
window.db = db;
window.signUp = signUp;
window.signIn = signIn;
window.doSignOut = doSignOut;
window.setupProfileForm = setupProfileForm;
window.setupTaskForm = setupTaskForm;
window.setupTaskList = setupTaskList;
window.addTimeToTask = addTimeToTask;
window.markTaskCompleted = markTaskCompleted;

// Firestore functions
window.doc = doc;
window.collection = collection;
window.onSnapshot = onSnapshot;
window.updateDoc = updateDoc;
window.getDoc = getDoc;
window.setDoc = setDoc;
window.addDoc = addDoc;
window.deleteDoc = deleteDoc;
window.query = query;
window.orderBy = orderBy;
window.serverTimestamp = serverTimestamp;
window.increment = increment;

export { auth, onAuthStateChanged, db };
export async function addTimeToTask(taskId, minutes) {
  if (!taskId) throw new Error('taskId required');
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  const docRef = doc(db, 'users', user.uid, 'tasks', taskId);
  try {
    await updateDoc(docRef, {
      timeSpent: increment(Number(minutes || 0))
    });
  } catch (err) {
    try {
      await setDoc(docRef, { timeSpent: Number(minutes || 0) }, { merge: true });
    } catch (e) {
      throw e;
    }
  }
}

export async function markTaskCompleted(taskId, completed = true) {
  if (!taskId) throw new Error('taskId required');
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  const docRef = doc(db, 'users', user.uid, 'tasks', taskId);
  await updateDoc(docRef, { completed });
}


