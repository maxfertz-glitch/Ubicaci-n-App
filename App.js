import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { supabase } from './src/lib/supabase';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <SafeAreaView style={styles.root}>
      {session ? <HomeScreen session={session} /> : <LoginScreen />}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#fff' } });
