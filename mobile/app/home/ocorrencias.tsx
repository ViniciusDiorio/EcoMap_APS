/**
 * Aba Ocorrências (camada cliente): lista as ocorrências registradas pela
 * comunidade (GET /api/incidents), das mais recentes para as mais antigas.
 * Tocar em um item abre o detalhe, onde é possível confirmar a ocorrência.
 */
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../src/api';
import type { Incident } from '../../src/types';
import { C, styles, Loading } from '../../src/ui';

// Tradução dos status da API para os rótulos exibidos no app.
const statusLabel: any = { REPORTED: 'Reportada', CONFIRMED: 'Confirmada', RESOLVED: 'Resolvida' };

export default function Incidents() {
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // Se a requisição falhar, a lista atual é mantida (sem Alert nesta tela).
  const load = useCallback(async () => {
    try {
      setItems(await api.incidents());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);
  // Recarrega sempre que a aba ganha foco, por exemplo ao voltar do detalhe
  // após uma confirmação ou do formulário após registrar uma ocorrência.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  if (loading) return <Loading />;
  return (
    // Pull to refresh: arrastar a lista para baixo chama load() e busca as
    // ocorrências mais recentes do servidor, inclusive as de outros usuários.
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Ocorrências</Text>
        <Text style={styles.subtitle}>Problemas ambientais registrados pela comunidade.</Text>
        {items.map((incident) => (
          <Pressable
            key={incident.id}
            onPress={() =>
              router.push({ pathname: '/home/ocorrencia', params: { id: incident.id } })
            }
            style={styles.card}
          >
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.dark }}>
                  {incident.title}
                </Text>
                <Text style={styles.small}>
                  {incident.category} • {incident.severity}
                </Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  {statusLabel[incident.status] || incident.status}
                </Text>
              </View>
            </View>
            <Text style={{ color: '#42554C', marginTop: 10 }} numberOfLines={2}>
              {incident.description}
            </Text>
            <Text style={[styles.small, { marginTop: 10 }]}>
              {incident.confirmations} confirmação(ões) • {incident.reporter_name || 'Usuário'}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
