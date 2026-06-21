import { trace, debug, info, warn, error } from "@tauri-apps/plugin-log";

type ConsoleMethod = "log" | "debug" | "info" | "warn" | "error";

function format(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.stack ?? arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

/**
 * 把前端 console.* 转发给 tauri-plugin-log，使前后端日志落到同一个文件。
 * 仅在 Tauri 运行时生效（普通浏览器里不转发，避免无意义的 IPC 调用）。
 */
export function initLogForwarding(): void {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;

  const sinks: Record<ConsoleMethod, (message: string) => Promise<void>> = {
    log: trace,
    debug,
    info,
    warn,
    error,
  };

  (Object.keys(sinks) as ConsoleMethod[]).forEach((name) => {
    const original = console[name].bind(console) as (...args: unknown[]) => void;
    console[name] = (...args: unknown[]) => {
      original(...args);
      void sinks[name](format(args)).catch(() => {
        /* 转发失败不应影响正常的 console 输出 */
      });
    };
  });
}
