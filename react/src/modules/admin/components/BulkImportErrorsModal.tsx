import type { BulkImportRowError } from '../api/admin.api';

type Props = {
  open: boolean;
  errors: BulkImportRowError[];
  onClose: () => void;
  title?: string;
};

export const BulkImportErrorsModal = ({ open, errors, onClose, title }: Props) => {
  if (!open) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title ?? `Import errors (${errors.length})`}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {errors.length === 0 ? (
              <p className="text-muted small mb-0">No errors.</p>
            ) : (
              <ul className="list-group list-group-flush">
                {errors.map((entry, idx) => (
                  <li
                    key={`${entry.row}-${idx}`}
                    className="list-group-item small text-danger"
                  >
                    <strong>#{entry.row}:</strong> {entry.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
