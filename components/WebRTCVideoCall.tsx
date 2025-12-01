// components/WebRTCVideoCall.tsx - VERSIÓN MÍNIMA Y SEGURA
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WebRTCVideoCallProps {
  userRole: 'host' | 'guest';
  callId: string;
}

const WebRTCVideoCall: React.FC<WebRTCVideoCallProps> = ({ userRole, callId }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎥 Video Llamada</Text>
      <Text style={styles.text}>Rol: {userRole}</Text>
      <Text style={styles.text}>ID: {callId}</Text>
      <Text style={styles.note}>
        Componente de video llamada - En desarrollo
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  title: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  note: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default WebRTCVideoCall;