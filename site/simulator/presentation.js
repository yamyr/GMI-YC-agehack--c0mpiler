import { createTranslator, formatMoney, formatNumber, formatList } from '../i18n/core.js';
import { SKILLS } from './engine.js';

/** Count labels remain grammatical for zero, one and many without joining inflected fragments. */
export function formatExpertDescription(expert, earned, week, weeks, locale = 'en') {
  const t = createTranslator(locale);
  const n = (value) => formatNumber(value, locale);
  const skills = formatList(expert.skills.map((index) => t(SKILLS[index])), locale);
  const final = week >= weeks ? t('. Sessions completed: {0}. Approved workflows: {1}', n(expert.sessions), n(expert.workflows)) : '';
  return t(
    '{0}, {1}. Experience: {2} years in {3}. Price per 15 minutes: {4}–{5}. Weekly session capacity: {6}. Earnings by week {8}: {7}{9}.',
    expert.name, n(expert.age), n(expert.years), skills, formatMoney(expert.price.min, locale), formatMoney(expert.price.max, locale), n(expert.capacity), formatMoney(earned, locale), n(week), final,
  );
}
