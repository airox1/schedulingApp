(() => {
  const TOKEN_KEY = 'availability_edit_token';
  const THEME_KEY = 'availability_theme';
  const SAVE_DEBOUNCE_MS = 700;
  const STATUS_CYCLE = ['unknown', 'available', 'unavailable'];
  const STATUS_LABELS = { unknown: 'Not set', available: 'Available', unavailable: 'Unavailable' };

  const weekLabelEl = document.getElementById('week-label');
  const weekGridEl = document.getElementById('week-grid');
  const weekSummaryEl = document.getElementById('week-summary');
  const editToggleBtn = document.getElementById('edit-toggle-btn');
  const editingBanner = document.getElementById('editing-banner');
  const doneEditingBtn = document.getElementById('done-editing-btn');
  const prevWeekBtn = document.getElementById('prev-week-btn');
  const nextWeekBtn = document.getElementById('next-week-btn');
  const todayBtn = document.getElementById('today-btn');
  const displayNameEl = document.getElementById('display-name');
  const modal = document.getElementById('passcode-modal');
  const passcodeForm = document.getElementById('passcode-form');
  const passcodeInput = document.getElementById('passcode-input');
  const passcodeError = document.getElementById('passcode-error');
  const passcodeCancelBtn = document.getElementById('passcode-cancel-btn');
  const toastEl = document.getElementById('toast');
  const themeLightBtns = document.querySelectorAll('.theme-light-btn');
  const themeDarkBtns = document.querySelectorAll('.theme-dark-btn');

  const noteModal = document.getElementById('note-modal');
  const noteCloseBtn = document.getElementById('note-close-btn');
  const noteSaveBtn = document.getElementById('note-save-btn');
  const noteInput = document.getElementById('note-input');
  const noteDisplay = document.getElementById('note-display');
  const noteModalActions = document.getElementById('note-modal-actions');
  const noteModalTitle = document.getElementById('note-modal-title');

  const bugReportBtn = document.getElementById('bug-report-btn');
  const bugModal = document.getElementById('bug-modal');
  const bugCloseBtn = document.getElementById('bug-close-btn');
  const bugCancelBtn = document.getElementById('bug-cancel-btn');
  const bugSubmitBtn = document.getElementById('bug-submit-btn');
  const bugInput = document.getElementById('bug-input');

  let currentWeekStart = getWeekStart(new Date());
  let weekData = null;
  let isEditing = false;
  let saveTimer = null;
  let toastTimer = null;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatDateStr(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseDateStr(s) {
    const [y, m, day] = s.split('-').map(Number);
    return new Date(y, m - 1, day);
  }

  function getWeekStart(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = -day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function addDaysToDate(d, n) {
    const date = new Date(d);
    date.setDate(date.getDate() + n);
    return date;
  }

  function shortDate(d) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatRangeLabel(startStr) {
    const start = parseDateStr(startStr);
    const end = addDaysToDate(start, 6);
    if (start.getFullYear() !== end.getFullYear()) {
      return `${shortDate(start)}, ${start.getFullYear()} – ${shortDate(end)}, ${end.getFullYear()}`;
    }
    return `${shortDate(start)} – ${shortDate(end)}, ${end.getFullYear()}`;
  }

  function getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const expiry = Number(token.split('.')[0]);
    if (!Number.isFinite(expiry) || Date.now() > expiry) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2200);
  }

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.displayName) {
        displayNameEl.textContent = data.displayName;
        document.title = data.displayName;
      }
    } catch (e) {
      console.error('Failed to load config');
    }
  }

  async function fetchWeek(startStr) {
    const res = await fetch(`/api/week?start=${encodeURIComponent(startStr)}`);
    if (!res.ok) throw new Error('Failed to load week');
    weekData = await res.json();
  }

  function renderSummary() {
    const counts = { available: 0, unavailable: 0, unknown: 0 };
    weekData.days.forEach((day) => {
      counts[day.status] += 1;
    });

    weekSummaryEl.innerHTML = '';
    STATUS_CYCLE.forEach((status) => {
      const item = document.createElement('div');
      item.className = 'legend-item';

      const dot = document.createElement('span');
      dot.className = `legend-dot status-${status}`;
      item.appendChild(dot);

      const label = document.createElement('span');
      label.textContent = `${STATUS_LABELS[status]} (${counts[status]})`;
      item.appendChild(label);

      weekSummaryEl.appendChild(item);
    });
  }

  function render(animDir = 0) {
    weekLabelEl.textContent = formatRangeLabel(formatDateStr(currentWeekStart));
    editToggleBtn.hidden = isEditing;
    
    if (isEditing) {
      editingBanner.classList.remove('collapsed');
    } else {
      editingBanner.classList.add('collapsed');
    }
    
    renderSummary();

    weekGridEl.innerHTML = '';
    weekData.days.forEach((day, index) => {
      let displayStatus = day.status;
      if (isEditing && day.status === 'unknown') {
        displayStatus = 'unavailable';
      }

      const card = document.createElement('div');
      card.className = `day-card status-${displayStatus}`;
      
      if (animDir !== 0) {
        card.classList.add('animate-in');
        let delayIndex = 0;
        if (animDir === 1) delayIndex = index;
        else if (animDir === -1) delayIndex = 6 - index;
        
        card.style.animationDelay = `${delayIndex * 0.05}s`;
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'day-name';
      nameEl.textContent = day.dayName;
      card.appendChild(nameEl);

      const dateEl = document.createElement('div');
      dateEl.className = 'day-date';
      dateEl.textContent = shortDate(parseDateStr(day.date));
      card.appendChild(dateEl);

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'toggle-btn';
      toggleBtn.type = 'button';
      toggleBtn.textContent = STATUS_LABELS[displayStatus];
      toggleBtn.disabled = !isEditing;
      toggleBtn.addEventListener('click', () => toggleDay(index));
      card.appendChild(toggleBtn);

      if (isEditing) {
        const noteBtn = document.createElement('button');
        noteBtn.className = 'btn btn-outline btn-small btn-note';
        noteBtn.textContent = day.note ? 'Edit note' : 'Add note';
        noteBtn.addEventListener('click', () => openNoteModal(index));
        card.appendChild(noteBtn);
      } else if (day.note) {
        const noteBtn = document.createElement('button');
        noteBtn.className = 'btn btn-outline btn-small btn-note';
        noteBtn.textContent = 'View note';
        noteBtn.addEventListener('click', () => openNoteModal(index));
        card.appendChild(noteBtn);
      }

      weekGridEl.appendChild(card);
    });
  }

  function toggleDay(index) {
    if (!isEditing) return;
    const day = weekData.days[index];
    
    if (day.status === 'unknown' || day.status === 'unavailable') {
      day.status = 'available';
    } else {
      day.status = 'unavailable';
    }
    
    render();
    scheduleSave();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWeek, SAVE_DEBOUNCE_MS);
  }

  async function flushPendingSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      await saveWeek();
    }
  }

  async function saveWeek() {
    const token = getToken();
    if (!token) {
      exitEditing();
      showToast('Session expired — click "Edit Availability" to log in again.');
      return;
    }
    try {
      const res = await fetch('/api/week', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ weekStart: weekData.weekStart, days: weekData.days }),
      });
      if (res.status === 401) {
        clearToken();
        exitEditing();
        showToast('Session expired — click "Edit Availability" to log in again.');
        return;
      }
      if (!res.ok) throw new Error('Save failed');
      showToast('Saved');
    } catch (e) {
      showToast('Could not save — check your connection.');
    }
  }

  function enterEditing() {
    isEditing = true;
    render(2);
  }

  function exitEditing() {
    isEditing = false;
    render(2);
  }

  function openPasscodeModal() {
    passcodeError.hidden = true;
    passcodeInput.value = '';
    modal.hidden = false;
    passcodeInput.focus();
  }

  function closePasscodeModal() {
    modal.classList.add('closing');
    setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove('closing');
    }, 200);
  }

  let currentNoteDayIndex = -1;

  function openNoteModal(index) {
    currentNoteDayIndex = index;
    const day = weekData.days[index];
    noteModalTitle.textContent = day.dayName;
    
    if (isEditing) {
      noteInput.value = day.note || '';
      noteInput.hidden = false;
      noteDisplay.hidden = true;
      noteModalActions.hidden = false;
      noteModal.hidden = false;
      noteInput.focus();
    } else {
      noteDisplay.textContent = day.note || '';
      noteDisplay.hidden = false;
      noteInput.hidden = true;
      noteModalActions.hidden = true;
      noteModal.hidden = false;
    }
  }

  function closeNoteModal() {
    noteModal.classList.add('closing');
    setTimeout(() => {
      noteModal.hidden = true;
      noteModal.classList.remove('closing');
      render();
    }, 200);
  }

  noteCloseBtn.addEventListener('click', closeNoteModal);
  noteSaveBtn.addEventListener('click', closeNoteModal);

  noteModal.addEventListener('click', (e) => {
    if (e.target === noteModal) closeNoteModal();
  });

  function openBugModal() {
    bugInput.value = '';
    bugModal.hidden = false;
    bugModal.classList.remove('closing');
    bugInput.focus();
  }

  function closeBugModal() {
    bugModal.classList.add('closing');
    setTimeout(() => {
      bugModal.hidden = true;
      bugModal.classList.remove('closing');
    }, 200);
  }

  bugReportBtn.addEventListener('click', openBugModal);
  bugCloseBtn.addEventListener('click', closeBugModal);
  bugCancelBtn.addEventListener('click', closeBugModal);
  bugModal.addEventListener('click', (e) => {
    if (e.target === bugModal) closeBugModal();
  });

  bugSubmitBtn.addEventListener('click', async () => {
    const issue = bugInput.value.trim();
    if (!issue) return;
    
    bugSubmitBtn.disabled = true;
    bugSubmitBtn.textContent = 'Submitting...';

    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue })
      });

      if (!res.ok) {
        throw new Error('Failed to submit bug report');
      }

      closeBugModal();
      showToast('Bug report submitted. Thanks!');
    } catch (err) {
      console.error(err);
      showToast('Failed to submit bug report. Please try again.');
    } finally {
      bugSubmitBtn.disabled = false;
      bugSubmitBtn.textContent = 'Submit';
    }
  });

  noteInput.addEventListener('input', (e) => {
    if (currentNoteDayIndex >= 0) {
      weekData.days[currentNoteDayIndex].note = e.target.value;
      scheduleSave();
    }
  });

  async function goToWeek(startDate, animDir = 1) {
    await flushPendingSave();
    currentWeekStart = startDate;
    await fetchWeek(formatDateStr(currentWeekStart));
    render(animDir);
  }

  editToggleBtn.addEventListener('click', () => {
    const token = getToken();
    if (token) {
      enterEditing();
    } else {
      openPasscodeModal();
    }
  });

  doneEditingBtn.addEventListener('click', async () => {
    await flushPendingSave();
    exitEditing();
  });

  prevWeekBtn.addEventListener('click', () => goToWeek(addDaysToDate(currentWeekStart, -7), -1));
  nextWeekBtn.addEventListener('click', () => goToWeek(addDaysToDate(currentWeekStart, 7), 1));
  todayBtn.addEventListener('click', () => goToWeek(getWeekStart(new Date()), 1));

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeLightBtns.forEach((btn) => {
      btn.classList.toggle('active', theme === 'light');
      btn.setAttribute('aria-pressed', String(theme === 'light'));
    });
    themeDarkBtns.forEach((btn) => {
      btn.classList.toggle('active', theme === 'dark');
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
    });
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }

  applyTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');

  themeLightBtns.forEach((btn) => btn.addEventListener('click', () => setTheme('light')));
  themeDarkBtns.forEach((btn) => btn.addEventListener('click', () => setTheme('dark')));

  passcodeCancelBtn.addEventListener('click', closePasscodeModal);

  passcodeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passcodeError.hidden = true;
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput.value }),
      });
      const data = await res.json();
      if (!res.ok) {
        passcodeError.textContent = data.error || 'Incorrect passcode.';
        passcodeError.hidden = false;
        return;
      }
      setToken(data.token);
      closePasscodeModal();
      enterEditing();
    } catch (e) {
      passcodeError.textContent = 'Could not reach the server.';
      passcodeError.hidden = false;
    }
  });

  (async function init() {
    await loadConfig();
    await fetchWeek(formatDateStr(currentWeekStart));
    render(1);
  })();
})();
