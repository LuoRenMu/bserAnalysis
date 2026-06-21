import React from "react";
import ReactDOM from "react-dom/client";
import { Provider, createStore } from "jotai";
import Router from "./router";
import { initLogForwarding } from "./utils/log";
import { loadSettings, settingsBaseAtom } from "./utils/settings";

initLogForwarding();

const initialSettings = await loadSettings();
const store = createStore();
store.set(settingsBaseAtom, initialSettings);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <Router />
    </Provider>
  </React.StrictMode>,
);
