import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import UploadPage from './pages/UploadPage';
import ChatPage from './pages/ChatPage';
import * as api from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'chat'
  const [mockMode, setMockMode] = useState(api.getMockMode());

  // Periodically check if API falls back to mock mode or has connection state
  useEffect(() => {
    const checkMode = () => {
      setMockMode(api.getMockMode());
    };
    const interval = setInterval(checkMode, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="main-app">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mockMode={mockMode}
      />

      {/* Main Content Pane */}
      <main className="main-content">
        {activeTab === 'upload' ? (
          <UploadPage onStartChat={() => setActiveTab('chat')} />
        ) : (
          <ChatPage />
        )}
      </main>
    </div>
  );
}

export default App;
