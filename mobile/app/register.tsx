/**
 * Tela de cadastro (camada cliente). Cria a conta pelo signUp do
 * AuthProvider (POST /api/auth/register); a API já devolve o token, então o
 * usuário entra direto nas abas sem precisar fazer login.
 */
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Field, styles } from '../src/ui';
import { useAuth } from '../src/auth';

export default function Register() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  // busy desabilita o botão durante a requisição (evita envios duplicados).
  // Se a API recusar, a mensagem dela (via request()) aparece em um Alert e
  // os campos continuam preenchidos.
  const submit = async () => {
    try {
      setBusy(true);
      await signUp(name, email, password);
      router.replace('/home');
    } catch (e: any) {
      Alert.alert('Não foi possível cadastrar', e.message);
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
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Participe do mapa ambiental de Jundiaí.</Text>
        <View style={styles.card}>
          <Field label="Nome" value={name} onChangeText={setName} />
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
          <Button title={busy ? 'Criando...' : 'Criar conta'} onPress={submit} disabled={busy} />
          <Button title="Voltar" secondary onPress={() => router.back()} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
