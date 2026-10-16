// Форма подписки
const signupForm = document.getElementById('signup-form');
const email = document.getElementById('email');
const adult = document.getElementById('adult');
const signupError = document.getElementById('signup-error');
const signupDone = document.getElementById('signup-done');
const signupCurtain = document.getElementById('signup-curtain');
const plaque = document.getElementById('plaque');

// Отправка формы
signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  signupError.textContent = '';
  email.removeAttribute('aria-invalid');

  if (!email.value.trim() || !email.validity.valid) {
    signupError.textContent = 'Проверьте адрес почты';
    email.setAttribute('aria-invalid', 'true');
    email.focus();
    return;
  }

  if (!adult.checked) {
    signupError.textContent = 'Подписка доступна только с 18 лет';
    adult.focus();
    return;
  }

  // Здесь адрес нужно отправить в сервис рассылки (см. README)

  signupForm.hidden = true;
  signupDone.hidden = false;
  signupDone.focus();
  plaque.classList.add('is-hidden');
  signupCurtain.classList.add('is-open');
});
