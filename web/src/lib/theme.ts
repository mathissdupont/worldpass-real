export type Theme = 'light' | 'dark' | 'system';

export function applyTheme(t: Theme){
  const html = document.documentElement;
  html.classList.remove('light','dark','system');
  html.classList.add(t);
  localStorage.setItem('wp_theme', t);
}

export function initTheme(){
  const t = (localStorage.getItem('wp_theme') as Theme) || 'light';
  applyTheme(t);
}
