import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useTheme } from "./utils/useTheme";
import { appSettingsAtom } from "./utils/settings";
import {injectAtom, injectEnabledAtom, addErrorNotificationAtom, snapshotAtom} from "./store";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import ErrorNotifications from "./components/ErrorNotifications";
import {GameSnapshot} from "./types/bser.ts";
import {startOverlayMonitoring, stopOverlayMonitoring, listenOverlayDataUpdated, listenOverlayInjectionLost} from "./utils/overlayApi";

function App() {
  const { theme, toggle } = useTheme();
  const settings = useAtomValue(appSettingsAtom);
  const setSettings = useSetAtom(appSettingsAtom);
  const [injected, setInjected] = useAtom(injectAtom);
  const [injectEnabled, setInjectEnabled] = useAtom(injectEnabledAtom);
  const addErrorNotification = useSetAtom(addErrorNotificationAtom);
  const lastInjectErrorRef = useRef<string | null>(null);
  const [,setSnapshot] = useAtom(snapshotAtom);
  // 勾选时立即加载 DLL；成功后启用 inject 轮询，失败则弹窗并自动取消勾选
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
        setSettings((current) => ({ ...current, skipInjectionConfirm: false }));
      }
    })();

    return () => { cancelled = true; };
  }, [settings.skipInjectionConfirm, settings.dllPath, injectEnabled, addErrorNotification, setInjectEnabled, setSettings]);

  // 注入成功后：启动后端 overlay 监控 + 监听事件更新 snapshot
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
        if (snap.nickname.trim().length > 0) {
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

  // 取消勾选时退出注入并清理状态
  useEffect(() => {
    if (settings.skipInjectionConfirm) return;
    if (!injectEnabled) return;

    if (injected) {
      invoke<boolean>("quit")
        .then(() => setInjected(false))
        .catch((error) => console.error("quit failed:", error));
    }
    setInjectEnabled(false);
  }, [settings.skipInjectionConfirm, injectEnabled, injected, setInjected, setInjectEnabled]);

  // 加载成功后每 2 秒尝试 inject
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
        const errorMsg = String(error);
        if (errorMsg.includes('DLL加载失败')) {
          setInjectEnabled(false);
        }
        if (lastInjectErrorRef.current !== errorMsg) {
          lastInjectErrorRef.current = errorMsg;
          addErrorNotification(errorMsg);
        }
      }
    }, 2000);

    return () => clearInterval(id);
  }, [injectEnabled, injected, setInjected, setInjectEnabled, addErrorNotification]);

  return (
    <div className="h-screen flex flex-col">
      <TitleBar theme={theme} onToggleTheme={toggle} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <ErrorNotifications />
    </div>
  );
}

export default App;
