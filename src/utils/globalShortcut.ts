import {
  isRegistered,
  register,
  unregister,
  type ShortcutEvent,
} from "@tauri-apps/plugin-global-shortcut";
import { hideOverlayWindow, showOverlayWindow } from "./overlayApi";

let registeredOverlayShortcut: string | null = null;

export async function registerGlobalOverlayShortcut(shortcut: string): Promise<void> {
  const normalized = shortcut.trim();
  if (!normalized) throw new Error("shortcut is empty");

  if (registeredOverlayShortcut && registeredOverlayShortcut !== normalized) {
    await unregister(registeredOverlayShortcut).catch(() => {});
  }

  if (await isRegistered(normalized)) {
    await unregister(normalized);
  }

  await register(normalized, handleOverlayShortcut);
  registeredOverlayShortcut = normalized;
}

function handleOverlayShortcut(event: ShortcutEvent) {
  if (event.state === "Pressed") {
    showOverlayWindow().catch((error) => {
      console.error("Failed to show overlay from global shortcut:", error);
    });
  } else {
    hideOverlayWindow().catch((error) => {
      console.error("Failed to hide overlay from global shortcut:", error);
    });
  }
}
