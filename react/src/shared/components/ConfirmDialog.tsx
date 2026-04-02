import type { ReactNode } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!open) return null;

  return (
    <div
      className="fade show"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,16,29,0.55)',
        backdropFilter: 'blur(2px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              disabled={loading}
              onClick={onCancel}
            />
          </div>
          <div className="modal-body">
            {typeof message === 'string' ? <p className="mb-0">{message}</p> : message}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" disabled={loading} onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

