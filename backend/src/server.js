/**
 * EcoMap Jundiaí - API REST (camada servidor da arquitetura distribuída).
 * Único processo Node.js que recebe as requisições HTTP/JSON do aplicativo
 * móvel, aplica as regras de negócio e persiste os dados no SQLite
 * (backend/data/ecomap.db) e as imagens das ocorrências em backend/uploads/.
 */
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

// ===========================================================================
// Configuração
// ===========================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const uploadsDir = path.join(root, 'uploads');

// As pastas do banco e das imagens são criadas na primeira execução, então o
// projeto pode ser copiado sem elas (não vão para o repositório).
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// PORT e JWT_SECRET vêm das variáveis de ambiente (ver backend/.env.example).
// O server.js não carrega o arquivo .env sozinho: sem as variáveis definidas,
// valem os padrões abaixo. Os scripts iniciar-windows.bat e iniciar.sh
// carregam o backend/.env antes de executar "npm run dev".
const DEFAULT_PORT = 3333;
const PORT = Number(process.env.PORT || DEFAULT_PORT);
const JWT_SECRET = process.env.JWT_SECRET || 'ecomap-development-secret';

// Segurança das credenciais (LGPD): a senha nunca é gravada em texto puro,
// somente o hash bcrypt com custo 10; o token JWT expira em 7 dias, limitando
// o tempo de uso de um token vazado.
const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

const JSON_BODY_LIMIT = '2mb';

// Upload de imagens: até 5 MB e apenas JPEG, PNG ou WebP, para impedir que
// arquivos grandes ou de outro tipo sejam gravados no servidor.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = /^image\/(jpeg|png|webp|jpg)$/i;

// Regra de validação comunitária: com 3 confirmações de usuários diferentes a
// ocorrência deixa de ser apenas "reportada" e passa a CONFIRMED.
const CONFIRMATIONS_TO_VALIDATE = 3;
const INCIDENT_STATUSES = ['REPORTED', 'CONFIRMED', 'RESOLVED'];

// ===========================================================================
// Banco de dados
// ===========================================================================

/*
 * Decisão técnica: acesso SÍNCRONO ao SQLite (DatabaseSync, nativo do Node.js
 * 22.13+) dentro de um único processo. Como nenhuma rota faz "await" entre as
 * instruções SQL, todas as instruções de uma requisição terminam antes de o
 * event loop atender a próxima. Assim, requisições simultâneas de vários
 * celulares são serializadas pelo próprio servidor, o que evita condições de
 * corrida (por exemplo, duas confirmações recalculando o contador ao mesmo
 * tempo) sem precisar de locks explícitos.
 */
const db = new DatabaseSync(path.join(dataDir, 'ecomap.db'));

/*
 * Cria as tabelas na primeira execução (CREATE TABLE IF NOT EXISTS) e insere
 * os dados de demonstração quando as tabelas estão vazias.
 * PRAGMA foreign_keys = ON: o SQLite vem com as chaves estrangeiras
 * desativadas; ativá-las garante que uma ocorrência sempre pertence a um
 * usuário existente e que as confirmações são removidas em cascata (ON DELETE
 * CASCADE) junto com a ocorrência ou o usuário.
 * UNIQUE(incident_id, user_id) em confirmations impede, no próprio banco, que
 * o mesmo usuário confirme a mesma ocorrência mais de uma vez.
 */
function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS disposal_points (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      materials TEXT NOT NULL,
      opening_hours TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'REPORTED',
      confirmations INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS confirmations (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(incident_id, user_id),
      FOREIGN KEY(incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const pointCount = db.prepare('SELECT COUNT(*) AS count FROM disposal_points').get().count;
  if (pointCount === 0) seedDisposalPoints();

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) seedDemoUser();
}

// ===========================================================================
// Dados iniciais
// ===========================================================================

/*
 * Dados de demonstração gravados somente na primeira execução (tabelas
 * vazias), para que o aplicativo já abra com pontos no mapa e com uma conta
 * pronta para login, sem cadastro manual.
 */
const DEMO_USER = {
  name: 'Usuário Demonstração',
  email: 'demo@ecomap.local',
  password: '123456',
};

function seedDemoUser() {
  const id = randomUUID();
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(DEMO_USER.password, BCRYPT_ROUNDS);
  db.prepare('INSERT INTO users (id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)').run(
    id,
    DEMO_USER.name,
    DEMO_USER.email,
    hash,
    now,
  );
}

// Cada linha segue a ordem das colunas do INSERT: name, description, address,
// latitude, longitude, materials (array salvo como texto JSON), opening_hours.
function seedDisposalPoints() {
  const points = [
    [
      'Ecoponto Vila Hortolândia',
      'Ponto demonstrativo para descarte e triagem de materiais.',
      'Vila Hortolândia, Jundiaí - SP',
      -23.1793,
      -46.886,
      JSON.stringify(['Papel', 'Plástico', 'Metal', 'Vidro', 'Eletrônicos']),
      'Seg. a Sáb., 08:00 às 17:00',
    ],
    [
      'Ponto de Reciclagem Centro',
      'Local demonstrativo para materiais recicláveis.',
      'Centro, Jundiaí - SP',
      -23.1857,
      -46.8842,
      JSON.stringify(['Papel', 'Plástico', 'Metal', 'Vidro']),
      'Seg. a Sex., 08:00 às 18:00',
    ],
    [
      'Ponto de Coleta Especial',
      'Exemplo de ponto para materiais de descarte específico.',
      'Anhangabaú, Jundiaí - SP',
      -23.1888,
      -46.8914,
      JSON.stringify(['Pilhas', 'Baterias', 'Eletrônicos', 'Óleo']),
      'Seg. a Sex., 09:00 às 17:00',
    ],
    [
      'Ecoponto Jardim Novo Horizonte',
      'Ponto demonstrativo de descarte adequado.',
      'Novo Horizonte, Jundiaí - SP',
      -23.203,
      -46.925,
      JSON.stringify(['Papel', 'Plástico', 'Entulho leve']),
      'Seg. a Sáb., 08:00 às 16:00',
    ],
  ];
  const stmt = db.prepare(
    'INSERT INTO disposal_points (id,name,description,address,latitude,longitude,materials,opening_hours,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
  );
  const now = new Date().toISOString();
  for (const point of points) stmt.run(randomUUID(), ...point, now);
}

initDb();

// ===========================================================================
// Middlewares
// ===========================================================================

const app = express();

// CORS liberado para qualquer origem. O app nativo não passa pela checagem de
// CORS (ela só existe em navegadores); a liberação permite consultar a API a
// partir de páginas e ferramentas web durante os testes.
app.use(cors());
app.use(express.json({ limit: JSON_BODY_LIMIT }));

// As imagens das ocorrências ficam acessíveis em /uploads/<arquivo>; o campo
// image_url guarda esse caminho relativo e o app monta a URL completa.
app.use('/uploads', express.static(uploadsDir));

/*
 * Upload de imagem (multipart/form-data, campo "image") com o multer.
 * O arquivo recebe um nome UUID para evitar colisões e não usar o nome
 * enviado pelo cliente. Arquivos acima de MAX_IMAGE_SIZE geram erro (500 no
 * tratador geral); tipos fora de ALLOWED_IMAGE_MIME são ignorados (req.file
 * fica indefinido e a ocorrência é salva sem imagem).
 */
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '.jpg').toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_IMAGE_MIME.test(file.mimetype));
  },
});

/*
 * Middleware de autenticação das rotas protegidas.
 * O app envia "Authorization: Bearer <token>" (ver request() em
 * mobile/src/api.ts). O token é validado com JWT_SECRET (assinatura e
 * expiração) e o payload { id, name, email } fica em req.user para a rota.
 * Sem token: 401 "Autenticação necessária." | inválido ou expirado: 401
 * "Sessão inválida ou expirada.".
 */
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Autenticação necessária.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
}

// ===========================================================================
// Autenticação
// ===========================================================================

// Formato público do usuário: nunca devolve o password_hash ao cliente.
function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email };
}

// O token carrega { id, name, email }, então a API identifica o usuário sem
// guardar sessão no servidor (stateless).
function tokenFor(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * GET /api/health (pública)
 * Verificação de disponibilidade usada pelos scripts de inicialização e para
 * testar, pelo navegador do celular, se a API está acessível na rede.
 * 200 { status: 'ok', app, time }.
 */
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', app: 'EcoMap API', time: new Date().toISOString() }),
);

/**
 * POST /api/auth/register (pública)
 * Recebe { name, email, password }.
 * 400 se faltar algum campo ou a senha tiver menos de 6 caracteres |
 * 409 se o e-mail já estiver cadastrado | 201 { user, token }.
 * O e-mail é normalizado (sem espaços e em minúsculas) para que a mesma
 * pessoa não crie duas contas variando maiúsculas. O cadastro já devolve o
 * token, então o usuário entra direto no app.
 */
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res
      .status(400)
      .json({ message: 'Nome, e-mail e senha (mínimo 6 caracteres) são obrigatórios.' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(normalizedEmail);
  if (exists) return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });

  const user = { id: randomUUID(), name: String(name).trim(), email: normalizedEmail };
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  db.prepare('INSERT INTO users (id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)').run(
    user.id,
    user.name,
    user.email,
    hash,
    now,
  );
  res.status(201).json({ user, token: tokenFor(user) });
});

/**
 * POST /api/auth/login (pública)
 * Recebe { email, password }.
 * 401 "E-mail ou senha inválidos." | 200 { user, token }.
 * A senha é comparada com o hash bcrypt. A mesma mensagem é usada para
 * e-mail inexistente e senha errada, para não revelar quais e-mails existem.
 */
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE email=?').get(normalizedEmail);
  if (!row || !bcrypt.compareSync(password || '', row.password_hash)) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  }
  const user = publicUser(row);
  res.json({ user, token: tokenFor(user) });
});

/**
 * GET /api/me (requer token)
 * Devolve { user } do dono do token. 404 se o usuário não existe mais.
 * O app chama esta rota ao abrir, para restaurar a sessão salva no
 * SecureStore e confirmar que o token ainda é válido.
 */
app.get('/api/me', auth, (req, res) => {
  const row = db.prepare('SELECT id,name,email,created_at FROM users WHERE id=?').get(req.user.id);
  if (!row) return res.status(404).json({ message: 'Usuário não encontrado.' });
  res.json({ user: publicUser(row) });
});

// ===========================================================================
// Pontos de descarte
// ===========================================================================

/**
 * GET /api/disposal-points (pública)
 * Lista todos os pontos em ordem alfabética. A coluna materials é guardada
 * como texto JSON e convertida de volta para array antes de responder.
 */
app.get('/api/disposal-points', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM disposal_points ORDER BY name')
    .all()
    .map((row) => ({ ...row, materials: JSON.parse(row.materials) }));
  res.json(rows);
});

/**
 * GET /api/disposal-points/:id (pública)
 * 404 "Ponto não encontrado." | 200 com o ponto (materials como array).
 */
app.get('/api/disposal-points/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM disposal_points WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Ponto não encontrado.' });
  res.json({ ...row, materials: JSON.parse(row.materials) });
});

// ===========================================================================
// Ocorrências
// ===========================================================================

/**
 * GET /api/incidents (pública)
 * Lista as ocorrências das mais recentes para as mais antigas, com o nome de
 * quem registrou (reporter_name, via JOIN com users).
 */
app.get('/api/incidents', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT i.*, u.name AS reporter_name FROM incidents i JOIN users u ON u.id=i.user_id ORDER BY i.created_at DESC`,
    )
    .all();
  res.json(rows);
});

/**
 * GET /api/incidents/:id (pública)
 * 404 "Ocorrência não encontrada." | 200 com a ocorrência e reporter_name.
 */
app.get('/api/incidents/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT i.*, u.name AS reporter_name FROM incidents i JOIN users u ON u.id=i.user_id WHERE i.id=?`,
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Ocorrência não encontrada.' });
  res.json(row);
});

/**
 * POST /api/incidents (requer token)
 * Recebe multipart/form-data com category, title, description, severity,
 * latitude, longitude e, opcionalmente, o arquivo "image".
 * 400 se faltar algum campo obrigatório | 201 com a ocorrência criada.
 * Fluxo: auth valida o token -> multer grava a imagem em uploads/ ->
 * a rota valida os campos -> grava a ocorrência com status REPORTED e 0
 * confirmações, ligada ao usuário do token (req.user.id).
 * Limitação conhecida da versão atual: como o multer roda antes da
 * validação, a imagem já está gravada em uploads/ quando a rota responde 400,
 * e o arquivo fica sem ocorrência associada.
 */
app.post('/api/incidents', auth, upload.single('image'), (req, res) => {
  const { category, title, description, severity, latitude, longitude } = req.body || {};
  const missingField =
    !category ||
    !title ||
    !description ||
    !severity ||
    latitude === undefined ||
    longitude === undefined;
  if (missingField) {
    return res
      .status(400)
      .json({ message: 'Preencha categoria, título, descrição, gravidade e localização.' });
  }
  const now = new Date().toISOString();
  const id = randomUUID();
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  db.prepare(
    `INSERT INTO incidents (id,user_id,category,title,description,severity,latitude,longitude,image_url,status,confirmations,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'REPORTED',0,?,?)`,
  ).run(
    id,
    req.user.id,
    category,
    title,
    description,
    severity,
    Number(latitude),
    Number(longitude),
    imageUrl,
    now,
    now,
  );
  res.status(201).json(db.prepare('SELECT * FROM incidents WHERE id=?').get(id));
});

/**
 * POST /api/incidents/:id/confirm (requer token)
 * Registra que o usuário autenticado confirmou a ocorrência.
 * 404 se a ocorrência não existe | 409 se este usuário já confirmou |
 * 200 com a ocorrência atualizada.
 * A UNIQUE(incident_id, user_id) garante, no próprio banco, uma única
 * confirmação por usuário: o INSERT repetido falha e vira 409. O total é
 * recontado com COUNT(*) na tabela confirmations, e não incrementado, para que
 * o contador nunca divirja dos registros gravados. Com 3 ou mais confirmações
 * o status passa a CONFIRMED; abaixo disso o status atual é mantido.
 * Limitações conhecidas da versão atual: qualquer falha no INSERT é tratada
 * como confirmação repetida; e a API não bloqueia confirmações em ocorrências
 * RESOLVED (o app só esconde o botão), então uma ocorrência resolvida com 3 ou
 * mais confirmações volta a CONFIRMED se receber uma nova confirmação.
 */
app.post('/api/incidents/:id/confirm', auth, (req, res) => {
  const incident = db.prepare('SELECT * FROM incidents WHERE id=?').get(req.params.id);
  if (!incident) return res.status(404).json({ message: 'Ocorrência não encontrada.' });
  try {
    db.prepare(
      'INSERT INTO confirmations (id,incident_id,user_id,created_at) VALUES (?,?,?,?)',
    ).run(randomUUID(), incident.id, req.user.id, new Date().toISOString());
  } catch {
    return res.status(409).json({ message: 'Você já confirmou esta ocorrência.' });
  }
  const confirmations = db
    .prepare('SELECT COUNT(*) AS count FROM confirmations WHERE incident_id=?')
    .get(incident.id).count;
  const status = confirmations >= CONFIRMATIONS_TO_VALIDATE ? 'CONFIRMED' : incident.status;
  db.prepare('UPDATE incidents SET confirmations=?, status=?, updated_at=? WHERE id=?').run(
    confirmations,
    status,
    new Date().toISOString(),
    incident.id,
  );
  res.json(db.prepare('SELECT * FROM incidents WHERE id=?').get(incident.id));
});

/**
 * PATCH /api/incidents/:id/status (requer token)
 * Recebe { status } com REPORTED, CONFIRMED ou RESOLVED.
 * 400 "Status inválido." | 404 se a ocorrência não existe | 200 com a
 * ocorrência atualizada.
 * Limitação conhecida da versão atual: qualquer usuário autenticado pode
 * alterar o status (não há perfil de gestor) e o aplicativo não tem tela que
 * use esta rota; ela é acessada apenas diretamente pela API.
 */
app.patch('/api/incidents/:id/status', auth, (req, res) => {
  const { status } = req.body || {};
  if (!INCIDENT_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Status inválido.' });
  }
  const incident = db.prepare('SELECT * FROM incidents WHERE id=?').get(req.params.id);
  if (!incident) return res.status(404).json({ message: 'Ocorrência não encontrada.' });
  db.prepare('UPDATE incidents SET status=?, updated_at=? WHERE id=?').run(
    status,
    new Date().toISOString(),
    incident.id,
  );
  res.json(db.prepare('SELECT * FROM incidents WHERE id=?').get(incident.id));
});

// ===========================================================================
// Estatísticas
// ===========================================================================

/**
 * GET /api/stats (pública)
 * Totais exibidos no Perfil: { totalIncidents, resolved, open,
 * disposalPoints, categories }. "open" é tudo o que não está RESOLVED
 * (REPORTED + CONFIRMED); categories traz a contagem por categoria, da mais
 * frequente para a menos frequente.
 */
app.get('/api/stats', (_req, res) => {
  const totalIncidents = db.prepare('SELECT COUNT(*) AS count FROM incidents').get().count;
  const resolved = db
    .prepare("SELECT COUNT(*) AS count FROM incidents WHERE status='RESOLVED'")
    .get().count;
  const open = totalIncidents - resolved;
  const disposalPoints = db.prepare('SELECT COUNT(*) AS count FROM disposal_points').get().count;
  const categories = db
    .prepare(
      'SELECT category, COUNT(*) AS count FROM incidents GROUP BY category ORDER BY count DESC',
    )
    .all();
  res.json({ totalIncidents, resolved, open, disposalPoints, categories });
});

// ===========================================================================
// Tratamento de erros
// ===========================================================================

// Tratador global: qualquer exceção não tratada nas rotas (inclusive erros do
// multer, como imagem acima de 5 MB) é registrada no console e devolvida como
// 500 com mensagem genérica, sem expor detalhes internos ao cliente.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

// ===========================================================================
// Inicialização
// ===========================================================================

// Bind em 0.0.0.0 (todas as interfaces de rede), e não só em localhost, para
// que o celular na mesma rede Wi-Fi acesse a API pelo IPv4 do computador.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EcoMap API rodando em http://0.0.0.0:${PORT}`);
});
