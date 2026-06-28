const STORAGE_KEY = "acai-fast-food-stock-v1";
const MOVEMENTS_KEY = "acai-fast-food-movements-v1";
const AUTH_KEY = "acai-fast-food-auth-v1";
const WHATSAPP_RECIPIENTS = [
  { label: "WhatsApp 1", phone: "351913163878" },
  { label: "WhatsApp 2", phone: "351912125244" },
];
const todayText = new Date().toISOString().slice(0, 10);

let items = load(STORAGE_KEY, []);
let movements = load(MOVEMENTS_KEY, []);
let auth = loadAuth();

const elements = {
  loginPanel: document.querySelector("#loginPanel"),
  staffPanel: document.querySelector("#staffPanel"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  loginStatus: document.querySelector("#loginStatus"),
  currentUserName: document.querySelector("#currentUserName"),
  logoutButton: document.querySelector("#logoutButton"),
  pullButton: document.querySelector("#pullButton"),
  syncBanner: document.querySelector("#syncBanner"),
  syncStatus: document.querySelector("#syncStatus"),
  whatsappShare: document.querySelector("#whatsappShare"),
  countDate: document.querySelector("#countDate"),
  controlTypeFilter: document.querySelector("#controlTypeFilter"),
  staffSearchInput: document.querySelector("#staffSearchInput"),
  clearStaffSearchButton: document.querySelector("#clearStaffSearchButton"),
  staffCountInfo: document.querySelector("#staffCountInfo"),
  countList: document.querySelector("#countList"),
  saveCountsButton: document.querySelector("#saveCountsButton"),
};

elements.countDate.value = todayText;
elements.loginForm.addEventListener("submit", login);
elements.logoutButton.addEventListener("click", logout);
elements.pullButton.addEventListener("click", pullFromNotion);
elements.countDate.addEventListener("change", renderCountList);
elements.controlTypeFilter.addEventListener("change", renderCountList);
elements.staffSearchInput.addEventListener("input", renderCountList);
elements.clearStaffSearchButton.addEventListener("click", clearStaffSearch);
elements.saveCountsButton.addEventListener("click", saveDailyCounts);
elements.countList.addEventListener("change", normalizeCountField);

renderControlTypeOptions();
renderCountList();
initializeAuth();

async function initializeAuth() {
  if (!auth?.token) {
    showLogin("Entra com o teu utilizador para iniciar a contagem.");
    return;
  }

  try {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authToken: auth.token }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Sessao expirada.");
    auth.user = result.user;
    persistAuth();
    showApp();
    await checkNotionStatus();
  } catch (error) {
    auth = null;
    persistAuth();
    showLogin(error.message || "Faz login novamente.");
  }
}

async function login(event) {
  event.preventDefault();
  elements.loginStatus.textContent = "A entrar...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: elements.loginUsername.value.trim(),
        password: elements.loginPassword.value,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Nao foi possivel entrar.");
    auth = { token: result.token, user: result.user };
    persistAuth();
    elements.loginPassword.value = "";
    showApp();
    await checkNotionStatus();
  } catch (error) {
    showLogin(error.message || "Utilizador ou senha invalidos.");
  }
}

async function logout() {
  const token = auth?.token;
  auth = null;
  persistAuth();
  showLogin("Sessao terminada.");
  if (token) {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authToken: token }),
    }).catch(() => {});
  }
}

function showLogin(message) {
  elements.loginPanel.hidden = false;
  elements.staffPanel.hidden = true;
  elements.loginStatus.textContent = message || "";
}

function showApp() {
  elements.loginPanel.hidden = true;
  elements.staffPanel.hidden = false;
  elements.currentUserName.textContent = auth?.user?.name || auth?.user?.username || "";
  elements.loginStatus.textContent = "";
}

async function checkNotionStatus() {
  try {
    const response = await fetch("/api/notion/status");
    if (!response.ok) return;
    const status = await response.json();
    if (!status.configured) {
      setSyncStatus("Notion nao configurado.", "warning");
      return;
    }
    await pullFromNotion({ automatic: true });
  } catch {
    setSyncStatus("Abre esta app por http://localhost:4173/funcionario.html para ligar ao Notion.", "warning");
  }
}

async function pullFromNotion(options = {}) {
  elements.pullButton.disabled = true;
  hideWhatsappShare();
  setSyncStatus(options.automatic ? "A carregar base do Notion..." : "A atualizar base...", "warning");

  try {
    const response = await fetch("/api/notion/items");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao carregar do Notion");
    items = result.items.map(normalizeItem);
    persist();
    renderControlTypeOptions();
    renderCountList();
    const database = result.databaseTitle ? ` de "${result.databaseTitle}"` : "";
    setSyncStatus(`Base carregada${database}: ${items.length} produtos.`, "success");
  } catch (error) {
    setSyncStatus(error.message || "Nao foi possivel carregar do Notion.", "error");
  } finally {
    elements.pullButton.disabled = false;
  }
}

function renderCountList() {
  elements.countList.innerHTML = "";
  const filteredItems = getFilteredItems();

  elements.staffCountInfo.textContent = `${filteredItems.length} de ${items.length} produtos visiveis`;

  if (filteredItems.length === 0) {
    elements.countList.innerHTML = '<div class="empty-state"><h3>Sem produtos</h3><p>Atualiza a base, muda o filtro ou limpa a pesquisa.</p></div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const group of groupItemsBySupplier(filteredItems)) {
    const section = document.createElement("section");
    section.className = "supplier-group";
    const lowStock = group.items.filter(isLowStock).length;
    const orderDays = orderDaySummary(group.items);
    const orderBadge = orderDays ? `<strong class="order-pill">${escapeHtml(orderDays)}</strong>` : "";
    section.innerHTML = `
      <div class="supplier-heading">
        <div>
          <h3>${escapeHtml(group.supplier)}</h3>
          <span>${escapeHtml(group.items.length)} produtos${lowStock ? ` | ${lowStock} abaixo do minimo` : ""}</span>
        </div>
        ${orderBadge}
      </div>
    `;
    const rows = document.createElement("div");
    rows.className = "supplier-items";

    for (const item of group.items) {
      const row = document.createElement("article");
      const minimumCells = renderMinimumCells(item);
      row.className = `count-row${isLowStock(item) ? " low-stock-row" : ""}`;
      row.innerHTML = `
        <div class="count-product">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml([item.category, item.orderDay, item.controlType].filter(Boolean).join(" | "))}</span>
        </div>
        <div class="count-unit">
          <span>Unidade</span>
          <strong>${escapeHtml(item.unit)}</strong>
        </div>
        <div class="count-minimum-stack${minimumCells ? "" : " empty"}">${minimumCells}</div>
        <label class="count-input">
          Contagem
          <input data-count-id="${escapeHtml(item.id)}" type="number" inputmode="numeric" min="0" step="1" placeholder="${formatNumber(item.quantity)}" />
        </label>
      `;
      rows.appendChild(row);
    }

    section.appendChild(rows);
    fragment.appendChild(section);
  }
  elements.countList.appendChild(fragment);
}

function renderMinimumCells(item) {
  const cells = [];
  if (showsDailyMinimum(item)) {
    cells.push(`
      <div class="count-minimum">
        <span>Minimo diario</span>
        <strong>${formatNumber(item.dailyMinimum)} ${escapeHtml(item.unit)}</strong>
      </div>
    `);
  }
  if (showsWeeklyMinimum(item)) {
    cells.push(`
      <div class="count-minimum">
        <span>Minimo semanal</span>
        <strong>${formatNumber(item.minimum)} ${escapeHtml(item.unit)}</strong>
      </div>
    `);
  }
  return cells.join("");
}

function getFilteredItems() {
  const term = elements.staffSearchInput.value.trim().toLowerCase();
  const controlTypeFilter = elements.controlTypeFilter.value;

  return items
    .filter((item) => {
      const haystack = `${item.name} ${item.supplier} ${item.category} ${item.orderDay} ${item.controlType}`.toLowerCase();
      return !term || haystack.includes(term);
    })
    .filter((item) => matchesControlTypeFilter(item, controlTypeFilter))
    .sort((a, b) => {
      const supplierOrder = supplierLabel(a).localeCompare(supplierLabel(b));
      if (supplierOrder !== 0) return supplierOrder;
      return Number(isLowStock(b)) - Number(isLowStock(a)) || a.name.localeCompare(b.name);
    });
}

function renderControlTypeOptions() {
  const currentValue = elements.controlTypeFilter.value || "all";
  const options = [...new Set(items.flatMap((item) => splitControlTypes(item.controlType)))].sort((a, b) => a.localeCompare(b));
  elements.controlTypeFilter.innerHTML = '<option value="all">Todos</option>';
  for (const option of options) {
    const entry = document.createElement("option");
    entry.value = option;
    entry.textContent = option;
    elements.controlTypeFilter.appendChild(entry);
  }
  elements.controlTypeFilter.value = options.includes(currentValue) ? currentValue : "all";
}

function matchesControlTypeFilter(item, filter) {
  if (filter === "all") return true;
  return splitControlTypes(item.controlType).includes(filter);
}

function groupItemsBySupplier(entries) {
  const groups = new Map();
  for (const item of entries) {
    const supplier = supplierLabel(item);
    if (!groups.has(supplier)) groups.set(supplier, []);
    groups.get(supplier).push(item);
  }
  return [...groups.entries()].map(([supplier, groupItems]) => ({ supplier, items: groupItems }));
}

function orderDaySummary(entries) {
  const days = [...new Set(entries.map((item) => normalizeOrderDay(item.orderDay)).filter(Boolean))];
  if (days.length === 0) return "";
  if (days.length === 1) return days[0];
  return days.join(", ");
}

function clearStaffSearch() {
  elements.staffSearchInput.value = "";
  renderCountList();
}

async function saveDailyCounts() {
  if (!auth?.token) {
    showLogin("Faz login novamente antes de guardar.");
    return;
  }
  hideWhatsappShare();

  const inputs = [...elements.countList.querySelectorAll("[data-count-id]")];
  const countDate = elements.countDate.value || todayText;
  const updates = inputs
    .map((input) => ({
      input,
      item: items.find((entry) => entry.id === input.dataset.countId),
      value: input.value.trim(),
    }))
    .filter((entry) => entry.item && entry.value !== "");

  if (updates.length === 0) {
    setSyncStatus("Nenhuma contagem preenchida.", "warning");
    return;
  }

  const countedItems = [];
  for (const update of updates) {
    const counted = wholeQuantity(update.value);
    const previous = update.item.quantity;
    const nextItem = { ...update.item, quantity: counted };
    countedItems.push({
      name: update.item.name,
      quantity: counted,
      previousQuantity: previous,
      unit: update.item.unit,
      supplier: update.item.supplier,
      minimum: update.item.minimum,
      dailyMinimum: update.item.dailyMinimum,
      controlType: update.item.controlType,
      lowStock: isLowStock(nextItem),
    });
    update.item.quantity = counted;
    update.item.updatedAt = new Date().toISOString();
    update.input.value = "";
    movements.unshift({
      id: crypto.randomUUID(),
      itemId: update.item.id,
      itemName: update.item.name,
      type: "count",
      quantity: counted,
      unit: update.item.unit,
      reason: `Contagem ${formatDate(countDate)} | anterior ${formatNumber(previous)} ${update.item.unit}`,
      createdAt: new Date().toISOString(),
    });
  }
  movements = movements.slice(0, 80);

  persist();
  renderCountList();
  setSyncStatus(`${updates.length} contagens guardadas. A enviar ao Notion...`, "warning");

  try {
    const response = await fetch("/api/notion/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authToken: auth.token,
        items,
        countRecord: {
          countDate,
          items: countedItems,
        },
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha na sincronizacao");
    setSyncStatus(`${updates.length} contagens guardadas e sincronizadas.`, "success");
    renderWhatsappShare(buildWhatsappMessage(countDate, countedItems));
  } catch (error) {
    setSyncStatus(error.message || "Contagens guardadas nesta app, mas nao sincronizadas.", "error");
    renderWhatsappShare(buildWhatsappMessage(countDate, countedItems));
  }
}

function renderWhatsappShare(message) {
  if (!message || WHATSAPP_RECIPIENTS.length === 0) return;
  const buttons = WHATSAPP_RECIPIENTS.map((recipient) => {
    const href = `https://wa.me/${recipient.phone}?text=${encodeURIComponent(message)}`;
    return `<a class="button whatsapp-button" href="${href}" target="_blank" rel="noopener">${escapeHtml(recipient.label)}</a>`;
  }).join("");
  elements.whatsappShare.innerHTML = `
    <div>
      <strong>Enviar lista por WhatsApp</strong>
      <span>A mensagem ja esta pronta. Abre cada contacto e confirma o envio.</span>
    </div>
    <div class="row-actions">${buttons}</div>
  `;
  elements.whatsappShare.hidden = false;
}

function hideWhatsappShare() {
  elements.whatsappShare.hidden = true;
  elements.whatsappShare.innerHTML = "";
}

function buildWhatsappMessage(countDate, countedItems) {
  const employeeName = auth?.user?.name || auth?.user?.username || "Funcionario";
  const employeeSector = auth?.user?.sector || "Sem setor";
  const priorityItems = countedItems.filter((item) => item.lowStock);
  const lines = [
    `Contagem de estoque - ${formatDate(countDate)}`,
    `Responsavel: ${employeeName}`,
    `Setor: ${employeeSector}`,
    "",
  ];

  if (priorityItems.length > 0) {
    lines.push("Produtos abaixo do minimo:");
    for (const item of priorityItems) {
      lines.push(`☐ ${item.name}: ${formatNumber(item.quantity)} ${item.unit}${item.supplier ? ` | ${item.supplier}` : ""}`);
    }
    lines.push("");
  }

  lines.push("Produtos preenchidos:");
  for (const item of countedItems) {
    lines.push(`- ${item.name}: ${formatNumber(item.quantity)} ${item.unit}${item.lowStock ? " | abaixo do minimo" : ""}`);
  }

  return lines.join("\n");
}

function normalizeItem(item) {
  return {
    id: item.id || crypto.randomUUID(),
    name: String(item.name || "Produto sem nome"),
    category: item.category || "Outros",
    unit: item.unit || "un",
    quantity: numberValue(item.quantity),
    minimum: numberValue(item.minimum),
    dailyMinimum: numberValue(item.dailyMinimum),
    unitCost: numberValue(item.unitCost),
    expiresAt: item.expiresAt || "",
    supplier: item.supplier || "",
    orderDay: item.orderDay || "",
    controlType: item.controlType || "",
    notes: item.notes || "",
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

function supplierLabel(item) {
  return item.supplier?.trim() || "Sem fornecedor";
}

function isLowStock(item) {
  const minimums = [];
  if (showsDailyMinimum(item)) minimums.push(item.dailyMinimum);
  if (showsWeeklyMinimum(item)) minimums.push(item.minimum);
  return minimums.some((minimum) => minimum > 0 && item.quantity <= minimum);
}

function normalizeOrderDay(value) {
  const normalized = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!normalized) return "";
  if (normalized.startsWith("seg") || normalized === "2" || normalized === "segunda") return "Segunda-feira";
  if (normalized.startsWith("ter") || normalized === "3" || normalized === "terca") return "Terca-feira";
  if (normalized.startsWith("qua") || normalized === "4" || normalized === "quarta") return "Quarta-feira";
  if (normalized.startsWith("qui") || normalized === "5" || normalized === "quinta") return "Quinta-feira";
  if (normalized.startsWith("sex") || normalized === "6" || normalized === "sexta") return "Sexta-feira";
  if (normalized.startsWith("sab") || normalized === "7" || normalized === "sabado") return "Sabado";
  if (normalized.startsWith("dom") || normalized === "1" || normalized === "domingo") return "Domingo";
  return String(value || "").trim();
}

function splitControlTypes(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function showsDailyMinimum(item) {
  const selectedControl = elements.controlTypeFilter.value;
  if (selectedControl === "Controle da Sala") return true;
  if (selectedControl === "Diário" || selectedControl === "Pingo Doce Quinta") return true;
  if (selectedControl === "Semanal") return false;
  return hasControlType(item, "diario") || hasControlType(item, "pingo doce quinta") || hasControlType(item, "controle da sala");
}

function showsWeeklyMinimum(item) {
  const selectedControl = elements.controlTypeFilter.value;
  if (selectedControl === "Controle da Sala") return true;
  if (selectedControl === "Semanal") return true;
  if (selectedControl === "Diário" || selectedControl === "Pingo Doce Quinta") return false;
  return hasControlType(item, "semanal") || hasControlType(item, "controle da sala");
}

function hasControlType(item, expected) {
  return splitControlTypes(item.controlType).some((entry) => normalizeControlType(entry) === expected);
}

function normalizeControlType(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
}

function load(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
}

function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

function persistAuth() {
  if (auth?.token) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_KEY);
}

function setSyncStatus(message, tone) {
  elements.syncBanner.hidden = false;
  elements.syncBanner.className = `sync-banner ${tone}`;
  elements.syncStatus.textContent = message;
}

function normalizeCountField(event) {
  const input = event.target.closest("[data-count-id]");
  if (!input || input.value.trim() === "") return;
  input.value = String(wholeQuantity(input.value));
}

function numberValue(value) {
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(/\.(?=\d{3}(,|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function wholeQuantity(value) {
  return Math.max(0, Math.round(numberValue(value)));
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateText) {
  if (!dateText) return "Sem data";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(`${dateText}T00:00:00`));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}
