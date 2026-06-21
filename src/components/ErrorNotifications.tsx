import { useAtomValue, useSetAtom } from "jotai";
import { errorNotificationsAtom, removeErrorNotificationAtom } from "../store/errorStore";

export default function ErrorNotifications() {
  const notifications = useAtomValue(errorNotificationsAtom);
  const removeNotification = useSetAtom(removeErrorNotificationAtom);

  if (notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end justify-end gap-2 p-4">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto animate-slide-in-right max-w-md rounded-lg border border-red-300 bg-red-50 px-4 py-3 shadow-lg dark:border-red-900 dark:bg-red-950/90"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-600 dark:text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1 text-sm text-red-800 dark:text-red-200">
              {notification.message}
            </div>
            <button
              type="button"
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              aria-label="关闭"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
