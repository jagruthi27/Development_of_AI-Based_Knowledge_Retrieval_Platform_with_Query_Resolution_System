import React, { useState } from 'react';

import Sidebar from './components/Sidebar';
import UploadPage from './pages/UploadPage';
import ChatPage from './pages/ChatPage';
import AuthPage from './pages/AuthPage';
import QueryHistoryStatistics from './pages/QueryHistoryStatistics';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import KnowledgeGapVisualization from './pages/KnowledgeGapVisualization';

import { useAuth } from './context/Authcontext';
import * as api from './services/api';

import './App.css';


function App() {
  const {
    user,
    isLoggedIn,
    loading: authLoading,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState('upload');
  const [mockMode] = useState(api.getMockMode());


  /* ---------------------------------------------------------------
     Authentication loading
     --------------------------------------------------------------- */

  if (authLoading) {
    return (
      <div className="app-auth-loading">
        <div className="app-auth-loading-content">
          <div className="app-auth-loading-title">
            Loading QueryNest...
          </div>

          <div className="app-auth-loading-text">
            Verifying your session
          </div>
        </div>
      </div>
    );
  }


  /* ---------------------------------------------------------------
     User is not authenticated
     --------------------------------------------------------------- */

  if (!isLoggedIn || !user) {
    return <AuthPage />;
  }


  /* ---------------------------------------------------------------
     Authenticated workspace
     --------------------------------------------------------------- */

  return (
    <div className="main-app">

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mockMode={mockMode}
        user={user}
        onLogout={logout}
      />


      <main className="main-content">

        <div
          style={{
            display:
              activeTab === 'upload'
                ? 'block'
                : 'none',
            height: '100%',
          }}
        >
          <UploadPage
            onStartChat={() =>
              setActiveTab('chat')
            }
          />
        </div>


        <div
          style={{
            display:
              activeTab === 'chat'
                ? 'block'
                : 'none',
            height: '100%',
          }}
        >
          <ChatPage />
        </div>

        <div
          style={{
            display:
              activeTab === 'history'
                ? 'block'
                : 'none',
            height: '100%',
          }}
        >
          <QueryHistoryStatistics />
        </div>

        <div
          style={{
            display:
              activeTab === 'analytics'
                ? 'block'
                : 'none',
            height: '100%',
          }}
        >
          <AnalyticsDashboard
            onNavigateToGaps={() =>
              setActiveTab('knowledge-gaps')
            }
          />
        </div>

        <div
          style={{
            display:
              activeTab === 'knowledge-gaps'
                ? 'block'
                : 'none',
            height: '100%',
          }}
        >
          <KnowledgeGapVisualization
            onIngest={() => setActiveTab('upload')}
          />
        </div>

      </main>

    </div>
  );
}


export default App;