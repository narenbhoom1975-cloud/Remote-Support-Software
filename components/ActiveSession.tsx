
import React, { useEffect, useRef, useState } from 'react';
import { X, MessageSquare, BrainCircuit, Wifi, AlertTriangle, ChevronDown, Monitor, Command, Lock, Power, RefreshCw, FileText, CheckCircle2, User, Share, ArrowLeft, RefreshCcw, Info, Play, ShieldCheck, Signal, Radio } from 'lucide-react';
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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING);
  const [detailedStatus, setDetailedStatus] = useState<string>("Initializing Network...");
  
  // UI States
  const [showChat, setShowChat] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [technicianIdForCall, setTechnicianIdForCall] = useState<string>('');
  
  // PeerJS Refs
  const peerInstance = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  // Chat State
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
      const mySenderRole = mode === 'technician' ? 'technician' : 'user';
      addMessage(text, mySenderRole);

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
                  // Wait a moment for network propagation then connect
                  setTimeout(() => connectToClient(peer), 500);
              } else {
                  setDetailedStatus("Waiting for technician connection...");
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
                setDetailedStatus("Technician connected. Sending acknowledgment...");
                addMessage('Technician connected.', 'system');
                showNotification("Technician Connected");
                
                // CRITICAL: Send ACK immediately so Technician knows we are ready
                setTimeout(() => {
                    if (conn.open) {
                        conn.send({ type: 'ack', from: myId });
                    } else {
                        conn.on('open', () => {
                             conn.send({ type: 'ack', from: myId });
                        });
                    }
                }, 500);
            }
        });

        // 2. Handle Incoming Media Call (Technician receives screen)
        peer.on('call', (call) => {
            console.log("Incoming call from", call.peer);
            
            if (mode === 'technician') {
                setDetailedStatus("Receiving video stream...");
                call.answer(); 
                callRef.current = call;
                
                call.on('stream', (stream) => {
                    console.log("Received remote stream", stream);
                    setRemoteStream(stream);
                    setStatus(ConnectionStatus.CONNECTED); // Force connected
                    setDetailedStatus("Video stream active");
                    addMessage("Receiving remote screen.", 'system');
                });

                call.on('error', (err) => {
                    console.error("Call error", err);
                    setErrorMsg("Video stream error: " + err.message);
                });
            } else {
                call.answer(); 
            }
        });

        peer.on('error', (err: any) => {
            console.error('Peer error:', err);
            
            let userFriendlyError = `Connection Error: ${err.type}`;
            if (err.type === 'peer-unavailable') {
                userFriendlyError = `Partner (${targetId}) is offline. Ask them to click 'Go Online' and wait.`;
            } else if (err.type === 'network') {
                userFriendlyError = "Network connection lost. Check internet.";
            }

            setErrorMsg(userFriendlyError);
            if (status !== ConnectionStatus.CONNECTED) {
               setStatus(ConnectionStatus.FAILED);
            }
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

  // --- Attach Stream to Video ---
  useEffect(() => {
    if (videoRef.current && remoteStream) {
        console.log("Attaching stream to video element", remoteStream.id);
        videoRef.current.srcObject = remoteStream;
        
        // Mute needed for autoplay policies
        videoRef.current.muted = true; 
        
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("Video playing successfully");
                setIsVideoPlaying(true);
            }).catch(error => {
                console.error("Auto-play prevented:", error);
                setIsVideoPlaying(false);
            });
        }
    }
  }, [remoteStream]);


  // --- Technician Logic: Connect & Request Screen ---
  const connectToClient = (peer: Peer) => {
      if (!targetId) return;
      
      setErrorMsg(null);
      setStatus(ConnectionStatus.CONNECTING);
      setDetailedStatus(`Locating Partner ${targetId}...`);
      addMessage(`Connecting to ${targetId}...`, 'system');
      
      try {
          // Use reliable: true for better signaling
          const conn = peer.connect(targetId, { reliable: true });
          connRef.current = conn;
          
          conn.on('open', () => {
              console.log("Connection OPENED on Technician side");
              setupDataConnection(conn);
              setStatus(ConnectionStatus.CONNECTED);
              setDetailedStatus("Signaling established. Requesting screen...");
              addMessage("Connected. Requesting screen...", 'system');
              requestScreen(conn);
          });

          conn.on('error', (err) => {
              console.error("Data connection error", err);
              setStatus(ConnectionStatus.FAILED);
              setErrorMsg("Failed to connect to client.");
          });

          // Fallback: If 'open' doesn't fire but we are stuck in Connecting, 
          // allow manual retry or check logs.
      } catch (e: any) {
          setErrorMsg(e.message || "Failed to initiate connection");
          setStatus(ConnectionStatus.FAILED);
      }
  };

  const requestScreen = (conn: DataConnection | null) => {
      if (conn && conn.open) {
          console.log("Sending request_stream to client");
          conn.send({ type: 'request_stream', technicianId: myId });
          setDetailedStatus("Request sent. Waiting for client approval...");
      } else {
          console.warn("Cannot request screen: Connection not open");
      }
  };

  const handleRetryConnection = () => {
      if (peerInstance.current && mode === 'technician') {
          connectToClient(peerInstance.current);
      }
  };

  const handleManualRequest = () => {
      if (connRef.current) {
          requestScreen(connRef.current);
      }
  };

  const setupDataConnection = (conn: DataConnection) => {
      conn.on('data', async (data: any) => {
          console.log("Received data:", data);

          // If we receive ANY data, we are definitely connected.
          // This fixes the bug where Technician stays in "Connecting" state if 'open' event was missed.
          if (status !== ConnectionStatus.CONNECTED) {
              setStatus(ConnectionStatus.CONNECTED);
          }

          if (data.type === 'ack') {
              console.log("ACK received from client");
              // Client is ready, let's request screen again to be sure
              if (mode === 'technician') {
                  requestScreen(conn);
              }
          }

          if (data.type === 'chat') {
              const senderRole = mode === 'technician' ? 'user' : 'technician';
              addMessage(data.text, senderRole); 
              if (!showChat) showNotification("New chat message");
          }
          
          if (data.type === 'command') {
              showNotification(`Remote Command: ${data.action}`);
          }

          if (data.type === 'request_stream' && mode === 'client') {
              console.log("Technician requested screen sharing.");
              if (data.technicianId) {
                  setTechnicianIdForCall(data.technicianId);
              }
              setShowConsentModal(true);
          }
      });
      
      conn.on('close', () => {
          addMessage('Peer disconnected.', 'system');
          setStatus(ConnectionStatus.DISCONNECTED);
          setDetailedStatus("Peer disconnected");
          setRemoteStream(null);
          setIsVideoPlaying(false);
      });
  };

  const handleConsentToShare = async () => {
      setShowConsentModal(false);
      try {
          // IMPORTANT: Capture cursor and audio for best compatibility
          const stream = await navigator.mediaDevices.getDisplayMedia({
              video: { 
                cursor: "always",
                frameRate: 30
              } as any,
              audio: false 
          });

          // Determine target ID: use the one sent in payload, or fallback to connection peer
          const targetPeerId = technicianIdForCall || connRef.current?.peer;

          if (peerInstance.current && targetPeerId) {
              console.log(`Calling technician at ${targetPeerId}`);
              const call = peerInstance.current.call(targetPeerId, stream);
              callRef.current = call;
              addMessage("Sharing screen with New Age Computers.", 'system');
              
              stream.getVideoTracks()[0].onended = () => {
                  onEndSession();
              };
          } else {
              throw new Error("Could not determine technician ID to call.");
          }

      } catch (err: any) {
          console.error("Screen share error", err);
          if (connRef.current) {
             connRef.current.send({ type: 'chat', text: "System: User denied screen sharing request." });
          }
          setErrorMsg("Screen sharing denied. Please reload.");
      }
  };

  const sendCommand = (action: string) => {
      if (connRef.current && connRef.current.open) {
          connRef.current.send({ type: 'command', action });
          showNotification(`Sent ${action}`);
      } else {
          showNotification("Not connected");
      }
  };

  const forcePlayVideo = () => {
      if (videoRef.current && remoteStream) {
          videoRef.current.muted = true; // Ensure muted to allow play
          videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(console.error);
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

  // --- Toolbar ---
  const TopToolbar = () => (
    <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 justify-between shrink-0 select-none z-[60] relative shadow-md">
        <div className="flex items-center gap-2">
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

            <button onClick={() => sendCommand("Open File Transfer")} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-700">
                <FileText className="w-4 h-4" />
                <span>Files</span>
            </button>

             <div className="w-px h-6 bg-slate-700 mx-2"></div>

             <button 
                onClick={handleCaptureAndAnalyze}
                disabled={status !== ConnectionStatus.CONNECTED || !remoteStream}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${
                    showAi 
                    ? 'bg-purple-600 text-white shadow-purple-500/20' 
                    : 'bg-slate-800 text-purple-300 hover:bg-purple-900/40 hover:text-white border border-slate-600 hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed'
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
      
      {/* --- CONSENT MODAL --- */}
      {showConsentModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-600 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                <div className="w-20 h-20 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Monitor className="w-10 h-10 text-blue-400 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Technician Requesting View</h2>
                <p className="text-slate-300 mb-8">
                    The support technician wants to view your screen.
                </p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleConsentToShare}
                        className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="w-5 h-5" /> Approve & Share Screen
                    </button>
                    <button 
                        onClick={() => {
                            setShowConsentModal(false);
                            if(connRef.current) connRef.current.send({type: 'chat', text: 'System: User declined screen sharing.'});
                        }}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
      )}

      {mode === 'technician' && <TopToolbar />}
      {mode === 'client' && (
          <div className="absolute top-6 right-6 z-[90] flex gap-3 pointer-events-auto">
              <button 
                onClick={() => setShowChat(!showChat)} 
                className="bg-slate-900/90 backdrop-blur-md p-4 rounded-full text-white shadow-2xl border-2 border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all group"
              >
                  <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={onEndSession} 
                className="bg-red-600/90 backdrop-blur-md p-4 rounded-full text-white shadow-2xl border-2 border-red-400 hover:bg-red-500 transition-all group"
              >
                  <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
          </div>
      )}

      <div className="flex-1 flex w-full relative overflow-hidden">
        {/* Main Area */}
        <div className="flex-1 flex flex-col h-full relative bg-zinc-950">
            
            {/* Status Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-900/90 backdrop-blur text-slate-400 text-xs flex items-center justify-between px-4 z-20 border-t border-slate-800 font-mono shadow-lg">
                 <div className="flex items-center gap-6">
                    <span className={`flex items-center gap-2 font-bold ${status === ConnectionStatus.CONNECTED ? 'text-green-500' : 'text-yellow-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                        {status === ConnectionStatus.CONNECTED ? 'CONNECTED' : 'CONNECTING'}
                    </span>
                    <span className="hidden sm:inline text-slate-600">|</span>
                    <span className="truncate max-w-[200px]">{detailedStatus}</span>
                    <span className="hidden sm:inline text-slate-600">|</span>
                    <span className="flex items-center gap-1 text-green-500/70"><ShieldCheck className="w-3 h-3" /> Secure Protocol</span>
                 </div>
                 {mode === 'technician' && <div className="text-blue-400">Remote: {targetId}</div>}
            </div>

            {notification && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl border border-slate-600 flex items-center gap-3 z-[80] animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="font-medium">{notification}</span>
                </div>
            )}

            <div className="flex-1 flex items-center justify-center overflow-hidden relative bg-zinc-950">
                {status === ConnectionStatus.FAILED && (
                    <div className="text-center p-8 max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50">
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
                    <div className="text-center p-8 bg-slate-900/50 rounded-2xl backdrop-blur-sm border border-slate-800 z-50">
                         <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                         <h3 className="text-xl text-white font-bold tracking-tight">Establishing Connection...</h3>
                         <p className="text-slate-400 text-sm mt-2 font-mono">{detailedStatus}</p>
                         <p className="text-xs text-slate-500 mt-4">Make sure the Client is Online and waiting.</p>
                    </div>
                )}
                
                {/* Technician: Waiting for video stream specifically */}
                {mode === 'technician' && status === ConnectionStatus.CONNECTED && !isVideoPlaying && (
                     <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-950">
                         <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center max-w-sm">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                {remoteStream ? <Signal className="w-8 h-8 text-green-400" /> : <Monitor className="w-8 h-8 text-blue-400" />}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">
                                {remoteStream ? "Video Stream Received" : "Requesting Screen..."}
                            </h3>
                            <p className="text-slate-400 text-sm mb-6">
                                {remoteStream 
                                 ? "Buffering video stream..." 
                                 : "Signaling connected. Waiting for client to approve..."}
                            </p>
                            
                            {/* Manual Buttons */}
                            <div className="space-y-3">
                                {!remoteStream && (
                                    <button 
                                        onClick={handleManualRequest}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Radio className="w-4 h-4" /> Resend Request
                                    </button>
                                )}
                                
                                {remoteStream && (
                                    <button 
                                        onClick={forcePlayVideo}
                                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors animate-pulse"
                                    >
                                        <Play className="w-5 h-5 fill-current" /> Force Video Play
                                    </button>
                                )}
                            </div>
                         </div>
                     </div>
                )}

                <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className={`max-w-full max-h-full shadow-2xl object-contain transition-opacity duration-500 ${status === ConnectionStatus.CONNECTED && isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
                    style={{ width: '100%', height: '100%' }}
                />
                
                {/* Client Status Overlay */}
                {mode === 'client' && status === ConnectionStatus.CONNECTED && !showConsentModal && (
                    <div className="text-center text-slate-400 p-8 bg-slate-900/80 rounded-2xl border border-slate-700 backdrop-blur shadow-[0_0_30px_rgba(74,222,128,0.1)] z-30 absolute">
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

        {/* Sidebar */}
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
