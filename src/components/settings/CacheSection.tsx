import {useTranslation} from "react-i18next";
import {useSetAtom} from "jotai";
import {clearAllCache} from "../../utils/cacheApi";
import {addErrorNotificationAtom, addSuccessNotificationAtom} from "../../store/errorStore";

export default function CacheSection() {
    const {t} = useTranslation();
    const addErrorNotification = useSetAtom(addErrorNotificationAtom);
    const addSuccessNotification = useSetAtom(addSuccessNotificationAtom);

    return (
        <section
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">{t('settings.cacheManagement')}</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {t('settings.cacheManagementDesc')}
                </p>
            </div>

            <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {t('settings.clearAllCache')}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {t('settings.clearAllCacheDesc')}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await clearAllCache();
                                addSuccessNotification(t('settings.cacheCleared'));
                            } catch (error) {
                                console.error('Failed to clear all cache:', error);
                                addErrorNotification(t('settings.cacheClearFailed'));
                            }
                        }}
                        className="h-8 rounded border border-red-300 bg-white px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-neutral-950 dark:text-red-400 dark:hover:bg-red-950"
                    >
                        {t('settings.clearAll')}
                    </button>
                </div>
            </div>
        </section>
    );
}
