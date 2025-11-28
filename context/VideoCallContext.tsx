// context/VideoCallContext.tsx - VERSIÓN SIMPLIFICADA
import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';

interface VideoCallContextType {
  isInCall: boolean;
  callId: string | null;
  currentCall: any | null;
  answerCall: (callData: any) => void;
  leaveCall: () => void;
}

const VideoCallContext = createContext<VideoCallContextType | undefined>(undefined);

export const VideoCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [currentCall, setCurrentCall] = useState<any>(null);

  const answerCall = async (callData: any) => {
    try {
      console.log("🎥 Contestando llamada:", callData);
      
      setCallId(callData._id);
      setCurrentCall(callData);
      setIsInCall(true);
      
      console.log("✅ Llamada contestada correctamente");
      
    } catch (error) {
      console.error("Error contestando llamada:", error);
      Alert.alert('Error', 'No se pudo contestar la llamada');
    }
  };

  const leaveCall = () => {
    console.log('📞 Saliendo de la llamada');
    
    setCallId(null);
    setCurrentCall(null);
    setIsInCall(false);
  };

  return (
    <VideoCallContext.Provider value={{
      isInCall,
      callId,
      currentCall,
      answerCall,
      leaveCall
    }}>
      {children}
    </VideoCallContext.Provider>
  );
};

export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (context === undefined) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};