import {useState} from "react";
import {useAtom, useAtomValue} from "jotai";
import {useTranslation} from "react-i18next";
import {appSettingsAtom} from "../utils/settings";
import {characterBriefAtom, injectAtom} from "../store";
import SettingsTabs, {type SettingsTab} from "../components/settings/SettingsTabs";
import BoundPlayerSection from "../components/settings/BoundPlayerSection";
import InjectionSection from "../components/settings/InjectionSection";
import OverlaySection from "../components/settings/OverlaySection";
import AliasSection from "../components/settings/AliasSection";
import LanguageSection from "../components/settings/LanguageSection";
import CacheSection from "../components/settings/CacheSection";
import AboutSection from "../components/settings/AboutSection";

export default function Settings() {
    const {t} = useTranslation();
    const [settings, setSettings] = useAtom(appSettingsAtom);
    const characters = useAtomValue(characterBriefAtom);
    const setInjected = useAtom(injectAtom)[1];
    const [activeTab, setActiveTab] = useState<SettingsTab>("main");

    return (
        <div className="h-full flex flex-col bg-neutral-100 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
            <SettingsTabs activeTab={activeTab} onChange={setActiveTab}/>

            <div className="flex-1 overflow-auto p-4">
                <div className="mx-auto max-w-312.5 space-y-4">
                    <header>
                        <h1 className="text-2xl font-black text-neutral-950 dark:text-neutral-50">{t('settings.title')}</h1>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {t('settings.betaVersion')}
                        </p>
                    </header>

                    {activeTab === "main" && (<>
                        <BoundPlayerSection settings={settings} setSettings={setSettings}/>
                        <InjectionSection
                            settings={settings}
                            setSettings={setSettings}
                            onConfirmEnable={() => setInjected(true)}
                        />
                        <OverlaySection settings={settings} setSettings={setSettings}/>
                    </>)}

                    {activeTab === "alias" && (<>
                        <AliasSection
                            title={t('settings.characterAliasSection')}
                            description={t('settings.characterAliasDesc')}
                            entries={settings.characterAliases}
                            sourceLabel={t('settings.originalName')}
                            aliasLabel={t('settings.aliasName')}
                            onChange={(characterAliases) =>
                                setSettings((current) => ({...current, characterAliases}))
                            }
                            characters={characters}
                        />
                        <AliasSection
                            title={t('settings.playerAliasSection')}
                            description={t('settings.playerAliasDesc')}
                            entries={settings.playerAliases}
                            sourceLabel={t('settings.originalName')}
                            aliasLabel={t('settings.aliasName')}
                            onChange={(playerAliases) => setSettings((current) => ({...current, playerAliases}))}
                        />
                    </>)}

                    {activeTab === "other" && (<>
                        <LanguageSection/>
                        <CacheSection/>
                    </>)}

                    {activeTab === "about" && <AboutSection/>}
                </div>
            </div>
        </div>
    );
}
