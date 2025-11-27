import React, { createContext, useCallback, useContext, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ToastContext = createContext({
  showToast: () => {},
  hideToast: () => {},
});

const TOAST_CONFIGS = {
  success: {
    icon: 'checkmark-circle',
    color: '#22c55e',
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  error: {
    icon: 'close-circle',
    color: '#ef4444',
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  warning: {
    icon: 'warning',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  info: {
    icon: 'information-circle',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const insets = useSafeAreaInsets();

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [fadeAnim, slideAnim]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({ message, type });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (duration > 0) {
      timeoutRef.current = setTimeout(hideToast, duration);
    }
  }, [fadeAnim, slideAnim, hideToast]);

  const config = toast ? TOAST_CONFIGS[toast.type] || TOAST_CONFIGS.info : null;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            {
              top: insets.top + 10,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={hideToast}
            style={[
              styles.toast,
              {
                backgroundColor: config.backgroundColor,
                borderColor: config.borderColor,
              },
            ]}
          >
            <Ionicons name={config.icon} size={22} color={config.color} />
            <Text style={[styles.message, { color: config.color }]}>
              {toast.message}
            </Text>
            <TouchableOpacity 
              onPress={hideToast} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close notification"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color={config.color} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
