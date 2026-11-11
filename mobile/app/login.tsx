/**
 * Tela de login (camada cliente). Envia e-mail e senha pelo signIn do
 * AuthProvider (POST /api/auth/login) e, em caso de sucesso, abre as abas.
 */
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, Field, styles, C } from '../src/ui';
import { useAuth } from '../src/auth';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  // busy desabilita o botão durante a requisição (evita envios duplicados).
  // Se a API recusar, a mensagem dela (via request()) aparece em um Alert e
  // os campos continuam preenchidos.
  const submit = async () => {
    try {
      setBusy(true);
      await signIn(email, password);
      router.replace('/home');
    } catch (e: any) {
      Alert.alert('Não foi possível entrar', e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={[styles.container, { justifyContent: 'center', flex: 1 }]}>
        <Text style={[styles.title, { fontSize: 34 }]}>EcoMap</Text>
        <Text style={styles.subtitle}>Jundiaí • informação ambiental colaborativa</Text>
        <View style={styles.card}>
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
          <Button title={busy ? 'Entrando...' : 'Entrar'} onPress={submit} disabled={busy} />
          <Button title="Criar uma conta" secondary onPress={() => router.push('/register')} />
        </View>
        <Text style={[styles.small, { textAlign: 'center' }]}>
          Demonstração: demo@ecomap.local / 123456
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
