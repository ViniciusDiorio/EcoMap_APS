/**
 * Detalhe de um ponto de descarte (camada cliente): materiais aceitos,
 * horário de funcionamento e coordenadas. Aberto pelo mapa ou pela aba
 * Descarte, recebendo o id do ponto pela rota.
 */
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api';
import type { DisposalPoint } from '../../src/types';
import { C, styles, Loading, Button } from '../../src/ui';

export default function Point() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [point, setPoint] = useState<DisposalPoint>();
  const router = useRouter();
  // Busca a lista de pontos (GET /api/disposal-points) e seleciona o ponto
  // pelo id recebido na rota.
  useEffect(() => {
    if (id)
      api
        .points()
        .then((allPoints) => setPoint(allPoints.find((candidate) => candidate.id === id)));
  }, [id]);
  if (!point) return <Loading />;
  return (
    <ScrollView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>{point.name}</Text>
        <Text style={styles.subtitle}>{point.address}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Materiais aceitos</Text>
          <Text style={{ fontSize: 16, color: C.dark }}>{point.materials.join(' • ')}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Horário</Text>
          <Text style={{ color: '#42554C' }}>{point.opening_hours || 'Não informado'}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Localização</Text>
          <Text style={styles.small}>
            {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
          </Text>
        </View>
        <Button title="Voltar" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
