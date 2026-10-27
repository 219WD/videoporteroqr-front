import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type AppModalAction = {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'destructive';
};

type AppModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  children?: React.ReactNode;
  actions?: AppModalAction[];
  onClose: () => void;
};

export default function AppModal({ visible, title, message, children, actions, onClose }: AppModalProps) {
  const modalActions = actions?.length ? actions : [{ label: 'Aceptar' }];

  const handleAction = async (action: AppModalAction) => {
    onClose();
    await action.onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}

          <View style={styles.actions}>
            {modalActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.action, action.variant === 'secondary' && styles.secondaryAction]}
                onPress={() => void handleAction(action)}
                accessibilityRole="button"
              >
                <Text style={[styles.actionText, action.variant === 'secondary' && styles.secondaryActionText]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FAFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    color: '#3D3D3D',
    fontSize: 20,
    fontFamily: 'BaiJamjuree-Bold',
  },
  message: {
    marginTop: 10,
    color: '#666',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'BaiJamjuree',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },
  action: {
    minWidth: 92,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
  },
  secondaryAction: {
    backgroundColor: '#F1F1F1',
  },
  actionText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
  },
  secondaryActionText: {
    color: '#555',
  },
});
