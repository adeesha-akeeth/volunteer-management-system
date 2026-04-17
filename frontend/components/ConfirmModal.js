import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [config, setConfig] = useState(null);

  const show = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', destructive = false, onConfirm }) => {
    setConfig({ title, message, confirmText, cancelText, destructive, onConfirm });
  }, []);

  const dismiss = useCallback(() => setConfig(null), []);

  const handleConfirm = useCallback(async () => {
    const onConfirm = config?.onConfirm;
    dismiss();
    if (onConfirm) await onConfirm();
  }, [config, dismiss]);

  return (
    <ConfirmContext.Provider value={show}>
      {children}
      <Modal visible={!!config} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={[styles.iconCircle, config?.destructive ? styles.iconCircleRed : styles.iconCircleBlue]}>
              <Ionicons
                name={config?.destructive ? 'warning-outline' : 'help-circle-outline'}
                size={30}
                color={config?.destructive ? '#e74c3c' : '#2e86de'}
              />
            </View>
            <Text style={styles.title}>{config?.title}</Text>
            {config?.message ? <Text style={styles.message}>{config.message}</Text> : null}
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={dismiss}>
                <Text style={styles.cancelText}>{config?.cancelText || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, config?.destructive && styles.confirmBtnRed]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>{config?.confirmText || 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircleRed: { backgroundColor: '#fdecea' },
  iconCircleBlue: { backgroundColor: '#e8f4fd' },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#2e86de',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmBtnRed: {
    backgroundColor: '#e74c3c',
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
