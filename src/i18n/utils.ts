import i18n from './index';
import { LANGUAGE_TO_HL } from './index';

/**
 * 获取当前语言对应的 API hl 参数
 * @returns API hl 参数（en, zh_CN, zh_TW, ja, ko）
 */
export function getCurrentHl(): string {
  const currentLang = i18n.language;
  return LANGUAGE_TO_HL[currentLang] || 'zh_CN';
}

/**
 * 获取所有支持的语言选项
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', name: '简体中文', nativeName: '简体中文' },
  { code: 'zh-TW', name: '繁體中文', nativeName: '繁體中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: '日本語', nativeName: '日本語' },
  { code: 'ko', name: '한국어', nativeName: '한국어' },
];
