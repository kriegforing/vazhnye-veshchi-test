// Состояние теста
const state = {
  index: 0,                 // номер вопроса
  step: 'price',            // у вопроса с ползунком: 'price' — цена, 'main' — условие и варианты
  picks: {},                // выбранные варианты: { id вопроса: id варианта }
  revealed: {},             // открытые ответы: { id вопроса: true }
  furthest: 0,              // до какого вопроса уже дошли
  price: QUESTIONS[0].slider.value,
  result: false
};

// Элементы страницы
const quiz = document.getElementById('test');
const progress = document.getElementById('progress');
const stage = document.getElementById('stage');
const card = document.getElementById('card');
const answer = document.getElementById('answer');
const announcer = document.getElementById('announcer');

// Настройки экрана
const mobile = window.matchMedia('(max-width: 860px)');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
const total = QUESTIONS.length;

// Текущий вопрос
function current() {
  return QUESTIONS[state.index];
}

// Первый шаг вопроса: у вопроса с ползунком — цена, у остальных — сразу варианты
function firstStep(q) {
  return q.slider ? 'price' : 'main';
}

// Все ли ответы открыты
function allRevealed() {
  return QUESTIONS.every((q) => state.revealed[q.id]);
}

// Цена в рублях
function rub(n) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

// Неразрывные пробелы: предлоги, союзы и короткие слова держатся за следующее слово,
// частицы «бы», «же», «ли» — за предыдущее, число — за свою единицу, тире — за слово перед ним
const SHORT_WORDS = 'в|во|и|а|но|на|с|со|к|ко|о|об|обо|у|по|за|из|от|до|не|ни|для|что|как|или|без|при|про|над|под|через|чем|где|№';
const reShort = new RegExp(`(?<=^|[\\s>«("„])(${SHORT_WORDS})\\s+`, 'gi');

function typograf(html) {
  return html
    .replace(reShort, '$1 ')
    .replace(reShort, '$1 ')
    .replace(/\s+(бы|же|ли)(?=[\s.,!?:;»)]|$)/gi, ' $1')
    .replace(/(\d)\s(?=\d{3}(?!\d))/g, '$1 ')
    .replace(/(\d)\s+(?=[а-яё%₽$])/gi, '$1 ')
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
  progress.innerHTML = QUESTIONS.map((q, i) => {
    const now = !state.result && i === state.index;
    let classes = 'progress__step';
    if (state.revealed[q.id]) classes += ' is-done';
    if (now) classes += ' is-current';

    return `<button class="${classes}" type="button" data-step="${i}"
      title="${i + 1}. ${q.title}" aria-label="Вопрос ${i + 1}: ${q.title}"
      ${now ? 'aria-current="step"' : ''} ${i > state.furthest ? 'disabled' : ''}></button>`;
  }).join('');
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

// Вариант ответа. Варианты с фото после ответа не блокируются:
// нажатием на другое фото можно посмотреть ответ для него, не проходя вопрос заново
function optionHtml(o, pick, locked) {
  return `
    <button class="option${o.photo ? ' option--photo' : ''}" type="button" data-id="${o.id}"
      aria-pressed="${pick === o.id}"${locked && !o.photo ? ' disabled' : ''}>
      ${o.photo ? photo(o.photo) : ''}
      <span class="option__text">${o.text}</span>
      ${o.note ? `<span class="option__note">${o.note}</span>` : ''}
    </button>`;
}

// Кнопки карточки вопроса: полупрозрачное «назад» и «дальше»
function navHtml(q, step, locked, i) {
  const canBack = i > 0 || (Boolean(q.slider) && step === 'main' && !locked);
  const label = locked && i === total - 1 ? 'к результату' : 'дальше';
  return `
    <div class="card__nav">
      <button class="link-button link-button--muted${canBack ? '' : ' is-invisible'}" type="button"
        data-action="back"${canBack ? '' : ' tabindex="-1" aria-hidden="true"'}>← назад</button>
      <button class="link-button link-button--strong" type="button" data-action="forward">${label} →</button>
    </div>`;
}

// Карточка вопроса
function questionHtml(q, step, pick, locked, i = state.index) {
  const nav = navHtml(q, step, locked, i);

  // Шаг 1: цена
  if (step === 'price') {
    return typograf(`
      <h2 class="card__title" id="card-title" tabindex="-1">${q.title}</h2>
      <p class="card__text">${q.intro}</p>
      ${sliderHtml(q.slider)}
      ${nav}`);
  }

  // Шаг 2 или обычный вопрос: условие и варианты
  const withPhotos = q.options.some((o) => o.photo);
  return typograf(`
    <h2 class="card__title" id="card-title" tabindex="-1">${q.title}</h2>
    <p class="card__text">${q.slider ? q.condition : q.intro}</p>
    <p class="card__ask" id="ask">${q.ask}</p>
    <div class="options${withPhotos ? ' options--cards' : ''}" role="group" aria-labelledby="ask">
      ${q.options.map((o) => optionHtml(o, pick, locked)).join('')}
    </div>
    ${nav}`);
}

// Карточка ответа
function answerHtml(q, o, last) {
  const a = q.answer;
  return typograf(`
    <div class="answer__block">
      <h3 class="answer__title" id="answer-title" tabindex="-1">${o ? o.title : 'Что показало исследование'}</h3>
      <p class="answer__text">${o ? o.lead + ' ' : ''}${a.research}</p>
    </div>
    <div class="answer__stat">
      <p class="answer__value">${a.stat.value}</p>
      <p class="answer__text">${a.stat.caption}</p>
    </div>
    <div class="answer__block answer__block--extra">
      <h3 class="answer__title">${a.extra.title}</h3>
      <p class="answer__text">${a.extra.text}</p>
    </div>
    <div class="answer__actions">
      <button class="button answer__next" type="button" data-action="next">${last ? 'узнать результат' : 'следующий вопрос'} →</button>
    </div>`);
}

// Итог: сколько ответов совпало с исследованиями
function score() {
  return QUESTIONS.reduce((sum, q) => {
    const o = q.options.find((x) => x.id === state.picks[q.id]);
    return sum + (o ? o.points : 0);
  }, 0);
}

// Карточка результата
function resultHtml(profile, points) {
  const stars = QUESTIONS
    .map((q, i) => `<img class="${i < points ? 'is-on' : ''}" src="assets/icons/star-dark.svg" alt="" width="18" height="18">`)
    .join('');

  return typograf(`
    <div class="result">
      <div class="result__main">
        <p class="result__label">
          <img src="assets/icons/star-dark.svg" alt="" width="22" height="22">
          Ваш результат
        </p>
        <h2 class="card__title" id="card-title" tabindex="-1">${profile.title}</h2>
        <p class="result__score">
          <span class="result__stars" aria-hidden="true">${stars}</span>
          В ${points} из ${total} вопросов вы ответили как участники исследований
        </p>
        <p class="card__text">${profile.text}</p>
      </div>
      <div class="result__more">
        <p class="card__text"><b>Совет:</b> ${profile.advice}</p>
        <p class="result__price">
          Свитер кумира вы оценили в ${rub(state.price)}.
          Для сравнения: за нестиранный кардиган Курта Кобейна в 2019 году отдали $334 000.
        </p>
        <div class="result__buttons">
          <button class="button button--primary" type="button" data-action="restart">Пройти заново</button>
        </div>
      </div>
    </div>`);
}

// Показать или спрятать ответ
function showAnswer(open) {
  answer.classList.toggle('is-hidden', !open);
  answer.inert = !open;
}

// Отрисовать текущий вопрос
function renderQuestion() {
  const q = current();
  stage.classList.remove('is-result');
  const open = Boolean(state.revealed[q.id]);

  card.innerHTML = questionHtml(q, state.step, state.picks[q.id], open);
  answer.innerHTML = open ? answerHtml(q, q.options.find((x) => x.id === state.picks[q.id]), state.index === total - 1) : '';
  showAnswer(open);
}

// Плавная смена содержимого: обе карточки плавно гаснут, пока стенка тёмная — меняем текст,
// ответ прячем сразу, без своей анимации, чтобы он не мигал при появлении нового вопроса
function swap(render, focus = true) {
  stage.classList.add('is-fading');

  setTimeout(() => {
    answer.classList.add('no-anim');
    render();
    void answer.offsetWidth;
    answer.classList.remove('no-anim');

    // На компьютере страница стоит на месте. На телефоне, если карточка уехала вверх,
    // возвращаем её начало под шкалу прохождения
    if (mobile.matches) {
      const top = stage.getBoundingClientRect().top - progress.offsetHeight - 8;
      if (top < 0) window.scrollTo({ top: window.scrollY + top, behavior: 'instant' });
    }

    stage.classList.remove('is-fading');
    if (focus) document.getElementById('card-title').focus({ preventScroll: true });
  }, calm.matches ? 0 : 300);
}

// Перейти к вопросу
function goTo(i) {
  swap(() => {
    const q = QUESTIONS[i];
    state.result = false;
    state.index = i;
    state.step = state.revealed[q.id] ? 'main' : firstStep(q);
    state.furthest = Math.max(state.furthest, i);
    renderQuestion();
    renderProgress();
    announcer.textContent = `Вопрос ${i + 1} из ${total}`;
  });
}

// Открыть ответ
function reveal() {
  const q = current();
  const o = q.options.find((x) => x.id === state.picks[q.id]);

  state.revealed[q.id] = true;
  card.querySelectorAll('.option:not(.option--photo)').forEach((b) => { b.disabled = true; });
  card.querySelector('.card__nav').outerHTML = typograf(navHtml(q, state.step, true, state.index));
  answer.innerHTML = answerHtml(q, o, state.index === total - 1);
  showAnswer(true);
  renderProgress();

  const title = document.getElementById('answer-title');
  if (mobile.matches) {
    answer.scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'start' });
  }
  title.focus({ preventScroll: true });
}

// Кнопка «дальше»
function forward() {
  const q = current();

  // С цены — к условию
  if (state.step === 'price') {
    swap(() => {
      state.step = 'main';
      card.innerHTML = questionHtml(q, 'main', state.picks[q.id], false);
    });
    return;
  }

  // Ответ ещё закрыт — открываем, уже открыт — идём дальше
  if (!state.revealed[q.id]) {
    reveal();
  } else {
    next();
  }
}

// Кнопка «назад»: с условия — к цене, иначе — к прошлому вопросу
function back() {
  const q = current();

  if (q.slider && state.step === 'main' && !state.revealed[q.id]) {
    swap(() => {
      state.step = 'price';
      card.innerHTML = questionHtml(q, 'price', state.picks[q.id], false);
    });
    return;
  }

  if (state.index > 0) goTo(state.index - 1);
}

// Выбор варианта: до открытия ответа можно передумать.
// В вопросе с фото и после ответа: нажатие на другое фото показывает ответ для этого варианта
function choose(id) {
  const q = current();
  const open = Boolean(state.revealed[q.id]);
  const withPhotos = q.options.some((o) => o.photo);
  if (open && (!withPhotos || state.picks[q.id] === id)) return;

  state.picks[q.id] = id;
  card.querySelectorAll('.option').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.id === id));
  });

  if (open) {
    const o = q.options.find((x) => x.id === id);
    answer.classList.add('is-hidden');
    setTimeout(() => {
      answer.innerHTML = answerHtml(q, o, state.index === total - 1);
      answer.classList.remove('is-hidden');
    }, calm.matches ? 0 : 250);
  }
}

// Следующий вопрос или результат
function next() {
  if (state.index < total - 1) {
    goTo(state.index + 1);
    return;
  }

  if (allRevealed()) {
    swap(showResult);
    return;
  }

  const missed = QUESTIONS.findIndex((q) => !state.revealed[q.id]);
  goTo(missed);
  announcer.textContent = 'Остался вопрос без ответа';
}

// Результат
function showResult() {
  state.result = true;
  const points = score();
  const profile = PROFILES.find((p) => points >= p.min);

  stage.classList.add('is-result');
  card.innerHTML = resultHtml(profile, points);
  answer.innerHTML = '';
  showAnswer(false);
  renderProgress();
}

// Пройти заново
function restart() {
  swap(() => {
    state.index = 0;
    state.step = firstStep(QUESTIONS[0]);
    state.picks = {};
    state.revealed = {};
    state.furthest = 0;
    state.result = false;
    state.price = QUESTIONS[0].slider.value;
    renderQuestion();
    renderProgress();
  });
}

// Высота сцены: меряем все состояния и берём самое длинное.
// Так окно теста не прыгает, когда меняется текст, и целиком помещается в экран ноутбука.
function measure() {
  const full = stage.getBoundingClientRect().width;
  if (!full) return;

  // Ширины колонок как в CSS: вопрос 7 частей, ответ 5, результат — на всю ширину
  const gap = parseFloat(getComputedStyle(stage).columnGap) || 0;
  const qWidth = mobile.matches ? full : (full - gap) * 7 / 12;
  const aWidth = mobile.matches ? full : (full - gap) * 5 / 12;

  const probe = document.createElement('section');
  stage.appendChild(probe);

  const heightOf = (classes, html, width) => {
    probe.className = 'card card--probe ' + classes;
    probe.style.width = width + 'px';
    probe.innerHTML = html;
    return probe.scrollHeight;
  };

  let q = 0;
  let a = 0;

  QUESTIONS.forEach((item, i) => {
    const last = i === total - 1;
    const steps = item.slider ? ['price', 'main'] : ['main'];
    steps.forEach((step) => {
      q = Math.max(q, heightOf('card--question', questionHtml(item, step, null, false, i), qWidth));
    });
    [null, ...item.options].forEach((o) => {
      a = Math.max(a, heightOf('card--answer', answerHtml(item, o, last), aWidth));
    });
  });

  // Результат на компьютере тоже не выходит за высоту сцены, на телефоне он растёт по содержимому
  if (!mobile.matches) {
    PROFILES.forEach((p) => {
      q = Math.max(q, heightOf('card--question', resultHtml(p, total), full));
    });
  }

  probe.remove();

  const pair = Math.max(q, a);
  stage.style.setProperty('--q-h', Math.ceil(q) + 'px');
  stage.style.setProperty('--a-h', Math.ceil(a) + 'px');
  stage.style.setProperty('--pair-h', Math.ceil(pair) + 'px');
}

// Пересчёт высоты при смене ширины окна
let resizeTimer = null;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(measure, 150);
}

// Клики по шкале
progress.addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  if (!step || step.disabled) return;

  const i = Number(step.dataset.step);
  if (i !== state.index || state.result) goTo(i);
});

// Клики по кнопкам теста
stage.addEventListener('click', (e) => {
  const option = e.target.closest('.option');
  if (option) {
    if (!option.disabled) choose(option.dataset.id);
    return;
  }

  const button = e.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  if (action === 'forward') forward();
  if (action === 'back') back();
  if (action === 'next') next();
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

window.addEventListener('resize', onResize);
mobile.addEventListener('change', measure);

// Запуск
renderQuestion();
renderProgress();
measure();
if (document.fonts) document.fonts.ready.then(measure);
window.addEventListener('load', measure);
