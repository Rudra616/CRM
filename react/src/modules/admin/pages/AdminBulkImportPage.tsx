import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageShell } from '../../../shared/components/PageShell';
import { showError, showSuccess } from '../../../shared/utils/toast';
import {
  bulkImportUsersApi,
  type BulkImportFailureRow,
  type BulkImportResult,
} from '../api/admin.api';

const ACCEPTED_IMPORT_TYPES = '.csv,.xlsx,.xls';

type ImportFeedback = {
  message: string;
  variant: 'success' | 'warning' | 'danger';
};

const AdminBulkImportPage = () => {
  const { user, isLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [feedback, setFeedback] = useState<ImportFeedback | null>(null);

  if (isLoading) {
    return <PageShell title="Bulk Import Users" subtitle="Loading..." loading />;
  }

  if (!user?.is_staff || !user.is_main_admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) {
      return;
    }

    setUploading(true);
    setResult(null);
    setFeedback(null);
    try {
      const res = await bulkImportUsersApi(file);
      if (res.success && res.data) {
        const { imported, failed } = res.data;
        const message = res.message || 'Bulk import completed';
        const variant: ImportFeedback['variant'] =
          failed > 0 && imported > 0 ? 'warning' : failed > 0 ? 'danger' : 'success';

        setResult(res.data);
        setFeedback({ message, variant });
        showSuccess(message);
      } else {
        const message = res.message || 'Bulk import failed';
        setFeedback({ message, variant: 'danger' });
        showError(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bulk import failed';
      setFeedback({ message, variant: 'danger' });
      showError(message);
    } finally {
      setUploading(false);
    }
  };

  const failures: BulkImportFailureRow[] = result?.errors ?? [];

  return (
    <PageShell
      title="Bulk Import Users"
      subtitle="Upload a CSV/XLSX file to create or update users in one step."
    >
      <div className="p-3 p-md-4">
        <form onSubmit={onSubmit} className="card shadow-sm border-0 mb-4">
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
              Allowed formats: CSV, XLSX, XLS. Field name must be <code>file</code>.
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!file || uploading}
              >
                {uploading ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </form>

        {feedback ? (
          <div
            className={`alert alert-${feedback.variant} mb-4`}
            role="status"
          >
            {feedback.message}
          </div>
        ) : null}

        {result ? (
          <div className="card shadow-sm border-0">
            <div className="card-header fw-semibold">Import summary</div>
            <div className="card-body">
              <div className="d-flex gap-3 flex-wrap mb-3">
                <span className="badge bg-success">Imported: {result.imported}</span>
                <span className="badge bg-danger">Failed: {result.failed}</span>
              </div>

              {failures.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}>Row</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failures.map((entry, idx) => (
                        <tr key={`${entry.row}-${idx}`}>
                          <td>{entry.row}</td>
                          <td>{entry.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small mb-0">No row-level errors.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
};

export default AdminBulkImportPage;
