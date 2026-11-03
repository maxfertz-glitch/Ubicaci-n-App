import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const run = async (fn) => {
    const { error } = await fn({ email: email.trim(), password });
    if (error) Alert.alert('Error', error.message);
  };
  return (
    <View style={s.box}>
      <Text style={s.title}>Ubicación</Text>
      <TextInput style={s.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Entrar" onPress={() => run((c) => supabase.auth.signInWithPassword(c))} />
      <View style={{ height: 8 }} />
      <Button title="Crear cuenta" onPress={() => run((c) => supabase.auth.signUp(c))} />
    </View>
  );
}
const s = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
});
