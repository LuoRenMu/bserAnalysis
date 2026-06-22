//! Bind to `dakgg-er-plugin.dll` and call its exports.
//!
//! This reproduces what `dakgg-er-plugin.node` does at module-init:
//! `LoadLibraryA("dakgg-er-plugin.dll")` then `GetProcAddress` for the four
//! `api_*` entry points. The addon's JS `getGameData()` ultimately reads the
//! buffer returned by `api_rpc_data`, and `inject()` calls `api_inject`.
//!
//! Export signatures (x64, default MSVC `cc`, no args):
//! ```c
//! int  api_inject(void);     // returns 1 on success, 0 otherwise
//! int  api_quit(void);       // returns 1 on success, 0 otherwise
//! int  api_sync(void);       // returns 1 on success, 0 otherwise
//! void*api_rpc_data(void);   // &record (1888 bytes) or NULL if not active
//! ```

use std::ffi::c_void;
use std::path::Path;

use windows::core::PCSTR;
use windows::Win32::Foundation::{FreeLibrary, HMODULE};
use windows::Win32::System::LibraryLoader::{
    AddDllDirectory, GetProcAddress, LoadLibraryA, SetDefaultDllDirectories,
    LOAD_LIBRARY_SEARCH_DEFAULT_DIRS,
};

type ApiIntFn = unsafe extern "system" fn() -> i32;
type ApiDataFn = unsafe extern "system" fn() -> *mut c_void;

/// A loaded handle to `dakgg-er-plugin.dll` with its exports resolved.
pub struct Plugin {
    module: HMODULE,
    api_inject: ApiIntFn,
    api_quit: ApiIntFn,
    api_sync: ApiIntFn,
    api_rpc_data: ApiDataFn,
}

// SAFETY: Plugin holds only a DLL module handle (an integer in practice) and
// function pointers — all safe to send/share across threads.
unsafe impl Send for Plugin {}
unsafe impl Sync for Plugin {}

#[repr(u32)]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum Command {
    Quit = 1,
    QuitDone = 2,
    Inject = 3,
    InjectDone = 4,
    Sync = 5,
    SyncDone = 6,
}
pub const DATA_SIZE: usize = 0x760; // 1888 bytes — the shared record size

impl Plugin {
    /// Load `dakgg-er-plugin.dll` from the given path and resolve its exports.
    ///
    /// # Safety
    /// Loads and executes arbitrary native code from `dll_path`. The caller
    /// must trust the binary. Returns an error if the library or any expected
    /// export is missing.
    pub fn load(dll_path: impl AsRef<Path>) -> Result<Self, String> {
        let path = dll_path.as_ref();
        // LoadLibraryA wants a NUL-terminated ANSI string.
        let path_str = path
            .to_str()
            .ok_or_else(|| format!("non-UTF8 path: {}", path.display()))?;
        let mut bytes = path_str.as_bytes().to_vec();
        bytes.push(0);

        unsafe {
            // Add dependency DLL search paths
            // The dakgg-er-plugin.dll depends on windows_*.dll files that are
            // in the rust-interop/target/debug/deps directory
            let mut deps_added = false;
            if let Some(parent) = path.parent() {
                let deps_path = parent
                    .parent()
                    .and_then(|p| p.parent())
                    .map(|p| p.join("rust-interop/target/debug/deps"));

                if let Some(deps_dir) = deps_path {
                    if deps_dir.exists() {
                        // Enable DLL directory search
                        let _ = SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);

                        // Add the deps directory to DLL search path
                        if let Some(deps_str) = deps_dir.to_str() {
                            let mut wide: Vec<u16> = deps_str.encode_utf16().collect();
                            wide.push(0);
                            let cookie = AddDllDirectory(windows::core::PCWSTR(wide.as_ptr()));
                            if !cookie.is_null() {
                                log::info!("Added DLL search path: {}", deps_str);
                                deps_added = true;
                            } else {
                                log::warn!("Failed to add DLL search path: {}", deps_str);
                            }
                        }
                    } else {
                        log::warn!("Dependency DLL directory not found: {}", deps_dir.display());
                    }
                }
            }

            if !deps_added {
                log::warn!("Could not add dependency DLL search paths - injection may fail");
            }

            let module = LoadLibraryA(PCSTR(bytes.as_ptr()))
                .map_err(|e| {
                    let msg = format!("DLL 加载失败: {} - {}", path_str, e);
                    log::error!("{}", msg);
                    if !deps_added {
                        log::error!("提示: 依赖 DLL 可能缺失。请确保 windows_*.dll 文件在正确的位置。");
                    }
                    msg
                })?;
            if module.is_invalid() {
                return Err("LoadLibraryA returned NULL".into());
            }

            let resolve = |name: &[u8]| -> Result<*const c_void, String> {
                match GetProcAddress(module, PCSTR(name.as_ptr())) {
                    Some(p) => Ok(p as *const c_void),
                    None => Err(format!(
                        "missing export: {}",
                        std::str::from_utf8(&name[..name.len() - 1]).unwrap_or("?")
                    )),
                }
            };

            let api_inject = resolve(b"api_inject\0")?;
            let api_quit = resolve(b"api_quit\0")?;
            let api_sync = resolve(b"api_sync\0")?;
            let api_rpc_data = resolve(b"api_rpc_data\0")?;

            Ok(Plugin {
                module,
                api_inject: std::mem::transmute::<_, ApiIntFn>(api_inject),
                api_quit: std::mem::transmute::<_, ApiIntFn>(api_quit),
                api_sync: std::mem::transmute::<_, ApiIntFn>(api_sync),
                api_rpc_data: std::mem::transmute::<_, ApiDataFn>(api_rpc_data),
            })
        }
    }

    /// Inject the controller into the running game (equivalent to the addon's
    /// `inject()`). Returns `true` on success.
    pub fn inject(&self) -> bool {
        unsafe { (self.api_inject)() != 0 }
    }

    /// Pull a fresh snapshot from the game into the shared record. Returns
    /// `true` if the round-trip handshake completed.
    pub fn sync(&self) -> bool {
        unsafe { (self.api_sync)() != 0 }
    }

    /// Tell the injected controller to detach/quit. Returns `true` on success.
    pub fn quit(&self) -> bool {
        unsafe { (self.api_quit)() != 0 }
    }

    /// Borrow the current 1888-byte record. Returns `None` when the plugin is
    /// not active (`api_rpc_data` yields NULL).
    ///
    /// Call [`Plugin::sync`] first to refresh it. This is the buffer the
    /// addon's `getGameData()` decodes into a JS object.
    pub fn data(&self) -> Option<&[u8]> {
        unsafe {
            let ptr = (self.api_rpc_data)() as *const u8;
            if ptr.is_null() {
                None
            } else {
                Some(std::slice::from_raw_parts(ptr, DATA_SIZE))
            }
        }
    }

    /// Convenience: [`sync`](Self::sync) then copy out the record.
    pub fn fetch(&self) -> Option<Vec<u8>> {
        if !self.sync() {
            return None;
        }
        self.data().map(|s| s.to_vec())
    }
}

impl Drop for Plugin {
    fn drop(&mut self) {
        unsafe {
            let _ = FreeLibrary(self.module);
        }
    }
}
