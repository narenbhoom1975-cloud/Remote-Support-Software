
import React, { useEffect, useRef, useState } from 'react';
import { X, MessageSquare, BrainCircuit, Wifi, AlertTriangle, ChevronDown, Monitor, Command, Lock, Power, RefreshCw, FileText, CheckCircle2, User, Share, ArrowLeft, RefreshCcw, Info } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { ConnectionStatus, ChatMessage } from '../types';
import { analyzeScreenSnapshot } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import Peer, { DataConnection, MediaConnection } from 'peerjs';

interface ActiveSessionProps {
  mode: 'technician' | 'client';
  myId: string;
  targetId: string;
  onEndSession: () => void;
}

export const ActiveSession: React.FC<ActiveSessionProps> = ({ mode, myId, targetId, onEndSession }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING);
  
  // UI States
  const [showChat, setShowChat] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // PeerJS Refs
  const peerInstance = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  // Chat State lifted up to handle incoming messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '0', sender: 'system', text: 'Initializing secure connection...', timestamp: new Date() }
  ]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const addMessage = (text: string, sender: 'user' | 'technician' | 'system') => {
    setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender,
        text,
        timestamp: new Date()
    }]);
  };

  const handleSendMessage = (text: string) => {
      // 1. Determine who I am for the local display
      const mySenderRole = mode === 'technician' ? 'technician' : 'user';

      // 2. Add locally so I can see my own message
      addMessage(text, mySenderRole);

      // 3. Send over P2P
      if (connRef.current && connRef.current.open) {
          connRef.current.send({ type: 'chat', text });
      } else {
          showNotification("Not connected. Message not sent.");
      }
  };

  // --- Initialize PeerJS ---
  useEffect(() => {
    let mounted = true;

    const initPeer = async () => {
      try {
        console.log(`Initializing PeerJS with ID: ${myId}`);
        const peer = new Peer(myId, {
           debug: 1,
        });
        
        peerInstance.current = peer;

        peer.on('open', (id) => {
          console.log('My peer ID is: ' + id);
          if (mounted) {
              if (mode === 'technician') {
                  connectToClient(peer);
              } else {
                  addMessage(`Waiting for technician (ID: ${myId})...`, 'system');
              }
          }
        });

        // 1. Handle Incoming Data Connection (Chat/Signaling)
        peer.on('connection', (conn) => {
            console.log("Incoming data connection from", conn.peer);
            connRef.current = conn;
            setupDataConnection(conn);
            
            if (mode === 'client') {
                setStatus(ConnectionStatus.CONNECTED);
                addMessage('New Age Computers Technician connected.', 'system');
                showNotification("Technician Connected");
            }
        });

        // 2. Handle Incoming Media Call (Technician receives screen, Client usually initiates)
        peer.on('call', (call) => {
            console.log("Incoming call from", call.peer);
            
            // Technician Logic: Answer the call to view screen
            if (mode === 'technician') {
                call.answer(); // Answer without sending a stream back (Receive only)
                callRef.current = call;
                
                call.on('stream', (remoteStream) => {
                    console.log("Received remote stream", remoteStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = remoteStream;
                        // Force play to ensure no black screen
                        videoRef.current.play().catch(e => console.error("Video play error:", e));
                        setStatus(ConnectionStatus.CONNECTED);
                        addMessage("Receiving remote screen.", 'system');
                    }
                });

                call.on('error', (err) => console.error("Call error", err));
            } 
            // Client Logic: Should not receive calls in this new flow, but safe to answer
            else {
                 call.answer(); 
            }
        });

        peer.on('error', (err: any) => {
            console.error('Peer error:', err);
            
            let userFriendlyError = `Connection Error: ${err.type}`;
            
            if (err.type === 'peer-unavailable') {
                userFriendlyError = `Partner (${targetId}) is not online. Please ask them to click 'Go Online' on their screen.`;
            } else if (err.type === 'network') {
                userFriendlyError = "Network connection lost. Please check your internet.";
            }

            setErrorMsg(userFriendlyError);
            setStatus(ConnectionStatus.FAILED);
        });

      } catch (err: any) {
        setErrorMsg(err.message);
      }
    };

    initPeer();

    return () => {
        mounted = false;
        if (callRef.current) callRef.current.close();
        if (connRef.current) connRef.current.close();
        if (peerInstance.current) peerInstance.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, myId]);


  // --- Technician Logic: Connect & Request Screen ---
  const connectToClient = (peer: Peer) => {
      if (!targetId) return;
      
      setErrorMsg(null);
      setStatus(ConnectionStatus.CONNECTING);
      addMessage(`Connecting to ${targetId}...`, 'system');
      
      try {
          // Open Data Connection
          const conn = peer.connect(targetId, { reliable: true });
          connRef.current = conn;
          
          conn.on('open', () => {
              setupDataConnection(conn);
              setStatus(ConnectionStatus.CONNECTED);
              addMessage("Connected. Requesting screen...", 'system');
              
              // Signal client to start sharing
              setTimeout(() => {
                  conn.send({ type: 'request_stream' });
              }, 1000);
          });

          conn.on('error', (err) => {
              console.error("Data connection error", err);
              setStatus(ConnectionStatus.FAILED);
              setErrorMsg("Failed to connect to client data channel.");
          });

      } catch (e: any) {
          setErrorMsg(e.message || "Failed to initiate connection");
          setStatus(ConnectionStatus.FAILED);
      }
  };

  const handleRetryConnection = () => {
      if (peerInstance.current && mode === 'technician') {
          connectToClient(peerInstance.current);
      }
  };

  const setupDataConnection = (conn: DataConnection) => {
      conn.on('data', async (data: any) => {
          console.log("Received data:", data);

          // Chat
          if (data.type === 'chat') {
              // Determine who sent this message based on my role.
              // If I am Technician, the sender is User.
              // If I am Client, the sender is Technician.
              const senderRole = mode === 'technician' ? 'user' : 'technician';
              
              addMessage(data.text, senderRole); 
              if (!showChat) showNotification("New chat message");
          }
          
          // Commands
          if (data.type === 'command') {
              showNotification(`Remote Command: ${data.action}`);
          }

          // Screen Request (Client Side)
          if (data.type === 'request_stream' && mode === 'client') {
              console.log("Technician requested screen sharing.");
              try {
                  const stream = await navigator.mediaDevices.getDisplayMedia({
                      video: { cursor: "always" } as any,
                      audio: false
                  });

                  // Client Calls Technician with the Stream
                  // This is "Reverse Calling" - more reliable for one-way screen sharing
                  if (peerInstance.current) {
                      const call = peerInstance.current.call(conn.peer, stream);
                      callRef.current = call;
                      addMessage("Sharing screen with New Age Computers.", 'system');
                      
                      // Handle stream end (user clicks Stop Sharing)
                      stream.getVideoTracks()[0].onended = () => {
                          onEndSession();
                      };
                  }

              } catch (err: any) {
                  console.error("Screen share error", err);
                  // Inform technician
                  conn.send({ type: 'chat', text: "System: User denied screen sharing request." });
                  setErrorMsg("Screen sharing denied. Please reload to try again.");
              }
          }
      });
      
      conn.on('close', () => {
          addMessage('Peer disconnected.', 'system');
          setStatus(ConnectionStatus.DISCONNECTED);
      });
  };

  const sendCommand = (action: string) => {
      if (connRef.current && connRef.current.open) {
          connRef.current.send({ type: 'command', action });
          showNotification(`Sent ${action}`);
      } else {
          showNotification("Not connected");
      }
  };

  // --- AI Analysis ---
  const handleCaptureAndAnalyze = async () => {
    if (!videoRef.current || mode !== 'technician') return;
    
    setIsAnalyzing(true);
    setShowAi(true);
    setShowChat(false);
    setAiAnalysis(null); 

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/png');
        
        const analysis = await analyzeScreenSnapshot(base64Image);
        setAiAnalysis(analysis);
      }
    } catch (error) {
      setAiAnalysis("Failed to analyze screen. Ensure API key is set.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Top Toolbar (Technician Only) ---
  const TopToolbar = () => (
    <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 justify-between shrink-0 select-none z-[60] relative shadow-md">
        <div className="flex items-center gap-2">
            {/* Actions */}
            <div className="relative group h-10 flex items-center">
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-700">
                    <Command className="w-4 h-4" />
                    <span>Actions</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 shadow-xl rounded-lg hidden group-hover:block overflow-hidden z-[70]">
                    <button onClick={() => sendCommand("Ctrl+Alt+Del")} className="w-full px-4 py-3 hover:bg-slate-800 flex items-center gap-3 text-sm text-slate-200 text-left">
                        <Command className="w-4 h-4 text-slate-400" /> Send Ctrl+Alt+Del
                    </button>
                    <button onClick={() => sendCommand("Lock")} className="w-full px-4 py-3 hover:bg-slate-800 flex items-center gap-3 text-sm text-slate-200 text-left">
                        <Lock className="w-4 h-4 text-slate-400" /> Lock Computer
                    </button>
                     <button onClick={() => sendCommand("Reboot")} className="w-full px-4 py-3 hover:bg-slate-800 flex items-center gap-3 text-sm text-slate-200 border-t border-slate-700 text-left">
                        <Power className="w-4 h-4 text-red-400" /> Reboot
                    </button>
                </div>
            </div>

            {/* View */}
            <div className="relative group h-10 flex items-center">
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-700">
                    <Monitor className="w-4 h-4" />
                    <span>View</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-slate-700 shadow-xl rounded-lg hidden group-hover:block overflow-hidden z-[70]">
                    <button className="w-full px-4 py-3 hover:bg-slate-800 flex items-center gap-3 text-sm text-slate-200 text-left">
                         Original
                    </button>
                     <button className="w-full px-4 py-3 hover:bg-slate-800 flex items-center gap-3 text-sm text-slate-200 border-t border-slate-700 text-left">
                         Optimize Speed
                    </button>
                </div>
            </div>

            {/* Files */}
            <button onClick={() => sendCommand("Open File Transfer")} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-700">
                <FileText className="w-4 h-4" />
                <span>Files</span>
            </button>

             <div className="w-px h-6 bg-slate-700 mx-2"></div>

             {/* AI Assist */}
             <button 
                onClick={handleCaptureAndAnalyze}
                disabled={status !== ConnectionStatus.CONNECTED}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${
                    showAi 
                    ? 'bg-purple-600 text-white shadow-purple-500/20' 
                    : 'bg-slate-800 text-purple-300 hover:bg-purple-900/40 hover:text-white border border-slate-600 hover:border-purple-500/50'
                }`}
             >
                <BrainCircuit className="w-4 h-4" />
                AI Assist
            </button>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => { setShowChat(!showChat); setShowAi(false); }}
                className={`p-2.5 rounded-lg border transition-all relative ${
                    showChat 
                    ? 'bg-slate-800 border-slate-600 text-white' 
                    : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                title="Chat"
            >
                <MessageSquare className="w-5 h-5" />
                {chatMessages.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-slate-900 shadow-sm"></span>}
            </button>
            <div className="w-px h-6 bg-slate-700 mx-2"></div>
            <button 
                onClick={onEndSession}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white border border-red-500 rounded-lg text-sm font-bold shadow-lg shadow-red-900/20 transition-all"
            >
                <X className="w-4 h-4" />
                <span>End Session</span>
            </button>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-black overflow-hidden relative">
      
      {mode === 'technician' && <TopToolbar />}
      {mode === 'client' && (
          <div className="absolute top-6 right-6 z-[100] flex gap-3 pointer-events-auto">
              <button 
                onClick={() => setShowChat(!showChat)} 
                className="bg-slate-900/90 backdrop-blur-md p-4 rounded-full text-white shadow-2xl border-2 border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all group"
                title="Open Chat"
              >
                  <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={onEndSession} 
                className="bg-red-600/90 backdrop-blur-md p-4 rounded-full text-white shadow-2xl border-2 border-red-400 hover:bg-red-500 transition-all group"
                title="Disconnect"
              >
                  <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
          </div>
      )}

      <div className="flex-1 flex w-full relative overflow-hidden">
        {/* Main Area */}
        <div className="flex-1 flex flex-col h-full relative bg-zinc-900">
            
            {/* Status Overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-900/90 backdrop-blur text-slate-400 text-xs flex items-center justify-between px-4 z-20 border-t border-slate-800 font-mono shadow-lg">
                 <div className="flex items-center gap-6">
                    <span className={`flex items-center gap-2 font-bold ${status === ConnectionStatus.CONNECTED ? 'text-green-500' : 'text-yellow-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                        {status}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span>Session ID: <span className="text-white">{myId}</span></span>
                    <span className="text-slate-500">|</span>
                    <span className="flex items-center gap-1 text-green-500/70"><Lock className="w-3 h-3" /> New Age Computers Secured</span>
                 </div>
                 {mode === 'technician' && <div className="text-blue-400">Remote: {targetId}</div>}
            </div>

            {notification && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl border border-slate-600 flex items-center gap-3 z-[80] animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="font-medium">{notification}</span>
                </div>
            )}

            <div className="flex-1 flex items-center justify-center overflow-auto relative bg-zinc-950">
                {status === ConnectionStatus.FAILED && (
                    <div className="text-center p-8 max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl text-white font-bold mb-2">Connection Failed</h3>
                        <p className="text-zinc-400 mb-6">{errorMsg || "Could not establish P2P connection."}</p>
                        <div className="flex flex-col gap-3">
                            {mode === 'technician' && (
                                <button 
                                    onClick={handleRetryConnection} 
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCcw className="w-4 h-4" /> Retry Connection
                                </button>
                            )}
                            <button onClick={onEndSession} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors">Return to Dashboard</button>
                        </div>
                    </div>
                )}
                
                {status === ConnectionStatus.CONNECTING && (
                    <div className="text-center p-8 bg-slate-900/50 rounded-2xl backdrop-blur-sm border border-slate-800">
                         <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                         <h3 className="text-xl text-white font-bold tracking-tight">Connecting to New Age Computers...</h3>
                         <p className="text-slate-400 text-sm mt-2 font-mono">{mode === 'technician' ? `Connecting to ${targetId}...` : `Waiting for technician at ${myId}...`}</p>
                    </div>
                )}
                
                {/* Connected but no video yet (Technician View) */}
                {mode === 'technician' && status === ConnectionStatus.CONNECTED && (!videoRef.current || videoRef.current.paused) && (
                     <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                         <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700 backdrop-blur">
                            <p className="text-slate-300 flex items-center gap-2"><Monitor className="w-5 h-5 animate-pulse" /> Requesting remote screen...</p>
                         </div>
                     </div>
                )}

                {/* Video Element */}
                <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className={`max-w-full max-h-full shadow-2xl object-contain ${status === ConnectionStatus.CONNECTED ? 'block' : 'hidden'}`}
                    onLoadedMetadata={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.play().catch(console.error);
                    }}
                />
                
                {/* Client Mode Placeholder - Active */}
                {mode === 'client' && status === ConnectionStatus.CONNECTED && (
                    <div className="text-center text-slate-400 p-8 bg-slate-900/80 rounded-2xl border border-slate-700 backdrop-blur shadow-[0_0_30px_rgba(74,222,128,0.1)] z-30">
                        <div className="w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                           <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                           <Share className="w-10 h-10 text-green-500 relative z-10" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Session Active</h3>
                        <p className="mb-4">Technician is viewing your screen.</p>
                        <div className="flex items-center justify-center gap-2 text-yellow-500 bg-yellow-900/20 p-2 rounded text-xs mb-4">
                             <Info className="w-4 h-4" /> Tip: Don't minimize the shared window.
                        </div>
                        <div className="text-green-500/50 text-xs font-mono border-t border-slate-800 pt-4 mt-4 uppercase tracking-wider">
                            Powered by New Age Computers
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Right Sidebar */}
        {(showChat || showAi) && (
            <div className="w-96 bg-slate-950 border-l border-slate-800 flex flex-col z-50 shadow-2xl absolute right-0 top-0 bottom-0 border-t border-slate-800">
                <div className="flex border-b border-slate-800 bg-slate-900/50 backdrop-blur">
                    <div className="flex-1 py-4 text-xs font-bold uppercase tracking-wider text-center text-slate-300 flex items-center justify-center gap-2">
                        {showChat ? <><MessageSquare className="w-4 h-4 text-blue-500" /> Session Chat</> : <><BrainCircuit className="w-4 h-4 text-purple-500" /> AI Diagnostics</>}
                    </div>
                    <button onClick={() => {setShowChat(false); setShowAi(false)}} className="px-4 hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative bg-slate-950">
                    {showChat && (
                        <ChatPanel 
                            messages={chatMessages} 
                            onSendMessage={handleSendMessage} 
                            currentUserRole={mode} 
                        />
                    )}
                    
                    {showAi && (
                        <div className="flex flex-col h-full p-6 overflow-y-auto bg-slate-950 custom-scrollbar">
                             {!aiAnalysis && !isAnalyzing && (
                                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 opacity-60">
                                    <BrainCircuit className="w-16 h-16 mb-6 text-slate-700" />
                                    <p className="text-base font-medium">Ready to analyze screen content.</p>
                                    <p className="text-xs mt-2 max-w-[200px]">Click 'AI Assist' in the toolbar to capture and diagnose.</p>
                                </div>
                            )}
                            {isAnalyzing && (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                                        <div className="w-16 h-16 border-4 border-slate-800 border-t-purple-500 rounded-full animate-spin relative z-10"></div>
                                    </div>
                                    <div>
                                        <p className="text-purple-400 text-lg font-bold animate-pulse">Analyzing...</p>
                                        <p className="text-slate-500 text-xs mt-1">Processing visual data with Gemini 2.5</p>
                                    </div>
                                </div>
                            )}
                            {aiAnalysis && (
                                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
