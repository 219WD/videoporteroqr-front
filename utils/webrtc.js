// utils/webrtc.js
export const createPeerConnection = (socket, callId) => {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },  // STUN básico
      { urls: 'stun:stun1.l.google.com:19302' }, // Fallback
      {
        urls: 'turn:openrelay.metered.ca:80',    // TURN gratis (sin auth)
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      // Agrega más si querés: https://www.metered.ca/ (gratis hasta 10GB/mes)
    ],
  });

  // Logs pa' debuggear (sacalos en prod)
  pc.onconnectionstatechange = () => {
    console.log('🧊 WebRTC state:', pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log('✅ ¡CONECTADO! Videos deberían verse ya');
    } else if (pc.connectionState === 'failed') {
      console.log('❌ Conexión falló – chequea firewall/red');
    }
  };

  pc.ontrack = (event) => {
    console.log('📹 Track recibido del otro lado');
    const remoteVideo = document.getElementById('remoteVideo') || event.target; // Ajusta al ID de tu <video>
    if (remoteVideo) {
      remoteVideo.srcObject = event.streams[0];
      remoteVideo.play().catch(e => console.log('Error play remote:', e));
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('🧊 Enviando ICE candidate');
      socket.emit('ice-candidate', { callId, candidate: event.candidate });
    }
  };

  // Agrega tus tracks de cámara/mic aquí (ejemplo)
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const localVideo = document.getElementById('localVideo');
      if (localVideo) localVideo.srcObject = stream;
    })
    .catch(err => console.error('Error cámara:', err));

  return pc;
};