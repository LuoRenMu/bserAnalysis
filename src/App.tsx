import { useEffect } from "react";
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

  // 同步 DLL 路径到后端
  useEffect(() => {
    if (settings.dllPath) {
      invoke("set_plugin_path", { path: settings.dllPath })
        .then(() => {
          console.log("DLL path synced to backend:", settings.dllPath);
        })
        .catch((error) => {
          console.error("Failed to set plugin path:", error);
          addErrorNotification(`设置 DLL 路径失败: ${error}`);
        });
    }
  }, [settings.dllPath, injected, addErrorNotification]);

  // 如果设置了跳过确认，自动启用注入；如果取消了，禁用注入并 quit
  useEffect(() => {
    if (settings.skipInjectionConfirm) {
      if (!injected) {
        // 重新勾选时，清除 DLL 缓存以便重新加载
        invoke("reload_plugin")
          .then(() => {
            console.log("DLL cache cleared, ready to reload");
            setInjected(true);
          })
          .catch((error) => {
            console.error("reload_plugin failed:", error);
            setInjected(true); // 仍然尝试注入
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
  }, [settings.skipInjectionConfirm, injected, active, setInjected, setActive]);

  // 全局注入轮询：已启用注入但未激活时，持续尝试注入
  useEffect(() => {
    if (!injected) return;
    if (active) return;

    const id = setInterval(async () => {
      try {
        const ok = await invoke<boolean>("inject");
        if (ok) setActive(true);
      } catch (error) {
        const errorMsg = String(error);
        console.error("inject failed:", errorMsg);
        // DLL 加载失败等致命错误，停止注入尝试并显示错误
        if (errorMsg.includes('DLL加载失败')) {
          console.error("Critical DLL error, disabling injection:", errorMsg);
          setInjected(false);
          addErrorNotification(errorMsg);
        }
      }
    }, 2000);

    return () => clearInterval(id);
  }, [active, injected, setActive, setInjected, addErrorNotification]);

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
