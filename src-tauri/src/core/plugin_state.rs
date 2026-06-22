//! Shared DLL plugin state for Tauri commands + overlay polling.
//!
//! Thin wrapper around `Arc<RwLock<Option<Plugin>>>` so the command layer
//! (`bser_client`) and the overlay manager share a single `Plugin` instance —
//! matching the `run_dll` reference flow: one load → inject → fetch.

use std::sync::{Arc, RwLock};

use crate::core::dll::Plugin;

pub struct PluginState {
    plugin: Arc<RwLock<Option<Plugin>>>,
}

impl PluginState {
    pub fn new() -> Self {
        Self {
            plugin: Arc::new(RwLock::new(None)),
        }
    }

    /// Clone the inner handle for components (e.g. OverlayManager) that need
    /// direct access to the shared `Plugin`.
    pub fn handle(&self) -> Arc<RwLock<Option<Plugin>>> {
        Arc::clone(&self.plugin)
    }

    /// Load (or replace) the DLL at `path`. Replaces any previously loaded
    /// plugin.
    pub fn load(&self, path: &str) -> Result<(), String> {
        let plugin = Plugin::load(path)?;
        let mut guard = self.plugin.write().unwrap();
        *guard = Some(plugin);
        log::info!("Plugin loaded: {path}");
        Ok(())
    }

    /// Attempt injection. Returns `false` if no plugin is loaded or the
    /// injection call fails (caller should retry).
    pub fn inject(&self) -> bool {
        let guard = self.plugin.read().unwrap();
        guard.as_ref().map(|p| p.inject()).unwrap_or(false)
    }

    /// Tell the injected controller to detach.
    pub fn quit(&self) -> bool {
        let guard = self.plugin.read().unwrap();
        guard.as_ref().map(|p| p.quit()).unwrap_or(false)
    }

    /// Sync + copy out the current record. `None` when not loaded, not
    /// injected, or the game is not running.
    pub fn fetch(&self) -> Option<Vec<u8>> {
        let guard = self.plugin.read().unwrap();
        guard.as_ref().and_then(|p| p.fetch())
    }

    pub fn is_loaded(&self) -> bool {
        self.plugin.read().unwrap().is_some()
    }
}

impl Default for PluginState {
    fn default() -> Self {
        Self::new()
    }
}
