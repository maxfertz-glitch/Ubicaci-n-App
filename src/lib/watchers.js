// Vigilantes que corren mientras la app está viva (también en segundo plano en Android,
// gracias al servicio de ubicación): batería baja, vuelta de la señal y notificaciones push.
import NetInfo from '@react-native-community/netinfo';
import * as Battery from 'expo-battery';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { flushQueue } from './offlineQueue';
import { isSharing, sendNow } from './locationTask';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export function startWatchers() {
  // 1) Al volver internet, subir lo que quedó guardado
  const unNet = NetInfo.addEventListener((s) => { if (s.isConnected && s.isInternetReachable !== false) flushQueue(); });

  // 2) Batería baja: mandar la posición ya, por si el teléfono se apaga
  let lastWarned = 1;
  const unBat = Battery.addBatteryLevelListener(async ({ batteryLevel }) => {
    const crossed = [0.15, 0.05].find((t) => batteryLevel <= t && lastWarned > t);
    if (crossed && (await isSharing())) { lastWarned = crossed; sendNow('low_battery').catch(() => {}); }
    if (batteryLevel > 0.2) lastWarned = 1;
  });

  return () => { unNet(); unBat.remove(); };
}

export async function setSharingStatus(userId, active) {
  await supabase.from('sharing_status').upsert({ user_id: userId, active, updated_at: new Date().toISOString() });
}

// Registra este teléfono para recibir avisos cuando alguien deja de reportar.
export async function registerPush(userId) {
  if (!Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alertas', { name: 'Alertas de ubicación', importance: Notifications.AndroidImportance.MAX });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await supabase.from('push_tokens').upsert({ token, user_id: userId, updated_at: new Date().toISOString() });
}
