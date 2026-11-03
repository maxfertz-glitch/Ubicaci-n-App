// Mapa en vivo: muestra la última posición de cada persona que te compartió su ubicación,
// con un círculo de precisión real (no un punto "exacto" engañoso).
import { Fragment, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { supabase } from '../lib/supabase';

const ago = (iso) => {
  const s = Math.round((Date.now() - new Date(iso)) / 1000);
  return s < 60 ? `hace ${s} s` : s < 3600 ? `hace ${Math.round(s / 60)} min` : `hace ${Math.round(s / 3600)} h`;
};

const STALE_MIN = 15;
const stale = (l) => Date.now() - new Date(l.recorded_at) > STALE_MIN * 60000;

export default function MapScreen({ session }) {
  const [people, setPeople] = useState({}); // user_id -> última ubicación
  const mapRef = useRef(null);

  useEffect(() => {
    let channel;
    (async () => {
      const { data: shares } = await supabase.from('shares').select('owner_id').eq('viewer_id', session.user.id);
      const ids = [session.user.id, ...(shares ?? []).map((x) => x.owner_id)];
      // Última posición conocida de cada uno
      const latest = {};
      for (const id of ids) {
        const { data } = await supabase.from('locations').select('*').eq('user_id', id).order('recorded_at', { ascending: false }).limit(1);
        if (data?.[0]) latest[id] = data[0];
      }
      setPeople(latest);
      // Actualizaciones en tiempo real (RLS filtra lo que no te compartieron)
      channel = supabase.channel('locs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'locations' }, ({ new: row }) =>
          setPeople((p) => (!p[row.user_id] || p[row.user_id].recorded_at < row.recorded_at ? { ...p, [row.user_id]: row } : p)))
        .subscribe();
    })();
    return () => { channel && supabase.removeChannel(channel); };
  }, [session.user.id]);

  const list = Object.values(people);
  useEffect(() => {
    if (list.length) mapRef.current?.fitToCoordinates(list.map((l) => ({ latitude: l.lat, longitude: l.lng })), { edgePadding: { top: 60, bottom: 60, left: 60, right: 60 } });
  }, [list.length]);

  return (
    <View style={{ flex: 1 }}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} showsUserLocation>
        {list.map((l) => (
          <Fragment key={l.user_id}>
            <Marker coordinate={{ latitude: l.lat, longitude: l.lng }}
              title={l.user_id === session.user.id ? 'Yo' : 'Familiar'}
              pinColor={stale(l) ? 'red' : undefined}
              description={`${stale(l) ? 'SIN SEÑAL · última vez ' : ''}${ago(l.recorded_at)} · ±${Math.round(l.accuracy_m ?? 0)} m`
                + (l.battery != null ? ` · batería ${Math.round(l.battery * 100)}%` : '')} />
            {l.accuracy_m ? <Circle center={{ latitude: l.lat, longitude: l.lng }} radius={l.accuracy_m}
              fillColor="rgba(30,120,255,0.15)" strokeColor="rgba(30,120,255,0.5)" /> : null}
          </Fragment>
        ))}
      </MapView>
      {!list.length && <Text style={s.empty}>Todavía no hay ubicaciones para mostrar</Text>}
    </View>
  );
}
const s = StyleSheet.create({ empty: { position: 'absolute', top: 16, alignSelf: 'center', backgroundColor: '#fffd', padding: 8, borderRadius: 8 } });
