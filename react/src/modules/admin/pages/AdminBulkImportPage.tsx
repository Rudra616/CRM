import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageShell } from '../../../shared/components/PageShell';
import { showError, showInfo, showSuccess } from '../../../shared/utils/toast';
import {
  getTicketSocket,
  type BulkImportFinishedSocketEvent,
} from '../../../shared/socket/ticketSocket';
import { BulkImportErrorsModal } from '../components/BulkImportErrorsModal';
import {
  confirmBulkImportApi,
  validateBulkImportApi,
  type BulkImportConfirmResult,
  type BulkImportPendingRow,
  type BulkImportRowError,
  type BulkImportValidateResult,
} from '../api/admin.api';

const ACCEPTED_IMPORT_TYPES = '.csv,.xlsx,.xls';

type Step = 'upload' | 'review' | 'importing' | 'done';

type ImportFeedback = {
  message: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
};

const AdminBulkImportPage = () => {
  const { user, isLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('upload');
  const [busy, setBusy] = useState(false);
  const [pendingRows, setPendingRows] = useState<BulkImportPendingRow[]>([]);
  const [validateResult, setValidateResult] = useState<BulkImportValidateResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<BulkImportConfirmResult | null>(null);
  const [feedback, setFeedback] = useState<ImportFeedback | null>(null);
  const [errorsModalOpen, setErrorsModalOpen] = useState(false);
  const [errorsModalSource, setErrorsModalSource] = useState<'validation' | 'confirm'>(
    'validation'
  );

  useEffect(() => {
    if (!user?.is_main_admin) return;

    const applyFinished = (payload: BulkImportFinishedSocketEvent) => {
      setConfirmResult({
        submitted: payload.submitted,
        inserted: payload.inserted,
        updated: payload.updated,
        imported: payload.imported,
        notImported: payload.notImported,
        errors: [],
      });
      setStep('done');
      setBusy(false);
      setFeedback({
        message: payload.message,
        variant: payload.success ? 'success' : 'danger',
      });
      if (payload.success) {
        showSuccess(payload.message);
      } else {
        showError(payload.message);
      }
    };

    const socket = getTicketSocket();
    socket.on('bulk_import_finished', applyFinished);
    return () => {
      socket.off('bulk_import_finished', applyFinished);
    };
  }, [user?.is_main_admin]);

  if (isLoading) {
    return <PageShell title="Bulk Import Users" subtitle="Loading..." loading />;
  }

  if (!user?.is_staff || !user.is_main_admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const resetAll = () => {
    setFile(null);
    setStep('upload');
    setPendingRows([]);
    setValidateResult(null);
    setConfirmResult(null);
    setFeedback(null);
    setErrorsModalOpen(false);
    const input = document.getElementById('bulk-import-file') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const onValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || busy) return;

    setBusy(true);
    setValidateResult(null);
    setConfirmResult(null);
    setFeedback(null);
    setPendingRows([]);

    try {
      const res = await validateBulkImportApi(file);
      if (!res.success || !res.data) {
        const message = res.message || 'Validation failed';
        setFeedback({ message, variant: 'danger' });
        showError(message);
        return;
      }

      const data = res.data;
      setValidateResult(data);
      setPendingRows(data.rows);
      setStep('review');

      const { validationErrors, valid } = data.summary;
      const message = res.message || 'Validation complete';
      const variant: ImportFeedback['variant'] =
        validationErrors > 0 && valid > 0
          ? 'warning'
          : validationErrors > 0
            ? 'danger'
            : 'success';

      setFeedback({ message, variant });
      if (valid > 0) {
        showSuccess(message);
      } else {
        showError(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setFeedback({ message, variant: 'danger' });
      showError(message);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = () => {
    if (!validateResult || pendingRows.length === 0 || busy || step === 'importing') return;

    const message =
      'Import started. Processing in the background — you will be notified when it finishes.';
    setStep('importing');
    setBusy(false);
    setFeedback({ message, variant: 'info' });
    showInfo(message);

    void confirmBulkImportApi(pendingRows, validateResult.summary)
      .then((res) => {
        if (!res.success || !res.data?.started) {
          const errMsg = res.message || 'Could not start import';
          setStep('review');
          setFeedback({ message: errMsg, variant: 'danger' });
          showError(errMsg);
        }
      })
      .catch((err) => {
        const errMsg = err instanceof Error ? err.message : 'Could not start import';
        setStep('review');
        setFeedback({ message: errMsg, variant: 'danger' });
        showError(errMsg);
      });
  };

  const validationErrors: BulkImportRowError[] = validateResult?.errors ?? [];
  const canConfirm = pendingRows.length > 0 && step === 'review';

  return (
    <PageShell
      title="Bulk Import Users"
      subtitle="Validate file (sheet only) → review errors → confirm to save (DB check runs on confirm)."
    >
      <div className="p-3 p-md-4">
        {step === 'upload' ? (
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
                CSV, XLSX, or XLS (max 50 MB). Required columns match the template. Cancel clears
                validation without touching the database.
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!file || busy}
                >
                  {busy ? 'Validating...' : 'Validate file'}
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {feedback ? (
          <div className={`alert alert-${feedback.variant} mb-4`} role="status">
            {feedback.message}
          </div>
        ) : null}

        {step === 'importing' ? (
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status" />
              <p className="mb-0 fw-semibold">Import in progress…</p>
              <p className="text-muted small mb-0">
                Processing {pendingRows.length} row(s). You can use other pages — a toast will appear when
                the import finishes.
              </p>
            </div>
          </div>
        ) : null}

        {step === 'review' && validateResult ? (
          <>
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header fw-semibold d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span>Review import</span>
                <div className="d-flex gap-2 flex-wrap">
                  {validationErrors.length > 0 ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => {
                        setErrorsModalSource('validation');
                        setErrorsModalOpen(true);
                      }}
                    >
                      View errors ({validateResult.summary.validationErrors})
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetAll}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={!canConfirm}
                    onClick={onConfirm}
                  >
                    Confirm import
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="d-flex gap-2 flex-wrap mb-3">
                  <span className="badge bg-secondary">Total: {validateResult.summary.total}</span>
                  <span className="badge bg-success">Ready: {validateResult.summary.valid}</span>
                  <span className="badge bg-danger">
                    Skipped (validation): {validateResult.summary.validationErrors}
                  </span>
                </div>

                {validationErrors.length === 0 ? (
                  <p className="text-muted small mb-0">No validation errors. You can confirm the import.</p>
                ) : (
                  <p className="text-muted small mb-0">
                    {validateResult.summary.validationErrors} row(s) have errors. Use &quot;View errors&quot; to
                    see details, or fix the file and validate again.
                  </p>
                )}

                {pendingRows.length === 0 ? (
                  <p className="text-muted small mb-0 mt-2">
                    No valid rows to import. Fix errors and validate again.
                  </p>
                ) : null}
              </div>
            </div>

            <BulkImportErrorsModal
              open={errorsModalOpen && errorsModalSource === 'validation'}
              errors={validationErrors}
              title={`Validation errors (${validateResult.summary.validationErrors})`}
              onClose={() => setErrorsModalOpen(false)}
            />
          </>
        ) : null}

        {step === 'done' && confirmResult ? (
          <div className="card shadow-sm border-0">
            <div className="card-header fw-semibold">Import complete</div>
            <div className="card-body">
              <p className="mb-3">
                {validateResult ? (
                  <>
                    <strong>{validateResult.summary.total}</strong> rows in file —{' '}
                    <strong>{validateResult.summary.validationErrors}</strong> skipped at validation,{' '}
                  </>
                ) : null}
                <strong>{confirmResult.imported}</strong> saved to database (
                <strong>{confirmResult.inserted}</strong> inserted,{' '}
                <strong>{confirmResult.updated}</strong> updated).
                {confirmResult.notImported > 0 ? (
                  <>
                    {' '}
                    <strong>{confirmResult.notImported}</strong> failed on confirm.
                  </>
                ) : null}
              </p>
              <div className="d-flex gap-2 flex-wrap mb-3">
                {validateResult ? (
                  <>
                    <span className="badge bg-secondary">
                      Total in file: {validateResult.summary.total}
                    </span>
                    <span className="badge bg-warning text-dark">
                      Skipped (validation): {validateResult.summary.validationErrors}
                    </span>
                  </>
                ) : null}
                <span className="badge bg-info text-dark">
                  Submitted: {confirmResult.submitted}
                </span>
                <span className="badge bg-success">Inserted: {confirmResult.inserted}</span>
                <span className="badge bg-primary">Updated: {confirmResult.updated}</span>
                <span className="badge bg-success">Imported: {confirmResult.imported}</span>
                <span className="badge bg-danger">
                  Not imported (confirm): {confirmResult.notImported}
                </span>
              </div>
              {validateResult && validateResult.summary.validationErrors > 0 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning mb-2 me-2"
                  onClick={() => {
                    setErrorsModalSource('validation');
                    setErrorsModalOpen(true);
                  }}
                >
                  View validation errors ({validateResult.summary.validationErrors} rows)
                </button>
              ) : null}
              {confirmResult.errors.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger mb-3"
                  onClick={() => {
                    setErrorsModalSource('confirm');
                    setErrorsModalOpen(true);
                  }}
                >
                  View confirm failures ({confirmResult.notImported})
                </button>
              ) : null}
              <div>
                <button type="button" className="btn btn-primary" onClick={resetAll}>
                  Import another file
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 'done' ? (
          <BulkImportErrorsModal
            open={errorsModalOpen}
            errors={
              errorsModalSource === 'confirm'
                ? (confirmResult?.errors ?? [])
                : (validateResult?.errors ?? [])
            }
            title={
              errorsModalSource === 'confirm'
                ? `Not imported on confirm (${confirmResult?.notImported ?? 0})`
                : `Skipped at validation (${validateResult?.summary.validationErrors ?? 0} rows)`
            }
            onClose={() => setErrorsModalOpen(false)}
          />
        ) : null}
      </div>
    </PageShell>
  );
};

export default AdminBulkImportPage;
