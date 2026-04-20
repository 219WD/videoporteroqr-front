// @ts-nocheck
import React, { useContext, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { router } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import { SOCKET_URL } from '../utils/backend';

export default function CallSignalListener() {
  const { user } = useContext(AuthContext);
  const socketRef = useRef<any>(null);
  const lastInviteRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user-connected', {
        userId: user.id,
        userType: user.role,
      });
    });

    socket.on('call:invite', (payload) => {
      if (!payload?.callId || lastInviteRef.current === payload.callId) return;

      lastInviteRef.current = payload.callId;
      router.push({
        pathname: '/calls/[callId]',
        params: {
          callId: payload.callId,
          role: 'callee',
        },
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, user?.role]);

  return null;
}
