/**
 * Aba Perfil (camada cliente): dados do usuário logado, totais gerais do
 * sistema (GET /api/stats), atalho para nova ocorrência e saída da sessão.
 */
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth';
import { api } from '../../src/api';
import { Button, C, styles } from '../../src/ui';

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>();
  // Se /stats falhar, os totais ficam como "-" em vez de interromper a tela.
  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch(() => {});
  }, []);
  return (
    <ScrollView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.subtitle}>Sua participação no EcoMap.</Text>
        <View style={styles.card}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: C.dark }}>{user?.name}</Text>
          <Text style={styles.small}>{user?.email}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Visão geral</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 23, fontWeight: '800', color: C.green }}>
                {stats?.disposalPoints ?? '-'}
              </Text>
              <Text style={styles.small}>Pontos de descarte</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 23, fontWeight: '800', color: C.green }}>
                {stats?.open ?? '-'}
              </Text>
              <Text style={styles.small}>Ocorrências abertas</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 23, fontWeight: '800', color: C.green }}>
                {stats?.resolved ?? '-'}
              </Text>
              <Text style={styles.small}>Resolvidas</Text>
            </View>
          </View>
        </View>
        <Button title="Nova ocorrência" onPress={() => router.push('/home/nova-ocorrencia')} />
        <Button
          title="Sair"
          secondary
          onPress={() => {
            Alert.alert('Sair', 'Deseja encerrar a sessão?', [
              { text: 'Cancelar' },
              {
                text: 'Sair',
                style: 'destructive',
                onPress: async () => {
                  await signOut();
                  router.replace('/login');
                },
              },
            ]);
          }}
        />
      </View>
    </ScrollView>
  );
}
