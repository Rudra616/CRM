import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PageShell } from '../../../shared/components/PageShell';
import {
  createBroadcastApi,
  deleteBroadcastApi,
  listBroadcastsApi,
  type BroadcastItem,
} from '../api/admin.api';
import { showError, showSuccess } from '../../../shared/utils/toast';
import { FaPaperPlane, FaTrash } from 'react-icons/fa';
import { ListTableToolbar } from '../../../shared/components/ListTableToolbar';

const sortBroadcastsChrono = (rows: BroadcastItem[]): BroadcastItem[] =>
  [...rows].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (Number.isFinite(tb) && Number.isFinite(ta) && ta !== tb) return ta - tb;
    return a.id - b.id;
  });

const AdminBroadcastPage = () => {
  const { user, isLoading } = useAuth();
  const isOwner = Boolean(user?.is_staff && user?.is_main_admin);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const rowsPerPage = 10;
  const pageSizeOptions = [10];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBroadcastsApi(100);
      if (res.success && res.data?.items) setItems(sortBroadcastsChrono(res.data.items));
      else showError(res.message || 'Failed to load broadcasts');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isOwner) {
      setLoading(false);
      return;
    }
    void load();
  }, [isLoading, isOwner, load]);

  if (isLoading) {
    return <PageShell title="Broadcast messages" subtitle="Loading…" loading />;
  }

  if (!user?.is_staff || !user.is_main_admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await createBroadcastApi({ message: text });
      if (res.success && res.data) {
        setMessage('');
        setItems((prev) => {
          const row: BroadcastItem = {
            id: res.data!.id,
            message: res.data!.message,
            is_delete: 0,
            created_at: res.data!.created_at,
          };
          return sortBroadcastsChrono([...prev.filter((r) => r.id !== row.id), row]);
        });
        showSuccess('Broadcast sent');
      } else {
        showError(res.message || 'Send failed');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this message for all users?')) return;
    try {
      const res = await deleteBroadcastApi(id);
      if (res.success) {
        setItems((prev) => prev.filter((r) => r.id !== id));
        showSuccess('Deleted');
      } else {
        showError(res.message || 'Delete failed');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const filteredItems = items.filter((row) => {
    const q = appliedSearchTerm.trim().toLowerCase();
    if (!q) return true;
    return row.message.toLowerCase().includes(q) || String(row.id).includes(q);
  });

  return (
    <PageShell
      title="Broadcast messages"
      subtitle="Send a site-wide message to members. They see it in the floating panel (read-only). Subadmins do not receive this list."
      loading={loading}
    >
      <form onSubmit={onSend} className="card shadow-sm border-0 mb-4" style={{ borderLeft: '5px solid #0d6efd' }}>
        <div className="card-body">
          <label htmlFor="broadcast-body" className="form-label fw-semibold">
            New message
          </label>
          <textarea
            id="broadcast-body"
            className="form-control"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your announcement…"
            maxLength={8000}
          />
          <div className="d-flex justify-content-end mt-3">
            <button type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
              <span className="d-inline-flex align-items-center gap-1">
                <FaPaperPlane size={12} aria-hidden />
                {sending ? 'Sending…' : 'Send broadcast'}
              </span>
            </button>
          </div>
        </div>
      </form>

      <div className="card shadow-sm border-0">
        <div className="card-header fw-semibold">Recent broadcasts</div>
        <div className="px-3 pt-3 pb-1">
          <ListTableToolbar
            rowsPerPage={rowsPerPage}
            pageSizeOptions={pageSizeOptions}
            totalRows={filteredItems.length}
            searchTerm={searchTerm}
            searchPlaceholder="Message text or id..."
            searchId="broadcast-search"
            onRowsPerPageChange={() => undefined}
            onSearchTermChange={setSearchTerm}
            onApplySearch={() => setAppliedSearchTerm(searchTerm.trim())}
            onClearSearch={() => {
              setSearchTerm('');
              setAppliedSearchTerm('');
            }}
          />
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Sent</th>
                <th>Message</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted small px-3 py-4">
                    No broadcasts yet.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.id}>
                    <td className="small text-muted text-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="small text-break" style={{ whiteSpace: 'pre-wrap' }}>
                      {row.message}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => void onDelete(row.id)}
                        title="Delete broadcast"
                        aria-label="Delete broadcast"
                      >
                        <FaTrash size={13} aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
};

export default AdminBroadcastPage;
