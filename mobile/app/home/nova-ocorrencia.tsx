/**
 * Formulário de nova ocorrência (camada cliente). Coleta categoria,
 * gravidade, título, descrição, localização e foto opcional e envia tudo à
 * API em POST /api/incidents (multipart/form-data, via api.createIncident).
 */
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { api } from '../../src/api';
import { Button, C, Field, styles } from '../../src/ui';

const INCIDENT_CATEGORIES = [
  'Descarte irregular',
  'Acúmulo de resíduos',
  'Bueiro obstruído',
  'Alagamento',
  'Queimada',
  'Árvore/área verde',
  'Outro problema',
];
const INCIDENT_SEVERITIES = ['Baixa', 'Média', 'Alta'];

// Padronização das fotos antes do envio (ver prepareImage abaixo).
const MAX_IMAGE_WIDTH = 1600;
const JPEG_QUALITY = 0.7;

/*
 * Converte a foto escolhida em um JPEG de no máximo 1600 px de largura.
 * Cada aparelho entrega a imagem de um jeito: o iPhone usa HEIC por padrão e
 * fotos de câmeras atuais passam facilmente de 5 MB. A API só aceita JPEG,
 * PNG ou WebP de até 5 MB (filtro e limite do multer), então sem esta etapa a
 * foto era descartada ou a requisição falhava. Convertida aqui, a imagem fica
 * com poucas centenas de KB e no formato aceito, em qualquer aparelho.
 */
async function prepareImage(asset: ImagePicker.ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_IMAGE_WIDTH) context.resize({ width: MAX_IMAGE_WIDTH });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return saved.uri;
}

export default function NewIncident() {
  const router = useRouter();
  const [category, setCategory] = useState(INCIDENT_CATEGORIES[0]);
  const [sev, setSev] = useState('Média');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState<string>();
  // Começa no centro de Jundiaí; é substituída pela posição real do aparelho
  // quando a permissão de localização é concedida.
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: -23.1857,
    longitude: -46.8842,
  });
  const [busy, setBusy] = useState(false);

  // Localização da ocorrência: pede a permissão ao abrir o formulário. Sem
  // permissão, nada é bloqueado e a ocorrência usa as coordenadas padrão.
  useEffect(() => {
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      }
    })();
  }, []);

  // Recebe o resultado da câmera ou da galeria, padroniza a foto e a exibe
  // no formulário. Se a conversão falhar, o usuário é avisado e pode enviar a
  // ocorrência sem foto.
  const handlePickedImage = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    try {
      setImage(await prepareImage(result.assets[0]));
    } catch (e: any) {
      Alert.alert('Foto', `Não foi possível processar a imagem: ${e.message}`);
    }
  };

  // Foto pela câmera: sem a permissão, o usuário é avisado e pode continuar
  // sem foto.
  const photo = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão', 'A câmera é necessária para tirar uma foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    await handlePickedImage(result);
  };

  // Foto da galeria: sem a permissão, o usuário é avisado (antes a ação só
  // não acontecia, sem explicação).
  const gallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão', 'O acesso às fotos é necessário para escolher uma imagem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    await handlePickedImage(result);
  };

  /*
   * Envio da ocorrência:
   *  - título e descrição são conferidos antes de chamar a API;
   *  - busy desabilita "Publicar ocorrência" durante o envio, evitando
   *    ocorrências duplicadas por toques repetidos;
   *  - api.createIncident monta o FormData com os campos, as coordenadas e a
   *    foto; a API grava a ocorrência como REPORTED e responde 201;
   *  - em caso de sucesso, um Alert confirma e o OK volta à tela anterior;
   *  - em caso de falha, o Alert mostra a mensagem da API e o formulário NÃO é
   *    limpo, então o usuário pode tentar de novo sem redigitar nada.
   */
  const submit = async () => {
    if (!title || !desc)
      return Alert.alert('Campos obrigatórios', 'Informe um título e uma descrição.');
    try {
      setBusy(true);
      await api.createIncident({
        category,
        title,
        description: desc,
        severity: sev,
        ...coords,
        imageUri: image,
      });
      Alert.alert('Ocorrência enviada', 'O registro foi salvo no servidor.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Nova ocorrência</Text>
        <Text style={styles.subtitle}>Registre um problema ambiental encontrado na cidade.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Categoria</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {INCIDENT_CATEGORIES.map((categoryOption) => (
              <Text
                onPress={() => setCategory(categoryOption)}
                key={categoryOption}
                style={[
                  styles.pill,
                  {
                    backgroundColor: category === categoryOption ? C.green : C.light,
                    color: category === categoryOption ? 'white' : C.green,
                  },
                ]}
              >
                {categoryOption}
              </Text>
            ))}
          </View>
          <Text style={styles.label}>Gravidade</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {INCIDENT_SEVERITIES.map((severityOption) => (
              <Text
                onPress={() => setSev(severityOption)}
                key={severityOption}
                style={[
                  styles.pill,
                  {
                    backgroundColor: sev === severityOption ? C.green : C.light,
                    color: sev === severityOption ? 'white' : C.green,
                  },
                ]}
              >
                {severityOption}
              </Text>
            ))}
          </View>
          <Field
            label="Título"
            placeholder="Ex.: Bueiro coberto por resíduos"
            value={title}
            onChangeText={setTitle}
          />
          <Field
            label="Descrição"
            placeholder="Descreva o que foi encontrado..."
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={styles.label}>Localização</Text>
          <Text style={styles.small}>
            {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </Text>
          <View style={[styles.row, { marginTop: 14 }]}>
            <View style={{ flex: 1 }}>
              <Button title="Tirar foto" secondary onPress={photo} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Galeria" secondary onPress={gallery} />
            </View>
          </View>
          {image && (
            <Image
              source={{ uri: image }}
              style={{ width: '100%', height: 190, borderRadius: 14, marginBottom: 12 }}
            />
          )}
          <Button
            title={busy ? 'Enviando...' : 'Publicar ocorrência'}
            onPress={submit}
            disabled={busy}
          />
          <Button title="Cancelar" secondary onPress={() => router.back()} />
        </View>
      </View>
    </ScrollView>
  );
}
