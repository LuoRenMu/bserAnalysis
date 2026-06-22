import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useTheme } from "./utils/useTheme";
import { appSettingsAtom } from "./utils/settings";
import { activeAtom, injectAtom, addErrorNotificationAtom } from "./store";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import ErrorNotifications from "./components/ErrorNotifications";

function App() {
  const { theme, toggle } = useTheme();
  const settings = useAtomValue(appSettingsAtom);
  const [injected, setInjected] = useAtom(injectAtom);
  const [active, setActive] = useAtom(activeAtom);
  const addErrorNotification = useSetAtom(addErrorNotificationAtom);
  const [dllPathValid, setDllPathValid] = useState(false);
  const lastInjectErrorRef = useRef<string | null>(null);


  // 如果设置了跳过确认，自动启用注入；如果取消了，禁用注入并 quit
  useEffect(() => {
    if (settings.skipInjectionConfirm) {
      invoke("set_plugin_path", { path: settings.dllPath })
          .then(() => {
            setDllPathValid(true);
            console.log("DLL path validated:", settings.dllPath);
          })
          .catch((error) => {
            setDllPathValid(false);
            const msg = `DLL 路径错误: ${error}`;
            console.error(msg);
            addErrorNotification(msg);
          });
      if (!injected && dllPathValid) {
        // 路径有效才清除 DLL 缓存并启用注入
        invoke("reload_plugin")
          .then(() => {
            console.log("DLL cache cleared, ready to reload");
            setInjected(true);
          })
          .catch((error) => {
            console.error("reload_plugin failed:", error);
            addErrorNotification(`DLL 重新加载失败: ${error}`);
          });
      }
    } else {
      // 取消了跳过确认，禁用注入
      if (injected) {
        // 如果已经注入成功，先调用 quit
        if (active) {
          invoke<boolean>("quit")
            .then(() => {
              console.log("quit called due to skipInjectionConfirm disabled");
              setActive(false);
            })
            .catch((error) => {
              console.error("quit failed:", error);
            });
        }
        setInjected(false);
      }
    }
  }, [settings.skipInjectionConfirm, injected, active, dllPathValid, setInjected, setActive, addErrorNotification]);

  // 全局注入轮询：已启用注入、DLL 路径有效、未激活时，持续尝试注入
  useEffect(() => {
    if (!injected) return;
    if (!dllPathValid) return;
    if (active) return;
    const id = setInterval(async () => {
      try {
        const ok = await invoke<boolean>("inject");
        if (ok) {
          setActive(true);
          lastInjectErrorRef.current = null;
        }
      } catch (error) {
        const errorMsg = String(error);
        // DLL 加载失败等致命错误，停止注入尝试
        if (errorMsg.includes('DLL加载失败')) {
          console.error("Critical DLL error, disabling injection:", errorMsg);
          setInjected(false);
        }
        // 只在错误消息变化时才通知，避免轮询刷屏
        if (lastInjectErrorRef.current !== errorMsg) {
          lastInjectErrorRef.current = errorMsg;
          addErrorNotification(errorMsg);
        }
      }
    }, 2000);

    return () => clearInterval(id);
  }, [active, injected, dllPathValid, setActive, setInjected, addErrorNotification, lastInjectErrorRef]);

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
