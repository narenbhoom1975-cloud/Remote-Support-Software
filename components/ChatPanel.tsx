import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    currentUserRole: 'technician' | 'client';
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, currentUserRole }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const isMe = (sender: string) => {
      // If I am technician, my messages are 'technician'.
      // If I am client, my messages are 'technician' (wait, no).
      // Logic:
      // If currentUserRole is technician, 'technician' is me.
      // If currentUserRole is client, 'user' is me? 
      // Let's simplify: The ActiveSession handles adding messages with specific sender tags.
      // Here we just display. 
      if (currentUserRole === 'technician') return sender === 'technician';
      return sender === 'user';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${isMe(msg.sender) ? 'items-end' : 'items-start'}`}>
            {msg.sender === 'system' ? (
              <div className="w-full text-center my-2">
                 <span className="text-[10px] bg-slate-900 text-slate-500 px-2 py-1 rounded-full border border-slate-800">
                   {msg.text}
                 </span>
              </div>
            ) : (
              <>
                 <div className={`flex items-end gap-2 max-w-[85%] ${isMe(msg.sender) ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isMe(msg.sender) ? 'bg-blue-600' : 'bg-slate-700'}`}>
                        <User className="w-3 h-3 text-white" />
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${
                        isMe(msg.sender)
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-slate-800 text-slate-200 rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>
                 </div>
                 <span className="text-[10px] text-slate-600 mt-1 px-9">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
              </>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800">
        <div className="relative">
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            />
            <button 
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-0 disabled:pointer-events-none"
            >
                <Send className="w-4 h-4" />
            </button>
        </div>
      </form>
    </div>
  );
};