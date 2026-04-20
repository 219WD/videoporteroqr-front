// app/flow-response.tsx
import { router, useLocalSearchParams } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import io from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { SOCKET_URL } from '../utils/backend';
import { api } from '../utils/api';

export default function FlowResponseScreen() {
  const { user } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const {
    callId,
    actionType,
    guestName,
    message: initialMessage,
  } = params;

  const [response, setResponse] = useState<'accept' | 'reject' | null>(null);
  const [hostMessage, setHostMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [flowDetails, setFlowDetails] = useState<any>(null);

  useEffect(() => {
    // Conectar socket
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('🔌 Conectado al servidor para flujo');
    });

    setSocket(newSocket);

    // Cargar detalles del flujo
    loadFlowDetails();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const loadFlowDetails = async () => {
    try {
      const response = await api.get(`/flows/status/${callId}`);
      if (response.data.success) {
        setFlowDetails(response.data.call);
      }
    } catch (error) {
      console.error('Error cargando detalles:', error);
    }
  };

const handleSubmit = async () => {
  if (!response) {
    Alert.alert('Error', 'Por favor selecciona una opción');
    return;
  }

  setLoading(true);

  try {
    // Enviar respuesta
    const responsePayload = {
      callId,
      response,
      hostMessage: hostMessage.trim() || null,
    };

    // Por socket
    if (socket && socket.connected) {
      socket.emit('flow-response', responsePayload);
    }

    // Por API
    await api.post('/flows/respond', responsePayload);

    if (response === 'reject') {
      Alert.alert(
        '❌ Rechazado',
        'Has rechazado la solicitud',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    // Si es mensaje y acepta
    if (actionType === 'message') {
      Alert.alert(
        '✅ Respuesta enviada',
        hostMessage ? 'Tu mensaje ha sido enviado' : 'Confirmado recibido',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    // === SI ES VIDEOLLAMADA Y ACEPTA ===
    if (actionType === 'call') {
      // Mostrar pantalla de espera
      Alert.alert(
        '✅ Llamada aceptada',
        'Esperando que el visitante se conecte a la videollamada...\n\nEsto puede tomar unos segundos.',
        [{ text: 'Cancelar', style: 'cancel', onPress: () => router.back() }]
      );

      // Escuchar evento de que el guest entró a la sala
      if (socket) {
        socket.once('guest-joined-call', (data: any) => {
          if (data.callId === callId) {
            console.log('👤 Guest entró a la videollamada, conectando...');
            router.replace({
              pathname: '/video-call/host',
              params: { callId, guestName, fromFlow: 'true' }
            });
          }
        });

        // Timeout de seguridad (30 segundos)
        setTimeout(() => {
          if (socket) {
            socket.off('guest-joined-call');
          }
          Alert.alert(
            '⏰ Tiempo agotado',
            'El visitante no se conectó. Puedes cerrar esta pantalla.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }, 30000);
      }

      // Opcional: pedir estado actual
      socket?.emit('check-room-status', { callId });
    }

  } catch (error) {
    console.error('Error enviando respuesta:', error);
    Alert.alert('Error', 'No se pudo procesar la respuesta');
  } finally {
    setLoading(false);
  }
};

  const renderCallDetails = () => {
    if (!flowDetails) return null;

    return (
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>📋 Detalles del contacto</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Nombre:</Text>
          <Text style={styles.detailValue}>{flowDetails.guestName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{flowDetails.guestEmail}</Text>
        </View>
        {flowDetails.guestPhone && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Teléfono:</Text>
            <Text style={styles.detailValue}>{flowDetails.guestPhone}</Text>
          </View>
        )}
        {flowDetails.guestCompany && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Empresa:</Text>
            <Text style={styles.detailValue}>{flowDetails.guestCompany}</Text>
          </View>
        )}
        {flowDetails.messageContent && (
          <View style={styles.messageContainer}>
            <Text style={styles.detailLabel}>Mensaje:</Text>
            <Text style={styles.messageText}>{flowDetails.messageContent}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {actionType === 'call' ? '📞 Videollamada entrante' : '📝 Mensaje nuevo'}
          </Text>
          <Text style={styles.subtitle}>
            De: {guestName || 'Invitado'}
          </Text>
        </View>

        {renderCallDetails()}

        {initialMessage && !flowDetails?.messageContent && (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Mensaje:</Text>
            <Text style={styles.messageContent}>{initialMessage}</Text>
          </View>
        )}

        <View style={styles.responseSection}>
          <Text style={styles.responseTitle}>
            {actionType === 'call' 
              ? '¿Quieres aceptar la videollamada?'
              : '¿Cómo quieres responder?'}
          </Text>

          <View style={styles.responseButtons}>
            <TouchableOpacity
              style={[
                styles.responseButton,
                styles.rejectButton,
                response === 'reject' && styles.selectedButton,
              ]}
              onPress={() => setResponse('reject')}
            >
              <Text style={[
                styles.responseButtonText,
                response === 'reject' && styles.selectedButtonText,
              ]}>
                ❌ Rechazar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.responseButton,
                styles.acceptButton,
                response === 'accept' && styles.selectedButton,
              ]}
              onPress={() => setResponse('accept')}
            >
              <Text style={[
                styles.responseButtonText,
                response === 'accept' && styles.selectedButtonText,
              ]}>
                {actionType === 'call' ? '✅ Aceptar llamada' : '✅ Responder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {response === 'accept' && actionType === 'message' && (
          <View style={styles.messageInputContainer}>
            <Text style={styles.inputLabel}>Tu respuesta (opcional):</Text>
            <TextInput
              style={styles.messageInput}
              value={hostMessage}
              onChangeText={setHostMessage}
              placeholder="Escribe tu respuesta aquí..."
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>
              {hostMessage.length}/500 caracteres
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!response || loading) && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={!response || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              {response === 'accept'
                ? actionType === 'call'
                  ? 'Iniciar videollamada'
                  : 'Enviar respuesta'
                : 'Confirmar rechazo'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3D3D3D',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7D1522',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#3D3D3D',
    flex: 1,
  },
  messageContainer: {
    marginTop: 10,
  },
  messageText: {
    fontSize: 14,
    color: '#3D3D3D',
    lineHeight: 20,
    marginTop: 5,
  },
  messageCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D1E8FF',
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 10,
  },
  messageContent: {
    fontSize: 14,
    color: '#3D3D3D',
    lineHeight: 20,
  },
  responseSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D3D3D',
    marginBottom: 20,
    textAlign: 'center',
  },
  responseButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  responseButton: {
    flex: 1,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rejectButton: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  acceptButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  selectedButton: {
    borderColor: '#7D1522',
    backgroundColor: '#FFF0F0',
  },
  responseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedButtonText: {
    color: '#7D1522',
  },
  messageInputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D3D3D',
    marginBottom: 10,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  submitButton: {
    backgroundColor: '#7D1522',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
