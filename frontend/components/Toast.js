import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Animated, Text, View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ToastContext = createContext(null);

const COLORS = {
  success: { bg: '#1a7d41', border: '#27ae60', icon: 'checkmark-circle' },
  error:   { bg: '#b52a2a', border: '#e74c3c', icon: 'close-circle' },
  info:    { bg: '#1a5fa8', border: '#2e86de', icon: 'information-circle' },
  warning: { bg: '#b87800', border: '#f39c12', icon: 'warning' },
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const slideY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const showToast = useCallback((type, title, message) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      Animated.timing(slideY, { toValue: -100, duration: 0, useNativeDriver: true }).start();
    }

    setToast({ type, title, message });
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true })
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideY, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start(() => setToast(null));
    }, 3000);
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(slideY, { toValue: -100, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => setToast(null));
  }, []);

  const theme = toast ? (COLORS[toast.type] || COLORS.info) : COLORS.info;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <Modal visible transparent animationType="none" statusBarTranslucent>
          <View style={styles.modalContainer} pointerEvents="box-none">
            <Animated.View
              style={[styles.toast, { backgroundColor: theme.bg, borderLeftColor: theme.border, transform: [{ translateY: slideY }], opacity }]}
              pointerEvents="box-none"
            >
              <Ionicons name={theme.icon} size={22} color="#fff" style={styles.icon} />
              <View style={styles.textContainer}>
                {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
                {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
              </View>
              <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const show = useContext(ToastContext);
  return {
    success: (title, message) => show?.('success', title, message),
    error: (title, message) => show?.('error', title, message),
    info: (title, message) => show?.('info', title, message),
    warning: (title, message) => show?.('warning', title, message),
  };
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  toast: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 5,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  icon: { marginRight: 10 },
  textContainer: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  message: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  closeBtn: { padding: 4, marginLeft: 8 },
});
