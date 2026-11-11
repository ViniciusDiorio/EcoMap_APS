# API REST — EcoMap

Base: `http://IP_DO_SERVIDOR:3333/api`

## Saúde

`GET /health`

## Autenticação

`POST /auth/register`

```json
{"name":"Nome","email":"email@exemplo.com","password":"123456"}
```

`POST /auth/login`

```json
{"email":"email@exemplo.com","password":"123456"}
```

Rotas autenticadas usam:

`Authorization: Bearer TOKEN`

## Usuário

`GET /me`

## Pontos de descarte

`GET /disposal-points`

`GET /disposal-points/:id`

## Ocorrências

`GET /incidents`

`GET /incidents/:id`

`POST /incidents` — multipart/form-data com categoria, título, descrição, gravidade, latitude, longitude e imagem opcional.

`POST /incidents/:id/confirm`

`PATCH /incidents/:id/status`

## Estatísticas

`GET /stats`
