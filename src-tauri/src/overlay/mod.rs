mod manager;
pub mod window;

pub use manager::OverlayManager;
pub use window::{create_overlay_window, is_overlay_visible, set_overlay_visible, OVERLAY_LABEL};
