/**
 * Barra de abas da área logada (/home): Mapa, Ocorrências, Descarte e Perfil.
 * As demais telas da pasta home (nova-ocorrencia, ocorrencia e ponto) são
 * abertas por navegação e ficam fora da barra.
 */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/ui';

/*
 * Telas que existem dentro das abas, mas não têm botão na barra.
 * No Expo Router 58 (Expo SDK 58) não se usa mais href: null para isso: uma
 * tela com href: null passou a ser tratada como oculta, e o router redireciona
 * para a primeira aba sempre que ela recebe o foco. O resultado era a tela
 * "piscar" e voltar ao Mapa ao tocar em "+". Telas não declaradas no layout
 * também não aparecem. Por isso as três são declaradas e só o botão da barra
 * é escondido (display: 'none'), o que mantém a navegação até elas.
 */
const HIDDEN_TAB = { tabBarItemStyle: { display: 'none' as const } };

export default function HomeLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: '#809087',
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 7 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ocorrencias"
        options={{
          title: 'Ocorrências',
          tabBarIcon: ({ color }) => <Ionicons name="warning" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="descarte"
        options={{
          title: 'Descarte',
          tabBarIcon: ({ color }) => <Ionicons name="leaf" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="nova-ocorrencia" options={HIDDEN_TAB} />
      <Tabs.Screen name="ocorrencia" options={HIDDEN_TAB} />
      <Tabs.Screen name="ponto" options={HIDDEN_TAB} />
    </Tabs>
  );
}
