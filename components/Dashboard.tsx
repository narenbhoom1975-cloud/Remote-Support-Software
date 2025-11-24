
import React, { useState, useEffect } from 'react';
import { ArrowRight, Monitor, Users, Shield, Cpu, HelpCircle, X, Copy, Check, Info, Globe, Phone, Lock, Key, RefreshCw, LogOut, WifiOff } from 'lucide-react';
import { LoginModal } from './LoginModal';
import { UserRole } from '../types';
import { generateEmployeeToken } from '../services/authService';

interface DashboardProps {
  onStartSession: (mode: 'technician' | 'client', myId: string, targetId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartSession }) => {
  const [activeTab, setActiveTab] = useState<'technician' | 'client'>('client');
  const [userRole, setUserRole] = useState<UserRole>(null); // 'admin' | 'employee' | null
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  // Admin State
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  
  const [remoteId, setRemoteId] = useState('');
  const [myId, setMyId] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate a random 9-digit ID on mount
  useEffect(() => {
    generateId();
  }, []);

  const generateId = () => {
      const p1 = Math.floor(Math.random() * 900) + 100;
      const p2 = Math.floor(Math.random() * 900) + 100;
      const p3 = Math.floor(Math.random() * 900) + 100;
      setMyId(`${p1}-${p2}-${p3}`);
  };

  const handleTabChange = (tab: 'technician' | 'client') => {
    if (tab === 'technician' && !isAuthenticated) {
      setShowLogin(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
    setShowLogin(false);
    setActiveTab('technician');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setActiveTab('client');
    setShowAdminTools(false);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (remoteId.trim().length > 0) {
      onStartSession('technician', myId, remoteId);
    }
  };

  const handleStartClient = () => {
      onStartSession('client', myId, '');
  };

  const handleGenerateCode = () => {
      const code = generateEmployeeToken();
      setEmployeeCode(code);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 overflow-y-auto relative">
      {/* Auth Modal */}
      {showLogin && (
        <LoginModal 
          onLogin={handleLoginSuccess} 
          onClose={() => setShowLogin(false)} 
        />
      )}

      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 shadow-lg shadow-green-900/5">
        <div className="flex flex-col">
          {/* Company Branding - Neon Green */}
          <h1 
            className="text-3xl md:text-4xl font-black tracking-tighter text-green-400 italic uppercase flex items-center gap-3"
            style={{ textShadow: "0 0 15px rgba(74, 222, 128, 0.6), 0 0 30px rgba(74, 222, 128, 0.2)" }}
          >
            <Monitor className="w-8 h-8 md:w-10 md:h-10 text-green-400" />
            New Age Computers
          </h1>
          
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 mt-3 ml-1">
            <a 
                href="https://newagecomputers.netlify.app" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 text-green-300/80 hover:text-green-300 text-sm font-medium tracking-wide transition-colors hover:underline decoration-green-500/50 underline-offset-4"
            >
                <Globe className="w-3.5 h-3.5" />
                https://newagecomputers.netlify.app
            </a>
            
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-green-400 font-bold tracking-wider text-sm bg-green-900/20 px-3 py-1 rounded-full border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                    <Phone className="w-3.5 h-3.5" />
                    9920524542
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800 px-2 py-0.5 rounded bg-slate-900">[ Remote Technician ]</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          
          {/* Admin Tools Button - Only visible if logged in as Admin */}
          {isAuthenticated && userRole === 'admin' && (
             <button 
                onClick={() => setShowAdminTools(!showAdminTools)}
                className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                    showAdminTools 
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                    : 'bg-slate-800 text-yellow-500 border-slate-700 hover:bg-slate-700'
                }`}
             >
                <Key className="w-4 h-4" />
                <span>Admin Tools</span>
             </button>
          )}

          <button 
            onClick={() => setShowHelp(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors border border-slate-700"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help</span>
          </button>
          
          <div className="h-12 w-px bg-slate-800 mx-2 hidden md:block"></div>
          
          {isAuthenticated ? (
             <div className="flex items-center gap-3">
                 <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logged in as</span>
                    <span className={`text-sm font-bold capitalize ${userRole === 'admin' ? 'text-yellow-400' : 'text-blue-400'}`}>{userRole}</span>
                 </div>
                 <button onClick={handleLogout} className="p-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-700 hover:border-red-500/30" title="Logout">
                    <LogOut className="w-5 h-5" />
                 </button>
             </div>
          ) : (
             <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-medium text-slate-400">Your Session ID</span>
                <span className="text-lg font-mono text-green-400 tracking-wider font-bold drop-shadow-sm">{myId || "..."}</span>
             </div>
          )}
        </div>
      </header>

      {/* Admin Tools Panel */}
      {showAdminTools && userRole === 'admin' && (
          <div className="w-full bg-slate-900 border-b border-yellow-500/20 py-6 animate-in slide-in-from-top-2">
              <div className="max-w-5xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Key className="w-5 h-5 text-yellow-500" />
                          Employee Access Generator
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">
                          Generate a time-limited access code for your technicians. Valid for the current hour.
                      </p>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <div className="px-6 py-2 bg-slate-900 rounded-lg border border-slate-800 min-w-[140px] text-center">
                          <span className="font-mono text-2xl font-bold text-white tracking-widest">
                              {employeeCode || "------"}
                          </span>
                      </div>
                      <button 
                        onClick={handleGenerateCode}
                        className="px-4 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                      >
                          <RefreshCw className="w-4 h-4" /> Generate
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 p-8 flex flex-col items-center justify-start w-full max-w-5xl mx-auto z-10">
        
        {/* Role Switcher - Secured */}
        <div className="bg-slate-950 p-2 rounded-2xl flex items-center mb-10 border border-slate-700 w-full max-w-lg shadow-2xl relative">
            <button 
                onClick={() => handleTabChange('technician')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 border relative overflow-hidden group ${
                  activeTab === 'technician' 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50' 
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
            >
                {activeTab !== 'technician' && !isAuthenticated && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                )}
                <Monitor className="w-5 h-5" /> Technician
            </button>
            <button 
                onClick={() => handleTabChange('client')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 border ${
                  activeTab === 'client' 
                  ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/50' 
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
            >
                <Shield className="w-5 h-5" /> User
            </button>
        </div>

        {/* Content Area */}
        <div className="w-full max-w-lg transition-all duration-300 min-h-[400px]">
            
            {/* Technician View */}
            {activeTab === 'technician' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
                        <div className="mb-6 flex justify-between items-start">
                          <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                  <Monitor className="text-blue-400 w-6 h-6" />
                                </div>
                                Remote Control
                            </h2>
                            <p className="text-slate-400 text-base mt-2">
                                Enter the 9-digit Partner ID from the user's screen.
                            </p>
                          </div>
                          {isAuthenticated && (
                            <div className={`px-2 py-1 border rounded text-[10px] font-bold uppercase tracking-wider ${
                                userRole === 'admin' 
                                ? 'bg-yellow-900/30 border-yellow-500/30 text-yellow-400' 
                                : 'bg-green-900/30 border-green-500/30 text-green-400'
                            }`}>
                              {userRole}
                            </div>
                          )}
                        </div>
                        
                        <form onSubmit={handleConnect} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Partner ID</label>
                                <input 
                                  type="text" 
                                  value={remoteId}
                                  onChange={(e) => setRemoteId(e.target.value)}
                                  placeholder="000-000-000"
                                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-5 text-2xl tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 font-mono text-center text-white"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={!remoteId}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-5 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20 mt-2 border border-blue-500"
                            >
                                Connect Now <ArrowRight className="w-6 h-6" />
                            </button>
                        </form>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex gap-4 items-start">
                        <div className="bg-blue-900/30 p-2 rounded-lg text-blue-400 shrink-0">
                            <Info className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-medium text-slate-200">Pro Tip</h4>
                            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                Ask the client to <strong>stay on the "User" tab</strong> and click "Go Online" before you attempt to connect.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Client View */}
            {activeTab === 'client' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute -top-12 -right-12 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="mb-8 relative z-10 flex justify-between items-start">
                            <div>
                              <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                                  <div className="p-2 bg-green-500/20 rounded-lg">
                                    <Shield className="text-green-400 w-6 h-6" />
                                  </div>
                                  Receive Support
                              </h2>
                              <p className="text-slate-400 text-base mt-2">
                                  Give this ID to the <strong>New Age Computers</strong> technician.
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end">
                              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-700">
                                <WifiOff className="w-3 h-3 text-slate-500" /> Offline
                              </span>
                            </div>
                        </div>
                        
                        <div className="space-y-6 relative z-10">
                            <div className="bg-slate-950 rounded-xl p-6 border-2 border-slate-700 text-center relative group">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">Your Session ID</label>
                                <div 
                                  className="flex items-center justify-center gap-3 cursor-pointer select-all" 
                                  onClick={copyToClipboard}
                                  title="Click to Copy"
                                >
                                    <span className="text-4xl font-mono font-bold text-white tracking-widest group-hover:text-green-400 transition-colors">
                                        {myId || "..."}
                                    </span>
                                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-slate-400 group-hover:text-white" />}
                                    </div>
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); generateId(); }} 
                                      className="p-2 text-slate-500 hover:text-white bg-slate-900 rounded-lg border border-slate-800"
                                      title="Generate New ID"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className={`text-xs mt-2 font-medium transition-opacity duration-300 ${copied ? 'opacity-100 text-green-500' : 'opacity-0 text-transparent'}`}>
                                    Copied to clipboard
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleStartClient}
                                className="w-full py-5 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all text-lg font-bold flex items-center justify-center gap-3 shadow-xl shadow-green-600/20 border border-green-500 animate-pulse hover:animate-none"
                            >
                                <Shield className="w-6 h-6" /> Go Online & Wait for Connection
                            </button>
                            
                            <div className="text-center text-xs text-slate-500">
                                You must click the button above to allow the technician to connect.
                            </div>
                        </div>
                    </div>

                     <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex gap-4 items-start">
                        <div className="bg-green-900/30 p-2 rounded-lg text-green-400 shrink-0">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-medium text-slate-200">Safety First</h4>
                            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                You are in control. You can stop screen sharing or disconnect the session at any time using the red 'X' button.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                Quick Start Guide
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4 p-3 bg-slate-800/50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                    <div>
                        <h4 className="font-bold text-white">Select Your Role</h4>
                        <p className="text-sm text-slate-300 mt-1">
                            <strong>Clients:</strong> Stay on the default "User" tab.<br/>
                            <strong>Technicians:</strong> Click "Technician" and enter your access code.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 p-3 bg-slate-800/50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-white">Go Online</h4>
                    <p className="text-sm text-slate-300 mt-1">
                        <strong>Important:</strong> The Client MUST click "Go Online & Wait for Connection" before the Technician can connect.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 p-3 bg-slate-800/50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-white">Start Support</h4>
                    <p className="text-sm text-slate-300 mt-1">
                      Technician enters the ID and clicks Connect. Browser asks for permission.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowHelp(false)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
