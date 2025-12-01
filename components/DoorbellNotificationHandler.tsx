// components/DoorbellNotificationHandler.tsx - VERSIÓN SIMPLIFICADA
// import { Audio } from "expo-av";
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
  const soundRef = useRef<Audio.Sound | null>(null);
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
      if (soundRef.current) {
        soundRef.current.unloadAsync();
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

      // Reproducir sonido local
      await playDoorbellSound();

      // Mostrar alerta
      showDoorbellAlert(call);
    } catch (error) {
      console.error("🔔❌ Error en llamada entrante:", error);
    }
  };

  const playDoorbellSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: "https://www.soundjay.com/buttons/sounds/beep-01a.mp3" },
        { shouldPlay: true, volume: 1.0 }
      );

      soundRef.current = sound;
      Vibration.vibrate([1000, 500, 1000], false);

    } catch (error) {
      console.error("🔔❌ Error con sonido:", error);
      Vibration.vibrate([1000, 500, 1000, 500, 1000], false);
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

  const handleCallResponse = async (callId: string, accepted: boolean, callData?: DoorbellCall) => {
    if (socketRef.current) {
      socketRef.current.emit("call-response", {
        callId,
        response: accepted ? "accept" : "reject",
      });
    }

    if (accepted && callData) {
      // Unirse a la sala de llamada
      if (socketRef.current) {
        socketRef.current.emit("join-call-room", {
          callId: callData._id,
          userType: "host",
          userId: user?.id
        });
      }

      // Pequeño delay para asegurar conexión
      setTimeout(() => {
        answerCall(callData);
        router.push("/video-call/host");
      }, 1000);
    }

    setIsShowingAlert(false);
  };

  return null;
}