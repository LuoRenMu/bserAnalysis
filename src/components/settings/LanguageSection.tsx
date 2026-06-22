import {useTranslation} from "react-i18next";
import LanguageSelector from "../LanguageSelector";

export default function LanguageSection() {
    const {t} = useTranslation();

    return (
        <section
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">{t('settings.languageSection')}</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {t('settings.languageDesc')}
                </p>
            </div>

            <div className="space-y-3 p-4">
                <LanguageSelector />
            </div>
        </section>
    );
}
