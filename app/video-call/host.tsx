// app/video-call/host.tsx - VERSIÓN CORREGIDA
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import WebRTCVideoCall from '../../components/WebRTCVideoCall';
import { useVideoCall } from '../../context/VideoCallContext';

export default function HostVideoCallScreen() {
  const params = useLocalSearchParams();
  const { callId, currentCall, leaveCall } = useVideoCall();
  
  // Extraer callId de los params si existe
  const resolvedCallId = (params.callId as string) || callId;

  useEffect(() => {
    // Si no hay callId, volver al dashboard
    if (!resolvedCallId) {
      router.back();
    }
  }, [resolvedCallId]);

  const handleEndCall = () => {
    leaveCall();
    router.replace('/dashboard/host');
  };

  if (!resolvedCallId) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No hay llamada activa</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Volver al Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebRTCVideoCall 
        userRole="host" 
        callId={resolvedCallId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFF',
    fontSize: 18,
    marginBottom: 20,
    fontFamily: 'BaiJamjuree',
  },
  button: {
    backgroundColor: '#7D1522',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'BaiJamjuree-Bold',
  },
});