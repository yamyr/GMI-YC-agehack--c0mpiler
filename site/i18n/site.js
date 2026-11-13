import { LOCALES, initialLocale, saveLocale, createTranslator, formatMoney } from "./core.js";

/** Explicit markers keep translation away from authored data and rich HTML structure. */
export function applyTranslations(root, t) {
  for (const node of root.querySelectorAll('[data-i18n]')) {
    const original = node.textContent;
    const source = node.dataset.i18nSource ?? original.trim().replace(/\s+/g, ' ');
    node.dataset.i18nSource = source;
    // Inline links stay separate DOM nodes. Preserve spaces that join their surrounding prose.
    const prefix = node.dataset.i18nPrefix ?? (/^\s/.test(original) ? ' ' : '');
    const suffix = node.dataset.i18nSuffix ?? (/\s$/.test(original) ? ' ' : '');
    node.dataset.i18nPrefix = prefix;
    node.dataset.i18nSuffix = suffix;
    node.textContent = prefix + t(source) + suffix;
  }
  for (const node of root.querySelectorAll('[data-i18n-attrs]')) {
    for (const attr of node.dataset.i18nAttrs.split(' ')) {
      const key = `i18nSource${attr.replace(/(^|-)(\w)/g, (_, dash, letter) => letter.toUpperCase())}`;
      const source = node.dataset[key] ?? node.getAttribute(attr);
      node.dataset[key] = source;
      node.setAttribute(attr, t(source));
    }
  }
}

/** Currency formatting must preserve the same inline word boundaries as translated prose. */
export function formatAmounts(root, locale) {
  const t = createTranslator(locale);
  for (const node of root.querySelectorAll('[data-money], [data-money-range]')) {
    const original = node.textContent;
    const prefix = /^\s/.test(original) ? ' ' : '';
    const suffix = /\s$/.test(original) ? ' ' : '';
    const formatted = node.hasAttribute('data-money')
      ? formatMoney(Number(node.dataset.money), locale)
      : t('{0}–{1}', ...node.dataset.moneyRange.split(',').map(value => formatMoney(Number(value), locale)));
    node.textContent = prefix + formatted + suffix;
  }
}

if (typeof document !== 'undefined') {
  const locale = initialLocale();
  saveLocale(locale);
  const t = createTranslator(locale);
  document.documentElement.lang = locale;
  applyTranslations(document, t);
  formatAmounts(document, locale);
  const area = document.createElement('div');
  area.className = 'language-settings';
  const label = document.createElement('label');
  label.htmlFor = 'site-language';
  label.textContent = t('Language');
  const select = document.createElement('select');
  select.id = 'site-language';
  for (const language of LOCALES) {
    const option = document.createElement('option');
    option.value = language.id;
    option.textContent = language.label;
    select.append(option);
  }
  select.value = locale;
  select.addEventListener('change', () => {
    saveLocale(select.value);
    const url = new URL(location.href);
    url.searchParams.set('lang', select.value);
    location.assign(url.href);
  });
  const notice = document.createElement('p');
  notice.className = 'translation-notice';
  notice.textContent = t('Translations are model-generated drafts. Missing translations appear in English.');
  area.append(label, select, notice);
  document.querySelector('header').after(area);
  // Query propagation also works when browser storage is disabled.
  for (const link of document.querySelectorAll('a[href]')) {
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && !url.pathname.match(/\.[a-z0-9]+$/i)) {
      url.searchParams.set('lang', locale);
      link.href = url.href;
    }
  }
}
