import {type KeyboardEvent, useEffect, useState} from "react";
import {useSetAtom} from "jotai";
import {type AppSettings} from "../../utils/settings";
import {
    emitOverlayMock,
    emitOverlayOpacity,
    toggleOverlayWindow,
} from "../../utils/overlayApi";
import {registerGlobalOverlayShortcut} from "../../utils/globalShortcut";
import {addErrorNotificationAtom, addSuccessNotificationAtom} from "../../store";

export interface OverlaySectionProps {
    settings: AppSettings;
    setSettings: (update: (current: AppSettings) => AppSettings) => void;
}

export default function OverlaySection({settings, setSettings}: OverlaySectionProps) {
    const addErrorNotification = useSetAtom(addErrorNotificationAtom);
    const addSuccessNotification = useSetAtom(addSuccessNotificationAtom);
    const [draftShortcut, setDraftShortcut] = useState(settings.overlayShortcut);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setDraftShortcut(settings.overlayShortcut);
    }, [settings.overlayShortcut]);

    const handleShortcutKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const shortcut = shortcutFromKeyboardEvent(event);
        if (!shortcut) return;
        setDraftShortcut(shortcut);
    };

    const saveShortcut = () => {
        if (saving) return;

        const shortcut = draftShortcut.trim();
        if (!shortcut) {
            addErrorNotification("快捷键不能为空");
            return;
        }
        if (shortcut === settings.overlayShortcut.trim()) return;

        setSaving(true);
        void registerGlobalOverlayShortcut(shortcut)
            .then(() => {
                setSettings((current) => ({
                    ...current,
                    overlayShortcut: shortcut,
                }));
                addSuccessNotification("快捷键已保存");
            })
            .catch((error) => {
                console.error("Failed to register shortcut:", error);
                addErrorNotification(`快捷键注册失败: ${error}`);
            })
            .finally(() => setSaving(false));
    };

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
                        value={draftShortcut}
                        onKeyDown={handleShortcutKeyDown}
                        onBlur={saveShortcut}
                        readOnly
                        placeholder="在此按下快捷键组合"
                        spellCheck={false}
                        className="h-10 w-full rounded border border-neutral-300 bg-white px-3 font-mono text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
                    />
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {saving
                            ? "正在保存快捷键..."
                            : "在输入框中按下组合键，输入框失焦后自动保存并注册全局快捷键；长按显示覆盖层，松开关闭。"}
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
                                console.error("Failed to toggle overlay:", error);
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

function shortcutFromKeyboardEvent(event: KeyboardEvent<HTMLInputElement>) {
    const mainKey = mainKeyFromKeyboardEvent(event);
    if (!mainKey) return "";

    const keys: string[] = [];
    if (event.ctrlKey) keys.push("Ctrl");
    if (event.shiftKey) keys.push("Shift");
    if (event.altKey) keys.push("Alt");
    if (event.metaKey) keys.push("Meta");
    keys.push(mainKey);
    return keys.join("+");
}

function mainKeyFromKeyboardEvent(event: KeyboardEvent<HTMLInputElement>) {
    if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return "";

    if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
    if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
    if (/^F([1-9]|1[0-2])$/.test(event.code)) return event.code;

    switch (event.code) {
        case "Backquote":
            return "`";
        case "Minus":
            return "-";
        case "Equal":
            return "=";
        case "BracketLeft":
            return "[";
        case "BracketRight":
            return "]";
        case "Semicolon":
            return ";";
        case "Quote":
            return "'";
        case "Backslash":
            return "\\";
        case "Comma":
            return ",";
        case "Period":
            return ".";
        case "Slash":
            return "/";
        case "Space":
            return "Space";
        case "Escape":
            return "Esc";
        case "Tab":
            return "Tab";
        case "Enter":
        case "NumpadEnter":
            return "Enter";
        case "Backspace":
            return "Backspace";
        case "Insert":
            return "Insert";
        case "Delete":
            return "Delete";
        case "Home":
            return "Home";
        case "End":
            return "End";
        case "PageUp":
            return "PageUp";
        case "PageDown":
            return "PageDown";
        case "ArrowUp":
            return "Up";
        case "ArrowDown":
            return "Down";
        case "ArrowLeft":
            return "Left";
        case "ArrowRight":
            return "Right";
        case "CapsLock":
            return "CapsLock";
        case "NumLock":
            return "NumLock";
        case "PrintScreen":
            return "PrintScreen";
        case "ScrollLock":
            return "ScrollLock";
        case "Pause":
            return "Pause";
        default:
            return event.key.length === 1 ? event.key.toUpperCase() : "";
    }
}
