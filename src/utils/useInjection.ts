import { useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import { appSettingsAtom } from "./settings";
import { injectAtom, injectEnabledAtom, addErrorNotificationAtom, snapshotAtom } from "../store";
import type { GameSnapshot } from "../types/bser";
import {
    startOverlayMonitoring,
    stopOverlayMonitoring,
    listenOverlayDataUpdated,
    listenOverlayInjectionLost,
} from "./overlayApi";

/**
 * 注入生命周期 hook：DLL 加载 → inject 轮询 → overlay 监控。
 * 封装 App.tsx 原有的 4 个 useEffect，让 App 变为纯布局壳。
 */
export function useInjection() {
    const settings = useAtomValue(appSettingsAtom);
    const setSettings = useSetAtom(appSettingsAtom);
    const [injected, setInjected] = useAtom(injectAtom);
    const [injectEnabled, setInjectEnabled] = useAtom(injectEnabledAtom);
    const addErrorNotification = useSetAtom(addErrorNotificationAtom);
    const [, setSnapshot] = useAtom(snapshotAtom);
    const lastInjectErrorRef = useRef<string | null>(null);

    // 1. 勾选注入 → 加载 DLL，失败弹窗并取消勾选
    useEffect(() => {
        if (!settings.skipInjectionConfirm) return;
        if (injectEnabled) return;

        let cancelled = false;
        void (async () => {
            try {
                await invoke("load", { path: settings.dllPath });
                if (cancelled) return;
                setInjectEnabled(true);
            } catch (error) {
                if (cancelled) return;
                addErrorNotification(String(error));
                setSettings((c) => ({ ...c, skipInjectionConfirm: false }));
            }
        })();

        return () => { cancelled = true; };
    }, [
        settings.skipInjectionConfirm,
        settings.dllPath,
        injectEnabled,
        addErrorNotification,
        setInjectEnabled,
        setSettings,
    ]);

    // 2. 注入成功 → 启动 overlay 监控 + 监听 snapshot/lost 事件
    useEffect(() => {
        if (!injected) {
            stopOverlayMonitoring().catch(console.error);
            return;
        }
        let unlisten: (() => void) | undefined;
        let unlistenLost: (() => void) | undefined;
        let cancelled = false;
        startOverlayMonitoring().catch(console.error);
        void (async () => {
            unlisten = await listenOverlayDataUpdated<GameSnapshot>((snap) => {
                if (cancelled) return;
                if (isStorableMatchSnapshot(snap)) {
                    setSnapshot(snap);
                }
            });
            unlistenLost = await listenOverlayInjectionLost(() => {
                if (cancelled) return;
                setInjected(false);
            });
        })();
        return () => {
            cancelled = true;
            unlisten?.();
            unlistenLost?.();
            stopOverlayMonitoring().catch(console.error);
        };
    }, [injected, setSnapshot, setInjected]);

    // 3. 取消勾选 → quit 退出注入
    useEffect(() => {
        if (settings.skipInjectionConfirm) return;
        if (!injectEnabled) return;

        if (injected) {
            invoke<boolean>("quit")
                .then(() => setInjected(false))
                .catch((e) => console.error("quit failed:", e));
        }
        setInjectEnabled(false);
    }, [settings.skipInjectionConfirm, injectEnabled, injected, setInjected, setInjectEnabled]);

    // 4. Poll inject 每 2 秒
    useEffect(() => {
        if (!injectEnabled) return;
        if (injected) return;

        const id = setInterval(async () => {
            try {
                const ok = await invoke<boolean>("inject");
                if (ok) {
                    setInjected(true);
                    lastInjectErrorRef.current = null;
                }
            } catch (error) {
                const msg = String(error);
                if (msg.includes("DLL加载失败")) {
                    setInjectEnabled(false);
                }
                if (lastInjectErrorRef.current !== msg) {
                    lastInjectErrorRef.current = msg;
                    addErrorNotification(msg);
                }
            }
        }, 2000);

        return () => clearInterval(id);
    }, [injectEnabled, injected, setInjected, setInjectEnabled, addErrorNotification]);
}

function isStorableMatchSnapshot(snapshot: GameSnapshot) {
    return (
        snapshot.is_game_started &&
        !snapshot.is_game_end &&
        !snapshot.is_game_result &&
        snapshot.entry_count > 0 &&
        snapshot.raw.some((player) => player.name.trim().length > 0)
    );
}
