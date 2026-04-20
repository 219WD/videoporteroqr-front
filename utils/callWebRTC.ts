// @ts-nocheck
import { RTCPeerConnection, mediaDevices } from 'react-native-webrtc';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function createCallPeerConnection({ onTrack, onIceCandidate, onConnectionStateChange }) {
  const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  if (typeof onTrack === 'function') {
    peerConnection.ontrack = onTrack;
  }

  if (typeof onIceCandidate === 'function') {
    peerConnection.onicecandidate = onIceCandidate;
  }

  if (typeof onConnectionStateChange === 'function') {
    peerConnection.onconnectionstatechange = onConnectionStateChange;
  }

  return peerConnection;
}

export async function getLocalCallStream() {
  try {
    return await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });
  } catch (error) {
    console.warn('[webrtc] fallback a audio-only stream:', error);
    return mediaDevices.getUserMedia({ audio: true, video: false });
  }
}
