/* ==========================================================================
   planner.js — логика страницы «Планировщик»
   Владелец: участник A
   Массив todos и функция loadTodos() — в common.js
   ========================================================================== */

function render() {
  // TODO: renderList(getFilteredTodos()), updateCounters(), updateProgress()
}

loadTodos().then(function () {
  render();
});


/* ==========================================================================
   planner.js — логика страницы «Планировщик»
   Владелец: участник A
   Массив todos, loadTodos() и escapeHtml() — в common.js
   ========================================================================== */

// Состояние страницы: выбранная вкладка и текст поиска
const state = {
  filter: 'all', // 'all' | 'active' | 'completed'
  query: '',
  poppedId: null, // id задачи, которую только что отметили (для анимации)
  newId: null // id только что добавленной задачи (для анимации)
};

/* --------------------------------------------------------------------------
   Фильтрация: вкладка и поиск работают одновременно
   -------------------------------------------------------------------------- */
function getFilteredTodos() {
  let result = todos;

  if (state.filter === 'active') {
    result = result.filter((t) => t.completed === false);
  }
  if (state.filter === 'completed') {
    result = result.filter((t) => t.completed === true);
  }
  if (state.query !== '') {
    const query = state.query.toLowerCase();
    result = result.filter((t) => t.todo.toLowerCase().includes(query));
  }

  return result;
}

/* --------------------------------------------------------------------------
   Отрисовка
   -------------------------------------------------------------------------- */
function render() {
  const filtered = getFilteredTodos();

  renderList(filtered);
  updateCounters();
  updateProgress();
  updateFooter(filtered.length);

  // Анимации проигрываются один раз
  state.poppedId = null;
  state.newId = null;
}

// Список строится циклом с накоплением строки
function renderList(list) {
  const container = document.getElementById('task-list');

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <p class="empty__icon">🔍</p>
        <p class="empty__title">Ничего не найдено</p>
        <p class="empty__text">Попробуйте изменить запрос или выбрать другую вкладку</p>
      </div>
    `;
    return;
  }

  let html = '';

  for (let i = 0; i < list.length; i++) {
    const task = list[i];

    let classes = 'task';
    if (task.completed) classes = classes + ' done';
    if (task.id === state.poppedId) classes = classes + ' task--pop';
    if (task.id === state.newId) classes = classes + ' task--new';

    const userBadge = task.own
      ? '<span class="user user--own">Моя</span>'
      : `<span class="user">User ${task.userId}</span>`;

    html =
      html +
      `
      <div
        class="${classes}"
        onclick="toggleTodo(${task.id})"
        onkeydown="onTaskKeydown(event, ${task.id})"
        role="checkbox"
        aria-checked="${task.completed}"
        tabindex="0"
      >
        <span class="check"></span>
        <p>${highlight(task.todo, state.query)}</p>
        ${userBadge}
        <button
          class="task__delete"
          type="button"
          aria-label="Удалить задачу"
          onclick="deleteTodo(event, ${task.id})"
        >×</button>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Счётчики во вкладках считаются из данных
function updateCounters() {
  const completedCount = todos.filter((t) => t.completed).length;

  document.getElementById('count-all').textContent = todos.length;
  document.getElementById('count-active').textContent = todos.length - completedCount;
  document.getElementById('count-completed').textContent = completedCount;
}

// Прогресс-бар: ширина = процент выполненных
function updateProgress() {
  const total = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  document.getElementById('progress-fill').style.width = percent + '%';
  document.getElementById('progress').setAttribute('aria-valuenow', percent);
  document.getElementById('progress-text').innerHTML =
    `Выполнено <strong>${percent}%</strong> (${completedCount} из ${total})`;
}

function updateFooter(shownCount) {
  document.getElementById('list-footer').textContent =
    `Показано ${shownCount} из ${todos.length}`;
}

// Подсвечивает найденный фрагмент. Текст экранируется перед вставкой.
function highlight(text, query) {
  if (query === '') return escapeHtml(text);

  const start = text.toLowerCase().indexOf(query.toLowerCase());
  if (start === -1) return escapeHtml(text);

  const end = start + query.length;
  return (
    escapeHtml(text.slice(0, start)) +
    '<mark>' +
    escapeHtml(text.slice(start, end)) +
    '</mark>' +
    escapeHtml(text.slice(end))
  );
}

/* --------------------------------------------------------------------------
   Действия пользователя
   -------------------------------------------------------------------------- */

// Клик по задаче: меняем статус и перерисовываем всё разом
function toggleTodo(id) {
  const task = todos.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  state.poppedId = id;
  render();

  // После перерисовки возвращаем фокус на ту же задачу, если она осталась в списке
  restoreFocus(id);
}

// Enter или пробел на задаче работают как клик
function onTaskKeydown(event, id) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleTodo(id);
  }
}

function restoreFocus(id) {
  const rows = document.querySelectorAll('.task');
  const list = getFilteredTodos();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      rows[i].focus({ preventScroll: true });
      return;
    }
  }
}

// Переключение вкладки
function setFilter(filter) {
  state.filter = filter;

  const tabs = document.querySelectorAll('.tab');
  for (let i = 0; i < tabs.length; i++) {
    const isActive = tabs[i].dataset.filter === filter;
    tabs[i].classList.toggle('tab--active', isActive);
    tabs[i].setAttribute('aria-selected', isActive);
  }

  render();
}

// Бонус: добавление своей задачи в начало списка
function addTodo(text) {
  // Новый id больше любого существующего
  let maxId = 0;
  for (let i = 0; i < todos.length; i++) {
    if (todos[i].id > maxId) maxId = todos[i].id;
  }

  const task = {
    id: maxId + 1,
    todo: text,
    completed: false,
    userId: 0,
    own: true
  };

  todos.unshift(task);
  state.newId = task.id;

  // Новая задача активная — на вкладке «Выполненные» её не было бы видно
  if (state.filter === 'completed') {
    setFilter('all');
  } else {
    render();
  }
}

// Бонус: удаление по «×»
function deleteTodo(event, id) {
  // Клик по крестику не должен переключать задачу
  event.stopPropagation();
  todos = todos.filter((t) => t.id !== id);
  render();
}

/* --------------------------------------------------------------------------
   Обработчики событий
   -------------------------------------------------------------------------- */
document.getElementById('search-input').addEventListener('input', function (event) {
  state.query = event.target.value.trim();
  render();
});

document.getElementById('add-form').addEventListener('submit', function (event) {
  event.preventDefault();

  const input = document.getElementById('add-input');
  const text = input.value.trim();

  if (text === '') {
    input.classList.remove('is-invalid');
    // Перезапуск анимации тряски
    void input.offsetWidth;
    input.classList.add('is-invalid');
    input.focus();
    return;
  }

  input.classList.remove('is-invalid');
  input.value = '';
  addTodo(text);
});

document.getElementById('add-input').addEventListener('input', function (event) {
  event.target.classList.remove('is-invalid');
});

/* --------------------------------------------------------------------------
   Запуск
   -------------------------------------------------------------------------- */
loadTodos().then(function () {
  render();
});
