import {useTranslation} from "react-i18next";
import type {AppSettings} from "../../utils/settings";

export interface BoundPlayerSectionProps {
    settings: AppSettings;
    setSettings: (update: (current: AppSettings) => AppSettings) => void;
}

export default function BoundPlayerSection({settings, setSettings}: BoundPlayerSectionProps) {
    const {t} = useTranslation();
    return (
        <section
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">{t('settings.boundPlayerSection')}</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {t('settings.boundPlayerDesc')}
                </p>
            </div>

            <div className="space-y-3 p-4">
                <input
                    value={settings.boundPlayerName}
                    onChange={(event) =>
                        setSettings((current) => ({...current, boundPlayerName: event.target.value}))
                    }
                    placeholder={t('settings.boundPlayerPlaceholder')}
                    spellCheck={false}
                    className="h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
                />
            </div>
        </section>
    );
}
