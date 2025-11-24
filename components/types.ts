
export interface ChatMessage {
  id: string;
  sender: 'user' | 'technician' | 'system' | 'ai';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED'
}

export interface AiDiagnosticResult {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  steps: string[];
}

export type UserRole = 'admin' | 'employee' | 'client' | null;
