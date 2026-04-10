import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Animated, Text, View, StyleSheet, TouchableOpacity } from 'react-native';

const ToastContext = createContext(null);

const COLORS = {
  success: { bg: '#1a7d41', border: '#27ae60', icon: '✅' },
  error:   { bg: '#b52a2a', border: '#e74c3c', icon: '❌' },
  info:    { bg: '#1a5fa8', border: '#2e86de', icon: 'ℹ️' },
  warning: { bg: '#b87800', border: '#f39c12', icon: '⚠️' },
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
        <Animated.View
          style={[styles.toast, { backgroundColor: theme.bg, borderLeftColor: theme.border, transform: [{ translateY: slideY }], opacity }]}
          pointerEvents="box-none"
        >
          <Text style={styles.icon}>{theme.icon}</Text>
          <View style={styles.textContainer}>
            {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
            {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
          </View>
          <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
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
    zIndex: 9999,
  },
  icon: { fontSize: 22, marginRight: 10 },
  textContainer: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  message: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  closeBtn: { padding: 4, marginLeft: 8 },
  closeText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 'bold' },
});
