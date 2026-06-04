import React, { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../utils/socket';
import { createLogger } from '../utils/logger';

const log = createLogger('websocket-bridge');

export default function WebSocketBridge() {
  const { user } = useContext(AuthContext);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      const currentUser = userRef.current;
      const hostId = currentUser?.id || null;
      log.info('connect', { socketId: socket.id || null, hostId });
      if (!hostId) {
        return;
      }

      log.info('host:join', {
        socketId: socket.id || null,
        hostId,
        hostName: currentUser?.name || 'Anfitrión',
      });
      socket.emit('host:join', {
        hostId,
        userId: hostId,
        hostName: currentUser?.name || 'Anfitrión',
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', (reason: string) => {
      log.info('disconnect', { socketId: socket.id || null, reason: reason || null });
    });

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socketRef.current?.off('connect', handleConnect);
      socketRef.current?.disconnect();
      disconnectSocket();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    const currentUser = userRef.current;
    const hostId = currentUser?.id || null;

    if (!socket || !hostId || !socket.connected) {
      return;
    }

    socket.emit('host:join', {
      hostId,
      userId: hostId,
      hostName: currentUser?.name || 'Anfitrión',
    });
  }, [user?.id, user?.name]);

  return null;
}
