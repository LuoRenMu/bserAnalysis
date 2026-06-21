import { useTranslation } from 'react-i18next';
import { useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { SUPPORTED_LANGUAGES } from '../i18n/utils';
import {
  characterStatsResultAtom,
  characterLeaderboardResultAtom,
  leaderboardResultAtom,
  searchResultAtom,
  clearCharactersAtom,
} from '../store';

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  // 获取重置函数
  const resetCharacterStats = useSetAtom(characterStatsResultAtom);
  const resetCharacterLeaderboard = useSetAtom(characterLeaderboardResultAtom);
  const resetLeaderboard = useSetAtom(leaderboardResultAtom);
  const resetSearchResult = useSetAtom(searchResultAtom);
  const clearCharacters = useSetAtom(clearCharactersAtom);

  const handleLanguageChange = async (langCode: string) => {
    // 切换前端语言
    await i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);

    // 转换为后端 hl 参数格式 (zh-CN -> zh_CN)
    const hl = langCode.replace('-', '_');

    // 通知后端更新语言设置
    try {
      await invoke('set_language', { hl });
    } catch (error) {
      console.error('Failed to set backend language:', error);
    }

    // 清除所有缓存的数据（因为语言切换后，API返回的数据可能不同）
    resetCharacterStats(null);
    resetCharacterLeaderboard(null);
    resetLeaderboard(null);
    clearCharacters();
    resetSearchResult(null);

    console.log('Language changed to:', langCode, 'hl:', hl);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        语言 / Language
      </label>
      <select
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[#ca9372] focus:outline-none focus:ring-1 focus:ring-[#ca9372] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        切换语言后，数据将在下次请求时更新
      </p>
    </div>
  );
}
