import { atom } from "jotai";

export interface ErrorNotification {
  id: string;
  message: string;
  timestamp: number;
}

export interface SuccessNotification {
  id: string;
  message: string;
  timestamp: number;
}

export const errorNotificationsAtom = atom<ErrorNotification[]>([]);
export const successNotificationsAtom = atom<SuccessNotification[]>([]);

export const addErrorNotificationAtom = atom(
  null,
  (get, set, message: string) => {
    // 去重：相同消息已存在则不重复添加
    const existing = get(errorNotificationsAtom);
    if (existing.some((n) => n.message === message)) return;

    const notification: ErrorNotification = {
      id: Math.random().toString(36).substring(2, 11),
      message,
      timestamp: Date.now(),
    };
    set(errorNotificationsAtom, [...existing, notification]);

    // 5秒后自动移除
    setTimeout(() => {
      set(errorNotificationsAtom, (prev) =>
        prev.filter((n) => n.id !== notification.id)
      );
    }, 5000);
  }
);

export const addSuccessNotificationAtom = atom(
  null,
  (get, set, message: string) => {
    const notification: SuccessNotification = {
      id: Math.random().toString(36).substring(2, 11),
      message,
      timestamp: Date.now(),
    };
    set(successNotificationsAtom, [...get(successNotificationsAtom), notification]);

    // 3秒后自动移除
    setTimeout(() => {
      set(successNotificationsAtom, (prev) =>
        prev.filter((n) => n.id !== notification.id)
      );
    }, 3000);
  }
);

export const removeErrorNotificationAtom = atom(
  null,
  (_get, set, id: string) => {
    set(errorNotificationsAtom, (prev) => prev.filter((n) => n.id !== id));
  }
);

export const removeSuccessNotificationAtom = atom(
  null,
  (_get, set, id: string) => {
    set(successNotificationsAtom, (prev) => prev.filter((n) => n.id !== id));
  }
);
