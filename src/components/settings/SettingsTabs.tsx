export type SettingsTab = "main" | "alias" | "other" | "about";

const TABS: { id: SettingsTab; label: string }[] = [
    { id: "main", label: "主要" },
    { id: "alias", label: "别名" },
    { id: "other", label: "其他" },
    { id: "about", label: "关于" },
];

export interface SettingsTabsProps {
    activeTab: SettingsTab;
    onChange: (tab: SettingsTab) => void;
}

export default function SettingsTabs({activeTab, onChange}: SettingsTabsProps) {
    return (
        <div className="flex shrink-0 gap-1 border-b border-neutral-200 bg-neutral-50 px-2 dark:border-neutral-800 dark:bg-neutral-900">
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                            ? "text-neutral-950 dark:text-neutral-50"
                            : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100"/>
                    )}
                </button>
            ))}
        </div>
    );
}
