import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';

import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

// 语言代码映射：UI 语言 -> API hl 参数
export const LANGUAGE_TO_HL: Record<string, string> = {
  'en': 'en',
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  'ja': 'ja',
  'ko': 'ko',
};

// API hl 参数 -> UI 语言代码
export const HL_TO_LANGUAGE: Record<string, string> = {
  'en': 'en',
  'zh_CN': 'zh-CN',
  'zh_TW': 'zh-TW',
  'ja': 'ja',
  'ko': 'ko',
};

// 检测浏览器语言
const detectBrowserLanguage = (): string => {
  const savedLang = localStorage.getItem('language');
  if (savedLang && LANGUAGE_TO_HL[savedLang]) {
    return savedLang;
  }

  const browserLang = navigator.language;

  if (LANGUAGE_TO_HL[browserLang]) {
    return browserLang;
  }
  if (browserLang.startsWith('zh')) {
    if (browserLang.includes('TW') || browserLang.includes('HK') || browserLang.includes('Hant')) {
      return 'zh-TW';
    }
    return 'zh-CN';
  }

  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('en')) return 'en';

  // 默认简体中文
  return 'zh-CN';
};

const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  ja: { translation: ja },
  ko: { translation: ko },
};

const initialLanguage = detectBrowserLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });

// 应用启动时同步语言设置到后端
const syncLanguageToBackend = async () => {
  const hl = LANGUAGE_TO_HL[initialLanguage] || 'zh_CN';
  try {
    await invoke('set_language', { hl });
    console.log('Initial language synced to backend:', initialLanguage, 'hl:', hl);
  } catch (error) {
    console.error('Failed to sync initial language to backend:', error);
  }
};

syncLanguageToBackend();

export default i18n;
