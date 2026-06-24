import {useSetAtom} from "jotai";
import {type AppSettings} from "../../utils/settings";
import {emitOverlayMock, emitOverlayOpacity, registerOverlayShortcut, toggleOverlayWindow} from "../../utils/overlayApi";
import {addErrorNotificationAtom} from "../../store";

export interface OverlaySectionProps {
    settings: AppSettings;
    setSettings: (update: (current: AppSettings) => AppSettings) => void;
}

export default function OverlaySection({settings, setSettings}: OverlaySectionProps) {
    const addErrorNotification = useSetAtom(addErrorNotificationAtom);

    return (
        <section
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">游戏覆盖层</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    测试游戏内覆盖层窗口
                </p>
            </div>

            <div className="space-y-4 p-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        快捷键
                    </label>
                    <input
                        type="text"
                        value={settings.overlayShortcut}
                        onChange={(event) =>
                            setSettings((current) => ({
                                ...current,
                                overlayShortcut: event.target.value,
                            }))
                        }
                        onBlur={() => {
                            const shortcut = settings.overlayShortcut.trim();
                            if (!shortcut) return;
                            registerOverlayShortcut(shortcut).catch((error) => {
                                console.error('Failed to register shortcut:', error);
                                addErrorNotification(`快捷键无效: ${error}`);
                            });
                        }}
                        placeholder="如：` 或 Ctrl+Shift+O 或 F1"
                        spellCheck={false}
                        className="h-10 w-full rounded border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
                    />
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        输入快捷键组合（修饰键用 Ctrl/Shift/Alt/Meta，主键用字母/数字/F1-F12/` 等），用 + 连接。长按显示覆盖层，松开关闭。
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        void toggleOverlayWindow()
                            .then((visible) => {
                                if (visible) emitOverlayMock().catch(() => {});
                            })
                            .catch((error) => {
                                console.error('Failed to toggle overlay:', error);
                            });
                    }}
                    className="h-10 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                >
                    预览
                </button>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    长按设置的快捷键也可在游戏中显示覆盖层，松开关闭
                </p>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            背景透明度
                        </label>
                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                            {Math.round(settings.overlayBackgroundOpacity * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={settings.overlayBackgroundOpacity}
                        onChange={(event) => {
                            const opacity = Number(event.target.value);
                            setSettings((current) => ({
                                ...current,
                                overlayBackgroundOpacity: opacity,
                            }));
                            emitOverlayOpacity(opacity).catch(() => {});
                        }}
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-blue-500 dark:bg-neutral-700"
                    />
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        拖动调整覆盖层背景透明度（0% 全透明 / 100% 全黑）
                    </p>
                </div>
            </div>
        </section>
    );
}
