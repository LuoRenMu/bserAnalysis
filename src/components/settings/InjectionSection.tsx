import {useState} from "react";
import {useTranslation} from "react-i18next";
import {DEFAULT_DLL_PATH, type AppSettings} from "../../utils/settings";
import DoubleConfirmDialog from "../DoubleConfirmDialog";

export interface InjectionSectionProps {
    settings: AppSettings;
    setSettings: (update: (current: AppSettings) => AppSettings) => void;
    onConfirmEnable: () => void;
}

export default function InjectionSection({settings, setSettings, onConfirmEnable}: InjectionSectionProps) {
    const {t} = useTranslation();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingSkipConfirm, setPendingSkipConfirm] = useState(false);

    return (
        <>
            <section
                className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                    <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">{t('settings.injectionSection')}</h2>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {t('settings.injectionDesc')}
                    </p>
                </div>

                <div className="space-y-4 p-4">
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={settings.skipInjectionConfirm}
                            onChange={(event) => {
                                if (event.target.checked) {
                                    setPendingSkipConfirm(true);
                                    setConfirmOpen(true);
                                } else {
                                    setSettings((current) => ({
                                        ...current,
                                        skipInjectionConfirm: false,
                                    }));
                                }
                            }}
                            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            {t('settings.enableInjection')}
                        </span>
                    </label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {t('settings.dllPathHint1')}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {t('settings.dllPathHint2')}
                    </p>
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            {t('settings.dllPluginPath')}
                        </label>
                        <input
                            value={settings.dllPath}
                            onChange={(event) =>
                                setSettings((current) => ({...current, dllPath: event.target.value}))
                            }
                            spellCheck={false}
                            placeholder={t('settings.dllPathPlaceholder')}
                            className="h-10 w-full rounded border border-neutral-300 bg-white px-3 font-mono text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                {t('settings.dllPathPlaceholder')}
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettings((current) => ({...current, dllPath: DEFAULT_DLL_PATH}))}
                                className="h-7 rounded border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            >
                                {t('settings.resetToDefault')}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <DoubleConfirmDialog
                open={confirmOpen}
                showRememberOption={false}
                firstStep={{
                    title: t('settings.confirmEnableInjectionTitle'),
                    description: t('settings.confirmEnableInjectionDesc'),
                    confirmLabel: t('settings.confirmEnableInjectionContinue'),
                }}
                secondStep={{
                    title: t('settings.confirmEnableInjectionSecondTitle'),
                    description: t('settings.confirmEnableInjectionSecondDesc'),
                    confirmLabel: t('settings.confirmEnableInjectionConfirm'),
                }}
                onCancel={async () => {
                    setConfirmOpen(false);
                    setPendingSkipConfirm(false);
                }}
                onConfirm={async () => {
                    setConfirmOpen(false);
                    if (pendingSkipConfirm) {
                        setSettings((current) => ({
                            ...current,
                            skipInjectionConfirm: true,
                        }));
                        onConfirmEnable();
                        setPendingSkipConfirm(false);
                    }
                }}
            />
        </>
    );
}
