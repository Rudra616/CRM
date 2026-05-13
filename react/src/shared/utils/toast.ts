import { toast, type Id } from "react-toastify";

export const showSuccess = (msg: string) => toast.success(msg);
export const showError = (msg: string) => toast.error(msg);
export const showInfo = (msg: string) => toast.info(msg);
export const showWarning = (msg: string) => toast.warning(msg);

/** Success toast that runs `onClick` when the user clicks the notification (e.g. deep-link). */
export const showSuccessClickable = (
  msg: string,
  onClick: () => void,
  toastId?: string
): Id => {
  const id = toast.success(msg, {
    ...(toastId ? { toastId } : {}),
    onClick: () => {
      onClick();
      toast.dismiss(id);
    },
    style: { cursor: "pointer" },
    pauseOnHover: true,
  });
  return id;
};