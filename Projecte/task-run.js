import { auth, onAuthStateChanged, db, addTimeToTask, markTaskCompleted } from './firebase-client.js';
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const beepAudio = new Audio('img/alarma.mp3');
beepAudio.preload = 'auto';
beepAudio.loop = true;   
let beepUnlocked = false;

async function unlockBeep() {
  if (beepUnlocked) return;
  try {
    await beepAudio.play();
    beepAudio.pause();
    beepAudio.currentTime = 0;
    beepUnlocked = true;
  } catch (e) {
  }
}

function stopBeep() {
  beepAudio.pause();
  beepAudio.currentTime = 0;
}
function mmss(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2,'0');
  const s = Math.floor(sec % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
}
function getQueryParam(name) {
  try { return new URL(location.href).searchParams.get(name); } catch(e) { return null; }
}

let state = {
  taskId: null,
  taskDoc: null,
  mode: 'idle',            
  running: false,
  timerSec: 0,
  elapsedSecThisSession: 0,
  intervalId: null,
  pomodoro_length: 25,
  short_break: 5,
  long_break: 15,
  cycles_before_long: 4,
  cycleCount: 0,
  _pomodoroLoaded: false,
  _phaseInitialized: false
};
const $ = sel => document.getElementById(sel);
const startBtn = $('start-btn'), pauseBtn = $('pause-btn'), stopBtn = $('stop-btn'), markDone = $('mark-done');
const timerEl = $('timer'), elapsedEl = $('elapsed'), phaseLabel = $('phase-label'), cyclesInfo = $('cycles-info');
if (!timerEl || !elapsedEl || !phaseLabel || !startBtn || !pauseBtn || !stopBtn || !markDone) {
  console.warn('[task-run] faltan elementos DOM. Asegúrate de que existen los IDs: timer, elapsed, phase-label, start-btn, pause-btn, stop-btn, mark-done');
}

let taskUnsubscribe = null;
async function loadTask(taskId) {
  if (!taskId) return;
  const user = auth.currentUser;
  if (!user) {
    console.error('No hay usuario autenticado al cargar tarea.');
    return;
  }
  const ref = doc(db, 'users', user.uid, 'tasks', taskId);
  if (typeof taskUnsubscribe === 'function') {
    taskUnsubscribe();
    taskUnsubscribe = null;
  }
  taskUnsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      alert('Tasca no trobada.');
      return;
    }
    const data = snap.data();
    state.taskDoc = data;
    state.taskId = taskId;
    const titleEl = $('task-title'); if (titleEl) titleEl.textContent = data.title || '(Sense títol)';
    const descEl = $('task-desc'); if (descEl) descEl.textContent = data.desc || '';
    const durEl = $('task-duration'); if (durEl) durEl.textContent = data.duration || 0;
    const dueEl = $('task-due'); if (dueEl) dueEl.textContent = data.due || '—';
    const methodEl = $('task-method'); if (methodEl) methodEl.textContent = (data.method || 'Normal').toUpperCase();
    if (data.method === 'pomodoro' && !state._pomodoroLoaded) {
      state.pomodoro_length = Number(data.pomodoro_length || data.duration || 25);
      state.short_break = Number(data.short_break || 5);
      state.long_break = Number(data.long_break || 15);
      state.cycles_before_long = Number(data.cycles_before_long || 4);
      state._pomodoroLoaded = true;
      preparePhase('work', state.pomodoro_length * 60);
    }
    if (data.method !== 'pomodoro' && !state._phaseInitialized) {
      if (data.method === 'long') preparePhase('work', (Number(data.duration || 90)) * 60);
      else preparePhase('work', (Number(data.duration || 0)) * 60);
      state._phaseInitialized = true;
    }
    updateCycleInfo();
  }, (err) => {
    console.error('[task-run] onSnapshot error:', err);
  });
}
function preparePhase(phase, sec) {
  state.mode = phase;
  state.timerSec = Number(sec || 0);
  state.elapsedSecThisSession = 0;
  if (timerEl) timerEl.textContent = mmss(state.timerSec);
  if (phaseLabel) phaseLabel.textContent = (phase === 'work') ? 'Sessió' : (phase === 'short' ? 'Pausa curta' : (phase === 'long' ? 'Pausa llarga' : 'Preparat'));
}
function updateCycleInfo() {
  if (cyclesInfo) cyclesInfo.textContent = `Cicles complerts: ${state.cycleCount}`;
  const totalMinutes = Math.round(( (state.taskDoc?.timeSpent || 0) * 1 ) + (state.elapsedSecThisSession / 60));
  if (elapsedEl) elapsedEl.textContent = totalMinutes;
}
function tick() {
  if (!state.running) return;
  if (state.timerSec <= 0) return onPhaseEnd();
  state.timerSec -= 1;
  state.elapsedSecThisSession += 1;
  if (timerEl) timerEl.textContent = mmss(state.timerSec);
  if (state.elapsedSecThisSession % 15 === 0) updateCycleInfo();
  document.title = `${mmss(state.timerSec)} — ${state.taskDoc?.title || 'Tasca'}`;
}
async function onPhaseEnd() {
  stopInterval();
  if (state.mode === 'work') {
    let minutes = Math.round(state.elapsedSecThisSession / 60);
    if (minutes === 0 && state.elapsedSecThisSession > 0) minutes = 1;
    if (minutes > 0) {
      try {
        if (typeof addTimeToTask === 'function') {
          await addTimeToTask(state.taskId, minutes);
        } else {
          console.warn('addTimeToTask not available — ensure firebase-client exports it');
        }
      } catch (err) {
        console.error('error subiendo minutos', err);
      }
    }
    state.cycleCount++;
  }

  try {
    if (beepUnlocked) {
      beepAudio.currentTime = 0;
      beepAudio.play().catch(() => {});
    }
  } catch (e) {
    console.warn('No se pudo reproducir el beep', e);
  }
  if (state.taskDoc?.method === 'pomodoro') {
    if (state.mode === 'work') {
      if (state.cycleCount % state.cycles_before_long === 0) {
        preparePhase('long', state.long_break * 60);
      } else {
        preparePhase('short', state.short_break * 60);
      }
    } else {
      preparePhase('work', state.pomodoro_length * 60);
    }
  } else {
    state.mode = 'finished';
    if (phaseLabel) phaseLabel.textContent = 'Finalitzat';
  }
  if (state.taskDoc?.method === 'pomodoro' && state.mode !== 'finished') {
    startTimer();
  }

  updateCycleInfo();
}
function startInterval() {
  if (state.intervalId) clearInterval(state.intervalId);
  state.running = true;
  state.intervalId = setInterval(tick, 1000);
  if (startBtn) startBtn.disabled = true;
  if (pauseBtn) pauseBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = false;
}
function stopInterval() {
  state.running = false;
  if (state.intervalId) { clearInterval(state.intervalId); state.intervalId = null; }
  if (startBtn) startBtn.disabled = false;
  if (pauseBtn) pauseBtn.disabled = true;
}
function startTimer() {
  if (!state.taskId || !state.taskDoc) {
    stopBeep();
    alert('No hi ha cap tasca carregada per iniciar.');
    return;
  }
  startInterval();
  if (phaseLabel) phaseLabel.textContent = (state.mode === 'work' ? 'Sessió' : (state.mode === 'short' ? 'Pausa curta' : 'Pausa llarga'));
}
function pauseTimer() {
  stopBeep();
  stopInterval();
  if (phaseLabel) phaseLabel.textContent = 'Pausat';
}

async function stopAndSave(finalize=false) {
  stopBeep();
  if (state.elapsedSecThisSession > 0) {
    let minutes = Math.round(state.elapsedSecThisSession / 60);
    if (minutes === 0 && state.elapsedSecThisSession > 0) minutes = 1;
    if (minutes > 0) {
      try {
        if (typeof addTimeToTask === 'function') await addTimeToTask(state.taskId, minutes);
        else console.warn('addTimeToTask missing');
      } catch (err) { console.error(err); }
    }
  }

  stopInterval();
  if (phaseLabel) phaseLabel.textContent = 'Aturat';

  if (finalize) {
    if (typeof markTaskCompleted === 'function') {
      try { await markTaskCompleted(state.taskId, true); alert('Tasca marcada com a completada'); }
      catch(e){ console.error(e); alert('Error marcant la tasca'); }
    }
  }
  updateCycleInfo();
}
if (startBtn) startBtn.addEventListener('click', async () => {
  try {
    await unlockBeep();
  } catch(e) {} 
  startTimer();
});

if (pauseBtn) pauseBtn.addEventListener('click', () => pauseTimer());
if (stopBtn) stopBtn.addEventListener('click', () => stopAndSave(false));
if (markDone) markDone.addEventListener('click', async () => {
  if (!confirm('Vols marcar la tasca com a completada?')) return;
  await stopAndSave(true);
});

const stopAlarmBtn = document.getElementById('stop-alarm');

if (stopAlarmBtn) {
  stopAlarmBtn.addEventListener('click', () => {
    stopBeep();
  });
}
window.addEventListener('beforeunload', () => {
  if (typeof taskUnsubscribe === 'function') taskUnsubscribe();
  stopInterval();
});
document.addEventListener('DOMContentLoaded', () => {
  const taskId = getQueryParam('task');
  if (!taskId) { alert('No taskId provided'); return; }
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert('Has d\'iniciar sessió per iniciar la tasca.');
      location.href = 'login.html';
      return;
    }
    loadTask(taskId);
  });
});
