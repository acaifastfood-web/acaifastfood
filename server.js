const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

loadEnv();

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const NOTION_VERSION = process.env.NOTION_VERSION || "2026-03-11";
const NOTION_TOKEN = process.env.NOTION_TOKEN || "";
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || "";
const NOTION_REVENUE_DATABASE_ID = process.env.NOTION_REVENUE_DATABASE_ID || "";
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
ensureDataDir();
const COUNT_RECORDS_PATH = path.join(DATA_DIR, "count-records.json");
const REVENUE_RECORDS_PATH = path.join(DATA_DIR, "faturacao-records.json");
const USERS_PATH = path.join(DATA_DIR, "app-users.json");
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();
const DEFAULT_USERS = [
  { name: "Paulo Vasconcelos", username: "paulo.vasconcelos", sector: "Gestao", role: "manager", password: "1234" },
  { name: "Vanessa Vasconcelos", username: "vanessa.vasconcelos", sector: "Gestao", role: "manager", password: "1234" },
  { name: "João", username: "joao", sector: "Sala", role: "employee", password: "1234" },
  { name: "Darlan", username: "darlan", sector: "Sala", role: "employee", password: "1234" },
  { name: "Camila", username: "camila", sector: "Sala", role: "employee", password: "1234" },
  { name: "Rafael", username: "rafael", sector: "Sala", role: "employee", password: "1234" },
  { name: "Claudia", username: "claudia", sector: "Cozinha", role: "employee", password: "1234" },
  { name: "Teia", username: "teia", sector: "Cozinha", role: "employee", password: "1234" },
  { name: "Alicia", username: "alicia", sector: "Cozinha", role: "employee", password: "1234" },
  { name: "Fernanda", username: "fernanda", sector: "Cozinha", role: "employee", password: "1234" },
  { name: "Rosa", username: "rosa", sector: "Cozinha", role: "employee", password: "1234" },
];

ensureUserStore();

const PROPERTY_NAMES = {
  product: process.env.NOTION_PROPERTY_PRODUCT || "Produto",
  category: process.env.NOTION_PROPERTY_CATEGORY || "Categoria",
  unit: process.env.NOTION_PROPERTY_UNIT || "Unidade",
  quantity: process.env.NOTION_PROPERTY_QUANTITY || "Estoque atual",
  minimum: process.env.NOTION_PROPERTY_MINIMUM || "Mínimo Semanal",
  dailyMinimum: process.env.NOTION_PROPERTY_DAILY_MINIMUM || "Mínimo Diário",
  orderQuantity: process.env.NOTION_PROPERTY_ORDER_QUANTITY || "Quantidade a Comprar ",
  shouldBuy: process.env.NOTION_PROPERTY_SHOULD_BUY || "Comprar?",
  unitCost: process.env.NOTION_PROPERTY_UNIT_COST || "Custo unitario",
  expiresAt: process.env.NOTION_PROPERTY_EXPIRES_AT || "Validade",
  supplier: process.env.NOTION_PROPERTY_SUPPLIER || "Fornecedor",
  orderDay: process.env.NOTION_PROPERTY_ORDER_DAY || "Dia de pedido",
  controlType: process.env.NOTION_PROPERTY_CONTROL_TYPE || "Tipo de controle ",
  status: process.env.NOTION_PROPERTY_STATUS || "Estado",
  notes: process.env.NOTION_PROPERTY_NOTES || "Observacoes",
  updatedAt: process.env.NOTION_PROPERTY_UPDATED_AT || "Atualizado em",
};

const PROPERTY_ALIASES = {
  quantity: ["Estoque atual", "Quantidade"],
  minimum: ["Mínimo Semanal", "Minimo Semanal", "Estoque minimo", "Estoque mínimo"],
  dailyMinimum: ["Mínimo Diário", "Minimo Diario"],
  orderQuantity: ["Quantidade a Comprar ", "Quantidade a Comprar"],
  controlType: ["Tipo de controle ", "Tipo de controle"],
};

const REVENUE_PROPERTY_NAMES = {
  date: process.env.NOTION_REVENUE_PROPERTY_DATE || "Data",
  coins: process.env.NOTION_REVENUE_PROPERTY_COINS || "Moedas",
  mbway: process.env.NOTION_REVENUE_PROPERTY_MBWAY || "MBWAY",
  uberEats: process.env.NOTION_REVENUE_PROPERTY_UBER_EATS || "Uber Eats",
  glovo: process.env.NOTION_REVENUE_PROPERTY_GLOVO || "Glovo",
  bolt: process.env.NOTION_REVENUE_PROPERTY_BOLT || "Bolt",
  multibanco: process.env.NOTION_REVENUE_PROPERTY_MULTIBANCO || "Multibanco",
  cash: process.env.NOTION_REVENUE_PROPERTY_CASH || "Dinheiro",
  fuel: process.env.NOTION_REVENUE_PROPERTY_FUEL || "Combustível",
  expense1: process.env.NOTION_REVENUE_PROPERTY_EXPENSE_1 || "Despesa 1",
  expense1Description: process.env.NOTION_REVENUE_PROPERTY_EXPENSE_1_DESCRIPTION || "Descrição Despesa 1",
  expense2: process.env.NOTION_REVENUE_PROPERTY_EXPENSE_2 || "Despesa 2",
  expense2Description: process.env.NOTION_REVENUE_PROPERTY_EXPENSE_2_DESCRIPTION || "Descrição Despesa 2",
  expense3: process.env.NOTION_REVENUE_PROPERTY_EXPENSE_3 || "Despesa 3",
  expense3Description: process.env.NOTION_REVENUE_PROPERTY_EXPENSE_3_DESCRIPTION || "Descrição Despesa 3",
  orders: process.env.NOTION_REVENUE_PROPERTY_ORDERS || "Qtd de Pedidos",
  dayNotes: process.env.NOTION_REVENUE_PROPERTY_DAY_NOTES || "Obs do dia",
  otherObservation: process.env.NOTION_REVENUE_PROPERTY_OTHER_OBSERVATION || "Observação",
  grossTotal: process.env.NOTION_REVENUE_PROPERTY_GROSS_TOTAL || "Total Faturação",
  expenseTotal: process.env.NOTION_REVENUE_PROPERTY_EXPENSE_TOTAL || "Total Despesas",
  netTotal: process.env.NOTION_REVENUE_PROPERTY_NET_TOTAL || "Total Líquido",
  updatedAt: process.env.NOTION_REVENUE_PROPERTY_UPDATED_AT || "Atualizado em",
};

const REVENUE_PROPERTY_ALIASES = {
  fuel: ["Combustível", "Combustivel"],
  expense1Description: ["Descrição Despesa 1", "Descricao Despesa 1"],
  expense2Description: ["Descrição Despesa 2", "Descricao Despesa 2"],
  expense3Description: ["Descrição Despesa 3", "Descricao Despesa 3"],
  dayNotes: ["Obs do dia", "Observações do dia", "Observacoes do dia"],
  otherObservation: ["Observação", "Observacao", "Outros"],
  grossTotal: ["Total Faturação", "Total Faturacao"],
  expenseTotal: ["Total Despesas", "Despesas"],
  netTotal: ["Total Líquido", "Total Liquido"],
};

const MIME_TYPES = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "application/javascript;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".csv": "text/csv;charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

http
  .createServer(async (request, response) => {
    try {
      if (request.url === "/api/notion/status" && request.method === "GET") {
        return sendJson(response, 200, { configured: isNotionConfigured() });
      }

      if (request.url === "/api/notion/databases" && request.method === "GET") {
        return await handleListDatabases(response);
      }

      if (request.url === "/api/notion/items" && request.method === "GET") {
        return await handleNotionItems(response);
      }

      if (request.url === "/api/notion/sync" && request.method === "POST") {
        return await handleNotionSync(request, response);
      }

      if (request.url === "/api/auth/login" && request.method === "POST") {
        return await handleLogin(request, response);
      }

      if (request.url === "/api/auth/session" && request.method === "POST") {
        return await handleSession(request, response);
      }

      if (request.url === "/api/auth/logout" && request.method === "POST") {
        return await handleLogout(request, response);
      }

      if (request.url === "/api/users" && request.method === "GET") {
        return handleUsers(response);
      }

      if (request.url === "/api/users/save" && request.method === "POST") {
        return await handleSaveUser(request, response);
      }

      if (request.url === "/api/users/delete" && request.method === "POST") {
        return await handleDeleteUser(request, response);
      }

      if (request.url === "/api/users/toggle" && request.method === "POST") {
        return await handleToggleUser(request, response);
      }

      if (request.url === "/api/users/reset-password" && request.method === "POST") {
        return await handleResetUserPassword(request, response);
      }

      if (request.url === "/api/count-records" && request.method === "GET") {
        return handleCountRecords(response);
      }

      if (request.url === "/api/count-records/item-status" && request.method === "POST") {
        return await handleCountRecordItemStatus(request, response);
      }

      if (request.url === "/api/revenue-records" && request.method === "GET") {
        return handleRevenueRecords(response);
      }

      if (request.url === "/api/revenue-records/save" && request.method === "POST") {
        return await handleSaveRevenueRecord(request, response);
      }

      if (request.url === "/api/revenue-records/delete" && request.method === "POST") {
        return await handleDeleteRevenueRecord(request, response);
      }

      return serveStatic(request, response);
    } catch (error) {
      return sendJson(response, 500, { error: error.message || "Erro interno" });
    }
  })
  .listen(PORT, () => {
    console.log(`Servidor ativo em http://localhost:${PORT}`);
  });

async function handleLogin(request, response) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");
  const user = readUsers().find((entry) => entry.username === username);

  if (!user || user.active === false || !verifyPassword(password, user)) {
    return sendJson(response, 401, { error: "Utilizador ou senha invalidos." });
  }

  cleanupSessions();
  const token = crypto.randomBytes(32).toString("hex");
  const session = {
    token,
    userId: user.id,
    username: user.username,
    name: user.name,
    sector: user.sector,
    role: normalizeRole(user.role),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  sessions.set(token, session);
  return sendJson(response, 200, { token, user: publicUser(session) });
}

async function handleSession(request, response) {
  const body = await readJson(request);
  const session = getSession(body.authToken);
  if (!session) return sendJson(response, 401, { error: "Sessao expirada. Faz login novamente." });
  return sendJson(response, 200, { user: publicUser(session) });
}

async function handleLogout(request, response) {
  const body = await readJson(request);
  if (body.authToken) sessions.delete(String(body.authToken));
  return sendJson(response, 200, { ok: true });
}

function handleCountRecords(response) {
  const records = readCountRecords().slice(0, 120);
  return sendJson(response, 200, { records });
}

async function handleCountRecordItemStatus(request, response) {
  const body = await readJson(request);
  const recordId = String(body.recordId || "");
  const itemId = String(body.itemId || "");
  const requested = body.requested === true;
  const records = readCountRecords();
  const record = records.find((entry) => entry.id === recordId);
  if (!record) return sendJson(response, 404, { error: "Registo nao encontrado." });
  const item = (record.items || []).find((entry) => entry.id === itemId);
  if (!item) return sendJson(response, 404, { error: "Produto nao encontrado no registo." });

  item.requested = requested;
  item.requestedAt = requested ? new Date().toISOString() : "";
  writeCountRecords(records);
  return sendJson(response, 200, { records: records.slice(0, 120) });
}

function handleRevenueRecords(response) {
  const records = readRevenueRecords().slice(0, 180);
  return sendJson(response, 200, { records });
}

async function handleSaveRevenueRecord(request, response) {
  const body = await readJson(request);
  const record = normalizeRevenueRecord(body.record || body);
  record.updatedAt = new Date().toISOString();
  const records = readRevenueRecords();
  const index = records.findIndex((entry) => entry.id === record.id || entry.date === record.date);
  if (index >= 0) {
    record.id = records[index].id;
    record.createdAt = records[index].createdAt || record.createdAt;
    records[index] = record;
  } else {
    records.unshift(record);
  }
  writeRevenueRecords(records);

  const notion = await syncRevenueRecordToNotion(record);
  return sendJson(response, 200, { record, records: readRevenueRecords().slice(0, 180), notion });
}

async function handleDeleteRevenueRecord(request, response) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const records = readRevenueRecords().filter((record) => record.id !== id);
  writeRevenueRecords(records);
  return sendJson(response, 200, { records: records.slice(0, 180) });
}

function handleUsers(response) {
  return sendJson(response, 200, { users: readUsers().map(publicUserRecord) });
}

async function handleSaveUser(request, response) {
  const body = await readJson(request);
  const users = readUsers();
  const id = String(body.id || "").trim();
  const username = normalizeUsername(body.username || body.name);
  const name = String(body.name || "").trim();
  const sector = normalizeSector(body.sector);
  const role = normalizeRole(body.role);
  const password = String(body.password || "");

  if (!name) return sendJson(response, 400, { error: "Nome obrigatorio." });
  if (!username) return sendJson(response, 400, { error: "Utilizador obrigatorio." });
  if (!sector) return sendJson(response, 400, { error: "Setor obrigatorio." });

  const existingByUsername = users.find((user) => user.username === username && user.id !== id);
  if (existingByUsername) return sendJson(response, 400, { error: "Esse utilizador ja existe." });

  const now = new Date().toISOString();
  const index = users.findIndex((user) => user.id === id);
  if (index >= 0) {
    users[index] = {
      ...users[index],
      name,
      username,
      sector,
      role,
      active: body.active !== false,
      updatedAt: now,
    };
    if (password) setUserPassword(users[index], password);
  } else {
    const user = {
      id: crypto.randomUUID(),
      name,
      username,
      sector,
      role,
      active: body.active !== false,
      createdAt: now,
      updatedAt: now,
    };
    setUserPassword(user, password || "1234");
    users.push(user);
  }

  writeUsers(users);
  return sendJson(response, 200, { users: readUsers().map(publicUserRecord) });
}

async function handleDeleteUser(request, response) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const users = readUsers().filter((user) => user.id !== id);
  writeUsers(users);
  deleteUserSessions(id);
  return sendJson(response, 200, { users: users.map(publicUserRecord) });
}

async function handleToggleUser(request, response) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const users = readUsers();
  const user = users.find((entry) => entry.id === id);
  if (!user) return sendJson(response, 404, { error: "Funcionario nao encontrado." });
  user.active = body.active !== false;
  user.updatedAt = new Date().toISOString();
  writeUsers(users);
  if (!user.active) deleteUserSessions(id, user.username);
  return sendJson(response, 200, { users: users.map(publicUserRecord) });
}

async function handleResetUserPassword(request, response) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const users = readUsers();
  const user = users.find((entry) => entry.id === id);
  if (!user) return sendJson(response, 404, { error: "Funcionario nao encontrado." });
  const temporaryPassword = String(body.password || generateTemporaryPassword());
  setUserPassword(user, temporaryPassword);
  user.updatedAt = new Date().toISOString();
  writeUsers(users);
  deleteUserSessions(id, user.username);
  return sendJson(response, 200, { temporaryPassword, users: users.map(publicUserRecord) });
}

async function handleListDatabases(response) {
  try {
    if (!NOTION_TOKEN) {
      return sendJson(response, 400, { error: "NOTION_TOKEN nao configurado no ficheiro .env." });
    }

    const databases = await searchDatabases();
    return sendJson(response, 200, { databases });
  } catch (error) {
    return sendJson(response, 400, { error: friendlyNotionError(error.message) });
  }
}

async function handleNotionItems(response) {
  try {
    if (!isNotionConfigured()) {
      return sendJson(response, 400, {
        error: "Notion nao configurado. Preenche NOTION_TOKEN e NOTION_DATABASE_ID no ficheiro .env.",
      });
    }

    const dataSourceRef = await resolveDataSource(NOTION_DATABASE_ID);
    const dataSource = dataSourceRef.dataSource;
    const properties = dataSource.properties || {};
    const titleProperty = findTitleProperty(properties);
    if (!titleProperty) {
      return sendJson(response, 400, { error: "A data source precisa de uma propriedade de titulo para o produto." });
    }

    const pages = await queryDataSourcePages(dataSourceRef.id);
    const items = pages.map((page) => pageToItem(page, properties, titleProperty.name)).filter((item) => item.name.trim());

    return sendJson(response, 200, {
      items,
      databaseTitle: dataSourceRef.title,
    });
  } catch (error) {
    return sendJson(response, 400, { error: friendlyNotionError(error.message) });
  }
}

async function handleNotionSync(request, response) {
  try {
    if (!isNotionConfigured()) {
      return sendJson(response, 400, {
        error: "Notion nao configurado. Preenche NOTION_TOKEN e NOTION_DATABASE_ID no ficheiro .env.",
      });
    }

    const body = await readJson(request);
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return sendJson(response, 400, { error: "Nao ha produtos para sincronizar." });
    }
    const countRecord = body.countRecord && typeof body.countRecord === "object" ? body.countRecord : null;
    const session = countRecord ? getSession(body.authToken) : null;
    if (countRecord && !session) {
      return sendJson(response, 401, { error: "Sessao expirada. Faz login novamente antes de guardar a contagem." });
    }

    const dataSourceRef = await resolveDataSource(NOTION_DATABASE_ID);
    const dataSource = dataSourceRef.dataSource;
    const properties = dataSource.properties || {};
    const titleProperty = findTitleProperty(properties);
    if (!titleProperty) {
      return sendJson(response, 400, { error: "A data source precisa de uma propriedade de titulo para o produto." });
    }

    let created = 0;
    let updated = 0;
    const skippedProperties = new Set();

    for (const rawItem of items) {
      const item = normalizeItem(rawItem);
      const existingPage = await findPageByTitle(dataSourceRef.id, titleProperty.name, item.name);
      const notionProperties = buildNotionProperties(item, properties, titleProperty.name, skippedProperties);

      if (existingPage) {
        await notionRequest(`/pages/${existingPage.id}`, {
          method: "PATCH",
          body: { properties: notionProperties },
        });
        updated += 1;
      } else {
        await notionRequest("/pages", {
          method: "POST",
          body: {
            parent: { data_source_id: dataSourceRef.id },
            properties: notionProperties,
          },
        });
        created += 1;
      }
    }

    if (countRecord && session) {
      appendCountRecord(buildCountRecord(countRecord, session));
    }

    return sendJson(response, 200, {
      created,
      updated,
      databaseTitle: dataSourceRef.title,
      skippedProperties: Array.from(skippedProperties).sort(),
    });
  } catch (error) {
    return sendJson(response, 400, { error: friendlyNotionError(error.message) });
  }
}

function buildCountRecord(rawRecord, session) {
  const countedItems = Array.isArray(rawRecord.items) ? rawRecord.items : [];
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    countDate: String(rawRecord.countDate || "").slice(0, 10),
    employeeName: session.name,
    employeeUsername: session.username,
    employeeSector: session.sector,
    itemCount: countedItems.length,
    items: countedItems.slice(0, 300).map((item) => ({
      id: crypto.randomUUID(),
      name: String(item.name || "Produto sem nome"),
      quantity: numberValue(item.quantity),
      unit: String(item.unit || ""),
      previousQuantity: numberValue(item.previousQuantity),
      expiresAt: String(item.expiresAt || "").slice(0, 10),
      requested: false,
      requestedAt: "",
    })),
  };
}

function normalizeRevenueRecord(rawRecord) {
  const expenses = Array.isArray(rawRecord.expenses) ? rawRecord.expenses : [];
  const normalized = {
    id: String(rawRecord.id || crypto.randomUUID()),
    date: normalizeDate(rawRecord.date) || new Date().toISOString().slice(0, 10),
    coins: moneyValue(rawRecord.coins),
    mbway: moneyValue(rawRecord.mbway),
    uberEats: moneyValue(rawRecord.uberEats),
    glovo: moneyValue(rawRecord.glovo),
    bolt: moneyValue(rawRecord.bolt),
    multibanco: moneyValue(rawRecord.multibanco),
    cash: moneyValue(rawRecord.cash),
    fuel: moneyValue(rawRecord.fuel),
    expenses: [0, 1, 2].map((index) => ({
      description: String(expenses[index]?.description || rawRecord[`expense${index + 1}Description`] || "").trim(),
      amount: moneyValue(expenses[index]?.amount ?? rawRecord[`expense${index + 1}`]),
    })),
    orders: Math.max(0, Math.round(numberValue(rawRecord.orders))),
    dayNotes: normalizeDayNotes(rawRecord.dayNotes),
    otherObservation: String(rawRecord.otherObservation || "").trim(),
    createdAt: rawRecord.createdAt || new Date().toISOString(),
    updatedAt: rawRecord.updatedAt || new Date().toISOString(),
  };
  normalized.grossTotal = moneyValue(
    normalized.coins + normalized.mbway + normalized.uberEats + normalized.glovo + normalized.bolt + normalized.multibanco + normalized.cash,
  );
  normalized.expenseTotal = moneyValue(normalized.fuel + normalized.expenses.reduce((total, expense) => total + expense.amount, 0));
  normalized.netTotal = moneyValue(normalized.grossTotal - normalized.expenseTotal);
  return normalized;
}

function normalizeDayNotes(value) {
  const allowed = new Set(["Fraco", "Forte", "Chuva", "Vento", "Outros"]);
  const entries = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(entries.map((entry) => String(entry || "").trim()).filter((entry) => allowed.has(entry)))];
}

function moneyValue(value) {
  return Math.round(numberValue(value) * 100) / 100;
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return "";
}

async function syncRevenueRecordToNotion(record) {
  if (!NOTION_TOKEN || !NOTION_REVENUE_DATABASE_ID) {
    return { configured: false, synced: false, message: "NOTION_REVENUE_DATABASE_ID nao configurado." };
  }

  try {
    const dataSourceRef = await resolveDataSource(NOTION_REVENUE_DATABASE_ID);
    const dataSource = dataSourceRef.dataSource;
    const properties = dataSource.properties || {};
    const titleProperty = findTitleProperty(properties);
    if (!titleProperty) throw new Error("A database de faturacao precisa de uma propriedade de titulo.");

    const notionProperties = buildRevenueNotionProperties(record, properties, titleProperty.name);
    const existingPage = await findRevenuePageByDate(dataSourceRef.id, properties, record.date, titleProperty.name);
    if (existingPage) {
      await notionRequest(`/pages/${existingPage.id}`, {
        method: "PATCH",
        body: { properties: notionProperties },
      });
      return { configured: true, synced: true, action: "updated", databaseTitle: dataSourceRef.title };
    }

    await notionRequest("/pages", {
      method: "POST",
      body: {
        parent: { data_source_id: dataSourceRef.id },
        properties: notionProperties,
      },
    });
    return { configured: true, synced: true, action: "created", databaseTitle: dataSourceRef.title };
  } catch (error) {
    return { configured: true, synced: false, error: friendlyNotionError(error.message) };
  }
}

async function findRevenuePageByDate(dataSourceId, properties, date, titlePropertyName) {
  const datePropertyName = revenuePropertyName("date", properties);
  if (properties[datePropertyName]?.type === "date") {
    const result = await notionRequest(`/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: {
        filter: {
          property: datePropertyName,
          date: { equals: date },
        },
        page_size: 1,
      },
    });
    if (result.results?.[0]) return result.results[0];
  }

  return findPageByTitle(dataSourceId, titlePropertyName, revenueTitle(date));
}

function buildRevenueNotionProperties(record, databaseProperties, titlePropertyName) {
  const values = {};
  setRevenuePropertyValue(values, databaseProperties, "date", record.date);
  setRevenuePropertyValue(values, databaseProperties, "coins", record.coins);
  setRevenuePropertyValue(values, databaseProperties, "mbway", record.mbway);
  setRevenuePropertyValue(values, databaseProperties, "uberEats", record.uberEats);
  setRevenuePropertyValue(values, databaseProperties, "glovo", record.glovo);
  setRevenuePropertyValue(values, databaseProperties, "bolt", record.bolt);
  setRevenuePropertyValue(values, databaseProperties, "multibanco", record.multibanco);
  setRevenuePropertyValue(values, databaseProperties, "cash", record.cash);
  setRevenuePropertyValue(values, databaseProperties, "fuel", record.fuel);
  setRevenuePropertyValue(values, databaseProperties, "expense1", record.expenses[0]?.amount);
  setRevenuePropertyValue(values, databaseProperties, "expense1Description", record.expenses[0]?.description);
  setRevenuePropertyValue(values, databaseProperties, "expense2", record.expenses[1]?.amount);
  setRevenuePropertyValue(values, databaseProperties, "expense2Description", record.expenses[1]?.description);
  setRevenuePropertyValue(values, databaseProperties, "expense3", record.expenses[2]?.amount);
  setRevenuePropertyValue(values, databaseProperties, "expense3Description", record.expenses[2]?.description);
  setRevenuePropertyValue(values, databaseProperties, "orders", record.orders);
  setRevenuePropertyValue(values, databaseProperties, "dayNotes", record.dayNotes.join(", "));
  setRevenuePropertyValue(values, databaseProperties, "otherObservation", record.otherObservation);
  setRevenuePropertyValue(values, databaseProperties, "grossTotal", record.grossTotal);
  setRevenuePropertyValue(values, databaseProperties, "expenseTotal", record.expenseTotal);
  setRevenuePropertyValue(values, databaseProperties, "netTotal", record.netTotal);
  setRevenuePropertyValue(values, databaseProperties, "updatedAt", record.updatedAt);
  values[titlePropertyName] = revenueTitle(record.date);

  const notionProperties = {};
  for (const [propertyName, value] of Object.entries(values)) {
    const property = databaseProperties[propertyName];
    if (!property) continue;
    const serialized = serializeProperty(property.type, value);
    if (serialized) notionProperties[propertyName] = serialized;
  }
  return notionProperties;
}

function setRevenuePropertyValue(values, databaseProperties, key, value) {
  values[revenuePropertyName(key, databaseProperties)] = value;
}

function revenuePropertyName(key, properties) {
  const candidates = [REVENUE_PROPERTY_NAMES[key], ...(REVENUE_PROPERTY_ALIASES[key] || [])].filter(Boolean);
  return candidates.find((name) => properties[name]) || REVENUE_PROPERTY_NAMES[key];
}

function revenueTitle(date) {
  return `Faturacao ${date}`;
}

async function queryDataSourcePages(dataSourceId) {
  const pages = [];
  let cursor = null;

  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const result = await notionRequest(`/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body,
    });

    pages.push(...(result.results || []));
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);

  return pages;
}

function pageToItem(page, properties, titlePropertyName) {
  const pageProperties = page.properties || {};
  const getProperty = (key) => pageProperties[notionPropertyName(key, pageProperties)];

  return normalizeItem({
    id: page.id,
    name: propertyText(pageProperties[titlePropertyName]),
    category: propertyText(getProperty("category")) || "Outros",
    unit: propertyText(getProperty("unit")) || "un",
    quantity: propertyNumber(getProperty("quantity")),
    minimum: propertyNumber(getProperty("minimum")),
    dailyMinimum: propertyNumber(getProperty("dailyMinimum")),
    orderQuantity: propertyNumber(getProperty("orderQuantity")),
    shouldBuy: propertyText(getProperty("shouldBuy")),
    unitCost: propertyNumber(getProperty("unitCost")),
    expiresAt: propertyDate(getProperty("expiresAt")),
    supplier: propertyText(getProperty("supplier")),
    orderDay: propertyText(getProperty("orderDay")),
    controlType: propertyText(getProperty("controlType")),
    notes: propertyText(getProperty("notes")),
    updatedAt: propertyDate(getProperty("updatedAt")) || page.last_edited_time || new Date().toISOString(),
  });
}

function propertyText(property) {
  if (!property) return "";
  if (property.type === "title") return richTextValue(property.title);
  if (property.type === "rich_text") return richTextValue(property.rich_text);
  if (property.type === "select") return property.select?.name || "";
  if (property.type === "multi_select") return (property.multi_select || []).map((entry) => entry.name).join(", ");
  if (property.type === "status") return property.status?.name || "";
  if (property.type === "number") return String(property.number ?? "");
  if (property.type === "checkbox") return property.checkbox ? "Sim" : "Nao";
  if (property.type === "formula") return formulaValue(property.formula);
  return "";
}

function propertyNumber(property) {
  if (!property) return 0;
  if (property.type === "number") return numberValue(property.number);
  if (property.type === "formula") return numberValue(formulaValue(property.formula));
  return numberValue(propertyText(property));
}

function propertyDate(property) {
  if (!property) return "";
  if (property.type === "date") return property.date?.start || "";
  if (property.type === "formula" && property.formula?.type === "date") return property.formula.date?.start || "";
  return "";
}

function richTextValue(parts) {
  return (parts || []).map((part) => part.plain_text || "").join("").trim();
}

function formulaValue(formula) {
  if (!formula) return "";
  if (formula.type === "string") return formula.string || "";
  if (formula.type === "number") return String(formula.number ?? "");
  if (formula.type === "boolean") return formula.boolean ? "Sim" : "Nao";
  if (formula.type === "date") return formula.date?.start || "";
  return "";
}

async function searchDatabases() {
  const databases = [];
  let cursor = null;

  do {
    const body = {
      filter: { property: "object", value: "database" },
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;

    const result = await notionRequest("/search", {
      method: "POST",
      body,
    });

    for (const database of result.results || []) {
      databases.push({
        id: database.id.replace(/-/g, ""),
        title: getRichTextTitle(database.title) || "Sem titulo",
        url: database.url,
      });
    }
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);

  return databases;
}

async function resolveDataSource(configuredId) {
  try {
    const dataSource = await notionRequest(`/data_sources/${configuredId}`, { method: "GET" });
    return {
      id: configuredId,
      dataSource,
      title: getRichTextTitle(dataSource.title) || configuredId,
    };
  } catch (error) {
    if (!error.message.includes("Could not find data source")) throw error;
  }

  try {
    const database = await notionRequest(`/databases/${configuredId}`, { method: "GET" });
    const dataSources = database.data_sources || [];
    if (dataSources.length === 0) {
      throw new Error("Essa database nao tem data sources acessiveis pela integracao.");
    }
    if (dataSources.length > 1) {
      const names = dataSources.map((source) => source.name || source.id).join(", ");
      throw new Error(`Essa database tem mais de uma data source: ${names}. Coloca no .env o ID da data source certa.`);
    }

    const source = dataSources[0];
    const dataSource = await notionRequest(`/data_sources/${source.id}`, { method: "GET" });
    return {
      id: source.id,
      dataSource,
      title: source.name || getRichTextTitle(dataSource.title) || getRichTextTitle(database.title) || source.id,
    };
  } catch (error) {
    if (!error.message.includes("is a page, not a database")) throw error;
  }

  const childDatabases = await findChildDatabases(configuredId);
  if (childDatabases.length === 0) {
    throw new Error("A pagina indicada nao tem uma database interna acessivel pela integracao.");
  }

  if (childDatabases.length > 1) {
    const names = childDatabases.map((database) => database.title || database.id).join(", ");
    throw new Error(`A pagina tem mais de uma database: ${names}. Coloca no .env o ID da database certa.`);
  }

  const childDatabase = childDatabases[0];
  return resolveDataSource(childDatabase.id);
}

async function findChildDatabases(pageId) {
  const databases = [];
  let cursor = null;

  do {
    const query = cursor ? `?start_cursor=${encodeURIComponent(cursor)}` : "";
    const result = await notionRequest(`/blocks/${pageId}/children${query}`, { method: "GET" });
    for (const block of result.results || []) {
      if (block.type === "child_database") {
        databases.push({
          id: block.id.replace(/-/g, ""),
          title: block.child_database?.title || "",
        });
      }
    }
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);

  return databases;
}

function getRichTextTitle(title) {
  return (title || []).map((part) => part.plain_text || "").join("").trim();
}

async function findPageByTitle(dataSourceId, titlePropertyName, title) {
  const result = await notionRequest(`/data_sources/${dataSourceId}/query`, {
    method: "POST",
    body: {
      filter: {
        property: titlePropertyName,
        title: { equals: title },
      },
      page_size: 1,
    },
  });
  return result.results?.[0] || null;
}

function buildNotionProperties(item, databaseProperties, titlePropertyName, skippedProperties) {
  const values = {};
  setNotionPropertyValue(values, databaseProperties, "product", item.name);
  setNotionPropertyValue(values, databaseProperties, "category", item.category);
  setNotionPropertyValue(values, databaseProperties, "unit", item.unit);
  setNotionPropertyValue(values, databaseProperties, "quantity", item.quantity);
  setNotionPropertyValue(values, databaseProperties, "minimum", item.minimum);
  setNotionPropertyValue(values, databaseProperties, "dailyMinimum", item.dailyMinimum);
  setNotionPropertyValue(values, databaseProperties, "orderQuantity", item.orderQuantity);
  setNotionPropertyValue(values, databaseProperties, "shouldBuy", item.shouldBuy);
  setNotionPropertyValue(values, databaseProperties, "unitCost", item.unitCost);
  setNotionPropertyValue(values, databaseProperties, "expiresAt", item.expiresAt);
  setNotionPropertyValue(values, databaseProperties, "supplier", item.supplier);
  setNotionPropertyValue(values, databaseProperties, "orderDay", item.orderDay);
  setNotionPropertyValue(values, databaseProperties, "controlType", item.controlType);
  setNotionPropertyValue(values, databaseProperties, "status", item.status);
  setNotionPropertyValue(values, databaseProperties, "notes", item.notes);
  setNotionPropertyValue(values, databaseProperties, "updatedAt", item.updatedAt);

  values[titlePropertyName] = item.name;

  const notionProperties = {};
  for (const [propertyName, value] of Object.entries(values)) {
    const property = databaseProperties[propertyName];
    if (!property) {
      skippedProperties.add(propertyName);
      continue;
    }

    const serialized = serializeProperty(property.type, value);
    if (!serialized) {
      skippedProperties.add(`${propertyName} (${property.type})`);
      continue;
    }
    notionProperties[propertyName] = serialized;
  }

  return notionProperties;
}

function setNotionPropertyValue(values, databaseProperties, key, value) {
  values[notionPropertyName(key, databaseProperties)] = value;
}

function notionPropertyName(key, properties) {
  const candidates = [PROPERTY_NAMES[key], ...(PROPERTY_ALIASES[key] || [])].filter(Boolean);
  return candidates.find((name) => properties[name]) || PROPERTY_NAMES[key];
}

function serializeProperty(type, value) {
  if (type === "title") return { title: [{ text: { content: String(value || "Produto sem nome") } }] };
  if (type === "rich_text") return { rich_text: value ? [{ text: { content: String(value) } }] : [] };
  if (type === "number") return { number: numberValue(value) };
  if (type === "select") return value ? { select: { name: String(value).slice(0, 100) } } : { select: null };
  if (type === "multi_select") return { multi_select: multiSelectValue(value) };
  if (type === "status") return value ? { status: { name: String(value).slice(0, 100) } } : { status: null };
  if (type === "date") return value ? { date: { start: String(value) } } : { date: null };
  return null;
}

function multiSelectValue(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((name) => ({ name: name.slice(0, 100) }));
}

function findTitleProperty(properties) {
  const configured = properties[PROPERTY_NAMES.product];
  if (configured?.type === "title") return { name: PROPERTY_NAMES.product, property: configured };

  const entry = Object.entries(properties).find(([, property]) => property.type === "title");
  return entry ? { name: entry[0], property: entry[1] } : null;
}

async function notionRequest(endpoint, options) {
  let response;
  try {
    response = await fetch(`https://api.notion.com/v1${endpoint}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new Error("Nao consegui ligar a API do Notion. Confirma a internet e tenta novamente.");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Erro Notion ${response.status}`);
  }
  return payload;
}

function friendlyNotionError(message) {
  if (message.includes("is a page, not a database")) {
    return "O NOTION_DATABASE_ID no .env e de uma pagina, nao da database. Abre a database como pagina inteira e copia o ID da propria database.";
  }

  if (message.includes("Could not find database")) {
    return "Nao encontrei essa database no Notion. Confirma o NOTION_DATABASE_ID e se a database foi partilhada com a integracao.";
  }

  if (message.includes("Unauthorized") || message.includes("API token is invalid")) {
    return "O NOTION_TOKEN parece invalido. Confirma o Internal Integration Secret no .env.";
  }

  return message || "Nao foi possivel sincronizar com o Notion.";
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(ROOT, requestedPath));
  const relativePath = path.relative(ROOT, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return sendText(response, 403, "Acesso negado");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) return sendText(response, 404, "Ficheiro nao encontrado");
    const type = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": type });
    response.end(data);
  });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Pedido demasiado grande"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("JSON invalido"));
      }
    });
    request.on("error", reject);
  });
}

function normalizeItem(item) {
  const normalized = {
    id: item.id || "",
    name: String(item.name || "Produto sem nome").trim(),
    category: item.category || "Outros",
    unit: item.unit || "un",
    quantity: numberValue(item.quantity),
    minimum: numberValue(item.minimum),
    dailyMinimum: numberValue(item.dailyMinimum),
    orderQuantity: numberValue(item.orderQuantity),
    shouldBuy: item.shouldBuy || "",
    unitCost: numberValue(item.unitCost),
    expiresAt: item.expiresAt || "",
    supplier: item.supplier || "",
    orderDay: item.orderDay || "",
    controlType: item.controlType || "",
    notes: item.notes || "",
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
  normalized.status = getStatus(normalized);
  return normalized;
}

function getStatus(item) {
  if (item.quantity <= item.minimum) return "Abaixo do minimo";
  if (item.expiresAt && daysUntil(item.expiresAt) < 0) return "Vencido";
  if (item.expiresAt && daysUntil(item.expiresAt) <= 7) return "A vencer";
  return "OK";
}

function daysUntil(dateText) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateText}T00:00:00`);
  return Math.ceil((date - today) / 86400000);
}

function numberValue(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(,|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseAppUsers(rawValue) {
  return String(rawValue || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [username, password, ...nameParts] = entry.split(":");
      return {
        username: String(username || "").trim(),
        password: String(password || ""),
        name: nameParts.join(":").trim() || String(username || "").trim(),
      };
    })
    .filter((entry) => entry.username && entry.password);
}

function ensureUserStore() {
  const users = readUserStoreFile();
  let changed = !fs.existsSync(USERS_PATH);
  for (const user of [...DEFAULT_USERS, ...parseAppUsers(process.env.APP_USERS || "")]) {
    const username = normalizeUsername(user.username || user.name);
    if (!username || users.some((entry) => entry.username === username)) continue;
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      name: user.name || username,
      username,
      sector: normalizeSector(user.sector) || "Sala",
      role: normalizeRole(user.role),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    setUserPassword(record, user.password || "1234");
    users.push(record);
    changed = true;
  }
  if (changed) writeUsers(users);
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readUsers() {
  try {
    if (!fs.existsSync(USERS_PATH)) ensureUserStore();
    return readUserStoreFile();
  } catch {
    return [];
  }
}

function readUserStoreFile() {
  try {
    if (!fs.existsSync(USERS_PATH)) return [];
    const users = JSON.parse(fs.readFileSync(USERS_PATH, "utf8"));
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function publicUserRecord(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    sector: user.sector,
    role: normalizeRole(user.role),
    active: user.active !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".");
}

function normalizeSector(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.startsWith("gest")) return "Gestao";
  if (normalized.startsWith("coz")) return "Cozinha";
  return "Sala";
}

function normalizeRole(value) {
  const normalized = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized === "manager" || normalized.startsWith("gest") || normalized.startsWith("admin") ? "manager" : "employee";
}

function setUserPassword(user, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  user.passwordSalt = salt;
  user.passwordHash = hashPassword(password, salt);
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password || ""), salt, 120000, 32, "sha256").toString("hex");
}

function verifyPassword(password, user) {
  if (!user.passwordSalt || !user.passwordHash) return false;
  const attempted = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(attempted, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function generateTemporaryPassword() {
  return String(1000 + crypto.randomInt(9000));
}

function deleteUserSessions(id, username) {
  for (const [token, session] of sessions.entries()) {
    if (session.userId === id || session.username === username) sessions.delete(token);
  }
}

function getSession(token) {
  cleanupSessions();
  const session = sessions.get(String(token || ""));
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    sessions.delete(session.token);
    return null;
  }
  return session;
}

function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (new Date(session.expiresAt).getTime() <= now) sessions.delete(token);
  }
}

function publicUser(session) {
  return {
    username: session.username,
    name: session.name,
    sector: session.sector,
    role: normalizeRole(session.role),
    expiresAt: session.expiresAt,
  };
}

function readCountRecords() {
  try {
    if (!fs.existsSync(COUNT_RECORDS_PATH)) return [];
    const records = JSON.parse(fs.readFileSync(COUNT_RECORDS_PATH, "utf8"));
    if (!Array.isArray(records)) return [];
    let changed = false;
    for (const record of records) {
      if (!record.id) {
        record.id = crypto.randomUUID();
        changed = true;
      }
      if (!Array.isArray(record.items)) record.items = [];
      for (const item of record.items) {
        if (!item.id) {
          item.id = crypto.randomUUID();
          changed = true;
        }
        if (typeof item.requested !== "boolean") {
          item.requested = false;
          changed = true;
        }
        if (!("requestedAt" in item)) {
          item.requestedAt = "";
          changed = true;
        }
        if (!("expiresAt" in item)) {
          item.expiresAt = "";
          changed = true;
        }
      }
    }
    if (changed) writeCountRecords(records);
    return records;
  } catch {
    return [];
  }
}

function appendCountRecord(record) {
  const records = [record, ...readCountRecords()].slice(0, 500);
  writeCountRecords(records);
}

function writeCountRecords(records) {
  fs.writeFileSync(COUNT_RECORDS_PATH, JSON.stringify(records, null, 2));
}

function readRevenueRecords() {
  try {
    if (!fs.existsSync(REVENUE_RECORDS_PATH)) return [];
    const records = JSON.parse(fs.readFileSync(REVENUE_RECORDS_PATH, "utf8"));
    if (!Array.isArray(records)) return [];
    let changed = false;
    const normalizedRecords = records.map((record) => {
      const normalized = normalizeRevenueRecord(record);
      if (!record.id || !("grossTotal" in record) || !("expenseTotal" in record) || !("netTotal" in record)) changed = true;
      return normalized;
    });
    if (changed) writeRevenueRecords(normalizedRecords);
    return normalizedRecords.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeRevenueRecords(records) {
  fs.writeFileSync(REVENUE_RECORDS_PATH, JSON.stringify(records.slice(0, 500), null, 2));
}

function isNotionConfigured() {
  return Boolean(NOTION_TOKEN && NOTION_DATABASE_ID);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json;charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, status, text) {
  response.writeHead(status, { "Content-Type": "text/plain;charset=utf-8" });
  response.end(text);
}
