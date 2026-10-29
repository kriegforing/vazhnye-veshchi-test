// Карусель «Шкала следа»
// На компьютере карточки лежат веером: наведёшь мышку — карточка выходит вперёд и увеличивается.
// На телефоне карточки листаются пальцем, активная — та, что по центру.
const deck = document.getElementById('deck');
const steps = [...deck.querySelectorAll('.step')];
const stars = [...deck.querySelectorAll('.deck__star')];
const list = deck.querySelector('.deck__cards');
const phone = window.matchMedia('(max-width: 860px)');

let active = 2;

// Сделать карточку активной: остальные уходят назад по мере удаления
function setActive(i) {
  active = i;
  steps.forEach((step, k) => {
    const d = Math.abs(k - i);
    step.dataset.d = Math.min(d, 2);
    step.style.zIndex = 10 - d;
    step.setAttribute('aria-current', d === 0 ? 'true' : 'false');
  });
  stars.forEach((star, k) => {
    star.dataset.d = Math.min(Math.abs(k - i), 2);
  });
}

// Прокрутить карусель к карточке (телефон)
function scrollToStep(i) {
  const step = steps[i];
  const left = step.offsetLeft - (list.clientWidth - step.offsetWidth) / 2;
  list.scrollTo({ left, behavior: 'smooth' });
}

// Наведение и фокус (компьютер)
steps.forEach((step, i) => {
  step.addEventListener('mouseenter', () => {
    if (phone.matches) return;
    setActive(i);
    deck.classList.add('is-zoom');
  });

  step.addEventListener('focus', () => {
    setActive(i);
    if (phone.matches) {
      scrollToStep(i);
    } else {
      deck.classList.add('is-zoom');
    }
  });

  step.addEventListener('blur', () => deck.classList.remove('is-zoom'));

  step.addEventListener('click', () => {
    if (phone.matches) scrollToStep(i);
    else setActive(i);
  });
});

list.addEventListener('mouseleave', () => deck.classList.remove('is-zoom'));

// Стрелки на клавиатуре
list.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const i = Math.max(0, Math.min(steps.length - 1, active + (e.key === 'ArrowRight' ? 1 : -1)));
  e.preventDefault();
  steps[i].focus();
});

// Клик по звезде
stars.forEach((star, i) => {
  star.addEventListener('click', () => {
    if (phone.matches) scrollToStep(i);
    else setActive(i);
  });
});

// Какая карточка по центру (телефон)
let ticking = false;
list.addEventListener('scroll', () => {
  if (!phone.matches || ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const center = list.scrollLeft + list.clientWidth / 2;
    let best = 0;
    let gap = Infinity;
    steps.forEach((step, k) => {
      const d = Math.abs(step.offsetLeft + step.offsetWidth / 2 - center);
      if (d < gap) { gap = d; best = k; }
    });
    if (best !== active) setActive(best);
  });
}, { passive: true });

// На телефоне сразу показываем третью ступень по центру
function start() {
  setActive(2);
  if (phone.matches) {
    const step = steps[2];
    list.scrollLeft = step.offsetLeft - (list.clientWidth - step.offsetWidth) / 2;
  }
}

phone.addEventListener('change', start);
start();
