import { useEffect, useMemo, useRef, useState } from 'react';
import { FaBullhorn, FaComments, FaTimes, FaCommentDots } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import {
  getTicketSocket,
  type AdminBroadcastSocketEvent,
  type BroadcastRemovedSocketEvent,
} from '../../../shared/socket/ticketSocket';
import { listMemberBroadcastsApi, type MemberBroadcastRow } from '../api/broadcast.api';
import { colors } from '../../../theme/colors';

/** Oldest first, newest last (chat-style list). */
const sortBroadcastsChrono = (rows: MemberBroadcastRow[]): MemberBroadcastRow[] =>
  [...rows].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (Number.isFinite(tb) && Number.isFinite(ta) && ta !== tb) return ta - tb;
    return a.id - b.id;
  });

const dockStyles = `
@keyframes mbr-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.mbr-fab {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 1059;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #25D366, #128C7E);
  color: white;
  border: none;
  box-shadow: 0 10px 25px rgba(0,0,0,0.25);
}

.mbr-fab-icon {
  animation: mbr-rotate 2.5s linear infinite;
}

.mbr-panel {
  animation: fadeIn 0.2s ease;
}

.mbr-bubble {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}

.mbr-date {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
`;

const MemberBroadcastDock = () => {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MemberBroadcastRow[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* FETCH */
  useEffect(() => {
    if (isLoading || !user?.id || user.is_staff) return;

    (async () => {
      const res = await listMemberBroadcastsApi(100);
      if (res.success && res.data?.items) {
        setItems(sortBroadcastsChrono(res.data.items));
      }
    })();
  }, [user, isLoading]);

  /* SOCKET */
  useEffect(() => {
    if (isLoading || !user?.id || user.is_staff) return;

    const socket = getTicketSocket();

    const onBroadcast = (p: AdminBroadcastSocketEvent) => {
      const id = Number(p.id);
      const message = String(p.message ?? '').trim();
      if (!Number.isFinite(id) || id <= 0 || !message) return;
      setItems((prev) =>
        sortBroadcastsChrono([
          ...prev.filter((x) => x.id !== id),
          {
            id,
            message,
            created_at: p.created_at || new Date().toISOString(),
            is_delete: 0,
          },
        ])
      );
    };

    const onRemoved = (p: BroadcastRemovedSocketEvent) => {
      setItems((prev) => prev.filter((x) => x.id !== Number(p.id)));
    };

    socket.on('admin_broadcast', onBroadcast);
    socket.on('broadcast_removed', onRemoved);

    return () => {
      socket.off('admin_broadcast', onBroadcast);
      socket.off('broadcast_removed', onRemoved);
    };
  }, [user, isLoading]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const messages = useMemo(() => sortBroadcastsChrono(items), [items]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }, [open, messages.length, items]);

  if (isLoading || !user || user.is_staff) return null;

  return (
    <>
      <style>{dockStyles}</style>

      {/* PANEL */}
      {open && (
        <div className="mbr-panel" style={{ position: 'fixed', right: 20, bottom: 92, width: 'min(420px, 92vw)', maxHeight: '70vh', background: '#fff', borderRadius: 18, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1058 }}>
          
          {/* HEADER */}
          <div style={{ background: `linear-gradient(135deg, ${colors.primary}, #4f46e5)`, color: '#fff', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <FaBullhorn />
              <div>
                <div style={{ fontWeight: 600 }}>Broadcasts</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>Updates</div>
              </div>
            </div>

            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 0, color: '#fff' }}>
              <FaTimes />
            </button>
          </div>

          {/* BODY */}
          <div ref={scrollRef} style={{ padding: 12, overflowY: 'auto', flex: 1, background: '#f9fafb' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: 40, color: '#64748b' }}>
                <FaComments size={40} />
                <p>No announcements yet</p>
              </div>
            ) : (
              messages.map((row) => (
                <div key={row.id} style={{ marginBottom: 12 }}>
                  <div className="mbr-bubble">
                    
                    {/* message */}
                    <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.5 }}>
                      {row.message}
                    </div>

                    <div className="mbr-date">
                      <span>{formatDate(row.created_at)}</span>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <button className="mbr-fab" onClick={() => setOpen((v) => !v)}>
        <span className="mbr-fab-icon">
          <FaCommentDots size={26} />
        </span>
      </button>
    </>
  );
};

export default MemberBroadcastDock;