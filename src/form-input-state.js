/** True while an input/textarea/select is focused (sign-in, sign-up, etc.). */
let formInputActive = false;

function isFormField(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function syncFormInputActive() {
  formInputActive = isFormField(document.activeElement);
  document.body.classList.toggle('form-input-active', formInputActive);
}

export function isFormInputActive() {
  return formInputActive;
}

export function initFormInputState() {
  document.addEventListener('focusin', (event) => {
    if (isFormField(event.target)) {
      formInputActive = true;
      document.body.classList.add('form-input-active');
    }
  });

  document.addEventListener('focusout', () => {
    requestAnimationFrame(syncFormInputActive);
  });
}
