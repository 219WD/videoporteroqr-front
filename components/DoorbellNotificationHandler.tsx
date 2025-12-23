// components/DoorbellNotificationHandler.tsx - VERSIÓN CON SONIDO OPTIMIZADA
import { Audio } from 'expo-av';
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Platform, Vibration } from "react-native";
import io from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import { useVideoCall } from "../context/VideoCallContext";
import { api } from "../utils/api";

// Configurar notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Sonidos disponibles
const DOORBELL_SOUND_URL =
  "https://res.cloudinary.com/dtxdv136u/video/upload/v1762718976/doorbell_ge9w5y.mp3";

const DOORBELL_SOUND_LOCAL = require('../assets/sounds/doorbell.mp3'); // Asegúrate que exista este archivo

interface DoorbellCall {
  _id: string;
  guestName: string;
  guestEmail: string;
  hostId: string;
  createdAt: string;
  status: "pending" | "answered";
  isAnonymous?: boolean;
  guestPhone?: string;
  guestCompany?: string;
  messageContent?: string;
  actionType?: "call" | "message";
  callType?: "video" | "message";
}

interface FlowNotification {
  type: "initial" | "message_details" | "start_videocall";
  actionType: "call" | "message";
  callId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCompany?: string;
  hasContactInfo?: boolean;
  messagePreview?: string;
  fullMessage?: string;
  urgency: "high" | "medium";
  requiresAction?: boolean;
  requiresResponse?: boolean;
  requiresAnswer?: boolean;
  timestamp: string;
  webUrl?: string;
}

export default function DoorbellNotificationHandler() {
  const { user } = useContext(AuthContext);
  const { answerCall, isInCall } = useVideoCall();
  const socketRef = useRef<any>(null);
  const [isShowingAlert, setIsShowingAlert] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isSoundLoaded, setIsSoundLoaded] = useState(false);
  const [soundSourceType, setSoundSourceType] = useState<'url' | 'local' | 'none'>('none');

  // Cargar el sonido del timbre con fallback URL → Local → Vibración
  useEffect(() => {
    loadDoorbellSoundWithFallback();

    return () => {
      unloadSound();
    };
  }, []);

  const configureAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false, // Suena por altavoz principal
      });
    } catch (error) {
      console.warn("No se pudo configurar el modo de audio:", error);
    }
  };

  const loadDoorbellSoundWithFallback = async () => {
    try {
      console.log("🔊 Intentando cargar sonido del timbre...");

      // Pedir permisos
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn("Permisos de audio no concedidos. Usando solo vibración.");
        setSoundSourceType('none');
        return;
      }

      // Configurar modo de audio
      await configureAudioMode();

      let sound: Audio.Sound | null = null;

      // 1. Primero intentar con URL remota
      try {
        console.log("🔊 Probando sonido desde URL remota...");
        const { sound: remoteSound } = await Audio.Sound.createAsync(
          { uri: DOORBELL_SOUND_URL },
          { shouldPlay: false, isLooping: true, volume: 1.0 }
        );
        sound = remoteSound;
        setSoundSourceType('url');
        console.log("🔊✅ Sonido cargado desde URL remota");
      } catch (urlError) {
        console.warn("🔊 URL remota falló, intentando archivo local...", urlError);

        // 2. Fallback al archivo local
        try {
          const { sound: localSound } = await Audio.Sound.createAsync(
            DOORBELL_SOUND_LOCAL,
            { shouldPlay: false, isLooping: true, volume: 1.0 }
          );
          sound = localSound;
          setSoundSourceType('local');
          console.log("🔊✅ Sonido cargado desde archivo local");
        } catch (localError) {
          console.error("🔊❌ Ambos sonidos fallaron (URL y local):", localError);
          setSoundSourceType('none');
          return;
        }
      }

      // Si llegamos aquí, el sonido se cargó correctamente
      soundRef.current = sound;
      setIsSoundLoaded(true);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish && !status.isLooping) {
          console.log("🔊 Sonido terminó (no looping)");
        }
      });

    } catch (error) {
      console.error("🔊❌ Error crítico cargando sonido:", error);
      setSoundSourceType('none');
    }
  };

  const unloadSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsSoundLoaded(false);
        console.log("🔊 Sonido descargado correctamente");
      }
    } catch (error) {
      console.error("🔊❌ Error descargando sonido:", error);
    }
  };

  const playDoorbellSound = async () => {
    try {
      if (!isSoundLoaded || !soundRef.current) {
        console.log("🔊 Sonido no cargado, intentando recargar...");
        await loadDoorbellSoundWithFallback();
      }

      if (soundRef.current) {
        console.log(`🔊 Reproduciendo timbre (${soundSourceType === 'url' ? 'URL' : 'local'})...`);
        await soundRef.current.stopAsync();
        await soundRef.current.playAsync();
        console.log("🔊✅ Timbre sonando en loop");
      } else {
        console.warn("🔊 No hay sonido disponible, usando vibración intensa");
        Vibration.vibrate([1000, 500, 1000, 500, 1000], true); // Repetir vibración
      }
    } catch (error) {
      console.error("🔊❌ Error reproduciendo sonido:", error);
      Vibration.vibrate([1000, 500, 1000, 500, 1000], true);
    }
  };

  const stopDoorbellSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        console.log("🔊 Timbre detenido");
      }
      Vibration.cancel();
    } catch (error) {
      console.error("🔊❌ Error deteniendo sonido:", error);
    }
  };

  // Registrar token de notificaciones push
  useEffect(() => {
    registerForPushNotifications();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "host" || isInCall) {
      return;
    }

    console.log("🔔🔄 Iniciando notificaciones para host:", user.name);

    socketRef.current = io("https://videoporteroqr-back.onrender.com", {
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("connect", () => {
      console.log("🔔✅ Conectado al servidor de notificaciones");
      socketRef.current.emit("host-join", { hostId: user.id });
      socketRef.current.emit("host-join-flows", { hostId: user.id });
    });

    socketRef.current.on("connect_error", (error: any) => {
      console.error("🔔❌ Error de conexión:", error);
    });

    // 1. Llamadas tradicionales (doorbell)
    socketRef.current.on("call-incoming", (call: DoorbellCall) => {
      console.log("🔔📞 Llamada entrante tradicional:", call.guestName);
      if (call.hostId === user.id && !isShowingAlert && !isInCall) {
        handleIncomingCall(call);
      }
    });

    // 2. Flujos de mensajes/videollamadas
    socketRef.current.on("flow-incoming", (flow: FlowNotification) => {
      console.log("🔔📝 Flujo entrante:", flow.actionType, flow.guestName);
      if (!isShowingAlert && !isInCall) {
        handleFlowNotification(flow);
      }
    });

    // 3. Detalles de mensaje (segunda notificación)
    socketRef.current.on("flow-message-details", (flow: FlowNotification) => {
      console.log("🔔📄 Detalles de mensaje:", flow.guestName);
      if (!isShowingAlert) {
        handleMessageDetails(flow);
      }
    });

    // 4. Iniciar videollamada desde flujo
    socketRef.current.on("flow-start-videocall", (flow: FlowNotification) => {
      console.log("🔔🎥 Iniciar videollamada desde flujo:", flow.guestName);
      if (!isShowingAlert && !isInCall) {
        handleStartVideocall(flow);
      }
    });

    // 5. Nuevo mensaje en conversación existente
    socketRef.current.on("new-flow-message", (data: any) => {
      console.log("🔔💬 Nuevo mensaje en conversación:", data.guestName);
      if (!isShowingAlert) {
        handleNewMessage(data);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, isShowingAlert, isInCall]);

  const registerForPushNotifications = async () => {
    if (!user || Platform.OS === "web") return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === "granted") {
        const token = (await Notifications.getExpoPushTokenAsync()).data;

        if (user.id && token) {
          await api.post("/auth/save-push-token", { pushToken: token });
          console.log("🔔✅ Token de notificaciones guardado");
        }
      }
    } catch (error) {
      console.error("🔔❌ Error registrando notificaciones:", error);
    }
  };

  // Manejar llamada tradicional
  const handleIncomingCall = async (call: DoorbellCall) => {
    try {
      await playDoorbellSound();
      playNotificationVibration("call");

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 ¡Tienes una visita!",
          body: `${call.guestName} está en la puerta`,
          data: {
            callId: call._id,
            guestName: call.guestName,
            type: "doorbell_call",
            guestEmail: call.guestEmail,
            guestPhone: call.guestPhone,
            guestCompany: call.guestCompany,
          },
          sound: true,
        },
        trigger: null,
      });

      showCallAlert(call);
    } catch (error) {
      console.error("🔔❌ Error en llamada entrante:", error);
    }
  };

  // Manejar notificación de flujo
  const handleFlowNotification = async (flow: FlowNotification) => {
    try {
      setCurrentNotification(flow);

      if (flow.actionType === "call" || flow.urgency === "high") {
        await playDoorbellSound();
      } else {
        playNotificationVibration("message");
      }

      if (flow.urgency === "high") {
        playNotificationVibration("call");
      } else {
        playNotificationVibration("message");
      }

      let title = flow.actionType === "call" ? "📞 Videollamada entrante" : "📝 Mensaje nuevo";
      let message = flow.actionType === "call"
        ? `${flow.guestName} quiere iniciar una videollamada${flow.guestCompany ? ` (${flow.guestCompany})` : ''}`
        : `${flow.guestName} tiene un mensaje para ti${flow.guestCompany ? ` (${flow.guestCompany})` : ''}`;

      Alert.alert(
        title,
        message,
        [
          {
            text: "Ver más tarde",
            style: "cancel",
            onPress: () => {
              setIsShowingAlert(false);
              stopDoorbellSound();
              if (flow.actionType === "message" && flow.callId) {
                markFlowAsSeen(flow.callId);
              }
            },
          },
          {
            text: flow.actionType === "call" ? "Ver llamada" : "Ver mensaje",
            onPress: () => {
              stopDoorbellSound();
              handleFlowAction(flow);
            },
          },
        ],
        {
          cancelable: false,
          onDismiss: () => {
            setIsShowingAlert(false);
            stopDoorbellSound();
          },
        }
      );

      setIsShowingAlert(true);
    } catch (error) {
      console.error("🔔❌ Error en notificación de flujo:", error);
    }
  };

  // Resto de handlers (sin cambios, solo se mantienen)
  const handleMessageDetails = async (flow: FlowNotification) => {
    try {
      playNotificationVibration("message");

      Alert.alert(
        "📝 Mensaje completo",
        `De ${flow.guestName}: ${flow.fullMessage || flow.messagePreview}`,
        [
          {
            text: "Cerrar",
            style: "cancel",
            onPress: () => {
              setIsShowingAlert(false);
              markFlowAsSeen(flow.callId);
            },
          },
          {
            text: "Responder",
            onPress: () => handleRespondToMessage(flow),
          },
        ],
        {
          cancelable: true,
          onDismiss: () => {
            setIsShowingAlert(false);
            markFlowAsSeen(flow.callId);
          },
        }
      );

      setIsShowingAlert(true);
    } catch (error) {
      console.error("🔔❌ Error en detalles de mensaje:", error);
    }
  };

  const handleStartVideocall = async (flow: FlowNotification) => {
    try {
      await playDoorbellSound();
      playNotificationVibration("call");

      Alert.alert(
        "📞 Videollamada lista",
        `${flow.guestName} espera para iniciar la videollamada`,
        [
          {
            text: "Rechazar",
            style: "destructive",
            onPress: () => {
              stopDoorbellSound();
              rejectVideocall(flow.callId);
            },
          },
          {
            text: "Unirse",
            onPress: () => {
              stopDoorbellSound();
              joinVideocall(flow);
            },
          },
        ],
        {
          cancelable: false,
          onDismiss: () => {
            setIsShowingAlert(false);
            stopDoorbellSound();
          },
        }
      );

      setIsShowingAlert(true);
    } catch (error) {
      console.error("🔔❌ Error en videollamada:", error);
    }
  };

  const handleNewMessage = async (data: any) => {
    try {
      playNotificationVibration("message");

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "💬 Nuevo mensaje",
          body: `${data.guestName}: ${data.message?.substring(0, 50)}...`,
          data: {
            callId: data.callId,
            guestName: data.guestName,
            type: "new_message",
            sender: data.sender,
          },
          sound: true,
        },
        trigger: null,
      });

      Alert.alert(
        "💬 Nuevo mensaje",
        `${data.guestName}: ${data.message?.substring(0, 100)}...`,
        [
          { text: "Cerrar", style: "cancel" },
          {
            text: "Ver conversación",
            onPress: () => {
              router.push({
                pathname: "/(tabs)/messages",
                params: { flowId: data.callId },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("🔔❌ Error en nuevo mensaje:", error);
    }
  };

  const playNotificationVibration = (type: "call" | "message") => {
    try {
      if (type === "call") {
        Vibration.vibrate([1000, 500, 1000, 500, 1000], false);
      } else {
        Vibration.vibrate([500, 300, 500], false);
      }
    } catch (error) {
      console.error("🔔❌ Error con vibración:", error);
    }
  };

  const showCallAlert = (call: DoorbellCall) => {
    if (isShowingAlert || isInCall) return;

    setIsShowingAlert(true);
    Vibration.cancel();

    let alertMessage = `${call.guestName} (${call.guestEmail}) está en la puerta`;
    if (call.guestPhone || call.guestCompany) {
      alertMessage += "\n\n";
      if (call.guestPhone) alertMessage += `📱 ${call.guestPhone}\n`;
      if (call.guestCompany) alertMessage += `🏢 ${call.guestCompany}`;
    }

    Alert.alert(
      "🔔 ¡Tienes una visita!",
      alertMessage,
      [
        {
          text: "Rechazar",
          style: "destructive",
          onPress: () => {
            stopDoorbellSound();
            handleCallResponse(call._id, false);
          },
        },
        {
          text: "Aceptar",
          onPress: () => {
            stopDoorbellSound();
            handleCallResponse(call._id, true, call);
          },
        },
      ],
      {
        cancelable: false,
        onDismiss: () => {
          setIsShowingAlert(false);
          stopDoorbellSound();
        },
      }
    );
  };

  const handleFlowAction = (flow: FlowNotification) => {
    setIsShowingAlert(false);

    router.push({
      pathname: "/flow-response",
      params: {
        callId: flow.callId,
        actionType: flow.actionType,
        guestName: flow.guestName,
      },
    });
  };

  const handleRespondToMessage = (flow: FlowNotification) => {
    setIsShowingAlert(false);
    router.push({
      pathname: "/flow-response",
      params: {
        callId: flow.callId,
        actionType: "message",
        guestName: flow.guestName,
        message: flow.fullMessage,
      },
    });
  };

  const joinVideocall = (flow: FlowNotification) => {
    setIsShowingAlert(false);

    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }

    if (socketRef.current) {
      socketRef.current.emit("flow-response", {
        callId: flow.callId,
        response: "accept",
      });

      socketRef.current.emit("join-call-room", {
        callId: flow.callId,
        userId: user?.id,
        userRole: "host",
      });
    }

    setTimeout(() => {
      router.push({
        pathname: "/video-call/host",
        params: {
          callId: flow.callId,
          guestName: flow.guestName,
          fromFlow: "true",
        },
      });
    }, 500);
  };

  const rejectVideocall = (callId: string) => {
    setIsShowingAlert(false);

    if (socketRef.current) {
      socketRef.current.emit("flow-response", {
        callId,
        response: "reject",
      });
    }
  };

  const handleCallResponse = async (callId: string, accepted: boolean, callData?: DoorbellCall) => {
    if (socketRef.current) {
      socketRef.current.emit("call-response", {
        callId,
        response: accepted ? "accept" : "reject",
      });
    }

    if (accepted && callData) {
      if (!socketRef.current.connected) {
        console.log("🔄 Reconectando socket...");
        socketRef.current.connect();
      }

      console.log(`🎥 Uniéndose a sala ${callData._id} como host`);
      socketRef.current.emit("join-call-room", {
        callId: callData._id,
        userType: "host",
        userId: user?.id,
      });

      setTimeout(() => {
        if (callData) {
          answerCall(callData);
        }
        router.push({
          pathname: "/video-call/host",
          params: { callId: callData._id },
        });
      }, 500);
    }

    setIsShowingAlert(false);
  };

  const markFlowAsSeen = async (callId: string) => {
    try {
      setCurrentNotification(null);
    } catch (error) {
      console.error("Error marcando flujo como visto:", error);
    }
  };

  return null;
}