// components/DoorbellNotificationHandler.tsx - VERSIÓN SOLO VIBRACIÓN
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Vibration } from "react-native";
import io from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import { useVideoCall } from "../context/VideoCallContext";

interface DoorbellCall {
  _id: string;
  guestName: string;
  guestEmail: string;
  hostId: string;
  createdAt: string;
  status: "pending" | "answered";
}

export default function DoorbellNotificationHandler() {
  const { user } = useContext(AuthContext);
  const { answerCall, isInCall } = useVideoCall();
  const socketRef = useRef<any>(null);
  const [isShowingAlert, setIsShowingAlert] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "host" || isInCall) {
      return;
    }

    console.log("🔔🔄 Iniciando notificaciones para host:", user.name);

    socketRef.current = io("https://videoporteroqr-back.onrender.com", {
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("🔔✅ Conectado al servidor");
      socketRef.current.emit("host-join", { hostId: user.id });
    });

    socketRef.current.on("call-incoming", (call: DoorbellCall) => {
      console.log("🔔📞 Llamada entrante:", call.guestName);

      if (call.hostId === user.id && !isShowingAlert && !isInCall) {
        handleIncomingCall(call);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, isShowingAlert, isInCall]);

  const handleIncomingCall = async (call: DoorbellCall) => {
    try {
      // Enviar notificación push
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 ¡Tienes una visita!",
          body: `${call.guestName} está en la puerta`,
          data: { 
            callId: call._id, 
            guestName: call.guestName,
            type: 'doorbell_call'
          },
          sound: true,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null,
      });

      // Solo vibración (más confiable que audio)
      playDoorbellVibration();

      // Mostrar alerta
      showDoorbellAlert(call);
    } catch (error) {
      console.error("🔔❌ Error en llamada entrante:", error);
    }
  };

  const playDoorbellVibration = () => {
    try {
      console.log("🔔🔊 Activando vibración...");
      Vibration.vibrate([1000, 500, 1000, 500, 1000], false);
      console.log("🔔🔊 Vibración activada");
    } catch (error) {
      console.error("🔔❌ Error con vibración:", error);
    }
  };

  const showDoorbellAlert = (call: DoorbellCall) => {
    if (isShowingAlert || isInCall) return;

    setIsShowingAlert(true);
    Vibration.cancel();

    Alert.alert(
      "🔔 ¡Tienes una visita!",
      `${call.guestName} (${call.guestEmail}) está en la puerta`,
      [
        {
          text: "Rechazar",
          style: "destructive",
          onPress: () => handleCallResponse(call._id, false),
        },
        {
          text: "Aceptar",
          onPress: () => handleCallResponse(call._id, true, call),
        },
      ],
      {
        cancelable: false,
        onDismiss: () => setIsShowingAlert(false),
      }
    );
  };

// En handleCallResponse, asegurar que el host se una correctamente:
const handleCallResponse = async (callId: string, accepted: boolean, callData?: DoorbellCall) => {
  if (socketRef.current) {
    socketRef.current.emit("call-response", {
      callId,
      response: accepted ? "accept" : "reject",
    });
  }

  if (accepted && callData) {
    // Asegurarnos de que el socket esté conectado
    if (!socketRef.current.connected) {
      console.log('🔄 Reconectando socket...');
      socketRef.current.connect();
    }

    // Unirse a la sala de llamada
    console.log(`🎥 Uniéndose a sala ${callData._id} como host`);
    socketRef.current.emit("join-call-room", {
      callId: callData._id,
      userType: "host",
      userId: user?.id
    });

    // Esperar un momento y luego navegar
    setTimeout(() => {
      answerCall(callData);
      router.push({
        pathname: "/video-call/host",
        params: { callId: callData._id }
      });
    }, 500);
  }

  setIsShowingAlert(false);
};

  return null;
}