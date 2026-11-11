/**
 * Endereço da API usado pelo aplicativo.
 * EXPO_PUBLIC_API_URL vem do arquivo mobile/.env (criado pelo script de
 * instalação com o IPv4 do computador que roda o backend) e é embutido pelo
 * Expo no momento em que o app é empacotado. Assim o IP muda sem alterar o
 * código; o valor fixo abaixo é usado só quando o .env não existe.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.25:3333/api';

// Origem do servidor (sem o sufixo /api), usada para montar a URL das imagens
// servidas em /uploads.
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');
