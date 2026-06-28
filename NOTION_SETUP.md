# Sincronizacao com Notion

## 1. Criar a integracao

Cria uma integracao no Notion e guarda o token em `NOTION_TOKEN`.

## 2. Criar a database

Cria uma database no Notion e partilha essa database com a integracao.

Campos recomendados:

| Nome | Tipo |
| --- | --- |
| Produto | Title |
| Categoria | Select |
| Unidade | Select |
| Quantidade | Number |
| Mínimo Semanal | Number |
| Mínimo Diário | Number |
| Custo unitario | Number |
| Validade | Date |
| Fornecedor | Text |
| Dia de pedido | Select |
| Estado | Select |
| Observacoes | Text |
| Atualizado em | Date |

## 3. Configurar `.env`

Copia `.env.example` para `.env` e preenche:

```bash
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=xxx
```

O `NOTION_DATABASE_ID` e o identificador da database. Normalmente aparece no link da database do Notion.

## 4. Abrir a app pelo servidor

```bash
node server.js
```

Depois abre:

```text
http://localhost:4173
```

Ao clicar em `Sincronizar Notion`, a app cria ou atualiza produtos pelo nome.
