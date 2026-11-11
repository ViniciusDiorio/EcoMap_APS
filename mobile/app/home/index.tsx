/**
 * Aba Mapa (camada cliente): exibe no mapa os pontos de descarte e as
 * ocorrências vindos da API, com filtro por tipo, e dá acesso ao registro de
 * uma nova ocorrência pelo botão "+".
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View, Pressable } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { api } from '../../src/api';
import type { DisposalPoint, Incident } from '../../src/types';
import { C, styles, Loading } from '../../src/ui';

// Região padrão: centro de Jundiaí. É usada enquanto a localização não chega
// e quando o usuário não concede a permissão de localização.
const JUNDIAI = {
  latitude: -23.1857,
  longitude: -46.8842,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};
const MARKER_ICONS: any = { DISPOSAL: '♻️', INCIDENT: '⚠️' };

export default function MapScreen() {
  const router = useRouter();
  const [points, setPoints] = useState<DisposalPoint[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [region, setRegion] = useState(JUNDIAI);
  const [filter, setFilter] = useState<'ALL' | 'DISPOSAL' | 'INCIDENT'>('ALL');
  const [loading, setLoading] = useState(true);

  /*
   * Carga inicial do mapa:
   *  1. busca pontos de descarte e ocorrências em paralelo (Promise.all);
   *  2. pede a permissão de localização; se concedida, centraliza o mapa na
   *     posição do usuário, mantendo o zoom da região padrão;
   *  3. sem permissão, o mapa permanece centralizado em Jundiaí.
   * Se a API não responder (IP errado, firewall, outra rede), a falha é
   * informada em um Alert "Conexão" com a mensagem do request().
   */
  useEffect(() => {
    (async () => {
      try {
        const [loadedPoints, loadedIncidents] = await Promise.all([api.points(), api.incidents()]);
        setPoints(loadedPoints);
        setIncidents(loadedIncidents);
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setRegion({
            ...JUNDIAI,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (e: any) {
        Alert.alert('Conexão', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtros Tudo / Descarte / Ocorrências: os dois tipos são convertidos para
  // um formato único de marcador; "Descarte" omite as ocorrências e
  // "Ocorrências" omite os pontos. useMemo evita refazer a lista a cada render.
  const markers = useMemo(() => {
    const markerList: any[] = [];
    if (filter !== 'INCIDENT')
      markerList.push(
        ...points.map((point) => ({
          id: point.id,
          type: 'DISPOSAL',
          lat: point.latitude,
          lng: point.longitude,
          title: point.name,
          desc: point.materials.join(', '),
        })),
      );
    if (filter !== 'DISPOSAL')
      markerList.push(
        ...incidents.map((incident) => ({
          id: incident.id,
          type: 'INCIDENT',
          lat: incident.latitude,
          lng: incident.longitude,
          title: incident.title,
          desc: incident.category,
        })),
      );
    return markerList;
  }, [points, incidents, filter]);

  if (loading) return <Loading />;
  return (
    <View style={styles.screen}>
      <MapView style={{ flex: 1 }} initialRegion={region} region={region} showsUserLocation>
        <>
          {/* Tocar no balão do marcador abre o detalhe da ocorrência ou do ponto. */}
          {markers.map((marker) => (
            <Marker
              key={`${marker.type}-${marker.id}`}
              coordinate={{ latitude: marker.lat, longitude: marker.lng }}
              title={`${MARKER_ICONS[marker.type]} ${marker.title}`}
              description={marker.desc}
              onCalloutPress={() =>
                marker.type === 'INCIDENT'
                  ? router.push({ pathname: '/home/ocorrencia', params: { id: marker.id } })
                  : router.push({ pathname: '/home/ponto', params: { id: marker.id } })
              }
            />
          ))}
        </>
      </MapView>
      <View style={{ position: 'absolute', top: 18, left: 16, right: 16 }}>
        <View style={[styles.card, { padding: 12, marginBottom: 8 }]}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.dark }}>EcoMap Jundiaí</Text>
          <Text style={styles.small}>Mapa colaborativo ambiental</Text>
          <View style={{ flexDirection: 'row', gap: 7, marginTop: 10 }}>
            {[
              ['ALL', 'Tudo'],
              ['DISPOSAL', '♻️ Descarte'],
              ['INCIDENT', '⚠️ Ocorrências'],
            ].map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setFilter(value as any)}
                style={[styles.pill, filter === value && { backgroundColor: C.green }]}
              >
                <Text style={[styles.pillText, filter === value && { color: 'white' }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <Pressable
        onPress={() => router.push('/home/nova-ocorrencia')}
        style={{
          position: 'absolute',
          right: 18,
          bottom: 84,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: C.green,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 5,
        }}
      >
        <Text style={{ fontSize: 30, color: 'white' }}>+</Text>
      </Pressable>
    </View>
  );
}
