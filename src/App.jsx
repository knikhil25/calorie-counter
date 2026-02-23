import { useState } from 'react';
import ChatScreen from './components/ChatScreen';
import HistoryScreen from './components/HistoryScreen';

function App() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="min-h-dvh bg-sage-50 flex flex-col">
      <header className="shrink-0 px-4 py-5 bg-white/80 backdrop-blur-md border-b border-sage-200/60 shadow-sm">
        <h1 className="text-xl font-semibold text-sage-800 text-center">Calorie Counter</h1>
        <p className="text-sm text-sage-500 text-center mt-0.5">AI-powered food tracking</p>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chat' && <ChatScreen />}
        {activeTab === 'history' && <HistoryScreen />}
      </main>

      <nav className="shrink-0 flex bg-white/90 backdrop-blur-md border-t border-sage-200/60 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-4 px-4 flex flex-col items-center gap-1 transition-all duration-200 ${
            activeTab === 'chat'
              ? 'text-sage-600 font-medium'
              : 'text-sage-400 hover:text-sage-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs">Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-4 px-4 flex flex-col items-center gap-1 transition-all duration-200 ${
            activeTab === 'history'
              ? 'text-sage-600 font-medium'
              : 'text-sage-400 hover:text-sage-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs">History</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
