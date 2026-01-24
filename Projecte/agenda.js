import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { auth, onAuthStateChanged, db } from './firebase-client.js';
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let calendar = null;

function taskToEvent(doc) {
  const d = doc.data();
  const start = d.due || d.createdAt?.toDate?.()?.toISOString?.()?.slice(0,10) || null;
  return {
    id: doc.id,
    title: d.title || '(sense títol)',
    start: start,
    allDay: true,
    extendedProps: {
      desc: d.desc || '',
      duration: d.duration || 0,
      completed: !!d.completed,
      method: d.method || ''
    },
    backgroundColor: d.completed ? '#d1fae5' : (d.method === 'pomodoro' ? '#ffedd5' : ''),
    borderColor: d.completed ? '#10b981' : ''
  };
}

function initCalendar() {
  console.log('[agenda] initCalendar()');
  const el = document.getElementById('calendar');
  if (!el) { console.warn('[agenda] no existe #calendar'); return; }

  calendar = new Calendar(el, {
    plugins: [ dayGridPlugin, interactionPlugin ],
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' },
    eventClick: function(info) {
      const e = info.event, p = e.extendedProps;
      alert(`${e.title}\n\nDescripció: ${p.desc || '-'}\nDurada: ${p.duration} min\nComplet: ${p.completed ? 'Sí' : 'No'}`);
    },
    events: []
  });

  calendar.render();
  console.log('[agenda] calendar.render() done');
}

function attachFirestoreListener(uid) {
  console.log('[agenda] attachFirestoreListener for uid=', uid);
  if (!calendar) { console.warn('[agenda] calendar no inicializado'); return; }
  const tasksCol = collection(db, "users", uid, "tasks");
  const q = query(tasksCol, orderBy("due", "asc"));

  return onSnapshot(q, (snapshot) => {
    console.log('[agenda] snapshot docs:', snapshot.docs.map(d => d.data()));
    calendar.removeAllEvents();
    snapshot.docs.forEach(docSnap => {
      const ev = taskToEvent(docSnap);
      if (ev.start) calendar.addEvent(ev);
    });
  }, (err) => {
    console.error('Error escuchando tareas para calendario:', err);
  });
}
export function setupCalendar() {
  document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
    let unsubscribe = null;
    onAuthStateChanged(auth, (user) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe(); unsubscribe = null;
      }
      if (!user) {
        if (calendar) calendar.removeAllEvents();
        return;
      }
      unsubscribe = attachFirestoreListener(user.uid);
    });
  });
}
setupCalendar();
