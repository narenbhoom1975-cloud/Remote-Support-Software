
import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ActiveSession } from './components/ActiveSession';
import { ShieldCheck, Monitor, HelpCircle, Settings } from 'lucide-react';

export enum AppState {
  DASHBOARD = 'DASHBOARD',
  SESSION = 'SESSION'
}

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>(AppState.DASHBOARD);
  const [sessionMode, setSessionMode] = useState<'technician' | 'client'>('client');
  
  // State for P2P connection details
  const [myId, setMyId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');

  const startSession = (mode: 'technician' | 'client', localId: string, remoteId: string) => {
    setSessionMode(mode);
    setMyId(localId);
    setTargetId(remoteId);
    setCurrentState(AppState.SESSION);
  };

  const endSession = () => {
    setCurrentState(AppState.DASHBOARD);
    setTargetId('');
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Global Sidebar */}
      <nav className="w-16 bg-slate-950 flex flex-col items-center py-6 border-r border-slate-800 z-50">
        <div className="mb-8 p-2 bg-green-600 rounded-lg shadow-lg shadow-green-500/20">
          <Monitor className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex flex-col gap-6 w-full items-center">
          <button 
            onClick={() => currentState === AppState.SESSION && endSession()}
            className={`p-3 rounded-xl transition-all ${currentState === AppState.DASHBOARD ? 'bg-slate-800 text-green-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Dashboard"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
          
          <button className="p-3 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-xl transition-all" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-auto">
          <button className="p-3 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-xl transition-all">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col min-w-0">
        {currentState === AppState.DASHBOARD ? (
          <Dashboard onStartSession={startSession} />
        ) : (
          <ActiveSession 
            mode={sessionMode} 
            myId={myId}
            targetId={targetId}
            onEndSession={endSession} 
          />
        )}
      </main>
    </div>
  );
}
