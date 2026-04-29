import type { TicketMessageItem } from '../types/ticket.types';

type Props = {
  msg: TicketMessageItem;
  viewerIsStaff: boolean;
};

const formatDateTime = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const headlineFor = (viewerIsStaff: boolean, msg: TicketMessageItem): string => {
  if (msg.sender_type === 'admin') {
    return `Support${msg.sender_username ? ` (${msg.sender_username})` : ''}`;
  }
  if (viewerIsStaff) {
    return msg.sender_username ? `Customer · @${msg.sender_username}` : 'Customer';
  }
  return 'You';
};

/** WhatsApp-style: “my” messages right, other party left — depends who is viewing. */
const isOutgoingMessage = (viewerIsStaff: boolean, msg: TicketMessageItem): boolean =>
  viewerIsStaff ? msg.sender_type === 'admin' : msg.sender_type === 'user';

export const TicketChatBubble = ({ msg, viewerIsStaff }: Props) => {
  const outgoing = isOutgoingMessage(viewerIsStaff, msg);
  const headline = headlineFor(viewerIsStaff, msg);

  return (
    <div
      className="d-flex w-100"
      style={{ justifyContent: outgoing ? 'flex-end' : 'flex-start' }}
    >
      <div
        className="shadow-sm"
        style={{
          maxWidth: 'min(78%, 420px)',
          padding: '8px 12px 6px',
          borderRadius: outgoing
            ? '12px 12px 4px 12px'
            : '12px 12px 12px 4px',
          /* Outgoing: WhatsApp-style green · Incoming: light tray */
          background: outgoing ? '#dcf8c6' : '#ffffff',
          border: `1px solid ${outgoing ? 'rgba(37, 94, 54, 0.12)' : '#e8e8e8'}`,
          boxShadow: outgoing ? '0 1px 0.5px rgba(0,0,0,0.13)' : '0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="small fw-semibold"
          style={{
            color: outgoing ? '#2d5a27' : '#54656f',
            letterSpacing: '0.01em',
            fontSize: 12,
          }}
        >
          {headline}
        </div>

        {msg.message?.trim() ? (
          <div className="small mt-1" style={{ whiteSpace: 'pre-wrap', color: '#1e293b' }}>
            {msg.message}
          </div>
        ) : null}

        {msg.image ? (
          <a href={msg.image} target="_blank" rel="noreferrer" className="d-inline-block mt-2">
            <img
              src={msg.image}
              alt=""
              style={{
                maxWidth: '100%',
                maxHeight: 220,
                borderRadius: 10,
                display: 'block',
              }}
            />
          </a>
        ) : null}

        <div className="text-muted mt-1" style={{ fontSize: 10 }}>
          {formatDateTime(msg.created_at)}
        </div>
      </div>
    </div>
  );
};
