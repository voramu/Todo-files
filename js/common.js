/* ==========================================================================
   common.js — общий код для обеих страниц
   Владельцы: оба участника. Меняем только по договорённости.

   Содержит:
   1. Загрузку задач с DummyJSON (loadTodos)
   2. Подсветку активной ссылки в навигации
   3. Кнопку «Случайная задача» с модальным окном
   4. Вспомогательные функции (escapeHtml, showPageError)
   ========================================================================== */

const API_URL = 'https://dummyjson.com/todos';

// Все задачи. Заполняется в loadTodos(), используется planner.js и stats.js
let todos = [];

/* --------------------------------------------------------------------------
   1. Загрузка данных
   Каждая страница вызывает: loadTodos().then(function () { render(); });
   -------------------------------------------------------------------------- */
function loadTodos() {
  return axios
    .get(API_URL + '?limit=0')
    .then(function (response) {
      todos = response.data.todos;
      return todos;
    })
    .catch(function (error) {
      console.error('Не удалось загрузить задачи:', error);
      showPageError('Не удалось загрузить задачи. Проверьте интернет и обновите страницу.');
      // Пробрасываем ошибку дальше, чтобы .then() страницы не запустил рендер
      throw error;
    });
}

/* --------------------------------------------------------------------------
   2. Активная ссылка в навигации
   У <body> стоит data-page="planner" или data-page="stats".
   Ссылка с тем же data-page получает класс nav__link--active.
   -------------------------------------------------------------------------- */
function highlightActiveNav() {
  const currentPage = document.body.dataset.page;
  const links = document.querySelectorAll('.nav__link');

  for (let i = 0; i < links.length; i++) {
    if (links[i].dataset.page === currentPage) {
      links[i].classList.add('nav__link--active');
      links[i].setAttribute('aria-current', 'page');
    }
  }
}

/* --------------------------------------------------------------------------
   3. Случайная задача
   Каждый клик — новый запрос к /todos/random. Ответ — ОДИН объект:
   { id, todo, completed, userId }
   -------------------------------------------------------------------------- */

// Номер последнего запроса. Если пользователь кликает быстро,
// показываем только ответ на самый свежий клик.
let randomRequestId = 0;

function createRandomModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'random-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="modal__overlay" data-close-modal></div>
    <div class="modal__window" role="dialog" aria-modal="true" aria-labelledby="random-modal-title">
      <button class="modal__close" type="button" aria-label="Закрыть" data-close-modal>×</button>
      <p class="modal__label" id="random-modal-title">🎲 Случайная задача</p>
      <div class="modal__body" id="random-modal-body"></div>
      <button class="btn btn--secondary modal__again" type="button" id="random-again-btn">
        Ещё одна
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  // Закрытие: крестик и клик по затемнению
  const closers = modal.querySelectorAll('[data-close-modal]');
  for (let i = 0; i < closers.length; i++) {
    closers[i].addEventListener('click', closeRandomModal);
  }

  // Закрытие по Escape
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) {
      closeRandomModal();
    }
  });

  document.getElementById('random-again-btn').addEventListener('click', showRandomTodo);
}

function openRandomModal() {
  const modal = document.getElementById('random-modal');
  modal.hidden = false;
  document.body.classList.add('no-scroll');
}

function closeRandomModal() {
  const modal = document.getElementById('random-modal');
  modal.hidden = true;
  document.body.classList.remove('no-scroll');
  // Возвращаем фокус на кнопку в шапке
  document.getElementById('random-btn').focus();
}

function renderRandomBody(html) {
  document.getElementById('random-modal-body').innerHTML = html;
}

function showRandomTodo() {
  randomRequestId = randomRequestId + 1;
  const requestId = randomRequestId;

  openRandomModal();
  renderRandomBody('<div class="loader" aria-label="Загрузка"></div>');

  axios
    .get(API_URL + '/random')
    .then(function (response) {
      // Пришёл ответ на старый клик — игнорируем
      if (requestId !== randomRequestId) return;

      const task = response.data;
      const statusText = task.completed ? 'Выполнена' : 'Активна';
      const statusClass = task.completed ? 'status--done' : 'status--active';

      renderRandomBody(`
        <p class="modal__text">${escapeHtml(task.todo)}</p>
        <div class="modal__meta">
          <span class="status ${statusClass}">${statusText}</span>
          <span class="badge">User ${task.userId}</span>
        </div>
      `);
    })
    .catch(function (error) {
      if (requestId !== randomRequestId) return;
      console.error('Не удалось получить случайную задачу:', error);
      renderRandomBody('<p class="modal__error">Не удалось загрузить задачу. Попробуйте ещё раз.</p>');
    });
}

/* --------------------------------------------------------------------------
   4. Вспомогательные функции
   -------------------------------------------------------------------------- */

// Экранирует текст перед вставкой через innerHTML
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Показывает ошибку вместо содержимого страницы
function showPageError(message) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="page-error">
      <p class="page-error__title">Что-то пошло не так</p>
      <p class="page-error__text">${escapeHtml(message)}</p>
      <button class="btn btn--primary" type="button" onclick="location.reload()">Обновить</button>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   Запуск общей части. Скрипты подключены с defer, DOM уже готов.
   -------------------------------------------------------------------------- */
highlightActiveNav();
createRandomModal();
document.getElementById('random-btn').addEventListener('click', showRandomTodo);
