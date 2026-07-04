const STORAGE_KEY = "acai-fast-food-stock-v1";
const MOVEMENTS_KEY = "acai-fast-food-movements-v1";
const AUTH_KEY = "acai-fast-food-auth-v1";
const WHATSAPP_RECIPIENTS = [
  { label: "WhatsApp 1", phone: "351913163878" },
  { label: "WhatsApp 2", phone: "351912125244" },
];
const REQUIRED_CONTROL_TYPES = ["Diário", "Semanal", "Inventário Diário Sala", "Inventário Semanal Sala"];
const CONTROL_TYPE_OPTION_OVERRIDES = [
  {
    key: "sala-daily",
    value: "Diário",
    label: "Diário",
    priority: 0,
    aliases: ["Inventário Diário Sala", "Inventario Diario Sala", "Diário", "Diario"],
  },
  {
    key: "sala-weekly",
    value: "Semanal",
    label: "Semanal",
    priority: 1,
    aliases: ["Inventário Semanal Sala", "Inventario Semanal Sala", "Semanal"],
  },
];
const todayText = new Date().toISOString().slice(0, 10);

let items = load(STORAGE_KEY, []);
let movements = load(MOVEMENTS_KEY, []);
let auth = loadAuth();

const elements = {
  appGreeting: document.querySelector("#appGreeting"),
  loginPanel: document.querySelector("#loginPanel"),
  staffPanel: document.querySelector("#staffPanel"),
  staffDashboard: document.querySelector("#staffDashboard"),
  staffStatCards: document.querySelector("#staffStatCards"),
  staffCriticalList: document.querySelector("#staffCriticalList"),
  staffQuickActions: document.querySelector("#staffQuickActions"),
  staffDailySummary: document.querySelector("#staffDailySummary"),
  staffBottomNav: document.querySelector("#staffBottomNav"),
  staffViewAllCriticalButton: document.querySelector("#staffViewAllCriticalButton"),
  staffReportButton: document.querySelector("#staffReportButton"),
  staffCountSection: document.querySelector("#staffCountSection"),
  timeClockSummary: document.querySelector("#timeClockSummary"),
  timeClockStatus: document.querySelector("#timeClockStatus"),
  timeClockButtons: document.querySelectorAll("[data-time-action]"),
  loginForm: document.querySelector("#loginForm"),
  loginUserSelect: document.querySelector("#loginUserSelect"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  showLoginPassword: document.querySelector("#showLoginPassword"),
  loginStatus: document.querySelector("#loginStatus"),
  currentUserName: document.querySelector("#currentUserName"),
  logoutButton: document.querySelector("#logoutButton"),
  headerLogoutButton: document.querySelector("#headerLogoutButton"),
  pullButton: document.querySelector("#pullButton"),
  syncBanner: document.querySelector("#syncBanner"),
  syncStatus: document.querySelector("#syncStatus"),
  whatsappShare: document.querySelector("#whatsappShare"),
  countDate: document.querySelector("#countDate"),
  controlTypeFilter: document.querySelector("#controlTypeFilter"),
  salaFrequencyFilter: document.querySelector("#salaFrequencyFilter"),
  staffSearchInput: document.querySelector("#staffSearchInput"),
  clearStaffSearchButton: document.querySelector("#clearStaffSearchButton"),
  staffCountInfo: document.querySelector("#staffCountInfo"),
  countList: document.querySelector("#countList"),
  saveCountsButton: document.querySelector("#saveCountsButton"),
};

elements.countDate.value = todayText;
elements.loginForm.addEventListener("submit", login);
elements.loginUserSelect.addEventListener("change", selectLoginUser);
elements.showLoginPassword.addEventListener("change", toggleLoginPasswordVisibility);
elements.logoutButton.addEventListener("click", logout);
elements.headerLogoutButton.addEventListener("click", logout);
elements.pullButton.addEventListener("click", pullFromNotion);
elements.countDate.addEventListener("change", renderCountList);
elements.controlTypeFilter.addEventListener("change", renderCountList);
elements.salaFrequencyFilter.addEventListener("change", renderCountList);
elements.staffSearchInput.addEventListener("input", renderCountList);
elements.clearStaffSearchButton.addEventListener("click", clearStaffSearch);
elements.saveCountsButton.addEventListener("click", saveDailyCounts);
elements.countList.addEventListener("change", normalizeCountField);
elements.staffStatCards.addEventListener("click", handleStaffDashboardAction);
elements.staffQuickActions.addEventListener("click", handleStaffDashboardAction);
elements.staffViewAllCriticalButton.addEventListener("click", () => handleStaffAction("critical"));
elements.staffReportButton.addEventListener("click", () => handleStaffAction("report"));
elements.staffBottomNav.addEventListener("click", handleStaffNavigation);
elements.timeClockButtons.forEach((button) => {
  button.addEventListener("click", () => punchTime(button.dataset.timeAction));
});

renderControlTypeOptions();
renderCountList();
fetchLoginUsers();
initializeAuth();

async function fetchLoginUsers() {
  try {
    const response = await fetch("/api/users");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao carregar funcionários.");
    renderLoginUserOptions(result.users || []);
  } catch {
    elements.loginUserSelect.innerHTML = '<option value="">Digitar utilizador manualmente</option>';
  }
}

function renderLoginUserOptions(users) {
  const currentUsername = elements.loginUsername.value.trim();
  elements.loginUserSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Escolher funcionário";
  elements.loginUserSelect.appendChild(placeholder);

  const activeUsers = users.filter((user) => user.active !== false).sort((a, b) => {
    const sectorCompare = String(a.sector || "").localeCompare(String(b.sector || ""));
    if (sectorCompare !== 0) return sectorCompare;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  for (const sector of ["Gestao", "Sala", "Cozinha"]) {
    const sectorUsers = activeUsers.filter((user) => user.sector === sector);
    if (sectorUsers.length === 0) continue;
    const group = document.createElement("optgroup");
    group.label = sector;
    for (const user of sectorUsers) {
      const option = document.createElement("option");
      option.value = user.username;
      option.textContent = `${user.name} (${user.username})`;
      group.appendChild(option);
    }
    elements.loginUserSelect.appendChild(group);
  }

  if (currentUsername) elements.loginUserSelect.value = currentUsername;
}

function selectLoginUser() {
  if (!elements.loginUserSelect.value) return;
  elements.loginUsername.value = elements.loginUserSelect.value;
  elements.loginPassword.focus();
}

function toggleLoginPasswordVisibility() {
  elements.loginPassword.type = elements.showLoginPassword.checked ? "text" : "password";
}

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
  elements.staffBottomNav.hidden = true;
  elements.headerLogoutButton.hidden = true;
  elements.appGreeting.textContent = "Olá";
  elements.loginStatus.textContent = message || "";
  renderTimeClock(null);
}

function showApp() {
  elements.loginPanel.hidden = true;
  elements.staffPanel.hidden = false;
  const name = auth?.user?.name || auth?.user?.username || "";
  elements.currentUserName.textContent = name;
  elements.appGreeting.textContent = `Olá, ${name || "equipa"}`;
  elements.staffBottomNav.hidden = false;
  elements.headerLogoutButton.hidden = false;
  elements.loginStatus.textContent = "";
  renderStaffDashboard();
  fetchMyTimeRecord();
}

async function fetchMyTimeRecord() {
  if (!auth?.token) return;
  elements.timeClockStatus.textContent = "A carregar ponto...";
  setTimeClockButtonsDisabled(true);
  try {
    const response = await fetch("/api/time-records/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authToken: auth.token, date: todayDateText() }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao carregar ponto.");
    renderTimeClock(result.record);
    elements.timeClockStatus.textContent = timeLocationText(result.record?.lastLocation);
  } catch (error) {
    renderTimeClock(null);
    elements.timeClockStatus.textContent = error.message || "Erro ao carregar ponto.";
  } finally {
    setTimeClockButtonsDisabled(false);
  }
}

async function punchTime(action) {
  if (!auth?.token) {
    showLogin("Faz login novamente antes de registrar o ponto.");
    return;
  }

  elements.timeClockStatus.textContent = "A obter localização...";
  setTimeClockButtonsDisabled(true);
  try {
    const location = await getTimeClockLocation();
    elements.timeClockStatus.textContent = "A registrar ponto...";
    const response = await fetch("/api/time-records/punch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authToken: auth.token, date: todayDateText(), action, location }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao registrar ponto.");
    renderTimeClock(result.record);
    elements.timeClockStatus.textContent = [`${timeActionLabel(action)} registrada.`, timeLocationText(result.record?.lastLocation)]
      .filter(Boolean)
      .join(" ");
  } catch (error) {
    elements.timeClockStatus.textContent = error.message || "Erro ao registrar ponto.";
  } finally {
    setTimeClockButtonsDisabled(false);
  }
}

function renderTimeClock(record) {
  if (!elements.timeClockSummary) return;
  const cells = [
    ["Entrada", record?.entryAt],
    ["Pausa almoço", record?.lunchStartAt],
    ["Retorno almoço", record?.lunchEndAt],
    ["Saída", record?.exitAt],
  ];
  elements.timeClockSummary.innerHTML = cells
    .map(
      ([label, value]) => `
        <article class="time-clock-cell">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(formatTime(value))}</strong>
        </article>
      `,
    )
    .join("");
}

function setTimeClockButtonsDisabled(disabled) {
  elements.timeClockButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function timeActionLabel(action) {
  return {
    entry: "Entrada",
    lunchStart: "Pausa para almoço",
    lunchEnd: "Retorno do almoço",
    exit: "Saída",
  }[action] || "Ponto";
}

function getTimeClockLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este telemóvel não permite obter localização pelo navegador."));
      return;
    }
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      reject(new Error("A localização só funciona com HTTPS. Usa o link online do app."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
        });
      },
      (error) => reject(new Error(geolocationErrorMessage(error))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function geolocationErrorMessage(error) {
  if (error?.code === 1) return "Permite o acesso à localização para registrar o ponto.";
  if (error?.code === 2) return "Não foi possível encontrar a localização. Confirma se o GPS está ativo.";
  if (error?.code === 3) return "A localização demorou demasiado. Tenta novamente perto da loja.";
  return "Não foi possível obter a localização do telemóvel.";
}

function timeLocationText(location) {
  if (!location || location.status !== "inside") return "";
  const distance = Number.isFinite(Number(location.distanceMeters)) ? `${Math.round(Number(location.distanceMeters))} m da loja` : "localização validada";
  const accuracy = Number.isFinite(Number(location.accuracyMeters)) ? `precisão ${Math.round(Number(location.accuracyMeters))} m` : "";
  return [`Localização validada: ${distance}`, accuracy].filter(Boolean).join(" | ");
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
    renderStaffDashboard();
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
    renderStaffDashboard();
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
      const expiryField = renderExpiryField(item);
      row.className = `count-row${expiryField ? " has-expiry-field" : ""}${isLowStock(item) ? " low-stock-row" : ""}`;
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
        <label class="count-input count-note">
          Observação
          <input data-note-id="${escapeHtml(item.id)}" type="text" placeholder="Opcional" />
        </label>
        ${expiryField}
      `;
      rows.appendChild(row);
    }

    section.appendChild(rows);
    fragment.appendChild(section);
  }
  elements.countList.appendChild(fragment);
  renderStaffDashboard();
}

function renderStaffDashboard() {
  if (!elements.staffPanel || elements.staffPanel.hidden) return;

  const lowStock = items.filter(isLowStock);
  const todayMovements = getTodayMovements();
  const productionsToday = getTodayProductions(todayMovements);
  const countedToday = todayMovements.filter((movement) => movement.type === "count").length;

  elements.staffStatCards.innerHTML = "";
  [
    { iconName: "stock", value: items.length, label: "Itens em estoque", description: "Base atual", tone: "purple", action: "stock" },
    { iconName: "alert", value: lowStock.length, label: "Itens críticos", description: "Abaixo do mínimo", tone: "red", action: "critical" },
    { iconName: "production", value: productionsToday, label: "Produções hoje", description: "Registos do dia", tone: "orange", action: "production" },
    { iconName: "movement", value: todayMovements.length, label: "Movimentações hoje", description: "Contagens e ajustes", tone: "blue", action: "movements" },
  ].forEach((card) => elements.staffStatCards.appendChild(AcaiUI.StatCard(card)));

  elements.staffCriticalList.innerHTML = "";
  elements.staffCriticalList.appendChild(
    AcaiUI.CriticalStockList({
      items: lowStock.sort((a, b) => criticalRatio(a) - criticalRatio(b)),
      limit: 4,
      emptyText: "Estoque sem alertas críticos.",
    }),
  );

  elements.staffQuickActions.innerHTML = "";
  [
    { iconName: "check", label: "Lançar Estoque", tone: "purple", action: "stock" },
    { iconName: "production", label: "Nova Produção", tone: "orange", action: "production" },
    { iconName: "movement", label: "Ajuste de Estoque", tone: "green", action: "adjust" },
    { iconName: "search", label: "Consultar Estoque", tone: "blue", action: "search" },
  ].forEach((button) => elements.staffQuickActions.appendChild(AcaiUI.QuickActionButton(button)));

  elements.staffDailySummary.innerHTML = "";
  elements.staffDailySummary.appendChild(
    AcaiUI.DailySummaryCard({
      sales: "Sem dados",
      orders: String(countedToday),
      ticket: "Sem dados",
      topProducts: topMovementProducts(todayMovements) || "Sem dados",
    }),
  );
}

function handleStaffDashboardAction(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  handleStaffAction(target.dataset.action);
}

function handleStaffNavigation(event) {
  const button = event.target.closest("[data-staff-nav]");
  if (!button) return;
  setStaffNav(button.dataset.staffNav);
}

function setStaffNav(target) {
  elements.staffBottomNav.querySelectorAll("[data-staff-nav]").forEach((button) => {
    button.classList.toggle("active", button.dataset.staffNav === target);
  });

  if (target === "dashboard") {
    elements.staffDashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (target === "estoque") {
    handleStaffAction("stock");
  } else if (target === "producao") {
    handleStaffAction("production");
  } else if (target === "pedidos") {
    handleStaffAction("critical");
  } else {
    elements.pullButton.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function handleStaffAction(action) {
  if (action === "critical") {
    elements.staffSearchInput.value = "";
    elements.controlTypeFilter.value = "all";
    elements.salaFrequencyFilter.value = "all";
    renderCountList();
    elements.staffCountSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "production") {
    const productionOption = [...elements.controlTypeFilter.options].find((option) => normalizeControlType(option.value).includes("produc"));
    elements.controlTypeFilter.value = productionOption?.value || "all";
    elements.salaFrequencyFilter.value = "all";
    elements.staffSearchInput.value = productionOption ? "" : "produção";
    renderCountList();
    elements.staffCountSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "search") {
    elements.staffCountSection.scrollIntoView({ behavior: "smooth", block: "start" });
    elements.staffSearchInput.focus();
    return;
  }

  if (action === "report" || action === "movements") {
    elements.staffDashboard.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  elements.staffCountSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getTodayMovements() {
  const selectedDate = elements.countDate.value || todayText;
  return movements.filter((movement) => String(movement.createdAt || "").slice(0, 10) === selectedDate);
}

function getTodayProductions(todayMovements) {
  return todayMovements.filter((movement) => {
    const text = `${movement.itemName || ""} ${movement.reason || ""}`;
    return normalizeControlType(text).includes("produc");
  }).length;
}

function topMovementProducts(todayMovements) {
  const counts = new Map();
  for (const movement of todayMovements) {
    const name = movement.itemName || "";
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([name]) => name)
    .join(", ");
}

function criticalRatio(item) {
  const minimum = Math.max(item.minimum || 0, item.dailyMinimum || 0, 1);
  return item.quantity / minimum;
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

function renderExpiryField(item) {
  if (!needsExpiryDate(item)) return "";
  return `
    <label class="count-input count-expiry">
      Validade
      <input data-expiry-id="${escapeHtml(item.id)}" type="date" value="${escapeHtml(item.expiresAt || "")}" />
    </label>
  `;
}

function getFilteredItems() {
  const term = elements.staffSearchInput.value.trim().toLowerCase();
  const controlTypeFilter = elements.controlTypeFilter.value;
  const salaFrequencyFilter = elements.salaFrequencyFilter.value;

  return items
    .filter((item) => {
      const haystack = `${item.name} ${item.supplier} ${item.category} ${item.orderDay} ${item.controlType}`.toLowerCase();
      return !term || haystack.includes(term);
    })
    .filter((item) => matchesControlTypeFilter(item, controlTypeFilter))
    .filter((item) => matchesSalaFrequencyFilter(item, salaFrequencyFilter))
    .sort((a, b) => {
      const supplierOrder = supplierLabel(a).localeCompare(supplierLabel(b));
      if (supplierOrder !== 0) return supplierOrder;
      return Number(isLowStock(b)) - Number(isLowStock(a)) || a.name.localeCompare(b.name);
    });
}

function renderControlTypeOptions() {
  const currentValue = elements.controlTypeFilter.value || "all";
  const options = uniqueControlTypeOptions([...REQUIRED_CONTROL_TYPES, ...items.flatMap((item) => splitControlTypes(item.controlType))]);
  elements.controlTypeFilter.innerHTML = '<option value="all">Todos</option>';
  for (const option of options) {
    const entry = document.createElement("option");
    entry.value = option.value;
    entry.textContent = option.label;
    elements.controlTypeFilter.appendChild(entry);
  }
  const selectedOption = options.find((option) => option.value === currentValue || option.label === currentValue || sameControlType(option.value, currentValue));
  elements.controlTypeFilter.value = selectedOption?.value || "all";
}

function matchesControlTypeFilter(item, filter) {
  if (filter === "all") return true;
  return splitControlTypes(item.controlType).some((entry) => sameControlType(entry, filter));
}

function matchesSalaFrequencyFilter(item, filter) {
  if (filter === "all") return true;
  const frequency = filter === "weekly" ? "Semanal" : "Diário";
  return hasControlType(item, "Controle da Sala") && hasControlType(item, frequency);
}

function uniqueControlTypeOptions(values) {
  const options = new Map();
  for (const value of values) {
    const option = controlTypeOptionMeta(value);
    if (!option?.key) continue;
    if (!options.has(option.key)) options.set(option.key, option);
  }
  return [...options.values()].sort((a, b) => {
    return a.priority - b.priority || a.label.localeCompare(b.label);
  });
}

function controlTypeOptionMeta(value) {
  const label = String(value || "").trim();
  if (!label) return null;
  const override = CONTROL_TYPE_OPTION_OVERRIDES.find((entry) =>
    entry.aliases.some((alias) => normalizeControlType(alias) === normalizeControlType(label))
  );
  if (override) return override;
  return {
    key: normalizeControlType(label),
    value: label,
    label,
    priority: 100,
  };
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
  const expiryInputs = [...elements.countList.querySelectorAll("[data-expiry-id]")];
  const noteInputs = [...elements.countList.querySelectorAll("[data-note-id]")];
  const countDate = elements.countDate.value || todayText;
  const updates = inputs
    .map((input) => ({
      input,
      expiryInput: expiryInputs.find((entry) => entry.dataset.expiryId === input.dataset.countId),
      noteInput: noteInputs.find((entry) => entry.dataset.noteId === input.dataset.countId),
      item: items.find((entry) => entry.id === input.dataset.countId),
      value: input.value.trim(),
    }))
    .filter((entry) => entry.item && (entry.value !== "" || getExpiryValue(entry.expiryInput) !== entry.item.expiresAt || getNoteValue(entry.noteInput)));

  if (updates.length === 0) {
    setSyncStatus("Nenhuma alteracao preenchida.", "warning");
    return;
  }

  const countedItems = [];
  for (const update of updates) {
    const hasCount = update.value !== "";
    const counted = hasCount ? wholeQuantity(update.value) : update.item.quantity;
    const previous = update.item.quantity;
    const expiresAt = getExpiryValue(update.expiryInput);
    const observation = getNoteValue(update.noteInput);
    const nextItem = { ...update.item, quantity: counted };
    countedItems.push({
      itemId: update.item.id,
      name: update.item.name,
      quantity: counted,
      previousQuantity: previous,
      unit: update.item.unit,
      expiresAt,
      supplier: update.item.supplier,
      minimum: update.item.minimum,
      dailyMinimum: update.item.dailyMinimum,
      controlType: update.item.controlType,
      observation,
      lowStock: isLowStock(nextItem),
    });
    update.item.quantity = counted;
    update.item.expiresAt = expiresAt;
    update.item.updatedAt = new Date().toISOString();
    update.input.value = "";
    if (update.noteInput) update.noteInput.value = "";
    movements.unshift({
      id: crypto.randomUUID(),
      itemId: update.item.id,
      itemName: update.item.name,
      type: "count",
      quantity: counted,
      unit: update.item.unit,
      reason: `Contagem ${formatDate(countDate)} | anterior ${formatNumber(previous)} ${update.item.unit}${expiresAt ? ` | validade ${formatDate(expiresAt)}` : ""}`,
      createdAt: new Date().toISOString(),
    });
  }
  movements = movements.slice(0, 80);

  persist();
  renderCountList();
  setSyncStatus(`${updates.length} alteracoes guardadas. A enviar ao Notion...`, "warning");

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
    setSyncStatus(`${updates.length} alteracoes guardadas e sincronizadas.`, "success");
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
    lines.push(`- ${item.name}: ${formatNumber(item.quantity)} ${item.unit}${item.expiresAt ? ` | validade ${formatDate(item.expiresAt)}` : ""}${item.lowStock ? " | abaixo do minimo" : ""}`);
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
    orderQuantity: numberValue(item.orderQuantity),
    shouldBuy: item.shouldBuy || "",
    purchaseStatus: item.purchaseStatus || item.statusCompra || "",
    inventoryStatus: item.inventoryStatus || item.statusInventario || "",
    status: item.status || "",
    unitCost: numberValue(item.unitCost),
    expiresAt: item.expiresAt || "",
    supplier: item.supplier || "",
    orderDay: item.orderDay || "",
    controlType: item.controlType || "",
    notes: item.notes || "",
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

function needsExpiryDate(item) {
  const normalized = `${item.name} ${item.category}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /\bbolos?\b/.test(normalized);
}

function getExpiryValue(input) {
  return input?.value ? input.value.slice(0, 10) : "";
}

function getNoteValue(input) {
  return input ? input.value.trim() : "";
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
  if (
    sameControlType(selectedControl, "Diário") ||
    sameControlType(selectedControl, "Inventário Diário Sala") ||
    sameControlType(selectedControl, "Pingo Doce Quinta")
  ) return true;
  if (sameControlType(selectedControl, "Semanal") || sameControlType(selectedControl, "Inventário Semanal Sala")) return false;
  return hasControlType(item, "diario") || hasControlType(item, "pingo doce quinta") || hasControlType(item, "controle da sala");
}

function showsWeeklyMinimum(item) {
  const selectedControl = elements.controlTypeFilter.value;
  if (selectedControl === "Controle da Sala") return true;
  if (sameControlType(selectedControl, "Semanal") || sameControlType(selectedControl, "Inventário Semanal Sala")) return true;
  if (
    sameControlType(selectedControl, "Diário") ||
    sameControlType(selectedControl, "Inventário Diário Sala") ||
    sameControlType(selectedControl, "Pingo Doce Quinta")
  ) return false;
  return hasControlType(item, "semanal") || hasControlType(item, "controle da sala");
}

function hasControlType(item, expected) {
  return splitControlTypes(item.controlType).some((entry) => sameControlType(entry, expected));
}

function sameControlType(left, right) {
  const normalizedLeft = normalizeControlType(left);
  const normalizedRight = normalizeControlType(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
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

function formatTime(dateText) {
  if (!dateText) return "--:--";
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function todayDateText() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}
