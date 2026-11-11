/**
 * Rota inicial ("/"). Aguarda o AuthProvider restaurar a sessão salva
 * (GET /me) e redireciona para as abas (/home) se houver usuário logado ou
 * para /login caso contrário.
 */
import { Redirect } from 'expo-router';
import { Loading } from '../src/ui';
import { useAuth } from '../src/auth';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Redirect href={user ? '/home' : '/login'} />;
}
