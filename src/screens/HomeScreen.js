import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { isSharing, startSharing, stopSharing } from '../lib/locationTask';
import { pendingCount } from '../lib/offlineQueue';
import { registerPush, setSharingStatus, startWatchers } from '../lib/watchers';
import BackupScreen from './BackupScreen';
import MapScreen from './MapScreen';

export default function HomeScreen({ session }) {
  const [sharing, setSharing] = useState(false);
  const [code, setCode] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [viewers, setViewers] = useState(0);
  const [pending, setPending] = useState(0);
  const [showBackup, setShowBackup] = useState(false);

  const refresh = async () => {
    setSharing(await isSharing());
    const { count } = await supabase.from('shares').select('*', { count: 'exact', head: true }).eq('owner_id', session.user.id);
    setViewers(count ?? 0);
    setPending(await pendingCount());
  };
  useEffect(() => {
    refresh();
    registerPush(session.user.id).catch(() => {});
    const stop = startWatchers();
    const t = setInterval(async () => setPending(await pendingCount()), 10000);
    return () => { stop(); clearInterval(t); };
  }, []);

  const toggle = async () => {
    try {
      if (sharing) { await stopSharing(); await setSharingStatus(session.user.id, false); }
      else { await startSharing(); await setSharingStatus(session.user.id, true); }
    } catch (e) { Alert.alert('Ubicación', e.message); }
    refresh();
  };
  const createInvite = async () => {
    const { data, error } = await supabase.from('invites').insert({ owner_id: session.user.id }).select().single();
    error ? Alert.alert('Error', error.message) : setCode(data.code);
  };
  const acceptInvite = async () => {
    const { error } = await supabase.rpc('accept_invite', { p_code: inputCode });
    if (error) return Alert.alert('Error', error.message);
    setInputCode(''); Alert.alert('Listo', 'Ya podés ver su ubicación en el mapa.');
  };
  // Sin datos pero con señal de celular: manda la ubicación por SMS (la persona confirma el envío)
  const sendSms = async () => {
    if (!(await SMS.isAvailableAsync())) return Alert.alert('SMS', 'Este dispositivo no puede enviar SMS.');
    const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    const { latitude: la, longitude: lo, accuracy } = l.coords;
    await SMS.sendSMSAsync([], `Estoy acá (±${Math.round(accuracy)} m): https://maps.google.com/?q=${la.toFixed(6)},${lo.toFixed(6)}`);
  };
  const revokeAll = async () => {
    await supabase.from('shares').delete().eq('owner_id', session.user.id); refresh();
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Aviso siempre visible del estado de compartir */}
      <View style={[s.banner, { backgroundColor: sharing ? '#0a7d32' : '#666' }]}>
        <Text style={s.bannerText}>
          {sharing ? `Compartiendo tu ubicación con ${viewers} persona(s)` : 'No estás compartiendo tu ubicación'}
        </Text>
        <Button title={sharing ? 'Pausar' : 'Compartir'} color="#fff" onPress={toggle} />
      </View>

      {pending > 0 && <Text style={s.pending}>Sin conexión: {pending} posiciones guardadas, se envían al volver la señal</Text>}

      {showBackup ? <BackupScreen onClose={() => setShowBackup(false)} /> : <MapScreen session={session} />}

      <View style={s.panel}>
        <Button title="Invitar a alguien a verme" onPress={createInvite} />
        {code && <Text style={s.code}>Código: {code} (vence en 24 h)</Text>}
        <View style={s.row}>
          <TextInput style={s.input} placeholder="Código recibido" autoCapitalize="characters" value={inputCode} onChangeText={setInputCode} />
          <Button title="Ver" onPress={acceptInvite} />
        </View>
        <View style={s.row}>
          <View style={{ flex: 1 }}><Button title="Enviar ubicación por SMS" onPress={sendSms} /></View>
          <View style={{ flex: 1 }}><Button title="Si se apaga…" onPress={() => setShowBackup(true)} /></View>
        </View>
        {viewers > 0 && <Button title="Quitar acceso a todos" color="#b00020" onPress={revokeAll} />}
        <Button title="Salir" onPress={async () => { await stopSharing(); await setSharingStatus(session.user.id, false); supabase.auth.signOut(); }} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  bannerText: { color: '#fff', fontWeight: '600', flex: 1 },
  panel: { padding: 12, gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 },
  pending: { backgroundColor: '#fff3cd', color: '#664d03', padding: 8, textAlign: 'center' },
  code: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
});
