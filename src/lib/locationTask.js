// Tarea de segundo plano: recibe posiciones del sistema y las sube a Supabase.
// Si no hay datos, las guarda en el teléfono y las sube cuando vuelve la señal.
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { enqueue, flushQueue } from './offlineQueue';
import { supabase } from './supabase';

export const LOCATION_TASK = 'compartir-ubicacion';
const LOW_BATTERY = 0.15;

async function batteryLevel() {
  try { const l = await Battery.getBatteryLevelAsync(); return l >= 0 ? l : null; } catch { return null; }
}

// Sube filas; si falla (sin datos), las deja en la cola local.
export async function sendRows(rows) {
  await flushQueue(); // primero lo pendiente, para mantener el orden
  const { error } = await supabase.from('locations').insert(rows);
  if (error) await enqueue(rows);
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  // getSession lee la sesión guardada en el teléfono, sin necesitar internet
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const battery = await batteryLevel();
  const rows = data.locations.map((l) => ({
    user_id: session.user.id,
    lat: l.coords.latitude,
    lng: l.coords.longitude,
    accuracy_m: l.coords.accuracy,
    speed: l.coords.speed,
    battery,
    low_battery: battery != null && battery <= LOW_BATTERY,
    recorded_at: new Date(l.timestamp).toISOString(),
  }));
  await sendRows(rows);
});

// Envía la posición actual ya mismo (se usa cuando la batería baja).
export async function sendNow(reason) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
  const battery = await batteryLevel();
  await sendRows([{
    user_id: session.user.id, lat: l.coords.latitude, lng: l.coords.longitude,
    accuracy_m: l.coords.accuracy, speed: l.coords.speed, battery,
    low_battery: reason === 'low_battery', recorded_at: new Date(l.timestamp).toISOString(),
  }]);
}

export async function startSharing() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('Sin permiso de ubicación');
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') throw new Error('Activá "Permitir siempre" para compartir en segundo plano');
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation, // máxima precisión de GPS (no necesita internet)
    timeInterval: 5000,      // Android: cada ~5 s
    distanceInterval: 5,     // o cada 5 m de movimiento
    deferredUpdatesInterval: 0,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true, // iOS: barra azul visible
    foregroundService: {     // Android: notificación fija y visible
      notificationTitle: 'Compartiendo tu ubicación',
      notificationBody: 'Tu familia puede ver dónde estás. Abrí la app para pausarlo.',
      killServiceOnDestroy: false,
    },
  });
}

export async function stopSharing() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export const isSharing = () => Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
