import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const NotificationContext = createContext({
  permissionStatus: null,
  expoPushToken: null,
  requestPermissions: async () => {},
  sendLocalNotification: async () => {},
});

export function NotificationProvider({ children }) {
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const requestPermissions = useCallback(async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings?.granted) {
        setPermissionStatus(settings.status || 'granted');
      } else {
        const request = await Notifications.requestPermissionsAsync();
        setPermissionStatus(request.status || request.granted ? 'granted' : 'denied');
      }

      if (Platform.OS !== 'web') {
        const token = await Notifications.getExpoPushTokenAsync();
        if (mountedRef.current) {
          setExpoPushToken(token?.data || null);
        }
      }
    } catch (err) {
      console.warn('Notification permission request failed', err?.message || err);
      setPermissionStatus('unavailable');
    }
  }, []);

  const sendLocalNotification = useCallback(async ({ title, body, data } = {}) => {
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: title || 'WorldPass',
          body: body || 'You have an update',
          data: data || {},
        },
        trigger: null,
      });
    } catch (err) {
      console.warn('Failed to send local notification', err?.message || err);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({
    permissionStatus,
    expoPushToken,
    requestPermissions,
    sendLocalNotification,
  }), [permissionStatus, expoPushToken, requestPermissions, sendLocalNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
