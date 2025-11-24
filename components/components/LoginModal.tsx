
import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { verifyCredentials } from '../services/authService';
import { UserRole } from '../types';

interface LoginModalProps {
  onLogin: (role: UserRole) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Simulate a brief network check for realism
    setTimeout(() => {
      const { success, role } = verifyCredentials(accessCode);
      
      if (success && role) {
        onLogin(role);
      } else {
        setError(true);
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-inner group">
            <Lock className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Technician Access</h2>
          <p className="text-slate-400 text-sm mb-8">
            Restricted area. Please enter your <span className="text-white font-medium">Employee Token</span> or <span className="text-green-400 font-medium">Master Key</span>.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  setError(false);
                }}
                placeholder="Enter Access Code"
                className={`w-full bg-slate-950 border-2 rounded-xl px-4 py-4 text-lg text-white focus:outline-none focus:ring-2 transition-all placeholder:text-slate-600 font-mono tracking-widest text-center ${
                  error 
                  ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                  : 'border-slate-700 focus:border-green-500 focus:ring-green-500/20'
                }`}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-red-400 text-sm animate-in slide-in-from-top-2 fade-in">
                <AlertCircle className="w-4 h-4" />
                <span>Invalid access code. Please try again.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !accessCode}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20 mt-4 border border-green-500/50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Verify Credentials <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              Secured by New Age Protocol
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
