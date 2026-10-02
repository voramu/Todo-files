const ICONS = {
  list: '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  trend: '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
};

const STORAGE_KEY = 'stats-completed';

let counts = {};
let topUsers = [];
let selectedUser = null;

// Кэш переводов: английский текст -> русский текст
const translations = {};

// ---------- Сохранение отметок между перезагрузками ----------

// Достаёт сохранённые отметки: { id задачи: true/false }
function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

// Запоминает одну отметку
function saveChange(taskId, completed) {
  const saved = loadSaved();
  saved[taskId] = completed;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (error) {
    console.error('Не удалось сохранить отметку:', error);
  }
}

// Накладывает сохранённые отметки на данные с сервера
function applySaved() {
  const saved = loadSaved();

  for (let i = 0; i < todos.length; i++) {
    if (saved[todos[i].id] !== undefined) {
      todos[i].completed = saved[todos[i].id];
    }
  }
}

// ---------- Страница ----------

function renderStats() {
  renderCards();
  countByUser();
  renderRanking();
}

// 1. Четыре карточки-метрики
function renderCards() {
  let total = todos.length;
  let done = 0;

  for (let i = 0; i < todos.length; i++) {
    if (todos[i].completed) {
      done = done + 1;
    }
  }

  let active = total - done;
  let percent = Math.round((done / total) * 100);

  let html = '';
  html = html + makeCard('icon-purple', ICONS.list, total, 'Всего задач');
  html = html + makeCard('icon-green', ICONS.check, done, 'Выполнено');
  html = html + makeCard('icon-yellow', ICONS.clock, active, 'Активных');
  html = html + makeCard('icon-pink', ICONS.trend, percent + '%', 'Процент');

  document.getElementById('cards').innerHTML = html;
}

function makeCard(iconClass, icon, value, label) {
  return `
    <div class="card">
      <div class="card-icon ${iconClass}">${icon}</div>
      <div class="card-value">${value}</div>
      <div class="card-label">${label}</div>
    </div>
  `;
}

// 2. Группировка по userId (объект-счётчик) и топ-10
function countByUser() {
  counts = {};

  for (let i = 0; i < todos.length; i++) {
    const id = todos[i].userId;

    if (counts[id] === undefined) {
      counts[id] = { total: 0, done: 0 };
    }

    counts[id].total = counts[id].total + 1;

    if (todos[i].completed) {
      counts[id].done = counts[id].done + 1;
    }
  }

  const userIds = Object.keys(counts);

  userIds.sort(function (a, b) {
    return counts[b].total - counts[a].total;
  });

  topUsers = userIds.slice(0, 10);
}

// 3. Рейтинг: строки с полоской
function renderRanking() {
  let html = '';

  for (let i = 0; i < topUsers.length; i++) {
    const id = topUsers[i];
    const total = counts[id].total;
    const done = counts[id].done;
    const percent = Math.round((done / total) * 100);
    const selectedClass = String(id) === String(selectedUser) ? 'selected' : '';

    html = html + `
      <div class="rank-row ${selectedClass}" onclick="selectUser(${id})">
        <span class="rank-place">${i + 1}</span>
        <span class="rank-name">User ${id}</span>
        <div class="bar">
          <div class="bar-fill" style="width: ${percent}%"></div>
        </div>
        <span class="rank-count">${done} из ${total} · ${percent}%</span>
      </div>
    `;
  }

  document.getElementById('ranking').innerHTML = html;
}

// 4. Перевод текста задачи на русский
function translateTodo(text) {
  if (translations[text] !== undefined) {
    return Promise.resolve(translations[text]);
  }

  return axios
    .get('https://api.mymemory.translated.net/get', {
      params: { q: text, langpair: 'en|ru' }
    })
    .then(function (response) {
      // Если сервис вернул ошибку или лимит, оставляем английский текст
      if (Number(response.data.responseStatus) !== 200) {
        return text;
      }
      const result = response.data.responseData.translatedText;
      translations[text] = result;
      return result;
    })
    .catch(function () {
      return text;
    });
}

function getUserTodos() {
  return todos.filter(function (t) {
    return t.userId === Number(selectedUser);
  });
}

// 5. Клик по пользователю: показать его задачи
function selectUser(id) {
  selectedUser = id;
  renderRanking();
  renderUserTasks(); // сразу, пока перевод грузится

  const promises = getUserTodos().map(function (t) {
    return translateTodo(t.todo);
  });

  // Когда переводы пришли, перерисовываем уже на русском
  Promise.all(promises).then(function () {
    renderUserTasks();
  });
}

function renderUserTasks() {
  const userTodos = getUserTodos();

  let html = `<h2>Задачи User ${selectedUser} <span>(${userTodos.length})</span></h2>`;

  for (let i = 0; i < userTodos.length; i++) {
    const task = userTodos[i];
    const text = translations[task.todo] || task.todo;
    const doneClass = task.completed ? 'done' : '';
    const statusClass = task.completed ? 'status--done' : 'status--active';
    const statusText = task.completed ? 'Выполнена' : 'Активна';

    html = html + `
      <div class="user-task ${doneClass}" onclick="toggleUserTask(${task.id})">
        <span class="check"></span>
        <p>${escapeHtml(text)}</p>
        <span class="status ${statusClass}">${statusText}</span>
      </div>
    `;
  }

  document.getElementById('userTasks').innerHTML = html;
}

// 6. Клик по задаче: отметить / снять отметку
function toggleUserTask(taskId) {
  const task = todos.find(function (t) {
    return t.id === taskId;
  });
  task.completed = !task.completed;

  // Запоминаем, чтобы после перезагрузки отметка осталась
  saveChange(task.id, task.completed);

  renderCards();
  countByUser();
  renderRanking();
  renderUserTasks();
}

loadTodos().then(function () {
  applySaved();
  renderStats();
});