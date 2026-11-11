/**
 * Layout raiz do Expo Router (camada cliente). O AuthProvider envolve todas
 * as rotas, então qualquer tela acessa a sessão por useAuth(). A navegação é
 * em pilha e sem cabeçalho; cada tela desenha o próprio título.
 */
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/auth';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
