import { auth, onAuthStateChanged, db } from './firebase-client.js';
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

function waitForFullCalendar(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const fc = window.FullCalendar || window.FullCalendarCore || window.FullCalendarDefault || window.FC;
      if (fc) return resolve(fc);
      if (Date.now() - start > timeoutMs) return reject(new Error('FullCalendar global not found (timeout)'));
      setTimeout(check, 100);
    };
    check();
  });
}

(async function main() {
  try {
    const FC = await waitForFullCalendar(7000);
    console.log('[agenda] FullCalendar global encontrado:', FC);

    const Calendar = FC.Calendar || (FC.default && FC.default.Calendar);
    const dayGridPlugin = FC.dayGridPlugin || FC.default?.dayGridPlugin;
    const interactionPlugin = FC.interactionPlugin || FC.default?.interactionPlugin;

    if (!Calendar) {
      console.error('[agenda] No se ha encontrado FullCalendar.Calendar en el global. Global:', FC);
      return;
    }

    let calendar = null;
    let currentUid = null; 
    function eventColorsFor(data) {
      if (data.completed) {
        return { backgroundColor: '#059669', textColor: '#ffffff', borderColor: '#047857' }; 
      }
      if (data.method === 'pomodoro') {
        return { backgroundColor: '#f97316', textColor: '#ffffff', borderColor: '#c2410c' };
      }
      if (data.method === 'srs') {
        return { backgroundColor: '#2563eb', textColor: '#ffffff', borderColor: '#1e40af' }; 
      }
      if (data.method === 'long') {
        return { backgroundColor: '#7c3aed', textColor: '#ffffff', borderColor: '#581c87' }; 
      }
      return { backgroundColor: '#0ea5e9', textColor: '#ffffff', borderColor: '#0284c7' }; 
    }

    function taskToEvent(docSnap) {
      const d = docSnap.data();
      const start = d.due || null; 
      const colors = eventColorsFor(d);
      return {
        id: docSnap.id,
        title: d.title || '(sense títol)',
        start: start,
        allDay: true,
        extendedProps: {
          desc: d.desc || '',
          duration: d.duration || 0,
          completed: !!d.completed,
          method: d.method || '',
          createdAt: d.createdAt || null
        },
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        textColor: colors.textColor
      };
    }

    function renderNoDateList(docs) {
      const container = document.getElementById('no-date-tasks');
      if (!container) return;
      if (!docs.length) {
        container.innerHTML = `<div style="color:#6b7280;">No hi ha tasques sense data.</div>`;
        return;
      }
      container.innerHTML = docs.map(docSnap => {
        const d = docSnap.data();
        return `
          <div class="no-date-item card" data-id="${docSnap.id}" style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:8px;">
            <div>
              <div style="font-weight:700;color:#0f1724">${escapeHtml(d.title || '(sense títol)')}</div>
              <div style="font-size:0.9rem;color:#6b7280">${escapeHtml(d.desc || '')} ${d.duration ? ' • ' + d.duration + ' min' : ''}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="btn-small view-task" data-id="${docSnap.id}">Veure</button>
              <button class="btn-small assign-day" data-id="${docSnap.id}">Assignar data</button>
            </div>
          </div>
        `;
      }).join('');
      container.querySelectorAll('.view-task').forEach(b => {
        b.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          window.location.href = `tasques.html?task=${id}`;
        });
      });
      container.querySelectorAll('.assign-day').forEach(b => {
        b.addEventListener('click', async (e) => {
          const id = e.currentTarget.dataset.id;
          const dia = prompt('Introduir data (YYYY-MM-DD) per assignar la tasca:');
          if (!dia) return;
          try {
            if (!currentUid) { alert('Has de iniciar sessió'); return; }
            const docRef = doc(db, 'users', currentUid, 'tasks', id);
            await updateDoc(docRef, { due: dia });
            alert('Data assignada ✅');
          } catch (err) {
            console.error('Error assignant data:', err);
            alert('Error assignant data');
          }
        });
      });
    }
    function initCalendar() {
      console.log('[agenda] initCalendar() - plugins ->', { dayGridPlugin: !!dayGridPlugin, interactionPlugin: !!interactionPlugin });
      const el = document.getElementById('calendar');
      if (!el) { console.warn('[agenda] no existe #calendar'); return; }

      const plugins = [];
      if (dayGridPlugin) plugins.push(dayGridPlugin);
      if (interactionPlugin) plugins.push(interactionPlugin);

      calendar = new Calendar(el, {
        plugins,
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' },
        eventClick: function(info) {
          const id = info.event.id;
          if (!id) return;
          window.location.href = `task-run.html?task=${encodeURIComponent(id)}`;
        },
        eventDidMount: function(info) {
          try {
            if (window.tippy) {
              const p = info.event.extendedProps;
              const content = `<strong>${escapeHtml(info.event.title)}</strong><div style="font-size:0.9rem;margin-top:6px;color:#6b7280;">${escapeHtml(p.desc || '')}<br/>${p.duration ? escapeHtml(p.duration) + ' min' : ''}</div>`;
              window.tippy(info.el, { content, allowHTML: true, theme: 'light-border' });
            } else {
              info.el.setAttribute('title', info.event.title + (info.event.extendedProps.desc ? ' - ' + info.event.extendedProps.desc : ''));
            }
          } catch (e) {}
        },
        eventDrop: async function(info) {
          const id = info.event.id;
          const newDate = info.event.start ? info.event.start.toISOString().slice(0,10) : null;
          if (!confirm(`Desitges moure la tasca "${info.event.title}" a ${newDate}?`)) {
            info.revert();
            return;
          }
          try {
            if (!currentUid) { alert('Has de iniciar sessió'); info.revert(); return; }
            const docRef = doc(db, 'users', currentUid, 'tasks', id);
            await updateDoc(docRef, { due: newDate });
          } catch (err) {
            console.error('Error movent tasca:', err);
            alert('Error movent tasca');
            info.revert();
          }
        },

        events: [] 
      });

      calendar.render();
      console.log('[agenda] calendar.render() done');
    }
    function attachFirestoreListener(uid) {
      console.log('[agenda] attachFirestoreListener for uid=', uid);
      currentUid = uid;
      const tasksCol = collection(db, "users", uid, "tasks");

      return onSnapshot(tasksCol, (snapshot) => {
        console.log('[agenda] snapshot docs:', snapshot.docs.map(d => d.data()));
        if (!calendar) return;

        const docsWithDate = [];
        const docsNoDate = [];

        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.due) docsWithDate.push(docSnap);
          else docsNoDate.push(docSnap);
        });
        renderNoDateList(docsNoDate);
        calendar.removeAllEvents();
        docsWithDate.forEach(docSnap => {
          const ev = taskToEvent(docSnap);
          if (ev.start) calendar.addEvent(ev);
          console.log('[agenda] evento añadido:', ev.title, ev.start);
        });
      }, (err) => {
        console.error('Error escuchando tareas para calendario:', err);
      });
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
    document.addEventListener('DOMContentLoaded', () => {
      initCalendar();
      let unsubscribe = null;
      onAuthStateChanged(auth, (user) => {
        if (typeof unsubscribe === 'function') { unsubscribe(); unsubscribe = null; }
        if (!user) {
          currentUid = null;
          if (calendar) calendar.removeAllEvents();
          renderNoDateList([]); 
          return;
        }
        unsubscribe = attachFirestoreListener(user.uid);
      });
    });
  } catch (err) {
    console.error('[agenda] ERROR:', err);
    console.info('[agenda] Verifica que los scripts UMD de FullCalendar + Tippy estén cargados y que no haya errores de red.');
  }
})();
