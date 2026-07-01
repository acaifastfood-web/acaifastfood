# Deploy no Render

## 1. Subir o projeto para o GitHub

No Render, o caminho mais simples e ligar um repositorio GitHub.

Antes de subir, confirma que `.env` nao vai para o GitHub. O ficheiro `.gitignore` ja bloqueia `.env`.

## 2. Criar Web Service no Render

1. Entra no Render.
2. Clica em `New`.
3. Escolhe `Web Service`.
4. Liga o repositorio deste projeto.
5. Usa estas opcoes:

```text
Environment: Node
Build Command: deixar vazio
Start Command: node server.js
```

O servidor usa `process.env.PORT`, portanto o Render define a porta automaticamente.

## 3. Variaveis de ambiente

No painel do servico, vai a `Environment` e adiciona:

```bash
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=f3723b2560054c46b3746f8297298588
NOTION_VERSION=2026-03-11
APP_USERS=ana:senha123:Ana Silva;joao:senha456:Joao Santos
NOTION_PROPERTY_PRODUCT=Produto
NOTION_PROPERTY_CATEGORY=Setor
NOTION_PROPERTY_UNIT=Unidade
NOTION_PROPERTY_QUANTITY=Estoque atual
NOTION_PROPERTY_MINIMUM=Mínimo Semanal
NOTION_PROPERTY_DAILY_MINIMUM=Mínimo Diário
NOTION_PROPERTY_ORDER_QUANTITY=Quantidade a Comprar 
NOTION_PROPERTY_SHOULD_BUY=Comprar?
NOTION_PROPERTY_UNIT_COST=Custo (unidade)
NOTION_PROPERTY_SUPPLIER=Fornecedor
NOTION_PROPERTY_ORDER_DAY=Dia de pedido
NOTION_PROPERTY_CONTROL_TYPE=Tipo de controle 
STORE_LATITUDE=38.000000
STORE_LONGITUDE=-9.000000
STORE_RADIUS_METERS=80
STORE_MAX_ACCURACY_METERS=120
```

Nao coloques `PORT`; o Render gere isso automaticamente.

Para o sistema de ponto, troca `STORE_LATITUDE` e `STORE_LONGITUDE` pelas coordenadas reais da loja. Se essas duas variaveis nao estiverem configuradas, o app bloqueia o registo do ponto.

## 4. Abrir as apps

Depois do deploy, o Render vai gerar um link parecido com:

```text
https://acai-fast-food-estoque.onrender.com
```

Apps:

```text
https://...onrender.com/
https://...onrender.com/gestor.html
https://...onrender.com/funcionario.html
```

## 5. Instalar no telemovel

No telemovel do funcionario:

1. Abrir `https://...onrender.com/funcionario.html`.
2. No iPhone, usar Safari > Partilhar > Adicionar ao Ecra Principal.
3. No Android, usar Chrome > Tres pontos > Adicionar ao ecra principal.

## 6. Nota de seguranca

Antes de usar em producao, recomenda-se adicionar login/PIN para separar gestor e funcionarios.
