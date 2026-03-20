import React from "react";

interface Props {
  onRetry: () => void;
  isChecking: boolean;
}

/** Full-screen overlay when backend is unreachable. Blocks all navigation and interaction. */
const ServerDownOverlay: React.FC<Props> = ({ onRetry, isChecking }) => {

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
        color: "#e8e8ed",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "2rem"
      }}
    >
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
          border: "2px solid rgba(239, 68, 68, 0.4)",
          animation: "pulse 2s ease-in-out infinite"
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(239, 68, 68, 0.9)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
          <line x1="18" y1="6" x2="18.01" y2="6" />
          <line x1="18" y1="18" x2="18.01" y2="18" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: 600,
          margin: 0,
          marginBottom: "0.75rem",
          letterSpacing: "-0.02em"
        }}
      >
        Server is down
      </h1>
      <p
        style={{
          fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)",
          color: "rgba(232, 232, 237, 0.75)",
          margin: 0,
          marginBottom: "2rem",
          maxWidth: "320px",
          textAlign: "center",
          lineHeight: 1.5
        }}
      >
        Please try again later. We'll automatically retry when the server is
        back.
      </p>

      <button
        onClick={onRetry}
        disabled={isChecking}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          fontWeight: 500,
          color: "#fff",
          background:
            isChecking
              ? "rgba(99, 102, 241, 0.5)"
              : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          border: "none",
          borderRadius: "8px",
          cursor: isChecking ? "not-allowed" : "pointer",
          boxShadow:
            "0 4px 14px rgba(99, 102, 241, 0.4)",
          transition: "transform 0.15s ease, opacity 0.15s ease"
        }}
        onMouseOver={(e) => {
          if (!isChecking) {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.opacity = "0.95";
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.opacity = "1";
        }}
      >
        {isChecking ? "Checking…" : "Retry now"}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default ServerDownOverlay;
