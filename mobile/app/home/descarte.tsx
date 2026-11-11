/**
 * Aba Descarte (camada cliente): lista os pontos de descarte da API e permite
 * buscar o local adequado por material (ex.: bateria, papel), nome ou endereço.
 */
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api';
import type { DisposalPoint } from '../../src/types';
import { C, Field, styles, Loading } from '../../src/ui';

export default function Disposal() {
  const [points, setPoints] = useState<DisposalPoint[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    api
      .points()
      .then(setPoints)
      .finally(() => setLoading(false));
  }, []);
  // A busca é feita no próprio aparelho, sobre a lista já carregada: o texto
  // digitado é procurado, sem diferenciar maiúsculas, no nome, nos materiais
  // e no endereço de cada ponto.
  const filtered = useMemo(
    () =>
      points.filter((point) =>
        `${point.name} ${point.materials.join(' ')} ${point.address}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [points, query],
  );
  if (loading) return <Loading />;
  return (
    <ScrollView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Descarte correto</Text>
        <Text style={styles.subtitle}>Encontre um local adequado para o seu resíduo.</Text>
        <Field
          label="Pesquisar material ou local"
          placeholder="Ex.: bateria, papel, eletrônico..."
          value={query}
          onChangeText={setQuery}
        />
        {filtered.map((point) => (
          <Pressable
            key={point.id}
            onPress={() => router.push({ pathname: '/home/ponto', params: { id: point.id } })}
            style={styles.card}
          >
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.dark }}>{point.name}</Text>
            <Text style={styles.small}>{point.address}</Text>
            <Text style={{ marginTop: 10, color: '#42554C' }}>{point.materials.join(' • ')}</Text>
            <Text style={[styles.small, { marginTop: 8 }]}>{point.opening_hours}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
