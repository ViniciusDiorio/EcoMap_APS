/**
 * Sessão do usuário no aplicativo (camada cliente).
 * O AuthProvider envolve todas as telas (app/_layout.tsx) e expõe, via
 * useAuth(), o usuário logado e as ações de entrar, cadastrar e sair.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setToken } from './api';
import type { User } from './types';

// Chave do token no SecureStore (armazenamento criptografado do sistema:
// Keychain no iOS, Keystore no Android), em vez de um armazenamento comum.
const TOKEN_KEY = 'ecomap_token';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

/*
 * Fluxo de autenticação no cliente:
 *  - signIn/signUp chamam POST /auth/login ou /auth/register; a API devolve
 *    { user, token }. O token é repassado ao request() (setToken), que passa a
 *    enviá-lo no cabeçalho Authorization, e é salvo no SecureStore.
 *  - Ao abrir o app, o efeito abaixo restaura a sessão: lê o token salvo e
 *    chama GET /me. Se der certo, o usuário entra direto; se o token estiver
 *    expirado ou inválido (ou a chamada falhar), o token é apagado e o app
 *    volta para o login. Enquanto isso, loading = true e app/index.tsx exibe
 *    o indicador de carregamento.
 *  - signOut limpa o estado, o token em memória e o SecureStore.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken) {
          setToken(storedToken);
          const session = await api.me();
          setUser(session.user);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const signIn = async (email: string, password: string) => {
    const session = await api.login({ email, password });
    setToken(session.token);
    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
    setUser(session.user);
  };
  const signUp = async (name: string, email: string, password: string) => {
    const session = await api.register({ name, email, password });
    setToken(session.token);
    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
    setUser(session.user);
  };
  const signOut = async () => {
    setUser(null);
    setToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  };
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
