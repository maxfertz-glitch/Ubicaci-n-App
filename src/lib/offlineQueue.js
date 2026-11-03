// Cola local de posiciones que no se pudieron enviar por falta de datos.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEY = 'cola-ubicaciones';
const MAX = 5000; // ~7 h a una posición cada 5 s; se descartan las más viejas

async function read() {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]'); } catch { return []; }
}

export async function enqueue(rows) {
  const q = (await read()).concat(rows).slice(-MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
}

export async function pendingCount() {
  return (await read()).length;
}

// Sube lo pendiente en tandas de 500. Devuelve true si quedó vacía.
export async function flushQueue() {
  let q = await read();
  while (q.length) {
    const batch = q.slice(0, 500);
    const { error } = await supabase.from('locations').insert(batch);
    if (error) return false;
    q = q.slice(batch.length);
    await AsyncStorage.setItem(KEY, JSON.stringify(q));
  }
  return true;
}
