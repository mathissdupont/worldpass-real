import tokens from '@tokens'

const TOKEN_STYLE_ID = 'wp-token-style'
const { globals: cssGlobals, modes: cssModes, systemDark } = tokens.css

function toRule(selector, vars){
  const body = Object.entries(vars)
    .map(([key, value]) => `${key}:${value};`)
    .join('')
  return `${selector}{${body}}`
}

function ensureTokenStyle(){
  if (typeof document === 'undefined') return
  if (document.getElementById(TOKEN_STYLE_ID)) return

  const baseRule = toRule(':root', { ...cssGlobals, ...cssModes.light })
  const darkRule = toRule('html.dark', cssModes.dark)
  const systemRule = `@media (prefers-color-scheme: dark){${toRule('html.system', systemDark || cssModes.dark)}}`

  const styleEl = document.createElement('style')
  styleEl.id = TOKEN_STYLE_ID
  styleEl.textContent = [baseRule, darkRule, systemRule].join('\n')
  document.head.prepend(styleEl)
}

export function applyTheme(theme){
  if (typeof document === 'undefined') return
  ensureTokenStyle()
  const html = document.documentElement
  html.classList.remove('light', 'dark', 'system')
  html.classList.add(theme)
  localStorage.setItem('wp_theme', theme)
}

export function initTheme(){
  if (typeof document === 'undefined') return
  ensureTokenStyle()
  const saved = localStorage.getItem('wp_theme')
  const initial = saved === 'dark' || saved === 'system' ? saved : 'light'
  applyTheme(initial)
}

export { tokens }
