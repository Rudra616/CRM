import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageShell } from '../../../shared/components/PageShell';
import { showError, showInfo, showSuccess } from '../../../shared/utils/toast';
import {
  getTicketSocket,
  type BulkImportFinishedSocketEvent,
} from '../../../shared/socket/ticketSocket';
import { colors } from '../../../theme/colors';
import { BulkImportErrorsModal } from '../components/BulkImportErrorsModal';
import {
  confirmBulkImportByIdApi,
  fetchBulkImportValidationCsvApi,
  listBulkImportsApi,
  openBulkImportFileUrl,
  openBulkImportValidationUrl,
  parseBulkImportValidationCsv,
  validateBulkImportApi,
  type BulkImportListItem,
  type BulkImportRowError,
} from '../api/admin.api';

const ACCEPTED_IMPORT_TYPES = '.csv,.xlsx,.xls';

const statusLabel = (status: string): string => {
  switch (status) {
    case 'processing':
      return 'Processing';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return 'Pending';
  }
};

const statusBadgeClass = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-success';
    case 'processing':
      return 'bg-info text-dark';
    case 'failed':
      return 'bg-danger';
    default:
      return 'bg-warning text-dark';
  }
};

const AdminBulkImportPage = () => {
  const { user, isLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [items, setItems] = useState<BulkImportListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationModalLoading, setValidationModalLoading] = useState(false);
  const [validationModalTitle, setValidationModalTitle] = useState('');
  const [validationModalErrors, setValidationModalErrors] = useState<BulkImportRowError[]>([]);

  const loadImports = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await listBulkImportsApi();
      if (res.success && res.data?.items) {
        setItems(res.data.items);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load imports');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.is_main_admin) return;
    void loadImports();
  }, [user?.is_main_admin, loadImports]);

  useEffect(() => {
    if (!user?.is_main_admin) return;

    const applyFinished = (_payload: BulkImportFinishedSocketEvent) => {
      setConfirmingId(null);
      void loadImports();
    };

    const socket = getTicketSocket();
    socket.on('bulk_import_finished', applyFinished);
    return () => {
      socket.off('bulk_import_finished', applyFinished);
    };
  }, [user?.is_main_admin, loadImports]);

  if (isLoading) {
    return <PageShell title="Bulk Import Users" subtitle="Loading..." loading />;
  }

  if (!user?.is_staff || !user.is_main_admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const onValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || busy) return;

    setBusy(true);
    try {
      const res = await validateBulkImportApi(file);
      if (!res.success || !res.data) {
        showError(res.message || 'Validation failed');
        return;
      }

      const { summary } = res.data;
      if (summary.validationErrors > 0 && summary.valid > 0) {
        showInfo(res.message || 'Validation completed with some errors');
      } else if (summary.validationErrors > 0) {
        showError(res.message || 'Validation failed — fix errors and upload again');
      } else {
        showSuccess(res.message || 'Validation successful');
      }

      setFile(null);
      const input = document.getElementById('bulk-import-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadImports();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setBusy(false);
    }
  };

  /** Pending (or failed retry) rows can be confirmed — server re-validates valid rows. */
  const canImportRow = (row: BulkImportListItem): boolean =>
    (row.status === 'pending' || row.status === 'failed') && confirmingId == null;

  const isRowImported = (row: BulkImportListItem): boolean => row.status === 'completed';

  const onImportRow = async (row: BulkImportListItem) => {
    if (!canImportRow(row)) return;

    if (!window.confirm(`Confirm import for "${row.file_name}"?`)) return;

    setConfirmingId(row.id);
    try {
      const res = await confirmBulkImportByIdApi(row.id);
      if (!res.success || !res.data?.started) {
        showError(res.message || 'Could not start import');
        setConfirmingId(null);
        return;
      }
      showInfo('Import started. You will be notified when it finishes.');
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, status: 'processing' } : item
        )
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not start import');
      setConfirmingId(null);
    }
  };

  const openFileInNewTab = (importId: number) => {
    window.open(openBulkImportFileUrl(importId), '_blank', 'noopener,noreferrer');
  };

  const openValidationInNewTab = (importId: number) => {
    window.open(openBulkImportValidationUrl(importId), '_blank', 'noopener,noreferrer');
  };

  const openValidationInModal = async (row: BulkImportListItem) => {
    setValidationModalOpen(true);
    setValidationModalLoading(true);
    setValidationModalTitle(`Validation errors — ${row.file_name}`);
    setValidationModalErrors([]);

    try {
      const csv = await fetchBulkImportValidationCsvApi(row.id);
      setValidationModalErrors(parseBulkImportValidationCsv(csv));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not load validation file');
      setValidationModalOpen(false);
    } finally {
      setValidationModalLoading(false);
    }
  };

  const closeValidationModal = () => {
    setValidationModalOpen(false);
    setValidationModalErrors([]);
    setValidationModalTitle('');
  };

  const theadStyle = { backgroundColor: colors.cardPrimaryBg };

  return (
    <PageShell
      title="Bulk Import Users"
      subtitle="Upload CSV → validate → import each file from the table below."
      flush
    >
      <div className="p-3 p-md-4">
        <form onSubmit={onValidate} className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <label htmlFor="bulk-import-file" className="form-label fw-semibold">
              Import file
            </label>
            <input
              id="bulk-import-file"
              type="file"
              className="form-control"
              accept={ACCEPTED_IMPORT_TYPES}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="form-text">
              CSV, XLSX, or XLS (max 50 MB). After validation the file appears in the table below.
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="submit" className="btn btn-primary" disabled={!file || busy}>
                {busy ? 'Validating...' : 'Validate file'}
              </button>
            </div>
          </div>
        </form>

        <div className="card shadow-sm border-0">
          <div className="card-header">
            <div className="fw-semibold">Import history</div>
            <p className="text-muted small mb-0 mt-1">
              For a <strong>Pending</strong> row, click <strong>Confirm import</strong> in Action to
              save users to the database. After import completes, the row shows Imported and cannot
              be run again.
            </p>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered table-striped align-middle mb-0">
              <thead style={theadStyle}>
                <tr className="fw-semibold small" style={{ color: colors.primary }}>
                  <th>#</th>
                  <th>File name</th>
                  <th>Path</th>
                  <th>Validation</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Loading imports…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      No imports yet. Upload and validate a file above.
                    </td>
                  </tr>
                ) : (
                  items.map((row, index) => {
                    const showImport = canImportRow(row);
                    const isRowBusy = confirmingId === row.id || row.status === 'processing';

                    return (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td className="text-break">{row.file_name}</td>
                        <td className="small text-break">
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-start text-break"
                            onClick={() => openFileInNewTab(row.id)}
                          >
                            {row.file_path}
                          </button>
                        </td>
                        <td>
                          {row.validation_file_path ? (
                            <div className="d-flex flex-wrap gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openValidationInNewTab(row.id)}
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => void openValidationInModal(row)}
                              >
                                View
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge text-capitalize ${statusBadgeClass(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td>
                          {isRowImported(row) ? (
                            <span className="text-muted small">Imported</span>
                          ) : row.status === 'processing' || confirmingId === row.id ? (
                            <span className="text-muted small d-inline-flex align-items-center gap-1">
                              <span className="spinner-border spinner-border-sm text-primary" />
                              Importing…
                            </span>
                          ) : showImport ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={isRowBusy}
                              onClick={() => void onImportRow(row)}
                              title={
                                row.valid_rows > 0
                                  ? `Import ${row.valid_rows} ready row(s)`
                                  : 'Server will check valid rows on confirm'
                              }
                            >
                              Confirm import
                            </button>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {validationModalLoading ? (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status" />
                <p className="text-muted small mb-0">Loading validation errors…</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <BulkImportErrorsModal
          open={validationModalOpen}
          errors={validationModalErrors}
          title={validationModalTitle}
          onClose={closeValidationModal}
        />
      )}
    </PageShell>
  );
};

export default AdminBulkImportPage;
