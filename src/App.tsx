import { Outlet } from "react-router-dom";
import { useSetAtom } from "jotai";
import "./App.css";
import { useTheme } from "./utils/useTheme";
import { useInjection } from "./utils/useInjection";
import { fetchGameDataAtom } from "./store";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import ErrorNotifications from "./components/ErrorNotifications";

function App() {
    const { theme, toggle } = useTheme();
    useInjection();
    const fetchGameData = useSetAtom(fetchGameDataAtom);
    fetchGameData(); // 应用启动即加载游戏参考数据

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
