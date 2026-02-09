import en from '@/messages/en.json';
import ko from '@/messages/ko.json';

export type Locale = 'en' | 'ko';

export const locales: Locale[] = ['en', 'ko'];
export const defaultLocale: Locale = 'en';

export const messages = {
  en,
  ko,
} as const;

export type Messages = typeof en;

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

const LOCALE_STORAGE_KEY = 'awaves-locale';

export function getSavedLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && locales.includes(saved as Locale)) {
    return saved as Locale;
  }
  // Try to detect from browser
  const browserLang = navigator.language.split('-')[0];
  if (browserLang === 'ko') return 'ko';
  return defaultLocale;
}

export function saveLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}
