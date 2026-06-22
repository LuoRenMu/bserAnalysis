//! Direct shared-memory protocol client (no DLL required).
//!
//! Reimplements the controller's sync handshake (`fcn.180002630` in the DLL)
//! purely from Win32. This lets a Rust process act as the *host* side: it
//! opens the per-PID named objects the injected agent created inside the game
//! and exchanges the 1888-byte record.
//!
//! Handshake (host perspective), mirroring the DLL exactly:
//! ```text
//! WaitForSingleObject(READY,    0)       // agent must be ready
//! WaitForSingleObject(MUTEX,    5000)
//! memcpy(shared <- local, 1888)          // publish request (cmd byte set)
//! ResetEvent(RESPONSE)
//! SetEvent(REQUEST)
//! ReleaseMutex(MUTEX)
//! WaitForSingleObject(REQUEST,  5000)     // agent consumed it
//! WaitForSingleObject(RESPONSE, 5000)     // agent produced a reply
//! memcpy(local <- shared, 1888)
//! ReleaseMutex(MUTEX)
//! ```
//!
//! Note: the real DLL waits on the same handle in places where a separate
//! object would be expected; this implementation follows the observed call
//! order and the named-object set created by `fcn.180001230`.

use std::ffi::c_void;

use windows::core::{PCSTR, PCWSTR};
use windows::Win32::Foundation::{CloseHandle, HANDLE, WAIT_OBJECT_0};
use windows::Win32::System::Memory::{
    MapViewOfFile, OpenFileMappingA, UnmapViewOfFile, FILE_MAP_ALL_ACCESS,
};
use windows::Win32::System::Threading::{
    OpenEventW, OpenMutexW, ReleaseMutex, ResetEvent, SetEvent, WaitForSingleObject,
    EVENT_MODIFY_STATE, SYNCHRONIZATION_SYNCHRONIZE,
};
use windows::Win32::UI::WindowsAndMessaging::{FindWindowW, GetWindowThreadProcessId};
use crate::core::{Command, DATA_SIZE};

const TIMEOUT_MS: u32 = 5000;

/// Find the Eternal Return game window and return its process id.
///
/// Window class `UnityWndClass`, title `Eternal Return` — the exact strings
/// the DLL passes to `FindWindowW`.
pub fn find_game_pid() -> Option<u32> {
    let class: Vec<u16> = "UnityWndClass\0".encode_utf16().collect();
    let title: Vec<u16> = "Eternal Return\0".encode_utf16().collect();
    unsafe {
        let hwnd = FindWindowW(
            windows::core::PCWSTR(class.as_ptr()),
            windows::core::PCWSTR(title.as_ptr()),
        )
            .ok()?;
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            None
        } else {
            Some(pid)
        }
    }
}

// PLACEHOLDER_BRIDGE

/// Host-side client for the per-PID shared-memory channel.
///
/// Construct with [`GameBridge::open`] (auto-detects the game PID) or
/// [`GameBridge::open_pid`]. All named objects must already exist — they are
/// created by the injected agent inside the game process.
pub struct GameBridge {
    pid: u32,
    mutex: HANDLE,
    request: HANDLE,
    response: HANDLE,
    ready: HANDLE,
    view: *mut c_void,
    map: HANDLE,
}

impl GameBridge {
    /// Open the channel for the currently running Eternal Return process.
    pub fn open() -> Result<Self, String> {
        let pid = find_game_pid().ok_or("Eternal Return window not found")?;
        Self::open_pid(pid)
    }

    /// Open the channel for a specific game process id.
    pub fn open_pid(pid: u32) -> Result<Self, String> {
        unsafe {
            let mutex = open_mutex(&wstr(&format!("DAKGG_ER:{pid}")))?;
            let request = open_event(&wstr(&format!("DAKGG_ER_REQUEST:{pid}")))?;
            let response = open_event(&wstr(&format!("DAKGG_ER_RESPONSE:{pid}")))?;
            let ready = open_event(&wstr(&format!("DAKGG_ER_READY:{pid}")))?;

            let map_name = cstr(&format!("DAKGG_ER_DATA:{pid}"));
            let map = OpenFileMappingA(FILE_MAP_ALL_ACCESS.0, false, PCSTR(map_name.as_ptr()))
                .map_err(|e| format!("OpenFileMapping(DATA) failed: {e}"))?;
            let view = MapViewOfFile(map, FILE_MAP_ALL_ACCESS, 0, 0, DATA_SIZE);
            if view.Value.is_null() {
                let _ = CloseHandle(map);
                return Err("MapViewOfFile failed".into());
            }

            Ok(GameBridge {
                pid,
                mutex,
                request,
                response,
                ready,
                view: view.Value,
                map,
            })
        }
    }

    pub fn pid(&self) -> u32 {
        self.pid
    }

    /// Perform one request/response round trip with the given command byte,
    /// returning the 1888-byte reply record.
    ///
    /// This is the host-side equivalent of the DLL's `fcn.180002630`.
    pub fn round_trip(&self, command: Command) -> Result<Vec<u8>, String> {
        unsafe {
            // Agent must be ready (non-blocking probe, like the DLL).
            if WaitForSingleObject(self.ready, 0) != WAIT_OBJECT_0 {
                return Err("agent not ready (READY event not signaled)".into());
            }

            // Acquire the cross-process mutex.
            if WaitForSingleObject(self.mutex, TIMEOUT_MS) != WAIT_OBJECT_0 {
                return Err("timeout acquiring mutex".into());
            }

            // Build the request record: zeroed buffer with command in dword[0].
            let mut record = vec![0u8; DATA_SIZE];
            record[0..4].copy_from_slice(&(command as u32).to_le_bytes());

            // Publish request into shared memory.
            std::ptr::copy_nonoverlapping(record.as_ptr(), self.view as *mut u8, DATA_SIZE);

            let _ = ResetEvent(self.response);
            let _ = SetEvent(self.request);
            let _ = ReleaseMutex(self.mutex);

            // Wait for the agent to consume the request and reply.
            if WaitForSingleObject(self.request, TIMEOUT_MS) != WAIT_OBJECT_0 {
                return Err("timeout waiting for request to be consumed".into());
            }
            if WaitForSingleObject(self.response, TIMEOUT_MS) != WAIT_OBJECT_0 {
                return Err("timeout waiting for response".into());
            }

            // Re-take the mutex to read back consistently.
            if WaitForSingleObject(self.mutex, TIMEOUT_MS) != WAIT_OBJECT_0 {
                return Err("timeout re-acquiring mutex".into());
            }
            std::ptr::copy_nonoverlapping(self.view as *const u8, record.as_mut_ptr(), DATA_SIZE);
            let _ = ReleaseMutex(self.mutex);

            Ok(record)
        }
    }

    /// Request a fresh game-state snapshot ([`Command::Sync`]).
    pub fn sync(&self) -> Result<GameSnapshot, String> {
        let raw = self.round_trip(Command::Sync)?;
        Ok(GameSnapshot::from_bytes(raw))
    }

    /// Read the current shared record without a handshake (a raw view snapshot).
    pub fn read_raw(&self) -> Vec<u8> {
        let mut out = vec![0u8; DATA_SIZE];
        unsafe {
            std::ptr::copy_nonoverlapping(self.view as *const u8, out.as_mut_ptr(), DATA_SIZE);
        }
        out
    }
}

impl Drop for GameBridge {
    fn drop(&mut self) {
        unsafe {
            if !self.view.is_null() {
                let _ = UnmapViewOfFile(windows::Win32::System::Memory::MEMORY_MAPPED_VIEW_ADDRESS {
                    Value: self.view,
                });
            }
            let _ = CloseHandle(self.map);
            let _ = CloseHandle(self.mutex);
            let _ = CloseHandle(self.request);
            let _ = CloseHandle(self.response);
            let _ = CloseHandle(self.ready);
        }
    }
}

// --- helpers ---------------------------------------------------------------

fn cstr(s: &str) -> Vec<u8> {
    let mut v = s.as_bytes().to_vec();
    v.push(0);
    v
}

fn wstr(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

unsafe fn open_mutex(name: &[u16]) -> Result<HANDLE, String> {
    OpenMutexW(SYNCHRONIZATION_SYNCHRONIZE, false, PCWSTR(name.as_ptr()))
        .map_err(|e| format!("OpenMutex failed: {e}"))
}

unsafe fn open_event(name: &[u16]) -> Result<HANDLE, String> {
    OpenEventW(
        EVENT_MODIFY_STATE | SYNCHRONIZATION_SYNCHRONIZE,
        false,
        PCWSTR(name.as_ptr()),
    )
        .map_err(|e| format!("OpenEvent failed: {e}"))
}

/// A snapshot of the 1888-byte game record.
///
/// **Every offset below is recovered directly from the DLL**, not guessed:
/// each field is written by `fcn.180002220` (scene/user/matching) and
/// `fcn.1800016c0` (in-game / playerResults) / `fcn.180001bd0` (lobby teams)
/// to a fixed absolute address; subtracting the record base `0x180007160`
/// gives the offset. The trailing 32-entry array fills the buffer exactly
/// (`0x60 + 32 * 0x38 == 0x760 == 1888`).
///
/// Header fields (offsets relative to record start):
///
/// | off  | type   | field                        | source class.member |
/// |------|--------|------------------------------|---------------------|
/// | 0x00 | u32    | command/state echo           | —                   |
/// | 0x08 | u64    | userNum                      | UserService._instance.User.UserNum |
/// | 0x10 | str31  | nickname (NUL at 0x2f)       | ...User.Nickname    |
/// | 0x30 | u32    | level                        | ...User.Level       |
/// | 0x34 | u32    | matchingRegion               | GlobalUserData.matchingRegion |
/// | 0x38 | u32    | matchingMode                 | GlobalUserData.matchingMode |
/// | 0x3c | u32    | matchingTeamMode             | GlobalUserData.matchingTeamMode |
/// | 0x40 | u32    | botDifficulty                | GlobalUserData.botDifficulty |
/// | 0x48 | u64    | lastGameId                   | GlobalUserData.lastGameId |
/// | 0x50 | bool   | isLoadingOpen (LoadingView)  | LoadingView.instance.IsOpen |
/// | 0x51 | bool   | isCharacterSelectOpen        | GameLobbyUI.inst.IsOpenCharacterSelectWindow |
/// | 0x52 | bool   | lobbyState                   | LobbyService.inst.LobbyState |
/// | 0x53 | bool   | gamePlayPhase                | ClientService.inst.GamePlayPhase |
/// | 0x54 | bool   | isGameStarted                | ClientService.inst.IsGameStarted |
/// | 0x55 | bool   | isBattleStarted              | ClientService.inst.IsBattleStarted |
/// | 0x56 | bool   | isGameEnd                    | ClientService.inst.IsGameEnd |
/// | 0x57 | bool   | isGameResult                 | LobbyService.inst.isGameResult |
/// | 0x58 | bool   | isReplay                     | ClientService/GlobalUserData.IsReplay |
/// | 0x5c | u32    | entryCount (array length)    | playerResults / matchingAllTeamInfos count |
/// | 0x60 | array  | 32 x Entry (stride 0x38)     | see [`PlayerEntry`] |
use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GameSnapshot {
    // --- header fields -------------------------------------------------------
    /// dword[0] — command/state echo (+0x00).
    pub command: u32,
    /// UserService._instance.User.UserNum (+0x08).
    pub user_num: u64,
    /// Player nickname (+0x10, NUL-terminated, ≤31 bytes).
    pub nickname: String,
    /// UserService._instance.User.Level (+0x30).
    pub level: u32,
    /// GlobalUserData.matchingRegion (+0x34).
    pub matching_region: u32,
    /// GlobalUserData.matchingMode (+0x38).
    pub matching_mode: u32,
    /// GlobalUserData.matchingTeamMode (+0x3c).
    pub matching_team_mode: u32,
    /// GlobalUserData.botDifficulty (+0x40).
    pub bot_difficulty: u32,
    /// GlobalUserData.lastGameId (+0x48).
    pub last_game_id: u64,

    // --- scene / state flags -------------------------------------------------
    /// LoadingView.IsOpen (+0x50).
    pub is_loading_open: bool,
    /// GameLobbyUI.IsOpenCharacterSelectWindow (+0x51).
    pub is_character_select_open: bool,
    /// LobbyService.LobbyState (+0x52).
    pub lobby_state: bool,
    /// ClientService.GamePlayPhase (+0x53).
    pub game_play_phase: bool,
    /// ClientService.IsGameStarted (+0x54).
    pub is_game_started: bool,
    /// ClientService.IsBattleStarted (+0x55).
    pub is_battle_started: bool,
    /// ClientService.IsGameEnd (+0x56).
    pub is_game_end: bool,
    /// LobbyService.isGameResult (+0x57).
    pub is_game_result: bool,
    /// IsReplay (+0x58).
    pub is_replay: bool,
    /// Number of valid entries in the array (+0x5c, capped at 32).
    pub entry_count: usize,

    // --- player entries ------------------------------------------------------
    /// Parsed player entries (up to 32).
    pub raw: Vec<PlayerEntry>,
}

/// One entry of the trailing array (stride 0x38 = 56 bytes). Offsets recovered
/// from the per-element stores in `fcn.1800016c0` (in-game `playerResults`):
/// `rbx-8`=userId, `rbx+0`=teamId, `rbx+4`=characterId, `rbx+8`=weaponId,
/// `rbx+0xc`=rank, name at `+0x18` (31 bytes + NUL at +0x37). In the lobby
/// state `fcn.180001bd0` reuses the same slots for `matchingAllTeamInfos`
/// (userId holds UserNum; rank is set to -1 / 0xffffffff).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerEntry {
    /// entry+0x00 userId (in-game) / UserNum (lobby).
    pub user_id: u64,
    /// entry+0x08 team ID.
    pub team_id: i32,
    /// entry+0x0c character ID（角色ID）.
    pub character_id: i32,
    /// entry+0x10 weapon ID（武器ID）.
    pub weapon_id: i32,
    /// entry+0x14 rank (in-game only; -1 in lobby).
    pub rank: i32,
    /// entry+0x18 name / NickName (31 bytes + NUL).
    pub name: String,
}

/// Offset of the entry array within the record.
const ENTRY_BASE: usize = 0x60;
/// Size of one entry.
const ENTRY_STRIDE: usize = 0x38;
/// Maximum entries the record can hold (DLL caps the loop at this).
pub const MAX_ENTRIES: usize = 32;

impl GameSnapshot {
    /// Parse a 1888-byte shared-memory record into a structured [`GameSnapshot`].
    pub fn from_bytes(bytes: Vec<u8>) -> Self {
        assert_eq!(bytes.len(), DATA_SIZE, "GameSnapshot requires exactly {DATA_SIZE} bytes");

        /// Read a little-endian u32 at the given offset.
        fn rdu32(raw: &[u8], off: usize) -> u32 {
            u32::from_le_bytes(raw[off..off + 4].try_into().unwrap())
        }
        /// Read a little-endian i32 at the given offset.
        fn rdi32(raw: &[u8], off: usize) -> i32 {
            i32::from_le_bytes(raw[off..off + 4].try_into().unwrap())
        }
        /// Read a little-endian u64 at the given offset.
        fn rdu64(raw: &[u8], off: usize) -> u64 {
            u64::from_le_bytes(raw[off..off + 8].try_into().unwrap())
        }
        /// Read a byte as bool at the given offset.
        fn rdbool(raw: &[u8], off: usize) -> bool {
            raw[off] != 0
        }
        /// Read a NUL-terminated string (max `max` bytes) at the given offset.
        fn rdstr(raw: &[u8], off: usize, max: usize) -> String {
            let end = raw[off..]
                .iter()
                .position(|&b| b == 0)
                .unwrap_or(max)
                .min(max);
            String::from_utf8_lossy(&raw[off..off + end]).into_owned()
        }

        let entry_count = (rdu32(&bytes, 0x5c) as usize).min(MAX_ENTRIES);

        let mut raw = Vec::with_capacity(entry_count);
        for i in 0..entry_count {
            let base = ENTRY_BASE + i * ENTRY_STRIDE;
            raw.push(PlayerEntry {
                user_id: rdu64(&bytes, base + 0x00),
                team_id: rdi32(&bytes, base + 0x08),
                character_id: rdi32(&bytes, base + 0x0c),
                weapon_id: rdi32(&bytes, base + 0x10),
                rank: rdi32(&bytes, base + 0x14),
                name: rdstr(&bytes, base + 0x18, 0x1f),
            });
        }

        GameSnapshot {
            command: rdu32(&bytes, 0x00),
            user_num: rdu64(&bytes, 0x08),
            nickname: rdstr(&bytes, 0x10, 0x1f),
            level: rdu32(&bytes, 0x30),
            matching_region: rdu32(&bytes, 0x34),
            matching_mode: rdu32(&bytes, 0x38),
            matching_team_mode: rdu32(&bytes, 0x3c),
            bot_difficulty: rdu32(&bytes, 0x40),
            last_game_id: rdu64(&bytes, 0x48),
            is_loading_open: rdbool(&bytes, 0x50),
            is_character_select_open: rdbool(&bytes, 0x51),
            lobby_state: rdbool(&bytes, 0x52),
            game_play_phase: rdbool(&bytes, 0x53),
            is_game_started: rdbool(&bytes, 0x54),
            is_battle_started: rdbool(&bytes, 0x55),
            is_game_end: rdbool(&bytes, 0x56),
            is_game_result: rdbool(&bytes, 0x57),
            is_replay: rdbool(&bytes, 0x58),
            entry_count,
            raw,
        }
    }
}


