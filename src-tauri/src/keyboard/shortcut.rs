//! 快捷键字符串与 [`rdev::Key`] 之间的双向解析。
//!
//! 约定：
//! - 组合键写作 `Mod1+Mod2+...+Main`，例如 `Ctrl+Shift+O`、`` ` ``、`F1`。
//! - 修饰键顺序在输出时规范化为 `Ctrl → Shift → Alt → Meta`，主键位于末尾。

use rdev::Key;

#[derive(Debug, thiserror::Error)]
pub enum ShortcutError {
    #[error("empty shortcut")]
    Empty,
    #[error("unsupported key: {0}")]
    UnsupportedKey(String),
}

/// 把 `"Ctrl+Shift+O"` 这样的字符串解析为按键列表。
///
/// 修饰键被规范化为左侧变体（`ControlLeft`、`ShiftLeft`、`Alt`、`MetaLeft`）。
pub fn parse_shortcut(input: &str) -> Result<Vec<Key>, ShortcutError> {
    let parts: Vec<&str> = input
        .split('+')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect();

    if parts.is_empty() {
        return Err(ShortcutError::Empty);
    }

    let mut keys = Vec::with_capacity(parts.len());
    for part in parts {
        let key = parse_key(part)
            .ok_or_else(|| ShortcutError::UnsupportedKey(part.to_string()))?;
        keys.push(key);
    }
    Ok(keys)
}

/// 把按键列表规范化为字符串。
pub fn combo_to_string(keys: &[Key]) -> String {
    let mut modifiers: Vec<Key> = Vec::new();
    let mut mains: Vec<Key> = Vec::new();
    for key in keys {
        if is_modifier(*key) {
            modifiers.push(*key);
        } else {
            mains.push(*key);
        }
    }
    modifiers.sort_by_key(|key: &Key| modifier_rank(*key));

    let mut parts: Vec<String> = modifiers
        .iter()
        .chain(mains.iter())
        .copied()
        .map(key_to_string)
        .collect();
    parts.dedup();
    parts.join("+")
}

/// 判断一个键是否属于修饰键。
pub fn is_modifier(key: Key) -> bool {
    matches!(
        key,
        Key::ControlLeft
            | Key::ControlRight
            | Key::ShiftLeft
            | Key::ShiftRight
            | Key::Alt
            | Key::AltGr
            | Key::MetaLeft
            | Key::MetaRight
    )
}

fn modifier_rank(key: Key) -> u8 {
    match key {
        Key::ControlLeft | Key::ControlRight => 0,
        Key::ShiftLeft | Key::ShiftRight => 1,
        Key::Alt | Key::AltGr => 2,
        Key::MetaLeft | Key::MetaRight => 3,
        _ => u8::MAX,
    }
}

fn parse_key(raw: &str) -> Option<Key> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    let upper = trimmed.to_uppercase();

    // 修饰键（Windows 约定：CommandOrControl 视为 Ctrl，Command/Cmd 视为 Meta）
    match upper.as_str() {
        "CTRL" | "CONTROL" | "COMMANDORCONTROL" => return Some(Key::ControlLeft),
        "SHIFT" => return Some(Key::ShiftLeft),
        "ALT" | "OPTION" | "OPT" => return Some(Key::Alt),
        "META" | "WIN" | "WINDOWS" | "SUPER" | "COMMAND" | "CMD" => return Some(Key::MetaLeft),
        _ => {}
    }

    // 单字符：A-Z 或 0-9
    let mut chars = upper.chars();
    if let (Some(c), None) = (chars.next(), chars.next()) {
        if c.is_ascii_alphabetic() {
            return Some(letter_to_key(c)?);
        }
        if c.is_ascii_digit() {
            return Some(digit_to_key(c));
        }
    }

    // 命名键
    Some(match upper.as_str() {
        "SPACE" | "SPC" => Key::Space,
        "ESC" | "ESCAPE" => Key::Escape,
        "TAB" => Key::Tab,
        "ENTER" | "RETURN" => Key::Return,
        "BACKSPACE" | "BACK" => Key::Backspace,
        "BACKQUOTE" | "GRAVE" => Key::BackQuote,
        "`" => Key::BackQuote,
        "MINUS" | "-" => Key::Minus,
        "EQUAL" | "=" => Key::Equal,
        "LEFTBRACKET" | "[" => Key::LeftBracket,
        "RIGHTBRACKET" | "]" => Key::RightBracket,
        "SEMICOLON" | ";" => Key::SemiColon,
        "QUOTE" | "'" => Key::Quote,
        "BACKSLASH" | "\\" => Key::BackSlash,
        "COMMA" | "," => Key::Comma,
        "DOT" | "." => Key::Dot,
        "SLASH" | "/" => Key::Slash,
        "INSERT" => Key::Insert,
        "DELETE" | "DEL" => Key::Delete,
        "HOME" => Key::Home,
        "END" => Key::End,
        "PAGEUP" | "PGUP" => Key::PageUp,
        "PAGEDOWN" | "PGDN" => Key::PageDown,
        "UP" | "UPARROW" => Key::UpArrow,
        "DOWN" | "DOWNARROW" => Key::DownArrow,
        "LEFT" | "LEFTARROW" => Key::LeftArrow,
        "RIGHT" | "RIGHTARROW" => Key::RightArrow,
        "CAPSLOCK" => Key::CapsLock,
        "NUMLOCK" => Key::NumLock,
        "PRINTSCREEN" | "PRTSC" => Key::PrintScreen,
        "SCROLLLOCK" => Key::ScrollLock,
        "PAUSE" => Key::Pause,
        "F1" => Key::F1,
        "F2" => Key::F2,
        "F3" => Key::F3,
        "F4" => Key::F4,
        "F5" => Key::F5,
        "F6" => Key::F6,
        "F7" => Key::F7,
        "F8" => Key::F8,
        "F9" => Key::F9,
        "F10" => Key::F10,
        "F11" => Key::F11,
        "F12" => Key::F12,
        _ => return None,
    })
}

fn letter_to_key(c: char) -> Option<Key> {
    Some(match c {
        'A' => Key::KeyA,
        'B' => Key::KeyB,
        'C' => Key::KeyC,
        'D' => Key::KeyD,
        'E' => Key::KeyE,
        'F' => Key::KeyF,
        'G' => Key::KeyG,
        'H' => Key::KeyH,
        'I' => Key::KeyI,
        'J' => Key::KeyJ,
        'K' => Key::KeyK,
        'L' => Key::KeyL,
        'M' => Key::KeyM,
        'N' => Key::KeyN,
        'O' => Key::KeyO,
        'P' => Key::KeyP,
        'Q' => Key::KeyQ,
        'R' => Key::KeyR,
        'S' => Key::KeyS,
        'T' => Key::KeyT,
        'U' => Key::KeyU,
        'V' => Key::KeyV,
        'W' => Key::KeyW,
        'X' => Key::KeyX,
        'Y' => Key::KeyY,
        'Z' => Key::KeyZ,
        _ => return None,
    })
}

fn digit_to_key(c: char) -> Key {
    match c {
        '0' => Key::Num0,
        '1' => Key::Num1,
        '2' => Key::Num2,
        '3' => Key::Num3,
        '4' => Key::Num4,
        '5' => Key::Num5,
        '6' => Key::Num6,
        '7' => Key::Num7,
        '8' => Key::Num8,
        '9' => Key::Num9,
        _ => unreachable!(),
    }
}

fn key_to_string(key: Key) -> String {
    match key {
        Key::ControlLeft | Key::ControlRight => "Ctrl".to_string(),
        Key::ShiftLeft | Key::ShiftRight => "Shift".to_string(),
        Key::Alt | Key::AltGr => "Alt".to_string(),
        Key::MetaLeft | Key::MetaRight => "Meta".to_string(),
        Key::Space => "Space".to_string(),
        Key::Escape => "Esc".to_string(),
        Key::Tab => "Tab".to_string(),
        Key::Return => "Return".to_string(),
        Key::Backspace => "Backspace".to_string(),
        Key::BackQuote => "`".to_string(),
        Key::Minus => "-".to_string(),
        Key::Equal => "=".to_string(),
        Key::LeftBracket => "[".to_string(),
        Key::RightBracket => "]".to_string(),
        Key::SemiColon => ";".to_string(),
        Key::Quote => "'".to_string(),
        Key::BackSlash => "\\".to_string(),
        Key::Comma => ",".to_string(),
        Key::Dot => ".".to_string(),
        Key::Slash => "/".to_string(),
        Key::Insert => "Insert".to_string(),
        Key::Delete => "Delete".to_string(),
        Key::Home => "Home".to_string(),
        Key::End => "End".to_string(),
        Key::PageUp => "PageUp".to_string(),
        Key::PageDown => "PageDown".to_string(),
        Key::UpArrow => "Up".to_string(),
        Key::DownArrow => "Down".to_string(),
        Key::LeftArrow => "Left".to_string(),
        Key::RightArrow => "Right".to_string(),
        Key::CapsLock => "CapsLock".to_string(),
        Key::NumLock => "NumLock".to_string(),
        Key::PrintScreen => "PrintScreen".to_string(),
        Key::ScrollLock => "ScrollLock".to_string(),
        Key::Pause => "Pause".to_string(),
        Key::F1 => "F1".to_string(),
        Key::F2 => "F2".to_string(),
        Key::F3 => "F3".to_string(),
        Key::F4 => "F4".to_string(),
        Key::F5 => "F5".to_string(),
        Key::F6 => "F6".to_string(),
        Key::F7 => "F7".to_string(),
        Key::F8 => "F8".to_string(),
        Key::F9 => "F9".to_string(),
        Key::F10 => "F10".to_string(),
        Key::F11 => "F11".to_string(),
        Key::F12 => "F12".to_string(),
        Key::KeyA => "A".to_string(),
        Key::KeyB => "B".to_string(),
        Key::KeyC => "C".to_string(),
        Key::KeyD => "D".to_string(),
        Key::KeyE => "E".to_string(),
        Key::KeyF => "F".to_string(),
        Key::KeyG => "G".to_string(),
        Key::KeyH => "H".to_string(),
        Key::KeyI => "I".to_string(),
        Key::KeyJ => "J".to_string(),
        Key::KeyK => "K".to_string(),
        Key::KeyL => "L".to_string(),
        Key::KeyM => "M".to_string(),
        Key::KeyN => "N".to_string(),
        Key::KeyO => "O".to_string(),
        Key::KeyP => "P".to_string(),
        Key::KeyQ => "Q".to_string(),
        Key::KeyR => "R".to_string(),
        Key::KeyS => "S".to_string(),
        Key::KeyT => "T".to_string(),
        Key::KeyU => "U".to_string(),
        Key::KeyV => "V".to_string(),
        Key::KeyW => "W".to_string(),
        Key::KeyX => "X".to_string(),
        Key::KeyY => "Y".to_string(),
        Key::KeyZ => "Z".to_string(),
        Key::Num0 => "0".to_string(),
        Key::Num1 => "1".to_string(),
        Key::Num2 => "2".to_string(),
        Key::Num3 => "3".to_string(),
        Key::Num4 => "4".to_string(),
        Key::Num5 => "5".to_string(),
        Key::Num6 => "6".to_string(),
        Key::Num7 => "7".to_string(),
        Key::Num8 => "8".to_string(),
        Key::Num9 => "9".to_string(),
        other => format!("{:?}", other),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_single_letter() {
        let keys = parse_shortcut("O").unwrap();
        assert_eq!(keys, vec![Key::KeyO]);
    }

    #[test]
    fn parse_combo() {
        let keys = parse_shortcut("Ctrl+Shift+O").unwrap();
        assert_eq!(keys, vec![Key::ControlLeft, Key::ShiftLeft, Key::KeyO]);
    }

    #[test]
    fn parse_backquote() {
        let keys = parse_shortcut("`").unwrap();
        assert_eq!(keys, vec![Key::BackQuote]);
    }

    #[test]
    fn parse_function_key() {
        let keys = parse_shortcut("F5").unwrap();
        assert_eq!(keys, vec![Key::F5]);
    }

    #[test]
    fn parse_empty_errors() {
        assert!(matches!(parse_shortcut(""), Err(ShortcutError::Empty)));
        assert!(matches!(parse_shortcut("   "), Err(ShortcutError::Empty)));
    }

    #[test]
    fn parse_unknown_errors() {
        assert!(parse_shortcut("Foo").is_err());
    }

    #[test]
    fn combo_string_normalizes_modifier_order() {
        let keys = vec![Key::KeyO, Key::ShiftLeft, Key::ControlLeft];
        assert_eq!(combo_to_string(&keys), "Ctrl+Shift+O");
    }

    #[test]
    fn combo_string_dedupes() {
        let keys = vec![Key::ControlLeft, Key::ControlRight, Key::KeyO];
        assert_eq!(combo_to_string(&keys), "Ctrl+O");
    }

    #[test]
    fn roundtrip() {
        let s = "Ctrl+Shift+F1";
        let keys = parse_shortcut(s).unwrap();
        assert_eq!(combo_to_string(&keys), s);
    }
}
