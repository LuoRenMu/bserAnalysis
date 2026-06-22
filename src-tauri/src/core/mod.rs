pub mod dll;
pub mod ipc;
pub mod plugin_state;
pub const DATA_SIZE: usize = 0x760; // 1888 bytes — the shared record size

/// Command/state values written to byte 0 of the record before signalling.
/// Derived from the DLL's `api_*` thunks.
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
