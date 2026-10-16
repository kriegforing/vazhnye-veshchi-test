// Состояние теста
const state = {
  index: 0,
  answers: {},
  viewed: {},
  furthest: 0,
  price: QUESTIONS[0].slider.value,
  revealed: false,
  instant: false,
  result: false
};

// Элементы страницы
const quiz = document.getElementById('test');
const progress = document.getElementById('progress');
const stage = document.getElementById('stage');
const card = document.getElementById('card');
const answer = document.getElementById('answer');
const curtain = document.getElementById('curtain');
const announcer = document.getElementById('announcer');

// Настройки экрана
const mobile = window.matchMedia('(max-width: 860px)');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
const total = QUESTIONS.length;
let timer = null;

// Текущий вопрос
function current() {
  return QUESTIONS[state.index];
}

// Все ли ответы открыты
function allViewed() {
  return QUESTIONS.every((q) => state.viewed[q.id]);
}

// Цена в рублях
function rub(n) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

// Неразрывные пробелы: короткие слова и тире не висят на краю строки
function typograf(html) {
  return html
    .replace(/(?<=^|[\s>«(])([а-яё]{1,2}|№)\s+/gi, '$1 ')
    .replace(/\s+—/g, ' —')
    .replace(/([а-яё]+-(?:то|либо|нибудь))(?![а-яё])/gi, '<span class="nowrap">$1</span>');
}

// Фото или заглушка
function photo(p, extra = '') {
  const img = p.src ? `<img src="${p.src}" alt="${p.alt}" loading="lazy">` : '';
  const hidden = p.src ? ' aria-hidden="true"' : '';
  return `<span class="photo ${extra}">${img}<span class="photo__label"${hidden}>${p.alt}</span></span>`;
}

// Шкала прохождения
function renderProgress() {
  const steps = QUESTIONS.map((q, i) => {
    const now = !state.result && i === state.index;
    let classes = 'progress__step';
    if (state.viewed[q.id]) classes += ' is-done';
    if (now) classes += ' is-current';

    return `<button class="${classes}" type="button" data-step="${i}"
      title="${i + 1}. ${q.title}" aria-label="Вопрос ${i + 1}: ${q.title}"
      ${now ? 'aria-current="step"' : ''} ${i > state.furthest ? 'disabled' : ''}></button>`;
  });

  steps.push(`
    <button class="progress__result${state.result ? ' is-current' : ''}" type="button" data-step="result"
      title="Результат" aria-label="Результат"
      ${state.result ? 'aria-current="step"' : ''} ${allViewed() ? '' : 'disabled'}>
      <img src="assets/icons/star.svg" alt="" width="20" height="20">
    </button>`);

  progress.innerHTML = steps.join('');
}

// Ползунок
function sliderHtml(s) {
  const p = (state.price - s.min) / (s.max - s.min);
  return `
    <div class="slider">
      <div class="slider__head">
        <label class="slider__label" for="price">${s.label}</label>
        <output class="slider__value" id="price-value" for="price">${rub(state.price)}</output>
      </div>
      <input class="slider__input" id="price" type="range"
        min="${s.min}" max="${s.max}" step="${s.step}" value="${state.price}"
        style="--p: ${p}" aria-valuetext="${rub(state.price)}">
      <div class="slider__scale" aria-hidden="true">
        <span>${rub(s.min)}</span>
        <span>${rub(s.max)}</span>
      </div>
    </div>`;
}

// Вариант ответа
function optionHtml(o, chosen) {
  return `
    <button class="option" type="button" data-id="${o.id}"
      aria-pressed="${chosen === o.id}"${chosen ? ' disabled' : ''}>
      ${o.photo ? photo(o.photo) : ''}
      <span class="option__text">${o.text}</span>
      ${o.note ? `<span class="option__note">${o.note}</span>` : ''}
    </button>`;
}

// Вопрос
function renderQuestion() {
  const q = current();
  const chosen = state.answers[q.id];
  const withPhotos = q.options.some((o) => o.photo);

  card.innerHTML = typograf(`
    <h2 class="card__title" id="card-title" tabindex="-1">${q.title}</h2>
    <p class="card__text">${q.intro}</p>
    ${q.slider ? sliderHtml(q.slider) : ''}
    <div class="card__bottom">
      ${q.condition ? `<p class="card__text card__condition">${q.condition}</p>` : ''}
      <p class="card__ask" id="ask">${q.ask}</p>
      <div class="options${withPhotos ? ' options--cards' : ''}" role="group" aria-labelledby="ask">
        ${q.options.map((o) => optionHtml(o, chosen)).join('')}
      </div>
      <button class="link-button link-button--quiet card__skip" id="skip" type="button" data-action="skip"
        ${state.viewed[q.id] ? 'hidden' : ''}>Показать ответ без выбора</button>
      <p class="scroll-hint" id="hint">Листайте вниз — занавес поднимется ↓</p>
    </div>`);

  renderAnswer();
}

// Ответ в рамке
function renderAnswer() {
  const q = current();
  const o = q.options.find((x) => x.id === state.answers[q.id]);
  const a = q.answer;
  const last = state.index === total - 1;

  answer.innerHTML = typograf(`
    <div class="answer__block">
      <h3 class="answer__title" id="answer-title" tabindex="-1">${o ? o.title : 'Что показало исследование'}</h3>
      <p class="answer__text">${o ? o.lead + ' ' : ''}${a.research}</p>
    </div>
    <div class="answer__stat">
      <p class="answer__value">${a.stat.value}</p>
      <p class="answer__text">${a.stat.caption}</p>
    </div>
    <div class="answer__block">
      <h3 class="answer__title">${a.extra.title}</h3>
      <div class="answer__media${a.extra.photo ? ' answer__media--photo' : ''}">
        ${a.extra.photo ? photo(a.extra.photo) : ''}
        <p class="answer__text">${a.extra.text}</p>
      </div>
    </div>
    <div class="answer__actions">
      ${o ? '<button class="link-button link-button--muted" type="button" data-action="again">ответить заново</button>' : '<span></span>'}
      <button class="link-button link-button--strong" type="button" data-action="next">${last ? 'узнать результат' : 'следующий вопрос'} →</button>
    </div>`);
}

// Насколько поднять шторку при скролле (0–1)
function scrollProgress() {
  const box = curtain.parentElement.getBoundingClientRect();
  const vh = window.innerHeight;
  const start = vh * 0.92;
  const end = Math.max(vh * 0.15, vh - box.height - 32);
  return Math.min(1, Math.max(0, (start - box.top) / (start - end)));
}

// Шторка
function updateCurtain() {
  let open = 0;
  if (state.revealed) {
    const byScroll = mobile.matches && !calm.matches && !state.instant;
    open = byScroll ? scrollProgress() : 1;
  }
  curtain.style.setProperty('--open', open.toFixed(3));

  const hint = document.getElementById('hint');
  if (hint) {
    const show = state.revealed && !state.instant && mobile.matches && open < 0.5;
    hint.classList.toggle('is-visible', show);
  }
}

// Открыть или закрыть ответ
function reveal(open) {
  state.revealed = open;
  answer.inert = !open;
  answer.setAttribute('aria-hidden', String(!open));
  curtain.classList.remove('is-scroll');
  updateCurtain();
}

// Кнопки вариантов
function setOptions(chosen) {
  card.querySelectorAll('.option').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.id === chosen));
    b.disabled = Boolean(chosen);
  });
}

// Фокус на заголовок ответа
function focusAnswer() {
  document.getElementById('answer-title').focus({ preventScroll: true });
}

// Выбор варианта
function choose(id) {
  const q = current();
  if (state.answers[q.id]) return;

  const wasOpen = state.revealed;
  state.answers[q.id] = id;
  state.viewed[q.id] = true;

  setOptions(id);
  document.getElementById('skip').hidden = true;
  renderAnswer();
  renderProgress();

  if (!wasOpen) {
    state.instant = false;
    reveal(true);
  }
  focusAnswer();
}

// Показать ответ без выбора
function skip() {
  const q = current();
  state.viewed[q.id] = true;

  document.getElementById('skip').hidden = true;
  renderAnswer();
  renderProgress();
  state.instant = false;
  reveal(true);
  focusAnswer();
}

// Ответить заново
function again() {
  const q = current();
  delete state.answers[q.id];
  delete state.viewed[q.id];

  setOptions(null);
  document.getElementById('skip').hidden = false;
  renderProgress();
  reveal(false);

  const first = card.querySelector('.option');
  first.focus({ preventScroll: true });
  if (mobile.matches) {
    card.querySelector('.options').scrollIntoView({
      behavior: calm.matches ? 'auto' : 'smooth',
      block: 'center'
    });
  }
}

// Смена экрана
function swap(render) {
  clearTimeout(timer);
  stage.classList.add('is-fading');

  setTimeout(() => {
    curtain.classList.add('no-anim');
    render();
    void curtain.offsetWidth;
    curtain.classList.remove('no-anim');

    const top = quiz.getBoundingClientRect().top;
    if (top < 0) window.scrollTo({ top: window.scrollY + top, behavior: 'instant' });

    stage.classList.remove('is-fading');
    document.getElementById('card-title').focus({ preventScroll: true });
  }, calm.matches ? 0 : 250);
}

// Показать вопрос
function showQuestion() {
  const opened = Boolean(state.viewed[current().id]);
  renderQuestion();
  renderProgress();
  state.instant = opened;
  reveal(opened);
}

// Перейти к вопросу
function goTo(i) {
  swap(() => {
    state.result = false;
    state.index = i;
    state.furthest = Math.max(state.furthest, i);
    showQuestion();
    announcer.textContent = `Вопрос ${i + 1} из ${total}`;
  });
}

// Следующий вопрос
function next() {
  if (state.index < total - 1) {
    goTo(state.index + 1);
    return;
  }

  if (allViewed()) {
    swap(showResult);
    return;
  }

  const missed = QUESTIONS.findIndex((q) => !state.viewed[q.id]);
  goTo(missed);
  announcer.textContent = 'Остался вопрос без ответа';
}

// Результат
function showResult() {
  state.result = true;
  const score = QUESTIONS.reduce((sum, q) => {
    const o = q.options.find((x) => x.id === state.answers[q.id]);
    return sum + (o ? o.points : 0);
  }, 0);
  const profile = PROFILES.find((p) => score >= p.min);
  const stars = QUESTIONS
    .map((q, i) => `<img class="${i < score ? 'is-on' : ''}" src="assets/icons/star.svg" alt="" width="18" height="18">`)
    .join('');

  renderProgress();

  card.innerHTML = typograf(`
    <p class="result__label">
      <img src="assets/icons/star.svg" alt="" width="24" height="24">
      Ваш результат
    </p>
    <h2 class="card__title" id="card-title" tabindex="-1">${profile.title}</h2>
    <p class="result__score">
      <span class="result__stars" aria-hidden="true">${stars}</span>
      В ${score} из ${total} вопросов вы ответили как участники исследований
    </p>
    <p class="card__text">${profile.text}</p>
    <p class="card__text"><b>Совет:</b> ${profile.advice}</p>
    <p class="result__price">
      Свитер кумира вы оценили в ${rub(state.price)}.
      Для сравнения: за нестиранный кардиган Курта Кобейна в 2019 году отдали $334 000.
    </p>
    <div class="card__bottom">
      <div class="result__buttons">
        <button class="button button--primary" type="button" data-action="share">Поделиться тестом</button>
        <button class="button" type="button" data-action="restart">Пройти заново</button>
      </div>
    </div>`);

  answer.innerHTML = `
    <div class="story">
      ${photo(profile.story, 'photo--story')}
      ${profile.story.src ? `<a class="link-button link-button--strong" href="${profile.story.src}" download>скачать карточку →</a>` : ''}
    </div>`;

  state.instant = false;
  reveal(false);
  timer = setTimeout(() => reveal(true), calm.matches ? 0 : 500);
}

// Пройти заново
function restart() {
  swap(() => {
    state.index = 0;
    state.answers = {};
    state.viewed = {};
    state.furthest = 0;
    state.result = false;
    state.price = QUESTIONS[0].slider.value;
    showQuestion();
  });
}

// Поделиться
async function share(btn) {
  const url = window.location.href.split('#')[0];

  // Меню «Поделиться» на телефоне
  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  // Копирование ссылки
  let message = 'Ссылка скопирована';
  try {
    await navigator.clipboard.writeText(url);
  } catch (e) {
    message = 'Скопируйте ссылку из адресной строки';
  }
  btn.textContent = message;
  announcer.textContent = message;
  setTimeout(() => { btn.textContent = 'Поделиться тестом'; }, 2500);
}

// Клики по шкале
progress.addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  if (!step || step.disabled) return;

  if (step.dataset.step === 'result') {
    if (!state.result) swap(showResult);
    return;
  }

  const i = Number(step.dataset.step);
  if (i !== state.index || state.result) goTo(i);
});

// Клики по кнопкам теста
stage.addEventListener('click', (e) => {
  const option = e.target.closest('.option');
  if (option) {
    choose(option.dataset.id);
    return;
  }

  const button = e.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  if (action === 'next') next();
  if (action === 'again') again();
  if (action === 'skip') skip();
  if (action === 'share') share(button);
  if (action === 'restart') restart();
});

// Движение ползунка
stage.addEventListener('input', (e) => {
  if (e.target.id !== 'price') return;
  const s = current().slider;

  state.price = Number(e.target.value);
  e.target.style.setProperty('--p', (state.price - s.min) / (s.max - s.min));
  e.target.setAttribute('aria-valuetext', rub(state.price));
  document.getElementById('price-value').textContent = rub(state.price);
});

// Скролл на телефоне
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    if (state.revealed && mobile.matches) curtain.classList.add('is-scroll');
    updateCurtain();
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
mobile.addEventListener('change', () => {
  curtain.classList.remove('is-scroll');
  updateCurtain();
});

// Запуск
renderQuestion();
renderProgress();
reveal(false);
