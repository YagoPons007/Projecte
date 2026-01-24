import { auth, onAuthStateChanged, db } from './firebase-client.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

export function setupStats() {
  const totalEl = document.getElementById('stat-total');
  const minutesEl = document.getElementById('stat-minutes');

  const daysTasks = [
    document.getElementById('day-1-tasks'),
    document.getElementById('day-2-tasks'),
    document.getElementById('day-3-tasks'),
    document.getElementById('day-4-tasks'),
    document.getElementById('day-5-tasks'),
    document.getElementById('day-6-tasks'),
    document.getElementById('day-7-tasks')
  ];

  const daysMinutes = [
    document.getElementById('day-1-minutes'),
    document.getElementById('day-2-minutes'),
    document.getElementById('day-3-minutes'),
    document.getElementById('day-4-minutes'),
    document.getElementById('day-5-minutes'),
    document.getElementById('day-6-minutes'),
    document.getElementById('day-7-minutes')
  ];

  if (!totalEl || !minutesEl) return;

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      totalEl.textContent = '0';
      minutesEl.textContent = '0';
      daysTasks.forEach(el => el.textContent = '0');
      daysMinutes.forEach(el => el.textContent = '0');
      return;
    }

    const uid = user.uid;
    const tasksCol = collection(db, "users", uid, "tasks");

    onSnapshot(tasksCol, (snapshot) => {
      console.log('Docs snapshot:', snapshot.docs.map(d => d.data())); 

      let totalCompleted = 0;
      let totalMinutes = 0;
      const dayTasksCount = Array(7).fill(0);
      const dayMinutesCount = Array(7).fill(0);

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.completed) return;

        totalCompleted++;
        totalMinutes += parseInt(data.timeSpent ?? data.duration ?? 0, 10);

        if (data.due) {
          const dueDate = new Date(data.due);
          const day = dueDate.getDay(); 
          const index = day === 0 ? 6 : day - 1;
          dayTasksCount[index]++;
          dayMinutesCount[index] += parseInt(data.timeSpent ?? data.duration ?? 0, 10);
        }
      });

      totalEl.textContent = totalCompleted;
      minutesEl.textContent = totalMinutes;
      dayTasksCount.forEach((val, i) => { if(daysTasks[i]) daysTasks[i].textContent = val; });
      dayMinutesCount.forEach((val, i) => { if(daysMinutes[i]) daysMinutes[i].textContent = val; });
    }, (err) => {
      console.error('Error al cargar tareas para stats:', err);
    });
  });
}
