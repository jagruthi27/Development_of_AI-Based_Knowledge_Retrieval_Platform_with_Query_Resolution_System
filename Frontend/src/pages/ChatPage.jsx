import React, { useState, useRef, useEffect } from 'react';
import ChatBubble from '../components/ChatBubble';
import * as api from '../services/api';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am your RAG Chatbot Assistant. Ask me anything about the files in your knowledge base.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [currentSources, setCurrentSources] = useState([]);
  
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    // Clear input
    if (!textToSend) setInputValue('');

    // Append user message
    const userMsg = {
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Get chat history for backend context (excluding avatars etc.)
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await api.sendChatMessage(text, history);

      // ChromaDB returns a distance, not a 0..1 confidence score.
      // Convert it only for the existing UI percentage display.
      const normalizedSources = (response.sources || []).map((source) => {
        const distance = Number(source.distance);
        const score = Number.isFinite(distance)
          ? 1 / (1 + Math.max(distance, 0))
          : 0;

        return { ...source, score };
      });

      const botMsg = {
        sender: 'bot',
        text: response.text,
        sources: normalizedSources,
        timestamp: response.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, botMsg]);
      
      // Update sources panel
      if (normalizedSources.length > 0) {
        setCurrentSources(normalizedSources);
        // Default select the first source to inspect
        setSelectedSource(normalizedSources[0]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "I apologize, but I encountered an error communicating with the RAG indexing service. Please verify if the backend is running.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* const quickPrompts = [
    { label: "Company Policy", text: "What is the hybrid working policy?" },
    { label: "Product Specifications", text: "What are the specs for version 4?" },
    { label: "General Help", text: "How do I upload custom files?" }
  ];
  */

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 0px)', overflow: 'hidden' }}>
      
      {/* Left Pane: Chat Feed */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-color)', position: 'relative' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>AI Assistant</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Retrieval-Augmented Chat Engine</p>
          </div>
          <div>
            <button 
              onClick={() => {
                setMessages([
                  {
                    sender: 'bot',
                    text: "Hello! I am your RAG Chatbot Assistant. Ask me anything about the files in your knowledge base.",
                    timestamp: new Date().toISOString()
                  }
                ]);
                setCurrentSources([]);
                setSelectedSource(null);
              }}
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              Clear Conversation
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column' }}>
          {messages.map((msg, idx) => (
            <ChatBubble 
              key={idx} 
              message={msg} 
              onSelectSource={(source) => {
                setSelectedSource(source);
              }}
            />
          ))}

          {isTyping && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600 }}>AI Assistant</span>
                <span>•</span>
                <span>Thinking...</span>
              </div>
              <div className="glass-card" style={{ padding: '12px 18px', borderRadius: '16px 16px 16px 4px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}

          {/* Empty Space bottom scroll anchor */}
          <div ref={chatEndRef} />
        </div>

        {/* Safe JSX Commenting for Quick Prompt Chips */}
        {/* {messages.length === 1 && (
          <div style={{ padding: '0 32px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {quickPrompts.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.text)}
                className="btn btn-secondary"
                style={{
                  padding: '8px 14px',
                  borderRadius: '99px',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-color)',
                  background: 'hsla(240, 25%, 15%, 0.5)'
                }}
              >
                <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold', marginRight: '6px' }}>{chip.label}:</span>
                {chip.text}
              </button>
            ))}
          </div>
        )} 
        */}

        {/* Input Bar */}
        <div style={{ padding: '24px 32px 32px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface-opaque)' }}>
          <div style={{ display: 'flex', gap: '12px', position: 'relative', alignItems: 'center' }}>
            <textarea
              className="input-text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your uploaded documents..."
              rows="1"
              style={{
                resize: 'none',
                height: '50px',
                paddingTop: '14px',
                paddingRight: '60px',
                lineHeight: '1.4'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping}
              className={`btn btn-primary`}
              style={{
                position: 'absolute',
                right: '6px',
                height: '38px',
                width: '38px',
                borderRadius: '8px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            AI Assistant will search and answer based on your indexed knowledge base documents.
          </div>
        </div>
      </div>

      {/* Right Pane: Source Chunk Inspector */}
      <div style={{ width: '360px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface-opaque)' }}>
        
        {/* Inspector Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Context Inspector</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Semantic matches retrieved from Database</p>
        </div>

        {/* Inspector Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!selectedSource ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>No Source Selected</h4>
              <p style={{ fontSize: '0.75rem' }}>Ask a question first, then click on a source pill to inspect its raw text chunk.</p>
            </div>
          ) : (
            <div className="animate-fade-in" style={{ textAlign: 'left' }}>
              
              {/* Document details card */}
              <div className="glass-card" style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-purple)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-all' }}>
                    {selectedSource.fileName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Chunk Index: <strong>#{selectedSource.chunkIndex}</strong></span>
                  <span>Confidence: <strong style={{ color: 'var(--accent-emerald)' }}>{Math.round(selectedSource.score * 100)}%</strong></span>
                </div>
              </div>

              {/* Chunk Content Preview */}
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Retrieved Context Chunk
              </h4>
              <div 
                className="glass-card" 
                style={{ 
                  padding: '16px', 
                  fontSize: '0.85rem', 
                  lineHeight: '1.5', 
                  fontFamily: 'var(--font-mono)', 
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {selectedSource.content}
              </div>

              {/* All sources retrieved list */}
              {currentSources.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    All Matches ({currentSources.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {currentSources.map((src, idx) => (
                      <div 
                        key={src.id || idx}
                        onClick={() => setSelectedSource(src)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid ' + (selectedSource.id === src.id ? 'var(--accent-purple)' : 'var(--border-color)'),
                          background: selectedSource.id === src.id ? 'hsla(263, 85%, 65%, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                          {src.fileName} <span style={{ color: 'var(--text-muted)' }}>[#{src.chunkIndex}]</span>
                        </span>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-emerald)' }}>
                          {Math.round(src.score * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}