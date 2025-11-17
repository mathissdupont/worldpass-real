import tr from '../i18n/tr.json';

const locales = { tr };
let current = 'tr';

export function setLocale(l){ if(locales[l]) current = l; }

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
