import { Outlet } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import "./App.css";
import { useTheme } from "./utils/useTheme";
import { useInjection } from "./utils/useInjection";
import { fetchGameDataAtom } from "./store";
import { appSettingsAtom } from "./utils/settings";
import { registerGlobalOverlayShortcut } from "./utils/globalShortcut";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import ErrorNotifications from "./components/ErrorNotifications";

function App() {
    const { theme, toggle } = useTheme();
    useInjection();
    const fetchGameData = useSetAtom(fetchGameDataAtom);
    const settings = useAtomValue(appSettingsAtom);

    useEffect(() => {
        void fetchGameData();
    }, [fetchGameData]);

    useEffect(() => {
        const shortcut = settings.overlayShortcut.trim();
        if (!shortcut) return;

        registerGlobalOverlayShortcut(shortcut).catch((error) => {
            console.error("Failed to register saved overlay shortcut:", error);
        });
    }, [settings.overlayShortcut]);

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
