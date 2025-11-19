import en from '../i18n/en.json';
import tr from '../i18n/tr.json';

const locales = { en, tr };
let current = 'en'; // Default to English for beta

export function setLocale(l){ if(locales[l]) current = l; }

export function getLocale(){ return current; }

export function t(key, vars){
  const dict = locales[current] || {};
  let s = dict[key] ?? key;
  if(vars && typeof vars === 'object'){
    Object.keys(vars).forEach(k=>{
      s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`,'g'), String(vars[k]));
    });
  }
  return s;
}

export default t;
