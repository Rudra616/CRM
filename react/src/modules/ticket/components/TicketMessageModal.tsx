import { useEffect, useMemo } from 'react';
import type { TicketItem, TicketMessageItem } from '../types/ticket.types';
import { TicketChatBubble } from './TicketChatBubble';
import { TicketChatComposer } from './TicketChatComposer';

type Props = {
  open: boolean;
  ticket: TicketItem | null;
  messages: TicketMessageItem[];
  loading: boolean;
  canReply: boolean;
  /** Staff ticket queue vs member “my tickets” — affects labels (Customer vs You). */
  viewerIsStaff: boolean;
  onClose: () => void;
  onSend: (message: string, image?: File | null) => Promise<void>;
};

export const TicketMessageModal = ({
  open,
  ticket,
  messages,
  loading,
  canReply,
  viewerIsStaff,
  onClose,
  onSend,
}: Props) => {
  const title = useMemo(() => {
    if (!ticket) return 'Ticket conversation';
    return `#${ticket.id} · ${ticket.subject}`;
  }, [ticket]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        zIndex: 1200,
        padding: 16,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card shadow-lg border-0 d-flex flex-column overflow-hidden"
        style={{
          width: 'min(720px, 100%)',
          maxHeight: '92vh',
          borderRadius: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="d-flex justify-content-between align-items-center text-white px-3 py-3"
          style={{
            background: 'linear-gradient(120deg, #1e3a5f 0%, #0f766e 100%)',
          }}
        >
          <div>
                <div className="small mb-0" style={{ opacity: 0.85 }}>
                  Ticket thread
                </div>
            <strong className="d-block" style={{ fontSize: '0.95rem' }}>
              {title}
            </strong>
          </div>
          <button type="button" className="btn btn-sm btn-light" onClick={onClose}>
            Close
          </button>
        </div>

        <div
          className="flex-grow-1 d-flex flex-column"
          style={{ minHeight: 0, background: '#f1f5f9' }}
        >
          {ticket && (
            <div className="px-3 pt-3">
              <div
                className="rounded-3 p-3 bg-white border"
                style={{ borderColor: '#e2e8f0' }}
              >
                <div className="small fw-semibold text-secondary text-uppercase" style={{ fontSize: 10 }}>
                  Original request
                </div>
                <div className="fw-semibold small mt-1">{ticket.subject}</div>
                <div className="small text-muted mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </div>
              </div>
            </div>
          )}

          <div
            className="flex-grow-1 px-3 py-2"
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minHeight: 220,
            }}
          >
            {loading ? (
              <p className="small text-muted mb-0 align-self-center my-auto">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="small text-muted mb-0 align-self-center my-auto">
                No messages yet — say hello below.
              </p>
            ) : (
              messages.map((msg) => (
                <TicketChatBubble key={msg.id} msg={msg} viewerIsStaff={viewerIsStaff} />
              ))
            )}
          </div>

          {canReply ? (
            <TicketChatComposer
              key={ticket?.id ?? 'new'}
              onSend={(text, image) => onSend(text, image)}
            />
          ) : (
            <div className="border-top bg-light px-3 py-2 small text-muted text-center">
              Replying is disabled for this view.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
