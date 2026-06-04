import { io } from 'socket.io-client';
import { SOCKET_URL } from './backend';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: false,
      reconnection: true,
      autoConnect: false,
    });
  }

  return socket;
}

export function connectSocket() {
  const currentSocket = getSocket();
  if (!currentSocket.connected) {
    currentSocket.connect();
  }

  return currentSocket;
}

export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
}
