/* =====================
   SILENTFLOW — script.js
   ===================== */

// ── State ──────────────────────────────────────────────
let tasks        = JSON.parse(localStorage.getItem('sf_tasks'))        || [];
let reflections  = JSON.parse(localStorage.getItem('sf_reflections'))  || [];
let sessions     = parseInt(localStorage.getItem('sf_sessions'))       || 0;
let streak       = parseInt(localStorage.getItem('sf_streak'))         || 0;
let lastStudyDay = localStorage.getItem('sf_last_study_day')           || null;
let studyMinutes = parseInt(localStorage.getItem('sf_study_mins'))     || 0;

let selectedCategory = 'Study';
let selectedPriority = 'high';
let selectedMood     = null;
let currentFilter    = 'all';

// ── Timer state ────────────────────────────────────────
let timerInterval = null;
let timerRunning  = false;
let timerSeconds  = 25 * 60;
let timerTotal    = 25 * 60;
const RING_CIRC   = 553; // 2π × 88

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════
function initNav() {
  const navItems   = document.querySelectorAll('.nav-item');
  const bnavBtns   = document.querySelectorAll('.bnav-btn');
  const sections   = document.querySelectorAll('.section');

  function activate(sectionId) {
    sections.forEach(s => s.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    bnavBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('section-' + sectionId)?.classList.add('active');
    navItems.forEach(n => { if (n.dataset.section === sectionId) n.classList.add('active'); });
    bnavBtns.forEach(b => { if (b.dataset.section === sectionId) b.classList.add('active'); });
  }

  navItems.forEach(item => item.addEventListener('click', () => activate(item.dataset.section)));
  bnavBtns.forEach(btn  => btn.addEventListener('click',  () => activate(btn.dataset.section)));
}

// ══════════════════════════════════════════════════════
//  STREAK & DATE
// ══════════════════════════════════════════════════════
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function updateStreak() {
  const today = todayStr();
  if (lastStudyDay === today) return;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  if (lastStudyDay === yStr) {
    streak++;
  } else if (lastStudyDay !== today) {
    streak = 1;
  }
  lastStudyDay = today;
  localStorage.setItem('sf_streak', streak);
  localStorage.setItem('sf_last_study_day', lastStudyDay);
  renderStreak();
}

function renderStreak() {
  const el = document.getElementById('sidebarStreak');
  if (el) el.textContent = streak;
}

function renderDate() {
  const el = document.getElementById('todayDate');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ══════════════════════════════════════════════════════
//  TASKS
// ══════════════════════════════════════════════════════
function saveTasks() {
  localStorage.setItem('sf_tasks', JSON.stringify(tasks));
}

function addTask() {
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }

  const task = {
    id:       Date.now(),
    text,
    category: selectedCategory,
    priority: selectedPriority,
    done:     false,
    date:     todayStr(),
  };
  tasks.unshift(task);
  saveTasks();
  input.value = '';
  renderTasks();
  renderDashboard();
  updateStreak();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  renderTasks();
  renderDashboard();
  if (t.done) spawnConfetti(id);
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  renderDashboard();
}

function renderTasks() {
  const list    = document.getElementById('taskList');
  const pill    = document.getElementById('taskProgressPill');
  const bar     = document.getElementById('taskProgressBar');
  if (!list) return;

  const todayTasks = tasks.filter(t => t.date === todayStr());
  const filtered   = currentFilter === 'all'
    ? todayTasks
    : todayTasks.filter(t => t.category === currentFilter);

  const done  = todayTasks.filter(t => t.done).length;
  const total = todayTasks.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  if (pill) pill.textContent = `${done} / ${total} done`;
  if (bar)  bar.style.width  = pct + '%';

  if (filtered.length === 0) {
    list.innerHTML = `<p style="color:var(--text-sub);font-size:14px;padding:20px 0">No tasks here — add one below ✦</p>`;
    return;
  }

  list.innerHTML = filtered.map(t => `
    <div class="task-item" id="task-${t.id}">
      <button class="task-checkbox ${t.done ? 'checked' : ''}" onclick="toggleTask(${t.id})" title="Toggle">
        <svg class="check-icon" width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1.5 5.5l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="task-body">
        <div class="task-text ${t.done ? 'done' : ''}">${escHtml(t.text)}</div>
        <div class="task-badges">
          <span class="badge badge-${t.category.toLowerCase()}">${t.category}</span>
          <span class="badge badge-${t.priority}">${t.priority}</span>
        </div>
      </div>
      <button class="task-delete" onclick="deleteTask(${t.id})" title="Delete">✕</button>
    </div>
  `).join('');
}

function initTaskControls() {
  document.getElementById('addTaskBtn')?.addEventListener('click', addTask);
  document.getElementById('taskInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });

  document.getElementById('categoryGroup')?.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#categoryGroup .tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCategory = btn.dataset.val;
    });
  });

  document.getElementById('priorityGroup')?.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#priorityGroup .tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPriority = btn.dataset.val;
    });
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });
}

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════
function renderDashboard() {
  const todayTasks = tasks.filter(t => t.date === todayStr());
  const done  = todayTasks.filter(t => t.done).length;
  const total = todayTasks.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const goalHours = 4;
  const goalPct   = Math.min(100, Math.round((studyMinutes / (goalHours * 60)) * 100));
  const goalH     = Math.floor(studyMinutes / 60);
  const goalM     = studyMinutes % 60;

  const goalDisplay = document.getElementById('goalDisplay');
  const goalBar     = document.getElementById('goalBar');
  const streakDisp  = document.getElementById('streakDisplay');
  const taskStats   = document.getElementById('taskStatsDisplay');
  const taskBar2    = document.getElementById('taskBar');
  const sesDisp     = document.getElementById('sessionsDisplay');
  const miniList    = document.getElementById('miniTaskList');
  const refPrev     = document.getElementById('reflectionPreview');

  if (goalDisplay) goalDisplay.textContent = `${goalH}h ${goalM}m / ${goalHours}h`;
  if (goalBar)     goalBar.style.width      = goalPct + '%';
  if (streakDisp)  streakDisp.textContent   = `${streak} day${streak !== 1 ? 's' : ''}`;
  if (taskStats)   taskStats.textContent    = `${done} / ${total}`;
  if (taskBar2)    taskBar2.style.width     = pct + '%';
  if (sesDisp)     sesDisp.textContent      = sessions;

  if (miniList) {
    if (todayTasks.length === 0) {
      miniList.innerHTML = `<li class="empty-state">No tasks yet — add some in Tasks ✦</li>`;
    } else {
      const catColors = { Study: 'var(--purple)', Personal: 'var(--pink)', Project: 'var(--blue)' };
      miniList.innerHTML = todayTasks.slice(0, 5).map(t => `
        <li class="mini-task-item ${t.done ? 'done' : ''}">
          <span class="mini-dot" style="background:${catColors[t.category] || 'var(--text-sub)'}"></span>
          ${escHtml(t.text)}
        </li>
      `).join('');
    }
  }

  if (refPrev) {
    const last = reflections[0];
    refPrev.textContent = last ? last.text.slice(0, 120) + (last.text.length > 120 ? '…' : '') : 'Your reflections will appear here.';
  }
}

// ══════════════════════════════════════════════════════
//  TIMER
// ══════════════════════════════════════════════════════
function updateTimerDisplay() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const s = String(timerSeconds % 60).padStart(2, '0');
  const el = document.getElementById('timerDisplay');
  if (el) el.textContent = `${m}:${s}`;
  updateRing();
}

function updateRing() {
  const ring = document.getElementById('timerRing');
  if (!ring) return;
  const progress = timerSeconds / timerTotal;
  ring.style.strokeDashoffset = RING_CIRC * (1 - progress);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  document.getElementById('startBtn').disabled = true;
  document.getElementById('pauseBtn').disabled = false;

  timerInterval = setInterval(() => {
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      document.getElementById('startBtn').disabled = false;
      document.getElementById('pauseBtn').disabled = true;
      onTimerComplete();
      return;
    }
    timerSeconds--;
    studyMinutes = Math.floor((timerTotal - timerSeconds) / 60);
    localStorage.setItem('sf_study_mins', studyMinutes);
    updateTimerDisplay();
    renderDashboard();
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;
}

function resetTimer() {
  pauseTimer();
  timerSeconds = timerTotal;
  updateTimerDisplay();
}

function onTimerComplete() {
  sessions++;
  localStorage.setItem('sf_sessions', sessions);
  updateStreak();
  renderDashboard();
  document.getElementById('sessionCount').textContent = sessions;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('SilentFlow', { body: 'Focus session complete! Take a break 🎉' });
  }
  // Flash display
  const disp = document.getElementById('timerDisplay');
  if (disp) { disp.style.opacity = '0.3'; setTimeout(() => disp.style.opacity = '1', 300); }
  resetTimer();
}

function initTimer() {
  const svg = document.querySelector('.timer-ring');
  if (svg) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stop-color="#818cf8"/>
        <stop offset="100%" stop-color="#f472b6"/>
      </linearGradient>`;
    svg.prepend(defs);
    document.getElementById('timerRing').style.stroke = 'url(#timerGrad)';
  }

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pauseTimer();
      timerTotal   = parseInt(btn.dataset.mins) * 60;
      timerSeconds = timerTotal;
      const label  = document.getElementById('timerLabel');
      if (label) label.textContent = btn.dataset.mode === 'pomodoro' ? 'Focus' : 'Break';
      updateTimerDisplay();
    });
  });

  document.getElementById('sessionCount').textContent = sessions;
  updateTimerDisplay();

  if ('Notification' in window) Notification.requestPermission();
}

// ══════════════════════════════════════════════════════
//  REFLECTIONS
// ══════════════════════════════════════════════════════
function saveReflection() {
  const text = document.getElementById('reflectionInput')?.value.trim();
  if (!text) return;

  const entry = {
    id:   Date.now(),
    text,
    mood: selectedMood,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  reflections.unshift(entry);
  localStorage.setItem('sf_reflections', JSON.stringify(reflections));

  document.getElementById('reflectionInput').value = '';
  selectedMood = null;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));

  const toast = document.getElementById('saveToast');
  if (toast) {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  renderReflectionHistory();
  renderDashboard();
  updateStreak();
}

function renderReflectionHistory() {
  const hist = document.getElementById('reflectionHistory');
  if (!hist) return;
  if (reflections.length === 0) {
    hist.innerHTML = '';
    return;
  }
  hist.innerHTML = reflections.slice(0, 5).map(r => `
    <div class="history-item">
      <div class="history-meta">
        <span class="history-date">${r.date}</span>
        <span class="history-mood">${r.mood || ''}</span>
      </div>
      <p class="history-text">${escHtml(r.text)}</p>
    </div>
  `).join('');
}

function initReflections() {
  document.getElementById('saveReflectionBtn')?.addEventListener('click', saveReflection);
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMood = btn.dataset.mood;
    });
  });
}

// ══════════════════════════════════════════════════════
//  CONFETTI
// ══════════════════════════════════════════════════════
function spawnConfetti(taskId) {
  const el = document.getElementById('task-' + taskId);
  if (!el) return;
  const colors = ['#818cf8','#f472b6','#34d399','#fbbf24','#38bdf8'];
  for (let i = 0; i < 12; i++) {
    const dot = document.createElement('span');
    const size = 5 + Math.random() * 5;
    Object.assign(dot.style, {
      position:        'absolute',
      left:            Math.random() * 100 + '%',
      top:             '50%',
      width:           size + 'px',
      height:          size + 'px',
      borderRadius:    Math.random() > 0.5 ? '50%' : '2px',
      background:      colors[Math.floor(Math.random() * colors.length)],
      pointerEvents:   'none',
      zIndex:          99,
      transform:       'translateY(0)',
      opacity:         '1',
      transition:      `transform ${0.6 + Math.random() * 0.4}s ease, opacity 0.5s ease`,
    });
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(dot);
    requestAnimationFrame(() => {
      const dy = -(40 + Math.random() * 60);
      const dx = -20 + Math.random() * 40;
      dot.style.transform = `translate(${dx}px, ${dy}px)`;
      dot.style.opacity   = '0';
    });
    setTimeout(() => dot.remove(), 1100);
  }
}

// ══════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initTaskControls();
  initTimer();
  initReflections();
  renderDate();
  renderStreak();
  renderTasks();
  renderDashboard();
  renderReflectionHistory();
});

// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
