import { Outlet } from "react-router-dom";
import "./App.css";
import { useTheme } from "./utils/useTheme";
import { useInjection } from "./utils/useInjection";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import ErrorNotifications from "./components/ErrorNotifications";

function App() {
    const { theme, toggle } = useTheme();
    useInjection();

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
