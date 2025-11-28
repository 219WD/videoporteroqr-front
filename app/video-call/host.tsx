// app/video-call/host.tsx - VERSIÓN SIMPLIFICADA
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import HostVideoCallSimple from '../../components/HostVideoCallSimple';
import { useVideoCall } from '../../context/VideoCallContext';

export default function HostVideoCallScreen() {
  const { leaveCall } = useVideoCall();

  const handleEndCall = () => {
    leaveCall();
    router.back();
  };

  return (
    <View style={styles.container}>
      <HostVideoCallSimple onEndCall={handleEndCall} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});