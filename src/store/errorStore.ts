import { atom } from "jotai";

export interface ErrorNotification {
  id: string;
  message: string;
  timestamp: number;
}

export const errorNotificationsAtom = atom<ErrorNotification[]>([]);

export const addErrorNotificationAtom = atom(
  null,
  (get, set, message: string) => {
    const notification: ErrorNotification = {
      id: Math.random().toString(36).substring(2, 11),
      message,
      timestamp: Date.now(),
    };
    set(errorNotificationsAtom, [...get(errorNotificationsAtom), notification]);

    // 5秒后自动移除
    setTimeout(() => {
      set(errorNotificationsAtom, (prev) =>
        prev.filter((n) => n.id !== notification.id)
      );
    }, 5000);
  }
);

export const removeErrorNotificationAtom = atom(
  null,
  (_get, set, id: string) => {
    set(errorNotificationsAtom, (prev) => prev.filter((n) => n.id !== id));
  }
);
