import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "../App";

const Overlay = lazy(() => import("../pages/Overlay"));
const Search = lazy(() => import("../pages/Search"));
const Characters = lazy(() => import("../pages/Characters"));
const CharacterDetail = lazy(() => import("../pages/CharacterDetail"));
const Leaderboard = lazy(() => import("../pages/Leaderboard"));
const CharacterLeaderboard = lazy(() => import("../pages/CharacterLeaderboard"));
const CharacterStats = lazy(() => import("../pages/CharacterStats"));
const Settings = lazy(() => import("../pages/Settings"));
const GameOverlay = lazy(() => import("../windows/GameOverlay"));

function RouteFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-[#ca9372] dark:border-neutral-700 dark:border-t-[#ca9372]" />
    </div>
  );
}

function routeElement(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: routeElement(<Overlay />) },
      { path: "search", element: routeElement(<Search />) },
      { path: "characters", element: routeElement(<Characters />) },
      { path: "characters/:id", element: routeElement(<CharacterDetail />) },
      { path: "leaderboard", element: routeElement(<Leaderboard />) },
      { path: "character-leaderboard", element: routeElement(<CharacterLeaderboard />) },
      { path: "character-stats", element: routeElement(<CharacterStats />) },
      { path: "settings", element: routeElement(<Settings />) },
    ],
  },
  // 独立窗口路由（无导航栏）
  {
    path: "/game-overlay",
    element: <Suspense fallback={null}><GameOverlay /></Suspense>,
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
