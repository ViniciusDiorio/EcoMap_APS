/**
 * Cliente HTTP do aplicativo (camada cliente da arquitetura distribuída).
 * Todas as telas falam com a API REST exclusivamente pelos métodos do objeto
 * `api`, que passam pela função central request(). Endereço da API: config.ts.
 */
import { File } from 'expo-file-system';
import { API_URL, API_ORIGIN } from './config';
import type { DisposalPoint, Incident, User } from './types';

// Token JWT da sessão atual, mantido em memória. Quem define o valor é o
// AuthProvider (src/auth.tsx) após login, cadastro ou restauração da sessão.
let token: string | null = null;
export function setToken(value: string | null) {
  token = value;
}

/*
 * Ponto único de comunicação com a API. Centralizar aqui garante que toda
 * requisição:
 *  1. envie "Authorization: Bearer <token>" quando há sessão (rotas
 *     protegidas, validadas pelo middleware auth do backend);
 *  2. use Content-Type JSON, exceto no envio de FormData, em que o próprio
 *     fetch define o multipart/form-data com o boundary correto;
 *  3. padronize os erros: qualquer resposta fora da faixa 2xx vira um Error
 *     com a mensagem enviada pela API (campo "message"), que as telas exibem
 *     diretamente em um Alert. Falhas de rede (API inacessível) chegam às
 *     telas como o erro do próprio fetch ("Network request failed").
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || `Erro HTTP ${res.status}`);
  return data as T;
}

// Um método por rota da API (ver backend/src/server.js e docs/API.md).
export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => request<{ user: User }>('/me'),
  points: () => request<DisposalPoint[]>('/disposal-points'),
  incidents: () => request<Incident[]>('/incidents'),
  incident: (id: string) => request<Incident>(`/incidents/${id}`),
  stats: () =>
    request<{
      totalIncidents: number;
      resolved: number;
      open: number;
      disposalPoints: number;
      categories: { category: string; count: number }[];
    }>('/stats'),
  confirm: (id: string) => request<Incident>(`/incidents/${id}/confirm`, { method: 'POST' }),

  /*
   * Registro de ocorrência: os dados vão como multipart/form-data porque a
   * foto é enviada junto, no campo "image" que o multer do backend espera.
   * No React Native o arquivo é descrito por { uri, name, type }; o tipo MIME
   * precisa ser image/jpeg, image/png ou image/webp para passar no filtro de
   * imagens da API. Latitude e longitude vão como texto, pois o FormData só
   * transporta strings; o backend converte com Number().
   */
  createIncident: async (data: {
    category: string;
    title: string;
    description: string;
    severity: string;
    latitude: number;
    longitude: number;
    imageUri?: string;
  }) => {
    const form = new FormData();
    form.append('category', data.category);
    form.append('title', data.title);
    form.append('description', data.description);
    form.append('severity', data.severity);
    form.append('latitude', String(data.latitude));
    form.append('longitude', String(data.longitude));
    if (data.imageUri) {
      // O nome e o tipo MIME saem da extensão do arquivo, sem diferenciar
      // maiúsculas (o iPhone usa .JPG). Sem extensão conhecida, vale JPEG,
      // que é o formato gerado pela tela de nova ocorrência.
      const fileName = data.imageUri.split('/').pop() || 'evidence.jpg';
      const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
      const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const name = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? fileName : `${fileName}.jpg`;
      // Desde o Expo SDK 57 o fetch global do app é o do Expo, que monta o
      // multipart em JavaScript e não aceita mais o anexo só com { uri }
      // ("Unsupported FormDataPart implementation"). Ele lê o conteúdo por
      // bytes(), que aqui vem do arquivo local via expo-file-system. O uri,
      // o name e o type continuam no objeto: name e type viram o nome e o
      // Content-Type da parte, que o filtro de imagens da API confere.
      const imageUri = data.imageUri;
      form.append('image', {
        uri: imageUri,
        name,
        type,
        bytes: () => new File(imageUri).bytes(),
      } as any);
    }
    return request<Incident>('/incidents', { method: 'POST', body: form });
  },

  // A API guarda image_url como caminho relativo (/uploads/<arquivo>); aqui ele
  // é completado com o endereço do servidor para o componente Image.
  imageUrl: (path?: string | null) =>
    path ? (path.startsWith('http') ? path : `${API_ORIGIN}${path}`) : null,
};
