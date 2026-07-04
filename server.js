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
const NOTION_INVOICE_DATABASE_ID = process.env.NOTION_INVOICE_DATABASE_ID || "";
const NOTION_PURCHASES_VIEW_URL = process.env.NOTION_PURCHASES_VIEW_URL || "";
const NOTION_MANAGEMENT_DASHBOARD_URL = process.env.NOTION_MANAGEMENT_DASHBOARD_URL || "";
const NOTION_MANAGEMENT_STOCK_URL = process.env.NOTION_MANAGEMENT_STOCK_URL || "";
const NOTION_MANAGEMENT_REVENUE_URL = process.env.NOTION_MANAGEMENT_REVENUE_URL || "";
const NOTION_MANAGEMENT_INVOICES_URL = process.env.NOTION_MANAGEMENT_INVOICES_URL || "";
const NOTION_MANAGEMENT_USERS_URL = process.env.NOTION_MANAGEMENT_USERS_URL || "";
const NOTION_MANAGEMENT_TIME_CLOCK_URL = process.env.NOTION_MANAGEMENT_TIME_CLOCK_URL || "";
const NOTION_MANAGEMENT_ACTIVITIES_URL = process.env.NOTION_MANAGEMENT_ACTIVITIES_URL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-5-mini";
const OPENAI_VISION_FALLBACK_MODELS = ["gpt-5.5", "gpt-4.1-mini", "gpt-4o-mini"];
const DEFAULT_STORE_LOCATION = {
  latitude: 37.0737152,
  longitude: -8.1002496,
  radiusMeters: 80,
  maxAccuracyMeters: 120,
};
const TIME_CLOCK_LOCATION = getTimeClockLocationConfig();
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
ensureDataDir();
const COUNT_RECORDS_PATH = path.join(DATA_DIR, "count-records.json");
const TIME_RECORDS_PATH = path.join(DATA_DIR, "time-records.json");
const REVENUE_RECORDS_PATH = path.join(DATA_DIR, "faturacao-records.json");
const INVOICE_RECORDS_PATH = path.join(DATA_DIR, "invoice-records.json");
const INVOICE_FILES_DIR = path.join(DATA_DIR, "invoice-files");
const USERS_PATH = path.join(DATA_DIR, "app-users.json");
const MAX_INVOICE_FILE_BYTES = 8 * 1024 * 1024;
ensureDir(INVOICE_FILES_DIR);
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

const INVOICE_PROPERTY_NAMES = {
  title: process.env.NOTION_INVOICE_PROPERTY_TITLE || "Fatura",
  supplier: process.env.NOTION_INVOICE_PROPERTY_SUPPLIER || "Fornecedor",
  invoiceNumber: process.env.NOTION_INVOICE_PROPERTY_NUMBER || "Nº da fatura",
  issueDate: process.env.NOTION_INVOICE_PROPERTY_ISSUE_DATE || "Data da fatura",
  dueDate: process.env.NOTION_INVOICE_PROPERTY_DUE_DATE || "Vencimento",
  amount: process.env.NOTION_INVOICE_PROPERTY_AMOUNT || "Valor",
  vat: process.env.NOTION_INVOICE_PROPERTY_VAT || "IVA",
  status: process.env.NOTION_INVOICE_PROPERTY_STATUS || "Estado",
  category: process.env.NOTION_INVOICE_PROPERTY_CATEGORY || "Categoria",
  notes: process.env.NOTION_INVOICE_PROPERTY_NOTES || "Observações",
  file: process.env.NOTION_INVOICE_PROPERTY_FILE || "Arquivo",
  originalFileName: process.env.NOTION_INVOICE_PROPERTY_ORIGINAL_FILE || "Arquivo original",
  createdAt: process.env.NOTION_INVOICE_PROPERTY_CREATED_AT || "Criado em",
  updatedAt: process.env.NOTION_INVOICE_PROPERTY_UPDATED_AT || "Atualizado em",
};

const INVOICE_PROPERTY_ALIASES = {
  title: ["Fatura", "Factura", "Nome"],
  invoiceNumber: ["Nº da fatura", "Numero da fatura", "Número da fatura", "Nº da factura", "Numero da factura"],
  issueDate: ["Data da fatura", "Data da factura", "Emissão", "Emissao"],
  dueDate: ["Vencimento", "Data de vencimento", "Prazo"],
  amount: ["Valor", "Total", "Total a pagar"],
  vat: ["IVA", "Iva"],
  notes: ["Observações", "Observacoes", "Notas"],
  file: ["Arquivo", "Ficheiro", "Anexo"],
};

const MIME_TYPES = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "application/javascript;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".csv": "text/csv;charset=utf-8",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".svg": "image/svg+xml",
};

http
  .createServer(async (request, response) => {
    try {
      const requestPath = new URL(request.url, `http://localhost:${PORT}`).pathname;

      if (requestPath === "/api/notion/status" && request.method === "GET") {
        return sendJson(response, 200, { configured: isNotionConfigured() });
      }

      if (requestPath === "/api/app-links" && request.method === "GET") {
        return sendJson(response, 200, getAppLinks());
      }

      if (requestPath === "/api/notion/databases" && request.method === "GET") {
        return await handleListDatabases(response);
      }

      if (requestPath === "/api/notion/items" && request.method === "GET") {
        return await handleNotionItems(response);
      }

      if (requestPath === "/api/notion/sync" && request.method === "POST") {
        return await handleNotionSync(request, response);
      }

      if (requestPath === "/api/auth/login" && request.method === "POST") {
        return await handleLogin(request, response);
      }

      if (requestPath === "/api/auth/session" && request.method === "POST") {
        return await handleSession(request, response);
      }

      if (requestPath === "/api/auth/logout" && request.method === "POST") {
        return await handleLogout(request, response);
      }

      if (requestPath === "/api/users" && request.method === "GET") {
        return handleUsers(response);
      }

      if (requestPath === "/api/users/save" && request.method === "POST") {
        return await handleSaveUser(request, response);
      }

      if (requestPath === "/api/users/delete" && request.method === "POST") {
        return await handleDeleteUser(request, response);
      }

      if (requestPath === "/api/users/toggle" && request.method === "POST") {
        return await handleToggleUser(request, response);
      }

      if (requestPath === "/api/users/reset-password" && request.method === "POST") {
        return await handleResetUserPassword(request, response);
      }

      if (requestPath === "/api/time-records" && request.method === "GET") {
        return handleTimeRecords(request, response);
      }

      if (requestPath === "/api/time-records/me" && request.method === "POST") {
        return await handleMyTimeRecord(request, response);
      }

      if (requestPath === "/api/time-records/punch" && request.method === "POST") {
        return await handleTimePunch(request, response);
      }

      if (requestPath === "/api/count-records" && request.method === "GET") {
        return handleCountRecords(response);
      }

      if (requestPath === "/api/count-records/item-status" && request.method === "POST") {
        return await handleCountRecordItemStatus(request, response);
      }

      if (requestPath === "/api/revenue-records" && request.method === "GET") {
        return handleRevenueRecords(response);
      }

      if (requestPath === "/api/revenue-records/save" && request.method === "POST") {
        return await handleSaveRevenueRecord(request, response);
      }

      if (requestPath === "/api/revenue-records/delete" && request.method === "POST") {
        return await handleDeleteRevenueRecord(request, response);
      }

      if (requestPath === "/api/invoices" && request.method === "GET") {
        return handleInvoiceRecords(response);
      }

      if (requestPath === "/api/invoices/upload" && request.method === "POST") {
        return await handleUploadInvoiceFile(request, response);
      }

      if (requestPath === "/api/invoices/save" && request.method === "POST") {
        return await handleSaveInvoiceRecord(request, response);
      }

      if (requestPath === "/api/invoices/sync" && request.method === "POST") {
        return await handleSyncInvoiceRecords(response);
      }

      if (requestPath === "/api/invoices/status" && request.method === "POST") {
        return await handleUpdateInvoiceStatus(request, response);
      }

      if (requestPath === "/api/invoices/delete" && request.method === "POST") {
        return await handleDeleteInvoiceRecord(request, response);
      }

      if (requestPath.startsWith("/api/invoice-files/") && request.method === "GET") {
        return serveInvoiceFile(request, response);
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

function handleTimeRecords(request, response) {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const date = normalizeDate(url.searchParams.get("date") || "");
  const employee = normalizeTextKey(url.searchParams.get("employee") || "");
  let records = readTimeRecords();
  if (date) records = records.filter((record) => record.date === date);
  if (employee) {
    records = records.filter((record) => {
      const haystack = `${record.employeeName || ""} ${record.employeeUsername || ""} ${record.employeeSector || ""}`;
      return normalizeTextKey(haystack).includes(employee);
    });
  }
  return sendJson(response, 200, { records: records.slice(0, 240) });
}

async function handleMyTimeRecord(request, response) {
  const body = await readJson(request);
  const session = getSession(body.authToken);
  if (!session) return sendJson(response, 401, { error: "Sessao expirada. Faz login novamente." });
  const date = normalizeDate(body.date) || todayDateText();
  const record = findTimeRecord(readTimeRecords(), session, date);
  return sendJson(response, 200, { record: record || buildEmptyTimeRecord(session, date) });
}

async function handleTimePunch(request, response) {
  const body = await readJson(request);
  const session = getSession(body.authToken);
  if (!session) return sendJson(response, 401, { error: "Sessao expirada. Faz login novamente antes de registrar o ponto." });
  const action = normalizeTimeAction(body.action);
  if (!action) return sendJson(response, 400, { error: "Tipo de ponto invalido." });
  const locationCheck = validateTimeClockLocation(body.location);
  if (!locationCheck.ok) {
    return sendJson(response, locationCheck.status || 403, { error: locationCheck.error, location: locationCheck.location || null });
  }

  const date = normalizeDate(body.date) || todayDateText();
  const records = readTimeRecords();
  let record = findTimeRecord(records, session, date);
  if (!record) {
    record = buildEmptyTimeRecord(session, date);
    records.unshift(record);
  }

  const now = new Date().toISOString();
  record[timeActionField(action)] = now;
  record.lastLocation = locationCheck.location;
  record.updatedAt = now;
  record.events.unshift({
    id: crypto.randomUUID(),
    action,
    label: timeActionLabel(action),
    createdAt: now,
    location: locationCheck.location,
  });
  record.events = record.events.slice(0, 40);
  writeTimeRecords(records);
  return sendJson(response, 200, { record, records: readTimeRecords().slice(0, 240) });
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

function handleInvoiceRecords(response) {
  const records = readInvoiceRecords().slice(0, 180);
  return sendJson(response, 200, { records });
}

async function handleUploadInvoiceFile(request, response) {
  const body = await readJson(request, MAX_INVOICE_FILE_BYTES * 2);
  const fileName = String(body.fileName || "fatura").trim();
  const dataUrl = String(body.dataUrl || "");
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return sendJson(response, 400, { error: "Arquivo invalido." });

  const contentType = String(body.contentType || parsed.contentType || "application/octet-stream").toLowerCase();
  if (!isAllowedInvoiceContentType(contentType)) {
    return sendJson(response, 400, { error: "Envia apenas PDF ou imagem." });
  }

  const buffer = Buffer.from(parsed.base64, "base64");
  if (buffer.length === 0) return sendJson(response, 400, { error: "Arquivo vazio." });
  if (buffer.length > MAX_INVOICE_FILE_BYTES) {
    return sendJson(response, 400, { error: "Arquivo muito grande. Usa PDF/foto ate 8 MB." });
  }

  const id = crypto.randomUUID();
  const safeName = safeFileName(fileName, contentType);
  const storedName = `${id}-${safeName}`;
  fs.writeFileSync(path.join(INVOICE_FILES_DIR, storedName), buffer);

  const fileUrlPath = `/api/invoice-files/${encodeURIComponent(storedName)}`;
  const file = {
    id,
    originalName: fileName || safeName,
    storedName,
    contentType,
    size: buffer.length,
    url: absoluteUrl(request, fileUrlPath),
    uploadedAt: new Date().toISOString(),
  };
  const extraction = await extractInvoiceDraft(file.originalName, buffer, contentType);
  return sendJson(response, 200, { file, draft: extraction.draft, extractionMessage: extraction.message });
}

async function handleSaveInvoiceRecord(request, response) {
  const body = await readJson(request);
  const record = normalizeInvoiceRecord(body.record || body);
  record.updatedAt = new Date().toISOString();
  const records = readInvoiceRecords();
  const index = records.findIndex((entry) => entry.id === record.id);
  if (index >= 0) {
    record.createdAt = records[index].createdAt || record.createdAt;
    records[index] = record;
  } else {
    records.unshift(record);
  }
  writeInvoiceRecords(records);

  const notion = await syncInvoiceRecordToNotion(record);
  return sendJson(response, 200, { record, records: readInvoiceRecords().slice(0, 180), notion });
}

async function handleSyncInvoiceRecords(response) {
  const records = readInvoiceRecords();
  const results = [];
  let synced = 0;
  let failed = 0;

  for (const record of records) {
    const notion = await syncInvoiceRecordToNotion(record);
    if (notion.synced) synced += 1;
    else failed += 1;
    results.push({ id: record.id, title: record.title, notion });
  }

  return sendJson(response, 200, { synced, failed, results, records: readInvoiceRecords().slice(0, 180) });
}

async function handleUpdateInvoiceStatus(request, response) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const status = normalizeInvoiceStatus(body.status);
  const records = readInvoiceRecords();
  const record = records.find((entry) => entry.id === id);
  if (!record) return sendJson(response, 404, { error: "Fatura nao encontrada." });

  record.status = status;
  record.updatedAt = new Date().toISOString();
  writeInvoiceRecords(records);

  const notion = await syncInvoiceRecordToNotion(record);
  return sendJson(response, 200, { record, records: readInvoiceRecords().slice(0, 180), notion });
}

async function handleDeleteInvoiceRecord(request, response) {
  const body = await readJson(request);
  const id = String(body.id || "");
  const records = readInvoiceRecords().filter((record) => record.id !== id);
  writeInvoiceRecords(records);
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

function normalizeInvoiceRecord(rawRecord) {
  const now = new Date().toISOString();
  const dueDate = normalizeLooseDate(rawRecord.dueDate);
  const status = normalizeInvoiceStatus(rawRecord.status, dueDate);
  const supplier = String(rawRecord.supplier || "").trim();
  const invoiceNumber = String(rawRecord.invoiceNumber || "").trim();
  const originalFileName = String(rawRecord.originalFileName || rawRecord.fileName || "").trim();
  const title = String(rawRecord.title || invoiceTitle({ supplier, invoiceNumber, originalFileName })).trim();

  return {
    id: String(rawRecord.id || crypto.randomUUID()),
    title,
    supplier,
    invoiceNumber,
    issueDate: normalizeLooseDate(rawRecord.issueDate),
    dueDate,
    amount: moneyValue(rawRecord.amount),
    vat: moneyValue(rawRecord.vat),
    status,
    category: String(rawRecord.category || "Geral").trim() || "Geral",
    notes: String(rawRecord.notes || "").trim(),
    fileUrl: String(rawRecord.fileUrl || "").trim(),
    originalFileName,
    storedFileName: String(rawRecord.storedFileName || "").trim(),
    contentType: String(rawRecord.contentType || "").trim(),
    fileSize: Math.max(0, Math.round(numberValue(rawRecord.fileSize))),
    createdAt: rawRecord.createdAt || now,
    updatedAt: rawRecord.updatedAt || now,
  };
}

function normalizeInvoiceStatus(status, dueDate) {
  const raw = String(status || "").trim();
  if (raw === "Pago") return "Pago";
  if (raw === "Por pagar" || raw === "Atrasado") return "Por pagar";
  if (raw === "Pendente") return "Pendente";
  if (dueDate && daysUntil(dueDate) < 0) return "Por pagar";
  return "Pendente";
}

function invoiceTitle(record) {
  const supplier = String(record.supplier || "").trim();
  const number = String(record.invoiceNumber || "").trim();
  if (supplier && number) return `${supplier} - ${number}`;
  if (supplier) return supplier;
  if (number) return `Fatura ${number}`;
  return String(record.originalFileName || "Fatura a pagar").trim();
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

function todayDateText() {
  return new Date().toISOString().slice(0, 10);
}

function getTimeClockLocationConfig() {
  const configuredLatitude = optionalNumber(process.env.STORE_LATITUDE || process.env.TIME_CLOCK_STORE_LATITUDE);
  const configuredLongitude = optionalNumber(process.env.STORE_LONGITUDE || process.env.TIME_CLOCK_STORE_LONGITUDE);
  const latitude = Number.isFinite(configuredLatitude) ? configuredLatitude : DEFAULT_STORE_LOCATION.latitude;
  const longitude = Number.isFinite(configuredLongitude) ? configuredLongitude : DEFAULT_STORE_LOCATION.longitude;
  return {
    configured: Number.isFinite(latitude) && Number.isFinite(longitude),
    latitude,
    longitude,
    radiusMeters: positiveNumber(process.env.STORE_RADIUS_METERS || process.env.TIME_CLOCK_RADIUS_METERS, DEFAULT_STORE_LOCATION.radiusMeters),
    maxAccuracyMeters: positiveNumber(
      process.env.STORE_MAX_ACCURACY_METERS || process.env.TIME_CLOCK_MAX_ACCURACY_METERS,
      DEFAULT_STORE_LOCATION.maxAccuracyMeters,
    ),
  };
}

function validateTimeClockLocation(location) {
  if (!TIME_CLOCK_LOCATION.configured) {
    return {
      ok: false,
      status: 503,
      error: "Localizacao da loja nao configurada. Configure STORE_LATITUDE e STORE_LONGITUDE no ficheiro .env local ou no Render.",
    };
  }

  const latitude = optionalNumber(location?.latitude);
  const longitude = optionalNumber(location?.longitude);
  const accuracy = optionalNumber(location?.accuracy);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, status: 400, error: "Nao foi possivel ler a localizacao do telemovel." };
  }
  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    return { ok: false, status: 400, error: "A localizacao nao informou precisao suficiente para validar o ponto." };
  }
  if (accuracy > TIME_CLOCK_LOCATION.maxAccuracyMeters) {
    return {
      ok: false,
      status: 403,
      error: `Ponto nao registado. A precisao do GPS esta baixa (${Math.round(accuracy)} m). Tenta novamente com GPS ativo perto da loja.`,
      location: { status: "low_accuracy", accuracyMeters: Math.round(accuracy) },
    };
  }

  const distanceMeters = distanceBetweenMeters(latitude, longitude, TIME_CLOCK_LOCATION.latitude, TIME_CLOCK_LOCATION.longitude);
  if (distanceMeters > TIME_CLOCK_LOCATION.radiusMeters) {
    return {
      ok: false,
      status: 403,
      error: `Ponto nao registado. Estás a ${Math.round(distanceMeters)} m da loja; o limite é ${Math.round(TIME_CLOCK_LOCATION.radiusMeters)} m.`,
      location: {
        status: "outside",
        distanceMeters: Math.round(distanceMeters),
        accuracyMeters: Math.round(accuracy),
        radiusMeters: Math.round(TIME_CLOCK_LOCATION.radiusMeters),
        capturedAt: validIsoDate(location?.capturedAt) || new Date().toISOString(),
      },
    };
  }

  return {
    ok: true,
    location: {
      status: "inside",
      distanceMeters: Math.round(distanceMeters),
      accuracyMeters: Math.round(accuracy),
      radiusMeters: Math.round(TIME_CLOCK_LOCATION.radiusMeters),
      capturedAt: validIsoDate(location?.capturedAt) || new Date().toISOString(),
    },
  };
}

function distanceBetweenMeters(lat1, lon1, lat2, lon2) {
  const radius = 6371000;
  const phi1 = degreesToRadians(lat1);
  const phi2 = degreesToRadians(lat2);
  const deltaPhi = degreesToRadians(lat2 - lat1);
  const deltaLambda = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function optionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return NaN;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function positiveNumber(value, fallback) {
  const parsed = optionalNumber(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

async function syncInvoiceRecordToNotion(record) {
  const invoiceDatabaseId = await resolveInvoiceDatabaseId();
  if (!NOTION_TOKEN || !invoiceDatabaseId) {
    return { configured: false, synced: false, message: "NOTION_INVOICE_DATABASE_ID nao configurado." };
  }

  try {
    const dataSourceRef = await resolveDataSource(invoiceDatabaseId);
    const dataSource = dataSourceRef.dataSource;
    const properties = dataSource.properties || {};
    const titleProperty = findInvoiceTitleProperty(properties);
    if (!titleProperty) throw new Error("A database de faturas precisa de uma propriedade de titulo.");

    const notionProperties = buildInvoiceNotionProperties(record, properties, titleProperty.name);
    const existingPage = await findPageByTitle(dataSourceRef.id, titleProperty.name, record.title);
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

async function resolveInvoiceDatabaseId() {
  const configuredId = String(NOTION_INVOICE_DATABASE_ID || "").trim();
  if (isUsableNotionId(configuredId)) return configuredId;
  if (!NOTION_TOKEN) return "";

  const databases = await searchDatabases();
  const exactMatch = databases.find((database) => normalizeTextKey(database.title) === "faturas a pagar");
  if (exactMatch) return exactMatch.id;
  const likelyMatch = databases.find((database) => normalizeTextKey(database.title).includes("fatura"));
  return likelyMatch?.id || "";
}

function isUsableNotionId(value) {
  const id = String(value || "").trim();
  return /^[a-f0-9]{32}$/i.test(id) || /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
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

function buildInvoiceNotionProperties(record, databaseProperties, titlePropertyName) {
  const values = {};
  setInvoicePropertyValue(values, databaseProperties, "supplier", record.supplier);
  setInvoicePropertyValue(values, databaseProperties, "invoiceNumber", record.invoiceNumber);
  setInvoicePropertyValue(values, databaseProperties, "issueDate", record.issueDate);
  setInvoicePropertyValue(values, databaseProperties, "dueDate", record.dueDate);
  setInvoicePropertyValue(values, databaseProperties, "amount", record.amount);
  setInvoicePropertyValue(values, databaseProperties, "vat", record.vat);
  setInvoicePropertyValue(values, databaseProperties, "status", record.status);
  setInvoicePropertyValue(values, databaseProperties, "category", record.category);
  setInvoicePropertyValue(values, databaseProperties, "notes", record.notes);
  setInvoicePropertyValue(values, databaseProperties, "file", { url: record.fileUrl, name: record.originalFileName || record.title });
  setInvoicePropertyValue(values, databaseProperties, "originalFileName", record.originalFileName);
  setInvoicePropertyValue(values, databaseProperties, "createdAt", record.createdAt);
  setInvoicePropertyValue(values, databaseProperties, "updatedAt", record.updatedAt);
  values[titlePropertyName] = record.title;

  const notionProperties = {};
  for (const [propertyName, value] of Object.entries(values)) {
    const property = databaseProperties[propertyName];
    if (!property) continue;
    const serialized = serializeInvoiceProperty(property, value);
    if (serialized) notionProperties[propertyName] = serialized;
  }
  return notionProperties;
}

function setInvoicePropertyValue(values, databaseProperties, key, value) {
  values[invoicePropertyName(key, databaseProperties)] = value;
}

function invoicePropertyName(key, properties) {
  const candidates = [INVOICE_PROPERTY_NAMES[key], ...(INVOICE_PROPERTY_ALIASES[key] || [])].filter(Boolean);
  return candidates.find((name) => properties[name]) || INVOICE_PROPERTY_NAMES[key];
}

function findInvoiceTitleProperty(properties) {
  const configured = properties[INVOICE_PROPERTY_NAMES.title];
  if (configured?.type === "title") return { name: INVOICE_PROPERTY_NAMES.title, property: configured };
  return findTitleProperty(properties);
}

function serializeInvoiceProperty(property, value) {
  const type = typeof property === "string" ? property : property?.type;
  if (type === "files") {
    const url = typeof value === "object" ? value.url : String(value || "");
    const name = typeof value === "object" ? value.name : "Fatura";
    return url ? { files: [{ name: String(name || "Fatura").slice(0, 100), type: "external", external: { url } }] } : { files: [] };
  }
  if (type === "url") {
    const url = typeof value === "object" ? value.url : String(value || "");
    return { url: url || null };
  }
  if (type === "status") {
    const status = invoiceStatusForNotion(property, value);
    return status ? { status: { name: status } } : { status: null };
  }
  return serializeProperty(type, typeof value === "object" ? value.url || "" : value);
}

function invoiceStatusForNotion(property, value) {
  const normalized = normalizeInvoiceStatus(value);
  const options = property?.status?.options || [];
  const optionNames = options.map((option) => option.name).filter(Boolean);
  const aliases = {
    Pendente: ["Pendente", "Agendado", "Aberto", "Em aberto"],
    Pago: ["Pago", "Paga", "Paid"],
    "Por pagar": ["Por pagar", "A pagar", "Atrasado", "Vencido"],
  };
  return findFirstMatchingOption(optionNames, aliases[normalized] || [normalized]) || normalized;
}

function findFirstMatchingOption(options, candidates) {
  const normalizedOptions = new Map(options.map((name) => [normalizeTextKey(name), name]));
  for (const candidate of candidates) {
    const match = normalizedOptions.get(normalizeTextKey(candidate));
    if (match) return match;
  }
  return "";
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
      filter: { property: "object", value: "data_source" },
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
    if (!isMissingNotionDataSourceError(error.message)) throw error;
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

  if (message.includes("Could not find database") || isMissingNotionDataSourceError(message)) {
    return "Nao encontrei essa database no Notion. Confirma o ID e se a database foi partilhada com a integracao.";
  }

  if (message.includes("Unauthorized") || message.includes("API token is invalid")) {
    return "O NOTION_TOKEN parece invalido. Confirma o Internal Integration Secret no .env.";
  }

  return message || "Nao foi possivel sincronizar com o Notion.";
}

function isMissingNotionDataSourceError(message) {
  return String(message || "").includes("Could not find data source") || String(message || "").includes("Could not find data_source");
}

function serveInvoiceFile(request, response) {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const storedName = decodeURIComponent(url.pathname.replace("/api/invoice-files/", ""));
  const filePath = path.normalize(path.join(INVOICE_FILES_DIR, path.basename(storedName)));
  const relativePath = path.relative(INVOICE_FILES_DIR, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return sendText(response, 403, "Acesso negado");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) return sendText(response, 404, "Ficheiro nao encontrado");
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${path.basename(filePath).replace(/"/g, "")}"`,
    });
    response.end(data);
  });
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

function readJson(request, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
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

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { contentType: match[1], base64: match[2] };
  if (/^[a-z0-9+/=\s]+$/i.test(dataUrl || "")) return { contentType: "", base64: dataUrl };
  return null;
}

function isAllowedInvoiceContentType(contentType) {
  return ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(contentType);
}

function safeFileName(fileName, contentType) {
  const extension = extensionForInvoiceFile(fileName, contentType);
  const base = path
    .basename(fileName || "fatura")
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "fatura"}${extension}`;
}

function extensionForInvoiceFile(fileName, contentType) {
  const current = path.extname(fileName || "").toLowerCase();
  if ([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].includes(current)) return current;
  if (contentType === "application/pdf") return ".pdf";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/heic") return ".heic";
  if (contentType === "image/heif") return ".heif";
  return ".jpg";
}

function absoluteUrl(request, pathname) {
  const protocol = String(request.headers["x-forwarded-proto"] || "").split(",")[0] || "http";
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || `localhost:${PORT}`).split(",")[0];
  return `${protocol}://${host}${pathname}`;
}

async function extractInvoiceDraft(fileName, buffer, contentType) {
  const isImage = contentType.startsWith("image/");
  const text = contentType === "application/pdf" ? extractReadablePdfText(buffer) : "";
  const source = `${fileName}\n${text}`.slice(0, 30000);
  const draft = isImage ? emptyInvoiceDraft() : buildInvoiceDraftFromText(source, fileName);
  const foundAny = hasInvoiceDraftData(draft);

  if (isImage && OPENAI_API_KEY) {
    try {
      const aiDraft = await extractInvoiceDraftWithOpenAI(fileName, buffer, contentType);
      const mergedDraft = mergeInvoiceDrafts(draft, aiDraft);
      return {
        draft: mergedDraft,
        message: hasInvoiceDraftData(mergedDraft)
          ? "Arquivo guardado. A foto foi lida por IA; confirma os campos antes de guardar."
          : "Arquivo guardado. A IA analisou a foto, mas não encontrou dados confiáveis. Preenche os campos manualmente ou tenta uma foto mais nítida.",
      };
    } catch (error) {
      const fallbackMessage = foundAny
        ? "Arquivo guardado. A leitura por IA falhou, mas alguns campos foram preenchidos pelo nome do arquivo."
        : "Arquivo guardado. A leitura por IA falhou; preenche os campos manualmente por enquanto.";
      return { draft, message: `${fallbackMessage} ${friendlyOpenAIError(error.message)}`.trim() };
    }
  }

  if (isImage && !OPENAI_API_KEY) {
    return {
      draft,
      message:
        "Arquivo guardado. Para ler fotos automaticamente, configure OPENAI_API_KEY no Render/local. Preenche os campos manualmente por enquanto.",
    };
  }

  const message = foundAny
    ? "Arquivo guardado. Alguns campos foram preenchidos automaticamente; confirma antes de guardar."
    : "Arquivo guardado. Nao consegui ler dados suficientes automaticamente; preenche ou confirma os campos antes de guardar.";
  return { draft, message };
}

function buildInvoiceDraftFromText(source, fileName) {
  return {
    supplier: guessSupplier(source, fileName),
    invoiceNumber: matchFirst(source, [
      /(?:fatura|factura|invoice|doc\.?|documento)\s*(?:n[ºo.]?|numero|number)?\s*[:#-]?\s*([a-z0-9][a-z0-9./_-]{2,})/i,
      /\b(?:ft|fac|inv)[\s.-]*([a-z0-9./_-]{3,})\b/i,
    ]),
    issueDate: findDateNear(source, /(data\s*(?:da)?\s*(?:fatura|factura|emissao|emissão)|invoice\s*date)/i),
    dueDate: findDateNear(source, /(vencimento|data\s*de\s*vencimento|due\s*date|pagamento\s*ate|pagamento\s*até)/i),
    amount: findMoneyNear(source, /(total\s*(?:a\s*pagar)?|valor\s*(?:total)?|amount\s*due)/i),
    vat: findMoneyNear(source, /\b(iva|vat)\b/i),
    status: "Pendente",
    category: "Geral",
    notes: "",
  };
}

function emptyInvoiceDraft() {
  return {
    supplier: "",
    invoiceNumber: "",
    issueDate: "",
    dueDate: "",
    amount: 0,
    vat: 0,
    status: "Pendente",
    category: "Geral",
    notes: "",
  };
}

function hasInvoiceDraftData(draft) {
  return Object.entries(draft).some(([key, value]) => !["status", "category", "notes"].includes(key) && Boolean(value));
}

function mergeInvoiceDrafts(localDraft, aiDraft) {
  const merged = { ...localDraft };
  for (const [key, value] of Object.entries(aiDraft || {})) {
    if (value !== undefined && value !== null && value !== "") merged[key] = value;
  }
  return {
    ...merged,
    supplier: cleanInvoiceIdentityValue(merged.supplier),
    invoiceNumber: cleanInvoiceIdentityValue(merged.invoiceNumber),
    amount: moneyValue(merged.amount),
    vat: moneyValue(merged.vat),
    issueDate: normalizeLooseDate(merged.issueDate),
    dueDate: normalizeLooseDate(merged.dueDate),
    status: normalizeInvoiceStatus(merged.status, normalizeLooseDate(merged.dueDate)),
    category: cleanTextValue(merged.category || "Geral") || "Geral",
  };
}

async function extractInvoiceDraftWithOpenAI(fileName, buffer, contentType) {
  const responseModels = uniqueValues([OPENAI_VISION_MODEL, ...OPENAI_VISION_FALLBACK_MODELS]);
  const chatModels = uniqueValues(["gpt-4o-mini", "gpt-4.1-mini"]);
  const attempts = [
    ...responseModels.map((model) => ({ api: "responses", model })),
    ...chatModels.map((model) => ({ api: "chat", model })),
  ];
  let lastError = null;

  for (const attempt of attempts) {
    try {
      if (attempt.api === "chat") {
        return await extractInvoiceDraftWithOpenAIChat(fileName, buffer, contentType, attempt.model);
      }
      return await extractInvoiceDraftWithOpenAIModel(fileName, buffer, contentType, attempt.model);
    } catch (error) {
      lastError = error;
      if (!isRetryableOpenAIExtractionError(error.message)) break;
    }
  }

  throw lastError || new Error("Nao foi possivel ler a imagem com IA.");
}

async function extractInvoiceDraftWithOpenAIModel(fileName, buffer, contentType, model) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_output_tokens: 700,
      text: {
        format: invoiceExtractionTextFormat(),
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: invoiceExtractionPrompt(),
            },
            {
              type: "input_image",
              image_url: `data:${contentType};base64,${buffer.toString("base64")}`,
              detail: "high",
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `Erro OpenAI ${response.status}`);
  }

  const text = responseOutputText(payload);
  let parsed;
  try {
    parsed = parseJsonObject(text);
  } catch (error) {
    const draftFromText = mergeInvoiceDrafts(emptyInvoiceDraft(), buildInvoiceDraftFromText(text, ""));
    if (hasInvoiceDraftData(draftFromText)) return draftFromText;
    throw new Error(`A IA respondeu num formato inesperado. ${text ? `Resposta: ${text.slice(0, 220)}` : "Resposta vazia."}`);
  }

  return normalizeOpenAIInvoiceDraft(parsed);
}

async function extractInvoiceDraftWithOpenAIChat(fileName, buffer, contentType, model) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Responde apenas com JSON valido. Chaves obrigatorias: supplier, invoiceNumber, issueDate, dueDate, amount, vat, status, category, notes. status deve ser Pendente, Pago ou Por pagar.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: invoiceExtractionPrompt() },
            {
              type: "image_url",
              image_url: {
                url: `data:${contentType};base64,${buffer.toString("base64")}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `Erro OpenAI ${response.status}`);
  }

  const text = String(payload.choices?.[0]?.message?.content || "").trim();
  let parsed;
  try {
    parsed = parseJsonObject(text);
  } catch (error) {
    const draftFromText = mergeInvoiceDrafts(emptyInvoiceDraft(), buildInvoiceDraftFromText(text, ""));
    if (hasInvoiceDraftData(draftFromText)) return draftFromText;
    throw new Error(`A IA respondeu num formato inesperado. ${text ? `Resposta: ${text.slice(0, 220)}` : "Resposta vazia."}`);
  }

  return normalizeOpenAIInvoiceDraft(parsed);
}

function normalizeOpenAIInvoiceDraft(parsed) {
  return {
    supplier: cleanInvoiceIdentityValue(parsed.supplier),
    invoiceNumber: cleanInvoiceIdentityValue(parsed.invoiceNumber),
    issueDate: normalizeLooseDate(parsed.issueDate),
    dueDate: normalizeLooseDate(parsed.dueDate),
    amount: moneyValue(parsed.amount),
    vat: moneyValue(parsed.vat),
    status: normalizeInvoiceStatus(parsed.status, normalizeLooseDate(parsed.dueDate)),
    category: cleanTextValue(parsed.category || "Geral") || "Geral",
    notes: cleanTextValue(parsed.notes),
  };
}

function invoiceExtractionPrompt() {
  return "Extrai os dados visiveis desta foto de fatura/recibo de fornecedor em Portugal. supplier deve ser o emissor/fornecedor, nunca o cliente. invoiceNumber deve ser apenas o numero da fatura/documento, nunca NIF, telefone, IBAN ou referencia de pagamento. issueDate e a data de emissao/data da fatura. dueDate e apenas a data marcada como vencimento/pagamento ate; se nao existir, usa string vazia. amount e o total final a pagar em euros, nao subtotal nem base tributavel. vat e apenas o valor do IVA em euros. status deve ser Pendente, Pago ou Por pagar. category deve ser uma categoria curta da despesa. notes deve apontar duvidas curtas. Usa strings vazias e 0 quando um campo nao estiver claro. Datas devem ficar em YYYY-MM-DD.";
}

function invoiceExtractionTextFormat() {
  return {
    type: "json_schema",
    name: "invoice_extraction",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        supplier: { type: "string", description: "Nome do fornecedor/emissor da fatura." },
        invoiceNumber: { type: "string", description: "Numero ou referencia da fatura." },
        issueDate: { type: "string", description: "Data da fatura no formato YYYY-MM-DD, ou vazio." },
        dueDate: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD, ou vazio." },
        amount: { type: "number", description: "Valor total a pagar em euros." },
        vat: { type: "number", description: "Valor de IVA em euros, se estiver visivel." },
        status: { type: "string", enum: ["Pendente", "Pago", "Por pagar"] },
        category: { type: "string", description: "Categoria simples da despesa, ou Geral." },
        notes: { type: "string", description: "Observacoes curtas sobre dados incertos ou relevantes." },
      },
      required: ["supplier", "invoiceNumber", "issueDate", "dueDate", "amount", "vat", "status", "category", "notes"],
    },
  };
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function isRetryableOpenAIExtractionError(message) {
  const raw = String(message || "").toLowerCase();
  return (
    (raw.includes("model") &&
      (raw.includes("does not exist") || raw.includes("not found") || raw.includes("not have access") || raw.includes("unsupported"))) ||
    (raw.includes("json_schema") && raw.includes("unsupported")) ||
    (raw.includes("text.format") && raw.includes("unsupported")) ||
    raw.includes("formato inesperado") ||
    raw.includes("resposta vazia") ||
    raw.includes("json valido") ||
    raw.includes("json válido")
  );
}

function responseOutputText(payload) {
  if (payload.output_text) return String(payload.output_text);
  const parts = [];
  for (const output of payload.output || []) {
    for (const content of output.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      else if (content.text) parts.push(content.text);
    }
  }
  if (parts.length) return parts.join("\n").trim();
  return collectResponseStrings(payload).join("\n").trim();
}

function collectResponseStrings(value, key = "") {
  if (!value) return [];
  if (typeof value === "string") {
    const usefulKeys = new Set(["text", "output_text", "content", "arguments"]);
    if (usefulKeys.has(key) || key === "refusal" || value.trim().startsWith("{")) return [value];
    return [];
  }
  if (Array.isArray(value)) return value.flatMap((entry) => collectResponseStrings(entry, key));
  if (typeof value !== "object") return [];

  const strings = [];
  for (const [childKey, childValue] of Object.entries(value)) {
    strings.push(...collectResponseStrings(childValue, childKey));
  }
  return strings;
}

function parseJsonObject(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("A IA nao devolveu JSON valido.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function friendlyOpenAIError(message) {
  const raw = String(message || "");
  const lower = raw.toLowerCase();
  if (lower.includes("incorrect api key") || lower.includes("invalid_api_key") || lower.includes("unauthorized")) {
    return "A chave OpenAI parece inválida. Confirma a OPENAI_API_KEY no Render, sem espaços antes/depois.";
  }
  if (isRetryableOpenAIExtractionError(raw) && raw.toLowerCase().includes("model")) {
    return "O modelo de IA configurado não está disponível para a tua conta. Remove OPENAI_VISION_MODEL ou usa gpt-5.5.";
  }
  if (lower.includes("quota") || lower.includes("billing") || lower.includes("insufficient_quota")) {
    return "A conta OpenAI parece sem saldo/billing ativo. Confirma o Billing no OpenAI Platform.";
  }
  if (lower.includes("rate limit")) return "A OpenAI limitou temporariamente os pedidos. Tenta novamente em instantes.";
  return raw ? `Detalhe: ${raw}` : "";
}

function extractReadablePdfText(buffer) {
  const utfText = buffer.toString("utf8");
  const latinText = buffer.toString("latin1");
  return `${utfText}\n${latinText}`
    .replace(/\\[rn]/g, "\n")
    .replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u00ff€]/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function guessSupplier(source, fileName) {
  const supplier = matchFirst(source, [
    /(?:fornecedor|supplier|emitente)\s*[:#-]?\s*([^\n\r|]{3,80})/i,
    /(?:de|from)\s*[:#-]\s*([^\n\r|]{3,80})/i,
  ]);
  if (supplier) return cleanTextValue(supplier);

  const fromFile = path
    .basename(fileName || "", path.extname(fileName || ""))
    .replace(/\b(fatura|factura|invoice|recibo|pdf|jpg|jpeg|png|fornecedor)\b/gi, "")
    .replace(/\b(?:ft|fac|inv)[-_.\s]*[a-z0-9._-]+/gi, "")
    .replace(/\d{2,4}[-_.]\d{1,2}[-_.]\d{1,4}/g, "")
    .replace(/[-_.]+/g, " ")
    .trim();
  return cleanTextValue(fromFile);
}

function matchFirst(source, expressions) {
  for (const expression of expressions) {
    const match = source.match(expression);
    if (match?.[1]) return cleanTextValue(match[1]);
  }
  return "";
}

function findDateNear(source, labelExpression) {
  const match = source.match(new RegExp(`${labelExpression.source}[\\s\\S]{0,80}?((?:\\d{4}[-/]\\d{1,2}[-/]\\d{1,2})|(?:\\d{1,2}[-/]\\d{1,2}[-/]\\d{2,4}))`, "i"));
  if (match) return normalizeLooseDate(match[match.length - 1]);

  const fallback = source.match(/\b((?:\d{4}[-/]\d{1,2}[-/]\d{1,2})|(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}))\b/);
  return fallback?.[1] ? normalizeLooseDate(fallback[1]) : "";
}

function findMoneyNear(source, labelExpression) {
  const match = source.match(new RegExp(`${labelExpression.source}[\\s\\S]{0,80}?([0-9]{1,3}(?:[ .][0-9]{3})*(?:,[0-9]{2})|[0-9]+(?:\\.[0-9]{2})?)`, "i"));
  return match ? moneyValue(match[match.length - 1]) : 0;
}

function cleanTextValue(value) {
  return String(value || "")
    .replace(/[|()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function cleanInvoiceIdentityValue(value) {
  const cleaned = cleanTextValue(value);
  if (!cleaned) return "";
  if (looksLikeGeneratedFileToken(cleaned)) return "";
  return cleaned;
}

function looksLikeGeneratedFileToken(value) {
  const compact = String(value || "")
    .toLowerCase()
    .replace(/\.(jpe?g|png|webp|heic|heif|pdf)$/i, "")
    .replace(/[^a-z0-9]/g, "");
  if (compact.length >= 24 && /^[a-f0-9]+$/.test(compact)) return true;
  if (/^[a-f0-9]{8}[a-f0-9]{4}[a-f0-9]{4}[a-f0-9]{4}[a-f0-9]{12}$/.test(compact)) return true;
  return false;
}

function normalizeLooseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const local = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (!local) return "";
  const year = local[3].length === 2 ? `20${local[3]}` : local[3];
  return `${year}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
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

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
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

function normalizeTextKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeSector(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = normalizeTextKey(raw);
  if (normalized.startsWith("gest")) return "Gestao";
  if (normalized.startsWith("coz")) return "Cozinha";
  return "Sala";
}

function normalizeRole(value) {
  const normalized = normalizeTextKey(value);
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

function readTimeRecords() {
  try {
    if (!fs.existsSync(TIME_RECORDS_PATH)) return [];
    const records = JSON.parse(fs.readFileSync(TIME_RECORDS_PATH, "utf8"));
    if (!Array.isArray(records)) return [];
    let changed = false;
    const normalizedRecords = records.map((record) => {
      const normalized = normalizeTimeRecord(record);
      if (!record.id || !Array.isArray(record.events)) changed = true;
      return normalized;
    });
    if (changed) writeTimeRecords(normalizedRecords);
    return normalizedRecords.sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  } catch {
    return [];
  }
}

function writeTimeRecords(records) {
  fs.writeFileSync(TIME_RECORDS_PATH, JSON.stringify(records.slice(0, 1000), null, 2));
}

function normalizeTimeRecord(record) {
  const now = new Date().toISOString();
  return {
    id: String(record.id || crypto.randomUUID()),
    date: normalizeDate(record.date) || todayDateText(),
    employeeId: String(record.employeeId || ""),
    employeeName: String(record.employeeName || "Funcionario"),
    employeeUsername: String(record.employeeUsername || ""),
    employeeSector: String(record.employeeSector || ""),
    entryAt: validIsoDate(record.entryAt),
    lunchStartAt: validIsoDate(record.lunchStartAt),
    lunchEndAt: validIsoDate(record.lunchEndAt),
    exitAt: validIsoDate(record.exitAt),
    lastLocation: normalizeTimeLocation(record.lastLocation),
    createdAt: validIsoDate(record.createdAt) || now,
    updatedAt: validIsoDate(record.updatedAt) || validIsoDate(record.createdAt) || now,
    events: Array.isArray(record.events)
      ? record.events
          .map((event) => ({
            id: String(event.id || crypto.randomUUID()),
            action: normalizeTimeAction(event.action),
            label: event.label || timeActionLabel(event.action),
            createdAt: validIsoDate(event.createdAt) || now,
            location: normalizeTimeLocation(event.location),
          }))
          .filter((event) => event.action)
      : [],
  };
}

function findTimeRecord(records, session, date) {
  return records.find((record) => record.date === date && (record.employeeId === session.userId || record.employeeUsername === session.username));
}

function buildEmptyTimeRecord(session, date) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    date,
    employeeId: session.userId,
    employeeName: session.name,
    employeeUsername: session.username,
    employeeSector: session.sector,
    entryAt: "",
    lunchStartAt: "",
    lunchEndAt: "",
    exitAt: "",
    lastLocation: null,
    createdAt: now,
    updatedAt: now,
    events: [],
  };
}

function normalizeTimeLocation(location) {
  if (!location || typeof location !== "object") return null;
  const status = ["inside", "outside", "low_accuracy"].includes(String(location.status || "")) ? String(location.status) : "";
  if (!status) return null;
  return {
    status,
    distanceMeters: Number.isFinite(Number(location.distanceMeters)) ? Math.round(Number(location.distanceMeters)) : null,
    accuracyMeters: Number.isFinite(Number(location.accuracyMeters)) ? Math.round(Number(location.accuracyMeters)) : null,
    radiusMeters: Number.isFinite(Number(location.radiusMeters)) ? Math.round(Number(location.radiusMeters)) : null,
    capturedAt: validIsoDate(location.capturedAt) || "",
  };
}

function normalizeTimeAction(action) {
  const normalized = normalizeTextKey(action);
  if (["entry", "entrada", "clockin"].includes(normalized)) return "entry";
  if (["lunchstart", "almocoinicio", "pausaalmoco", "pausa"].includes(normalized)) return "lunchStart";
  if (["lunchend", "almocofim", "retornoalmoco", "retorno"].includes(normalized)) return "lunchEnd";
  if (["exit", "saida", "clockout"].includes(normalized)) return "exit";
  return "";
}

function timeActionField(action) {
  return {
    entry: "entryAt",
    lunchStart: "lunchStartAt",
    lunchEnd: "lunchEndAt",
    exit: "exitAt",
  }[normalizeTimeAction(action)];
}

function timeActionLabel(action) {
  return {
    entry: "Entrada",
    lunchStart: "Pausa para almoço",
    lunchEnd: "Retorno do almoço",
    exit: "Saída",
  }[normalizeTimeAction(action)] || "Ponto";
}

function validIsoDate(value) {
  const raw = String(value || "");
  return Number.isNaN(new Date(raw).getTime()) ? "" : raw;
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

function readInvoiceRecords() {
  try {
    if (!fs.existsSync(INVOICE_RECORDS_PATH)) return [];
    const records = JSON.parse(fs.readFileSync(INVOICE_RECORDS_PATH, "utf8"));
    if (!Array.isArray(records)) return [];
    let changed = false;
    const normalizedRecords = records.map((record) => {
      const normalized = normalizeInvoiceRecord(record);
      if (!record.id || !("title" in record) || !("status" in record)) changed = true;
      return normalized;
    });
    if (changed) writeInvoiceRecords(normalizedRecords);
    return normalizedRecords.sort((a, b) => {
      const statusPriority = invoiceStatusPriority(a.status) - invoiceStatusPriority(b.status);
      if (statusPriority !== 0) return statusPriority;
      return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") || b.updatedAt.localeCompare(a.updatedAt);
    });
  } catch {
    return [];
  }
}

function writeInvoiceRecords(records) {
  fs.writeFileSync(INVOICE_RECORDS_PATH, JSON.stringify(records.slice(0, 500), null, 2));
}

function invoiceStatusPriority(status) {
  if (status === "Por pagar" || status === "Atrasado") return 0;
  if (status === "Pendente") return 1;
  return 2;
}

function isNotionConfigured() {
  return Boolean(NOTION_TOKEN && NOTION_DATABASE_ID);
}

function getAppLinks() {
  const purchasesNotionUrl = normalizedUrl(NOTION_PURCHASES_VIEW_URL) || notionDatabaseUrl(NOTION_DATABASE_ID);
  return {
    purchasesNotionUrl,
    managementDashboardUrl: normalizedUrl(NOTION_MANAGEMENT_DASHBOARD_URL) || notionDatabaseUrl(NOTION_DATABASE_ID),
    managementLinks: {
      stock: normalizedUrl(NOTION_MANAGEMENT_STOCK_URL) || notionDatabaseUrl(NOTION_DATABASE_ID),
      revenue: normalizedUrl(NOTION_MANAGEMENT_REVENUE_URL) || notionDatabaseUrl(NOTION_REVENUE_DATABASE_ID),
      invoices: normalizedUrl(NOTION_MANAGEMENT_INVOICES_URL) || notionDatabaseUrl(NOTION_INVOICE_DATABASE_ID),
      purchases: purchasesNotionUrl,
      users: normalizedUrl(NOTION_MANAGEMENT_USERS_URL),
      timeClock: normalizedUrl(NOTION_MANAGEMENT_TIME_CLOCK_URL),
      activities: normalizedUrl(NOTION_MANAGEMENT_ACTIVITIES_URL),
    },
  };
}

function normalizedUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function notionDatabaseUrl(id) {
  const normalizedId = String(id || "").replace(/-/g, "").trim();
  return normalizedId ? `https://www.notion.so/${normalizedId}` : "";
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json;charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, status, text) {
  response.writeHead(status, { "Content-Type": "text/plain;charset=utf-8" });
  response.end(text);
}
