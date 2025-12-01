// context/VideoCallContext.tsx - VERSIÓN SIMPLIFICADA
import React, { createContext, ReactNode, useContext, useState } from 'react';

interface VideoCallContextType {
  isInCall: boolean;
  currentCall: any | null;
  joinCall: (callId: string, userId: string, role: 'host' | 'guest') => Promise<void>;
  leaveCall: () => void;
  answerCall: (callData: any) => void;
  initializeWebRTC: (callId: string, role: 'host' | 'guest') => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  localStream: any;
  remoteStream: any;
}

const VideoCallContext = createContext<VideoCallContextType | undefined>(undefined);

export function VideoCallProvider({ children }: { children: ReactNode }) {
  const [isInCall, setIsInCall] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  const joinCall = async (callId: string, userId: string, role: 'host' | 'guest') => {
    console.log(`🎥 Uniéndose a llamada ${callId} como ${role}`);
    setIsInCall(true);
    setCurrentCall({ callId, userId, role });
  };

  const leaveCall = () => {
    console.log('🎥 Saliendo de llamada');
    setIsInCall(false);
    setCurrentCall(null);
    setLocalStream(null);
    setRemoteStream(null);
  };

  const answerCall = (callData: any) => {
    console.log('🎥 Contestando llamada:', callData);
    setIsInCall(true);
    setCurrentCall(callData);
  };

  const initializeWebRTC = (callId: string, role: 'host' | 'guest') => {
    console.log(`🎥 Inicializando WebRTC para ${callId} como ${role}`);
    setIsInCall(true);
    setCurrentCall({ callId, role });
  };

  const toggleAudio = () => {
    console.log('🎤 Alternando audio');
  };

  const toggleVideo = () => {
    console.log('📹 Alternando video');
  };

  const value = {
    isInCall,
    currentCall,
    joinCall,
    leaveCall,
    answerCall,
    initializeWebRTC,
    toggleAudio,
    toggleVideo,
    localStream,
    remoteStream,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (context === undefined) {
    throw new Error('useVideoCall debe ser usado dentro de VideoCallProvider');
  }
  return context;
}