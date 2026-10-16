// Thème figé en clair (cohérent avec la landing blanche, plus de toggle).
export function initTheme() {
  localStorage.removeItem('blank-theme');
  document.documentElement.dataset.theme = 'light';
  document
    .querySelector('#meta-theme-color')
    ?.setAttribute('content', '#ffffff');
}
