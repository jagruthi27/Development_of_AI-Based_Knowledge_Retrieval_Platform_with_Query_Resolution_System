import React, { useState } from 'react';

export default function ChatBubble({ message, onSelectSource }) {
  const { sender, text, sources, timestamp } = message;
  const isUser = sender === 'user';
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div 
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '20px',
        width: '100%',
        maxWidth: '85%',
        alignSelf: isUser ? 'flex-end' : 'flex-start'
      }}
    >
      {/* Sender Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '6px',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        {!isUser && (
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 0 1 8 12.83V19a2 2 0 0 1-2 2h-1.5a1 1 0 0 0-.7.3l-1.5 1.5a1 1 0 0 1-1.4 0l-1.5-1.5a1 1 0 0 0-.7-.3H10a2 2 0 0 1-2-2v-4.17A10 10 0 0 1 12 2z" />
            </svg>
          </div>
        )}
        <span style={{ fontWeight: 600, color: isUser ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {isUser ? 'You' : 'AI Assistant'}
        </span>
        <span>•</span>
        <span>{formatTime(timestamp)}</span>
      </div>

      {/* Bubble Body */}
      <div 
        className={isUser ? '' : 'glass-card'}
        style={{
          padding: '16px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' : 'var(--bg-surface)',
          border: isUser ? 'none' : '1px solid var(--border-color)',
          color: '#fff',
          lineHeight: '1.6',
          fontSize: '0.95rem',
          position: 'relative',
          whiteSpace: 'pre-wrap',
          boxShadow: isUser ? '0 4px 12px hsla(263, 85%, 65%, 0.15)' : 'var(--glass-shadow)',
          width: '100%'
        }}
      >
        {/* Copy Button */}
        <button
          onClick={copyToClipboard}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            opacity: 0.6,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0.6}
          title="Copy to clipboard"
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>

        {/* Message Text */}
        <div style={{ paddingRight: '20px' }}>
          {text}
        </div>

        {/* Sources Attribution Panel */}
        {!isUser && sources && sources.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Sources Used ({sources.length})
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sources.map((source, idx) => (
                <button
                  key={source.id || idx}
                  onClick={() => onSelectSource && onSelectSource(source)}
                  className="badge badge-purple"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease',
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px var(--accent-purple-glow)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {source.fileName}
                  </span>
                  <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>
                    [{source.chunkIndex}]
                  </span>
                  <span style={{
                    marginLeft: '4px',
                    padding: '2px 4px',
                    background: 'hsla(263, 85%, 65%, 0.25)',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    color: 'var(--text-primary)',
                    fontWeight: 'bold'
                  }}>
                    {Math.round(source.score * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
