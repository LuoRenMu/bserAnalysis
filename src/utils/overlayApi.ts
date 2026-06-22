import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * Starts overlay data monitoring (backend polls game data and emits updates).
 */
export async function startOverlayMonitoring(): Promise<void> {
  await invoke("start_overlay_monitoring");
}

/**
 * Stops overlay data monitoring.
 */
export async function stopOverlayMonitoring(): Promise<void> {
  await invoke("stop_overlay_monitoring");
}

/**
 * Checks if overlay monitoring is active.
 */
export async function isOverlayMonitoring(): Promise<boolean> {
  return await invoke<boolean>("is_overlay_monitoring");
}

// --- Overlay window controls -------------------------------------------------

/**
 * Shows the overlay window.
 */
export async function showOverlayWindow(): Promise<void> {
  await invoke("show_overlay_window");
}

/**
 * Hides the overlay window.
 */
export async function hideOverlayWindow(): Promise<void> {
  await invoke("hide_overlay_window");
}

/**
 * Toggles the overlay window visibility. Returns the new visible state.
 */
export async function toggleOverlayWindow(): Promise<boolean> {
  return await invoke<boolean>("toggle_overlay_window");
}

/**
 * Queries whether the overlay window is currently visible.
 */
export async function isOverlayWindowVisible(): Promise<boolean> {
  return await invoke<boolean>("is_overlay_window_visible");
}

// --- Shortcut recording (backend rdev) ---------------------------------------

/**
 * Starts recording the next shortcut press on the backend. When a non-modifier
 * key is pressed, the backend emits a `shortcut-recorded` event with the combo
 * string (e.g. `` ` ``, `Ctrl+Shift+O`).
 */
export async function startShortcutRecording(): Promise<void> {
  await invoke("start_shortcut_recording");
}

/**
 * Cancels an in-progress shortcut recording.
 */
export async function cancelShortcutRecording(): Promise<void> {
  await invoke("cancel_shortcut_recording");
}

/**
 * Whether the backend is currently recording a shortcut.
 */
export async function isShortcutRecording(): Promise<boolean> {
  return await invoke<boolean>("is_shortcut_recording");
}

/**
 * Registers the overlay trigger combo. Press-and-hold semantics: the overlay
 * shows while all combo keys are held and hides when any is released.
 */
export async function registerOverlayShortcut(shortcut: string): Promise<void> {
  await invoke("register_overlay_shortcut", { shortcut });
}

/**
 * Clears the registered overlay combo.
 */
export async function clearOverlayShortcut(): Promise<void> {
  await invoke("clear_overlay_shortcut");
}

// --- Event listeners ---------------------------------------------------------

/**
 * Listens for `shortcut-recorded` events emitted by the backend rdev listener.
 * @param onRecorded Receives the combo string.
 * @returns Cleanup function.
 */
export async function listenShortcutRecorded(
  onRecorded: (combo: string) => void,
): Promise<() => void> {
  const unlisten = await listen<string>("shortcut-recorded", (event) => {
    onRecorded(event.payload);
  });
  return () => unlisten();
}

/**
 * Listens for overlay show/hide events from the backend (driven by rdev
 * press-and-hold).
 */
export async function listenOverlayEvents(
  onShow: () => void,
  onHide: () => void,
): Promise<() => void> {
  const unlistenShow = await listen("overlay-show", () => onShow());
  const unlistenHide = await listen("overlay-hide", () => onHide());
  return () => {
    unlistenShow();
    unlistenHide();
  };
}

/**
 * Listens for game data updates pushed by the backend overlay monitor.
 */
export async function listenOverlayDataUpdated<T>(
  onData: (snapshot: T) => void,
): Promise<UnlistenFn> {
  return await listen<T>("overlay-data-updated", (event) => onData(event.payload));
}
