import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "../App";
import Overlay from "../pages/Overlay";
import Search from "../pages/Search";
import Characters from "../pages/Characters";
import CharacterDetail from "../pages/CharacterDetail";
import Leaderboard from "../pages/Leaderboard";
import CharacterLeaderboard from "../pages/CharacterLeaderboard";
import CharacterStats from "../pages/CharacterStats";
import Settings from "../pages/Settings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Overlay /> },
      { path: "search", element: <Search /> },
      { path: "characters", element: <Characters /> },
      { path: "characters/:id", element: <CharacterDetail /> },
      { path: "leaderboard", element: <Leaderboard /> },
      { path: "character-leaderboard", element: <CharacterLeaderboard /> },
      { path: "character-stats", element: <CharacterStats /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
