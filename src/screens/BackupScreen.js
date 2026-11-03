// Guía de respaldo: con el teléfono apagado ninguna app puede funcionar.
// Solo las redes de Apple y Google lo logran, y hay que dejarlas activadas antes.
import { Button, Linking, Platform, ScrollView, StyleSheet, Text } from 'react-native';

const IOS = [
  'Ajustes > [tu nombre] > Buscar > Buscar mi iPhone: activado.',
  'Dentro, activá "Red de Buscar": permite encontrarlo sin datos y hasta ~24 h después de apagado (iPhone 11 o más nuevo).',
  'Activá "Enviar última ubicación": manda la posición cuando la batería está por agotarse.',
  'Para buscarlo: icloud.com/find desde cualquier navegador o la app Buscar de otro dispositivo Apple.',
];
const ANDROID = [
  'Ajustes > Google > Todos los servicios > Encontrar dispositivo: activado.',
  'En "Red de Encontrar", elegí "Con red en todas las áreas" para que otros Android cercanos lo detecten sin datos.',
  'Algunos modelos (Pixel 8 en adelante) se pueden encontrar varias horas después de apagarse.',
  'Para buscarlo: google.com/android/find desde cualquier navegador.',
];

export default function BackupScreen({ onClose }) {
  const steps = Platform.OS === 'ios' ? IOS : ANDROID;
  return (
    <ScrollView contentContainerStyle={s.box}>
      <Text style={s.title}>Si el celular se apaga</Text>
      <Text style={s.p}>
        Con el teléfono apagado ninguna app puede enviar la ubicación. Esta app guarda la última posición
        (incluso la que manda cuando la batería baja) y avisa a tu familia si deja de reportar.
        Para seguir encontrándolo apagado, activá también el servicio del sistema:
      </Text>
      {steps.map((t, i) => <Text key={i} style={s.step}>{i + 1}. {t}</Text>)}
      <Button title="Abrir Ajustes" onPress={() => Linking.openSettings()} />
      <Button title="Volver al mapa" onPress={onClose} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  box: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  p: { fontSize: 15, lineHeight: 21 },
  step: { fontSize: 15, lineHeight: 21, paddingLeft: 4 },
});
