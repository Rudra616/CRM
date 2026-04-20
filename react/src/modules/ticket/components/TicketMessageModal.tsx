import { useEffect, useMemo, useState } from 'react';
import type { TicketItem, TicketMessageItem } from '../types/ticket.types';

type Props = {
  open: boolean;
  ticket: TicketItem | null;
  messages: TicketMessageItem[];
  loading: boolean;
  canReply: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
};

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const TicketMessageModal = ({
  open,
  ticket,
  messages,
  loading,
  canReply,
  onClose,
  onSend,
}: Props) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) setDraft('');
  }, [open]);

  const title = useMemo(() => {
    if (!ticket) return 'Ticket Messages';
    return `Ticket #${ticket.id} - ${ticket.subject}`;
  }, [ticket]);

  if (!open) return null;

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    try {
      setSending(true);
      await onSend(text);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card shadow-sm"
        style={{ width: 'min(860px, 100%)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong className="small">{title}</strong>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="card-body d-flex flex-column gap-3" style={{ overflowY: 'auto' }}>
          {ticket && (
            <div className="border rounded p-2 bg-light">
              <div className="small fw-semibold">{ticket.subject}</div>
              <div className="small text-muted">{ticket.description}</div>
              {ticket.image_url ? (
                <img
                  src={ticket.image_url}
                  alt="Ticket attachment"
                  className="mt-2 rounded border"
                  style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>
          )}

          {loading ? (
            <p className="small text-muted mb-0">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="small text-muted mb-0">No messages yet.</p>
          ) : (
            <div className="d-flex flex-column gap-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded border ${msg.sender_type === 'admin' ? 'bg-light' : ''}`}
                >
                  <div className="d-flex justify-content-between small">
                    <span className="fw-semibold">
                      {msg.sender_type === 'admin' ? 'Support/Admin' : 'User'}
                      {msg.sender_username ? ` (${msg.sender_username})` : ''}
                    </span>
                    <span className="text-muted">{formatDateTime(msg.created_at)}</span>
                  </div>
                  <div className="small mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {canReply ? (
          <div className="card-footer">
            <div className="d-flex gap-2">
              <textarea
                className="form-control form-control-sm"
                rows={3}
                placeholder="Write a message..."
                value={draft}
                maxLength={2000}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm align-self-end"
                disabled={sending || draft.trim().length === 0}
                onClick={() => void submit()}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

