# Arquitetura do EcoMap

## Visão geral

O EcoMap utiliza uma arquitetura distribuída cliente-servidor. O aplicativo móvel executado no celular é o cliente. O servidor hospeda a API REST, o banco SQLite e o armazenamento de imagens.

```text
┌──────────────────────┐
│ Celular              │
│ EcoMap Mobile        │
│ Expo + React Native  │
└──────────┬───────────┘
           │ HTTP / JSON / multipart
           ▼
┌──────────────────────┐
│ Servidor             │
│ Node.js + Express    │
├──────────────────────┤
│ Regras / autenticação│
└───────┬──────────────┘
        ├──────────────► SQLite
        └──────────────► uploads/
```

## Componentes

### Cliente móvel
Responsável por interface, navegação, geolocalização, captura de imagem, validações básicas e consumo da API.

### API
Responsável por autenticação, regras de negócio, persistência e exposição dos recursos por HTTP.

### Banco
SQLite centraliza usuários, pontos de descarte, ocorrências e confirmações.

### Armazenamento
Imagens de ocorrências são armazenadas em `backend/uploads` e disponibilizadas pela API.

## Fluxo de uma ocorrência

1. Usuário seleciona uma categoria.
2. Aplicativo obtém a localização autorizada.
3. Usuário informa título e descrição.
4. Opcionalmente envia imagem.
5. Aplicativo envia multipart/form-data para a API.
6. API valida a sessão e os dados.
7. API grava o registro no SQLite.
8. API retorna a ocorrência.
9. Outros clientes passam a consultar o mesmo registro.
