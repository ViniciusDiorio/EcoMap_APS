/**
 * Detalhe de uma ocorrência e confirmação comunitária (camada cliente).
 * Recebe o id pela rota, carrega GET /api/incidents/:id e permite que o
 * usuário confirme que o problema existe (POST /api/incidents/:id/confirm).
 */
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/auth';
import { api } from '../../src/api';
import type { Incident } from '../../src/types';
import { Button, styles, Loading } from '../../src/ui';

export default function IncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Incident>();
  const router = useRouter();
  const { user } = useAuth();
  const load = () => id && api.incident(id).then(setItem);
  useEffect(() => {
    load();
  }, [id]);
  if (!item) return <Loading />;
  /*
   * Confirmação comunitária: a API aceita uma confirmação por usuário e
   * devolve a ocorrência já com o total recontado; com 3 confirmações o status
   * passa a "Confirmada". Se este usuário já confirmou, a API responde 409 e
   * a mensagem "Você já confirmou esta ocorrência." aparece no Alert.
   */
  const confirm = async () => {
    try {
      const updatedIncident = await api.confirm(item.id);
      setItem(updatedIncident);
      Alert.alert('Obrigado', 'Sua confirmação foi registrada.');
    } catch (e: any) {
      Alert.alert('Confirmação', e.message);
    }
  };
  return (
    <ScrollView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>
          {item.category} • {item.severity}
        </Text>
        {item.image_url && (
          <Image
            source={{ uri: api.imageUrl(item.image_url)! }}
            style={{ width: '100%', height: 220, borderRadius: 18, marginBottom: 14 }}
          />
        )}
        <View style={styles.card}>
          <Text style={{ color: '#42554C', fontSize: 15, lineHeight: 22 }}>{item.description}</Text>
          <View style={styles.divider} />
          <Text style={styles.small}>Reportado por {item.reporter_name || 'Usuário'}</Text>
          <Text style={[styles.small, { marginTop: 6 }]}>
            Localização: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
          </Text>
          <Text style={[styles.small, { marginTop: 6 }]}>Confirmações: {item.confirmations}</Text>
          <View style={{ marginTop: 12 }}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {item.status === 'RESOLVED'
                  ? 'Resolvida'
                  : item.status === 'CONFIRMED'
                    ? 'Confirmada'
                    : 'Reportada'}
              </Text>
            </View>
          </View>
        </View>
        {user && item.status !== 'RESOLVED' && (
          <Button title="Confirmar que o problema existe" onPress={confirm} />
        )}
        <Button title="Voltar" secondary onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
