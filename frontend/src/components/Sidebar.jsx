import React from 'react';
import robotLogo from '../assets/hero.jpg'; // Going up one level to find the assets folder

export default function Sidebar({ activeTab, setActiveTab, mockMode }) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          overflow: 'hidden', // Ensures the image corners fit perfectly inside the rounded border
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px var(--accent-purple-glow)',
          background: 'var(--bg-card)'
        }}>
          {/* Rendering the image from hero.jpg as the logo */}
          <img 
            src={robotLogo} 
            alt="RAG Robot Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        </div>
        <div className="logo-text">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            QueryNest
          </h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '-2px' }}>
            KNOWLEDGE BASE CONSOLE
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <button
          onClick={() => setActiveTab('upload')}
          className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            justifyContent: 'flex-start',
            width: '100%',
            padding: '12px 16px',
            border: activeTab === 'upload' ? 'none' : '1px solid var(--border-color)',
            background: activeTab === 'upload' ? undefined : 'transparent'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <span className="nav-label" style={{ marginLeft: '8px' }}>Upload Documents</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            justifyContent: 'flex-start',
            width: '100%',
            padding: '12px 16px',
            border: activeTab === 'chat' ? 'none' : '1px solid var(--border-color)',
            background: activeTab === 'chat' ? undefined : 'transparent'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="nav-label" style={{ marginLeft: '8px' }}>AI Chatbot</span>
        </button>
      </nav>

      {/* Mode / Status Panel */}
      {/*<div className="glass-card" style={{ padding: '12px', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
        ...
      </div>*/}

      {/* Footer Info */}
      <div className="sidebar-footer-text" style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        RAG Workspace v1.0.0
      </div>
    </aside>
  );
}