/**
 * Tipos dos objetos trocados com a API. Os nomes dos campos seguem as colunas
 * das tabelas do SQLite, porque o backend devolve as linhas do banco em JSON.
 */
export type User = { id: string; name: string; email: string };

// materials chega como array: o backend converte o texto JSON da coluna.
export type DisposalPoint = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  materials: string[];
  opening_hours?: string;
};

// status: REPORTED | CONFIRMED | RESOLVED. reporter_name só vem nas rotas de
// consulta (GET /incidents e GET /incidents/:id), que fazem JOIN com users.
export type Incident = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  latitude: number;
  longitude: number;
  image_url?: string | null;
  status: string;
  confirmations: number;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
};
