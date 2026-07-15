const STORAGE_KEY = "acai-fast-food-stock-v1";
const MOVEMENTS_KEY = "acai-fast-food-movements-v1";
const PURCHASE_SELECTION_KEY = "acai-fast-food-purchase-selection-v1";
const ACTIVITIES_KEY = "acai-fast-food-activities-v1";
const ACTIVITIES_SEED_KEY = "acai-fast-food-activities-seed-2026-07-01";
const EXPIRING_DAYS = 7;
const REQUIRED_CONTROL_TYPES = ["Diário", "Semanal", "Controle da Sala", "Inventário Diário Sala", "Inventário Semanal Sala"];
const DEFAULT_NOTION_MANAGEMENT_DASHBOARD_URL = "https://app.notion.com/p/Dashboard-Gest-o-397643c289174f3886e28b17f737329d?source=copy_link";
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
const NOTION_MANAGEMENT_DIVISIONS = [
  {
    id: "stock",
    label: "Estoque",
    description: "Base mestre, mínimos, fornecedores e tipo de controle.",
    view: "inventario",
    iconName: "stock",
    tone: "purple",
  },
  {
    id: "revenue",
    label: "Faturação",
    description: "Fecho diário, meios de pagamento, despesas e observações.",
    view: "faturacao",
    iconName: "sales",
    tone: "green",
  },
  {
    id: "invoices",
    label: "Faturas",
    description: "Faturas a pagar, vencimentos, estados e arquivo.",
    view: "faturas",
    iconName: "orders",
    tone: "orange",
  },
  {
    id: "purchases",
    label: "Solicitações",
    description: "Produtos abaixo do mínimo e lista por fornecedor.",
    view: "pedidos",
    iconName: "check",
    tone: "blue",
  },
  {
    id: "users",
    label: "Funcionários",
    description: "Acessos, setores, senhas e permissões.",
    view: "funcionarios",
    iconName: "more",
    tone: "orange",
  },
  {
    id: "timeClock",
    label: "Ponto",
    description: "Entrada, pausa, retorno e saída por funcionário.",
    view: "ponto",
    iconName: "movement",
    tone: "blue",
  },
  {
    id: "activities",
    label: "Atividades",
    description: "Ideias, pendências e itens resolvidos.",
    view: "atividades",
    iconName: "dashboard",
    tone: "green",
  },
];
const WHATSAPP_RECIPIENTS = [
  { label: "WhatsApp 1", phone: "351913163878" },
  { label: "WhatsApp 2", phone: "351912125244" },
];
const ACTIVITY_SEED_ITEMS = [
  {
    id: "seed-activity-stock-app",
    title: "Aplicação para controle de estoque",
    notes: "Em andamento | implementação provável a partir de amanhã",
  },
  { id: "seed-activity-headphones", title: "Compra dos fones", notes: "Em andamento" },
  { id: "seed-activity-menu", title: "Refazer menu", notes: "Em andamento" },
  { id: "seed-activity-drinks-price", title: "Aumento do preço das bebidas ou entrega das latas", notes: "Em andamento" },
  { id: "seed-activity-loyalty-cards", title: "Entrega de cartões fidelidade e selos (pochetes)", notes: "Em andamento" },
  { id: "seed-activity-google-reviews-box", title: "Caixinha para avaliações do Google", notes: "Em andamento" },
  {
    id: "seed-activity-packaging-brand",
    title: "Autocolantes/carimbo nas embalagens para divulgação da marca",
    notes: "Em andamento",
  },
  {
    id: "seed-activity-controls",
    title: "Controle completo de consumos, descontos, horários, atrasos e pausas",
    notes: "Em andamento",
  },
  { id: "seed-activity-store-cleaning", title: "Limpeza completa da loja", notes: "Em andamento" },
  { id: "seed-activity-tips", title: "Gorjetas (Claudia e Alicia)", notes: "Em andamento" },
  { id: "seed-activity-assembly-printer", title: "Impressora da montagem", notes: "Em andamento" },
  { id: "seed-activity-dead-hours", title: "Tarefas para as horas mortas (10/06)", notes: "Em andamento" },
  { id: "seed-activity-paulo-uber-tab", title: "Cadastro na outra aba da Uber", notes: "Responsável: Paulo" },
  { id: "seed-activity-vanessa-roles", title: "Definição e fixação das funções", notes: "Responsável: Vanessa" },
  { id: "seed-activity-vanessa-checklist", title: "Check list de abertura / fecho", notes: "Responsável: Vanessa" },
  { id: "seed-activity-joao-uber-couriers", title: "Troca dos pedidos para estafetas da Uber", notes: "Responsável: João" },
  {
    id: "seed-activity-joao-validity",
    title: "Conferência de validade das bebidas para os próximos 3 meses",
    notes: "Responsável: João",
  },
  { id: "seed-activity-joao-pochetes", title: "Uso diário das pochetes", notes: "Responsável: João" },
  { id: "seed-activity-joao-glovo-bolt", title: "Glovo / Bolt", notes: "Responsável: João" },
  {
    id: "seed-activity-discard-auto-system",
    title: "Novo sistema com integração automática",
    status: "Resolvido",
    notes: "Descartada/Suspensa",
  },
  {
    id: "seed-activity-discard-hours-extension",
    title: "Extensão de horário",
    status: "Resolvido",
    notes: "Descartada/Suspensa",
  },
];

let items = load(STORAGE_KEY, []);
let movements = load(MOVEMENTS_KEY, []);
let selectedPurchaseIds = new Set(load(PURCHASE_SELECTION_KEY, []));
let countRecords = [];
let revenueRecords = [];
let invoiceRecords = [];
let timeRecords = [];
let countHistoryEntries = [];
let selectedCountProduct = "";
let activities = load(ACTIVITIES_KEY, []).map(normalizeActivity);
let appLinks = {};

const elements = {
  form: document.querySelector("#itemForm"),
  itemId: document.querySelector("#itemId"),
  formTitle: document.querySelector("#formTitle"),
  resetFormButton: document.querySelector("#resetFormButton"),
  inventoryBody: document.querySelector("#inventoryBody"),
  rowTemplate: document.querySelector("#rowTemplate"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  controlType: document.querySelector("#controlType"),
  managerControlTypeFilter: document.querySelector("#managerControlTypeFilter"),
  managerSalaFrequencyFilter: document.querySelector("#managerSalaFrequencyFilter"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  managerCountInfo: document.querySelector("#managerCountInfo"),
  managerDate: document.querySelector("#managerDate"),
  managerStatCards: document.querySelector("#managerStatCards"),
  managerExecutiveDashboard: document.querySelector("#managerExecutiveDashboard"),
  managerCriticalList: document.querySelector("#managerCriticalList"),
  managerQuickActions: document.querySelector("#managerQuickActions"),
  managerDailySummary: document.querySelector("#managerDailySummary"),
  managerUpcomingInvoices: document.querySelector("#managerUpcomingInvoices"),
  managerDashboard: document.querySelector("[data-view='resumo']"),
  revenueForm: document.querySelector("#revenueForm"),
  revenueId: document.querySelector("#revenueId"),
  revenueDate: document.querySelector("#revenueDate"),
  revenueCoins: document.querySelector("#revenueCoins"),
  revenueMbway: document.querySelector("#revenueMbway"),
  revenueUberEats: document.querySelector("#revenueUberEats"),
  revenueGlovo: document.querySelector("#revenueGlovo"),
  revenueBolt: document.querySelector("#revenueBolt"),
  revenueMultibanco: document.querySelector("#revenueMultibanco"),
  revenueCash: document.querySelector("#revenueCash"),
  revenueFuel: document.querySelector("#revenueFuel"),
  revenueExpense1Description: document.querySelector("#revenueExpense1Description"),
  revenueExpense1: document.querySelector("#revenueExpense1"),
  revenueExpense2Description: document.querySelector("#revenueExpense2Description"),
  revenueExpense2: document.querySelector("#revenueExpense2"),
  revenueExpense3Description: document.querySelector("#revenueExpense3Description"),
  revenueExpense3: document.querySelector("#revenueExpense3"),
  revenueOrders: document.querySelector("#revenueOrders"),
  revenueOtherToggle: document.querySelector("#revenueOtherToggle"),
  revenueOtherObservationWrap: document.querySelector("#revenueOtherObservationWrap"),
  revenueOtherObservation: document.querySelector("#revenueOtherObservation"),
  revenueTotals: document.querySelector("#revenueTotals"),
  resetRevenueFormButton: document.querySelector("#resetRevenueFormButton"),
  refreshRevenueButton: document.querySelector("#refreshRevenueButton"),
  revenueFeedback: document.querySelector("#revenueFeedback"),
  revenueWhatsappShare: document.querySelector("#revenueWhatsappShare"),
  revenueList: document.querySelector("#revenueList"),
  invoiceForm: document.querySelector("#invoiceForm"),
  invoiceId: document.querySelector("#invoiceId"),
  invoiceFileUrl: document.querySelector("#invoiceFileUrl"),
  invoiceOriginalFileName: document.querySelector("#invoiceOriginalFileName"),
  invoiceStoredFileName: document.querySelector("#invoiceStoredFileName"),
  invoiceContentType: document.querySelector("#invoiceContentType"),
  invoiceFileSize: document.querySelector("#invoiceFileSize"),
  invoiceFile: document.querySelector("#invoiceFile"),
  invoiceFileInfo: document.querySelector("#invoiceFileInfo"),
  invoiceSupplier: document.querySelector("#invoiceSupplier"),
  invoiceNumber: document.querySelector("#invoiceNumber"),
  invoiceIssueDate: document.querySelector("#invoiceIssueDate"),
  invoiceDueDate: document.querySelector("#invoiceDueDate"),
  invoiceAmount: document.querySelector("#invoiceAmount"),
  invoiceVat: document.querySelector("#invoiceVat"),
  invoiceStatus: document.querySelector("#invoiceStatus"),
  invoiceCategory: document.querySelector("#invoiceCategory"),
  invoiceNotes: document.querySelector("#invoiceNotes"),
  resetInvoiceFormButton: document.querySelector("#resetInvoiceFormButton"),
  refreshInvoicesButton: document.querySelector("#refreshInvoicesButton"),
  syncInvoicesButton: document.querySelector("#syncInvoicesButton"),
  invoiceFeedback: document.querySelector("#invoiceFeedback"),
  invoiceList: document.querySelector("#invoiceList"),
  userForm: document.querySelector("#userForm"),
  userId: document.querySelector("#userId"),
  userName: document.querySelector("#userName"),
  userUsername: document.querySelector("#userUsername"),
  userSector: document.querySelector("#userSector"),
  userRole: document.querySelector("#userRole"),
  userPassword: document.querySelector("#userPassword"),
  userActive: document.querySelector("#userActive"),
  resetUserFormButton: document.querySelector("#resetUserFormButton"),
  refreshUsersButton: document.querySelector("#refreshUsersButton"),
  userFeedback: document.querySelector("#userFeedback"),
  userList: document.querySelector("#userList"),
  timeRecordDate: document.querySelector("#timeRecordDate"),
  refreshTimeRecordsButton: document.querySelector("#refreshTimeRecordsButton"),
  timeRecordSummary: document.querySelector("#timeRecordSummary"),
  timeRecordList: document.querySelector("#timeRecordList"),
  purchaseList: document.querySelector("#purchaseList"),
  purchaseCountInfo: document.querySelector("#purchaseCountInfo"),
  selectedPurchaseInfo: document.querySelector("#selectedPurchaseInfo"),
  purchaseOutput: document.querySelector("#purchaseOutput"),
  purchaseNotionLink: document.querySelector("#purchaseNotionLink"),
  selectAllPurchasesButton: document.querySelector("#selectAllPurchasesButton"),
  clearPurchasesButton: document.querySelector("#clearPurchasesButton"),
  copyPurchasesButton: document.querySelector("#copyPurchasesButton"),
  movementList: document.querySelector("#movementList"),
  movementDialog: document.querySelector("#movementDialog"),
  movementForm: document.querySelector("#movementForm"),
  movementTitle: document.querySelector("#movementTitle"),
  movementItemId: document.querySelector("#movementItemId"),
  movementType: document.querySelector("#movementType"),
  movementQuantity: document.querySelector("#movementQuantity"),
  movementReason: document.querySelector("#movementReason"),
  templateButton: document.querySelector("#templateButton"),
  pullButton: document.querySelector("#pullButton"),
  syncButton: document.querySelector("#syncButton"),
  syncBanner: document.querySelector("#syncBanner"),
  syncStatus: document.querySelector("#syncStatus"),
  exportButton: document.querySelector("#exportButton"),
  importFile: document.querySelector("#importFile"),
  clearMovementsButton: document.querySelector("#clearMovementsButton"),
  refreshCountRecordsButton: document.querySelector("#refreshCountRecordsButton"),
  countRecordList: document.querySelector("#countRecordList"),
  countHistoryMode: document.querySelector("#countHistoryMode"),
  countFilterProduct: document.querySelector("#countFilterProduct"),
  countFilterEmployee: document.querySelector("#countFilterEmployee"),
  countFilterSector: document.querySelector("#countFilterSector"),
  countFilterSupplier: document.querySelector("#countFilterSupplier"),
  countFilterDate: document.querySelector("#countFilterDate"),
  clearCountFiltersButton: document.querySelector("#clearCountFiltersButton"),
  countHistorySummary: document.querySelector("#countHistorySummary"),
  countProductHistory: document.querySelector("#countProductHistory"),
  activityForm: document.querySelector("#activityForm"),
  activityId: document.querySelector("#activityId"),
  activityTitle: document.querySelector("#activityTitle"),
  activityType: document.querySelector("#activityType"),
  activityStatus: document.querySelector("#activityStatus"),
  activityNotes: document.querySelector("#activityNotes"),
  resetActivityFormButton: document.querySelector("#resetActivityFormButton"),
  clearResolvedActivitiesButton: document.querySelector("#clearResolvedActivitiesButton"),
  activitySummary: document.querySelector("#activitySummary"),
  activityList: document.querySelector("#activityList"),
  managerNotionDashboardLink: document.querySelector("#managerNotionDashboardLink"),
  notionMasterDashboard: document.querySelector("#notionMasterDashboard"),
  notionDivisionList: document.querySelector("#notionDivisionList"),
  notionLinkStatus: document.querySelector("#notionLinkStatus"),
  sidebarButtons: document.querySelectorAll("[data-view-target]"),
  managerViews: document.querySelectorAll("[data-view]"),
  moduleActions: document.querySelectorAll("[data-module-action]"),
};

elements.sidebarButtons.forEach((button) => {
  button.addEventListener("click", () => setManagerView(button.dataset.viewTarget));
});
elements.managerDate.value = todayDateText();
elements.timeRecordDate.value = todayDateText();
elements.managerDate.addEventListener("change", renderManagerDashboard);
elements.managerDashboard.addEventListener("click", handleManagerDashboardAction);
elements.form.addEventListener("submit", saveItem);
elements.resetFormButton.addEventListener("click", resetForm);
elements.searchInput.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);
elements.categoryFilter.addEventListener("change", render);
elements.managerControlTypeFilter.addEventListener("change", render);
elements.managerSalaFrequencyFilter.addEventListener("change", render);
elements.clearFiltersButton.addEventListener("click", clearManagerFilters);
elements.inventoryBody.addEventListener("click", handleTableAction);
elements.revenueForm.addEventListener("submit", saveRevenueRecord);
elements.revenueForm.addEventListener("input", updateRevenueTotals);
elements.revenueOtherToggle.addEventListener("change", toggleRevenueOtherObservation);
elements.resetRevenueFormButton.addEventListener("click", resetRevenueForm);
elements.refreshRevenueButton.addEventListener("click", fetchRevenueRecords);
elements.revenueList.addEventListener("click", handleRevenueAction);
elements.invoiceForm.addEventListener("submit", saveInvoiceRecord);
elements.invoiceFile.addEventListener("change", uploadInvoiceFile);
elements.resetInvoiceFormButton.addEventListener("click", resetInvoiceForm);
elements.refreshInvoicesButton.addEventListener("click", fetchInvoiceRecords);
elements.syncInvoicesButton.addEventListener("click", syncInvoiceRecords);
elements.invoiceList.addEventListener("click", handleInvoiceAction);
elements.invoiceList.addEventListener("change", handleInvoiceStatusChange);
elements.userForm.addEventListener("submit", saveUser);
elements.resetUserFormButton.addEventListener("click", resetUserForm);
elements.refreshUsersButton.addEventListener("click", fetchUsers);
elements.userList.addEventListener("click", handleUserAction);
elements.refreshTimeRecordsButton.addEventListener("click", fetchTimeRecords);
elements.timeRecordDate.addEventListener("change", fetchTimeRecords);
elements.purchaseList.addEventListener("change", handlePurchaseSelection);
elements.selectAllPurchasesButton.addEventListener("click", selectAllPurchases);
elements.clearPurchasesButton.addEventListener("click", clearPurchaseSelection);
elements.copyPurchasesButton.addEventListener("click", copySelectedPurchases);
elements.movementForm.addEventListener("submit", applyMovement);
elements.templateButton.addEventListener("click", downloadCsvTemplate);
elements.pullButton.addEventListener("click", pullFromNotion);
elements.syncButton.addEventListener("click", syncWithNotion);
elements.exportButton.addEventListener("click", exportData);
elements.importFile.addEventListener("change", importData);
elements.clearMovementsButton.addEventListener("click", clearMovements);
elements.refreshCountRecordsButton.addEventListener("click", fetchCountRecords);
elements.countHistoryMode.addEventListener("change", renderCountHistory);
elements.countFilterProduct.addEventListener("input", renderCountHistory);
elements.countFilterEmployee.addEventListener("input", renderCountHistory);
elements.countFilterSector.addEventListener("change", renderCountHistory);
elements.countFilterSupplier.addEventListener("input", renderCountHistory);
elements.countFilterDate.addEventListener("change", renderCountHistory);
elements.clearCountFiltersButton.addEventListener("click", clearCountHistoryFilters);
elements.countRecordList.addEventListener("change", handleCountRecordChange);
elements.countRecordList.addEventListener("click", handleCountRecordClick);
elements.activityForm.addEventListener("submit", saveActivity);
elements.resetActivityFormButton.addEventListener("click", resetActivityForm);
elements.clearResolvedActivitiesButton.addEventListener("click", clearResolvedActivities);
elements.activityList.addEventListener("change", handleActivityStatusChange);
elements.activityList.addEventListener("click", handleActivityAction);
elements.notionMasterDashboard.addEventListener("click", handleNotionMasterAction);
elements.notionDivisionList.addEventListener("click", handleNotionDivisionAction);

seedActivityList();
render();
renderActivities();
fetchAppLinks();
checkNotionStatus();
fetchCountRecords();
fetchRevenueRecords();
fetchInvoiceRecords();
fetchUsers();
fetchTimeRecords();
resetRevenueForm();
resetInvoiceForm();

setManagerView("resumo");

function setManagerView(viewName) {
  elements.managerViews.forEach((view) => {
    view.hidden = view.dataset.view !== viewName;
  });
  elements.sidebarButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewTarget === viewName);
  });
  updateModuleActions(viewName);
  if (viewName === "notion") renderNotionDashboard();
}

function updateModuleActions(viewName) {
  elements.moduleActions.forEach((action) => {
    action.hidden = action.dataset.moduleAction !== viewName;
  });
}

async function fetchAppLinks() {
  try {
    const response = await fetch("/api/app-links");
    const links = await response.json();
    if (!response.ok) throw new Error("Links nao configurados.");
    appLinks = links || {};
    if (links.purchasesNotionUrl) {
      elements.purchaseNotionLink.href = links.purchasesNotionUrl;
      elements.purchaseNotionLink.hidden = false;
    } else {
      elements.purchaseNotionLink.hidden = true;
    }
  } catch {
    appLinks = {};
    elements.purchaseNotionLink.hidden = true;
  } finally {
    renderNotionDashboard();
  }
}

function saveItem(event) {
  event.preventDefault();
  const formData = new FormData(elements.form);
  const id = elements.itemId.value || crypto.randomUUID();
  const item = normalizeItem({
    id,
    name: String(formData.get("name")).trim(),
    category: formData.get("category"),
    unit: formData.get("unit"),
    quantity: formData.get("quantity"),
    minimum: formData.get("minimum"),
    dailyMinimum: formData.get("dailyMinimum"),
    unitCost: formData.get("unitCost"),
    expiresAt: formData.get("expiresAt") || "",
    supplier: String(formData.get("supplier") || "").trim(),
    orderDay: String(formData.get("orderDay") || "").trim(),
    controlType: String(formData.get("controlType") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    updatedAt: new Date().toISOString(),
  });

  const existingIndex = items.findIndex((entry) => entry.id === id);
  if (existingIndex >= 0) items[existingIndex] = item;
  else items.unshift(item);

  persist();
  resetForm();
  render();
}

function handleTableAction(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const row = button.closest("tr");
  const item = items.find((entry) => entry.id === row.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit") fillForm(item);
  if (button.dataset.action === "delete") deleteItem(item);
  if (button.dataset.action === "move") openMovement(item);
}

function deleteItem(item) {
  const confirmed = confirm(`Apagar "${item.name}" do estoque local?`);
  if (!confirmed) return;

  items = items.filter((entry) => entry.id !== item.id);
  movements = movements.filter((entry) => entry.itemId !== item.id);
  persist();
  render();
}

function fillForm(item) {
  elements.itemId.value = item.id;
  elements.formTitle.textContent = "Editar item";
  setField("name", item.name);
  setField("category", item.category);
  setField("unit", item.unit);
  setField("quantity", item.quantity);
  setField("minimum", item.minimum);
  setField("dailyMinimum", item.dailyMinimum);
  setField("unitCost", item.unitCost);
  setField("expiresAt", item.expiresAt);
  setField("supplier", item.supplier);
  setField("orderDay", item.orderDay);
  ensureControlTypeOption(elements.controlType, item.controlType);
  setField("controlType", item.controlType);
  setField("notes", item.notes);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  elements.form.reset();
  elements.itemId.value = "";
  elements.formTitle.textContent = "Novo item";
  setField("category", "Ingredientes");
  setField("unit", "kg");
}

function openMovement(item) {
  elements.movementItemId.value = item.id;
  elements.movementTitle.textContent = `Movimento: ${item.name}`;
  elements.movementType.value = "in";
  elements.movementQuantity.value = "";
  elements.movementReason.value = "";
  elements.movementDialog.showModal();
}

function applyMovement(event) {
  event.preventDefault();
  const item = items.find((entry) => entry.id === elements.movementItemId.value);
  if (!item) return;

  const quantity = numberValue(elements.movementQuantity.value);
  const type = elements.movementType.value;
  if (quantity <= 0) return;

  const nextQuantity = type === "in" ? item.quantity + quantity : Math.max(0, item.quantity - quantity);
  item.quantity = roundQuantity(nextQuantity);
  item.updatedAt = new Date().toISOString();

  movements.unshift({
    id: crypto.randomUUID(),
    itemId: item.id,
    itemName: item.name,
    type,
    quantity,
    unit: item.unit,
    reason: elements.movementReason.value.trim(),
    createdAt: new Date().toISOString(),
  });
  movements = movements.slice(0, 80);

  persist();
  elements.movementDialog.close();
  render();
}

function render() {
  renderSummary();
  renderControlTypeOptions();
  renderPurchaseSuggestions();
  renderTable();
  renderMovements();
}

function renderSummary() {
  renderManagerDashboard();
}

function renderManagerDashboard() {
  if (!elements.managerStatCards) return;

  const selectedDate = elements.managerDate.value || todayDateText();
  const selectedMonth = selectedDate.slice(0, 7);
  const executiveDashboard = getExecutiveDashboardData(selectedDate);
  const lowStock = items.filter(isLowStock).sort((a, b) => criticalRatio(a) - criticalRatio(b));
  const todayMovements = movements.filter((movement) => String(movement.createdAt || "").slice(0, 10) === selectedDate);
  const monthMovements = movements.filter((movement) => String(movement.createdAt || "").slice(0, 7) === selectedMonth);
  const latestCount = executiveDashboard.latestCount;

  elements.managerStatCards.innerHTML = "";
  [
    { iconName: "alert", value: executiveDashboard.ruptures.length, label: "Rupturas", description: "Status de compra RUPTURA", tone: "red", action: "dashboard-ruptures" },
    { iconName: "orders", value: executiveDashboard.purchases.length, label: "Comprar Hoje", description: "Quantidade Comprar > 0", tone: "orange", action: "dashboard-purchases" },
    { iconName: "movement", value: executiveDashboard.supplierGroups.length, label: "Fornecedores com Compra", description: "Fornecedores únicos", tone: "blue", action: "dashboard-suppliers" },
    { iconName: "alert", value: executiveDashboard.recountItems.length, label: "Produtos sem Contagem", description: "Status Inventário RECONTAR", tone: "red", action: "dashboard-recount" },
    { iconName: "check", value: executiveDashboard.todayCounts.length, label: "Contagens Hoje", description: formatDate(selectedDate), tone: "green", action: "registos" },
    {
      iconName: "movement",
      value: latestCount ? formatDate(latestCount.countDate) : "-",
      label: "Última Contagem",
      description: latestCount ? `${latestCount.employeeName || latestCount.employeeUsername || "Sem responsável"} | ${latestCount.productName}` : "Sem registros",
      tone: "purple",
      action: "registos",
    },
  ].forEach((card) => elements.managerStatCards.appendChild(AcaiUI.StatCard(card)));

  renderManagerExecutiveDashboard(executiveDashboard);

  elements.managerCriticalList.innerHTML = "";
  elements.managerCriticalList.appendChild(
    AcaiUI.CriticalStockList({
      items: lowStock,
      limit: 5,
      emptyText: "Estoque sem alertas críticos.",
    }),
  );

  elements.managerQuickActions.innerHTML = "";
  [
    { iconName: "check", label: "Lançar Estoque", tone: "purple", action: "estoque" },
    { iconName: "orders", label: "Lançar faturas", tone: "orange", action: "faturas" },
    { iconName: "movement", label: "Ajuste de Estoque", tone: "green", action: "ajuste" },
    { iconName: "search", label: "Consultar Estoque", tone: "blue", action: "consulta" },
    { iconName: "check", label: "Ponto", tone: "blue", action: "ponto" },
    { iconName: "orders", label: "Funcionários e senhas", tone: "orange", action: "funcionarios" },
    { iconName: "sales", label: "Registro financeiro", tone: "purple", action: "relatorio" },
    { iconName: "movement", label: "Histórico Contagens", tone: "blue", action: "registos" },
    { iconName: "orders", label: "Lista de Atividades", tone: "green", action: "atividades" },
    { iconName: "notion", label: "Dashboard Notion", tone: "purple", action: "notion" },
  ].forEach((button) => elements.managerQuickActions.appendChild(AcaiUI.QuickActionButton(button)));

  const monthlyRevenue = revenueRecords.filter((record) => String(record.date || "").slice(0, 7) === selectedMonth);
  const gross = monthlyRevenue.reduce((total, record) => total + revenueGrossTotal(record), 0);
  const orders = monthlyRevenue.reduce((total, record) => total + numberValue(record.orders), 0);
  const ticket = orders > 0 ? gross / orders : 0;
  elements.managerDailySummary.innerHTML = "";
  elements.managerDailySummary.appendChild(
    AcaiUI.DailySummaryCard({
      sales: monthlyRevenue.length ? formatCurrency(gross) : "Sem dados",
      orders: monthlyRevenue.length ? formatNumber(orders) : "0",
      ticket: monthlyRevenue.length && orders > 0 ? formatCurrency(ticket) : "Sem dados",
      topProducts: topMovedProducts(monthMovements) || "Sem dados",
    }),
  );

  renderUpcomingInvoices();
}

function getExecutiveDashboardData(date = todayDateText()) {
  const purchases = items
    .filter((item) => dashboardQuantityToBuy(item) > 0)
    .sort((a, b) => supplierLabel(a).localeCompare(supplierLabel(b)) || a.name.localeCompare(b.name));
  const supplierGroups = groupBySupplier(purchases).sort((a, b) => a.supplier.localeCompare(b.supplier));
  const ruptures = items.filter(isExecutiveRupture).sort((a, b) => a.name.localeCompare(b.name));
  const recountItems = items.filter(isInventoryRecount).sort((a, b) => a.name.localeCompare(b.name));
  const sortedCounts = [...countHistoryEntries].sort(compareCountHistoryEntries);
  const latestCountByProduct = latestCountsByProduct(sortedCounts);

  return {
    date,
    ruptures,
    purchases,
    supplierGroups,
    recountItems,
    todayCounts: sortedCounts.filter((entry) => entry.countDate === date),
    latestCount: sortedCounts[0] || null,
    latestCountByProduct,
  };
}

function renderManagerExecutiveDashboard(data) {
  if (!elements.managerExecutiveDashboard) return;
  elements.managerExecutiveDashboard.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>Dashboard Gestor</h2>
        <p class="panel-subtitle">Painel executivo reservado a Paulo e Vanessa.</p>
      </div>
      <button class="text-action" data-dashboard-action="registos" type="button">Histórico</button>
    </div>

    <div class="manager-executive-grid">
      ${executiveTable({
        title: "Rupturas",
        subtitle: "Status de compra = RUPTURA",
        tone: "red",
        headers: ["Produto", "Estoque atual", "Mínimo diário", "Fornecedor"],
        rows: data.ruptures.map((item) => [
          item.name,
          `${formatNumber(item.quantity)} ${item.unit}`,
          `${formatNumber(item.dailyMinimum)} ${item.unit}`,
          supplierLabel(item),
        ]),
        emptyText: "Sem produtos em ruptura.",
        action: "dashboard-ruptures",
        total: data.ruptures.length,
      })}

      ${executiveTable({
        title: "Comprar Hoje",
        subtitle: "Produtos com Quantidade Comprar acima de zero",
        tone: "orange",
        headers: ["Produto", "Quantidade comprar", "Unidade", "Fornecedor"],
        rows: data.purchases.map((item) => [
          item.name,
          formatNumber(dashboardQuantityToBuy(item)),
          item.unit,
          supplierLabel(item),
        ]),
        emptyText: "Sem compras sugeridas.",
        action: "dashboard-purchases",
        total: data.purchases.length,
      })}

      ${executiveSupplierBlock(data.supplierGroups)}

      ${executiveTable({
        title: "Sem Contagem",
        subtitle: "Status Inventário = RECONTAR",
        tone: "red",
        headers: ["Produto", "Última data", "Dias sem contagem", "Responsável"],
        rows: data.recountItems.map((item) => {
          const latest = latestCountForItem(item, data.latestCountByProduct);
          return [
            item.name,
            latest ? formatDate(latest.countDate) : "Nunca contado",
            latest ? formatNumber(daysSinceCount(latest.countDate, data.date)) : "-",
            latest?.employeeName || latest?.employeeUsername || "-",
          ];
        }),
        emptyText: "Sem produtos marcados para recontagem.",
        action: "dashboard-recount",
        total: data.recountItems.length,
      })}
    </div>
  `;
}

function executiveTable({ title, subtitle, tone, headers, rows, emptyText, action, total }) {
  const visibleRows = rows.slice(0, 10);
  return `
    <section class="manager-executive-block tone-${escapeHtml(tone)}">
      <div class="manager-executive-block-head">
        <div>
          <span>${escapeHtml(title)}</span>
          <strong>${formatNumber(total)} ${total === 1 ? "item" : "itens"}</strong>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        ${action ? `<button class="text-action" data-dashboard-action="${escapeHtml(action)}" type="button">Ver</button>` : ""}
      </div>
      ${visibleRows.length ? `
        <div class="manager-executive-table-wrap">
          <table class="manager-executive-table">
            <thead>
              <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${visibleRows.map((row) => `
                <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${rows.length > visibleRows.length ? `<p class="manager-executive-note">Mostrando 10 de ${formatNumber(rows.length)}. Usa “Ver” para consultar todos.</p>` : ""}
      ` : `<div class="mini-empty">${escapeHtml(emptyText)}</div>`}
    </section>
  `;
}

function executiveSupplierBlock(supplierGroups) {
  const visibleGroups = supplierGroups.slice(0, 8);
  return `
    <section class="manager-executive-block tone-blue">
      <div class="manager-executive-block-head">
        <div>
          <span>Compras por Fornecedor</span>
          <strong>${formatNumber(supplierGroups.length)} grupos</strong>
          <p>Produtos agrupados por fornecedor.</p>
        </div>
        <button class="text-action" data-dashboard-action="dashboard-suppliers" type="button">Ver</button>
      </div>
      ${visibleGroups.length ? `
        <div class="manager-supplier-groups">
          ${visibleGroups.map((group) => `
            <article class="manager-supplier-group">
              <div>
                <strong>${escapeHtml(group.supplier)}</strong>
                <span>${formatNumber(group.items.length)} ${group.items.length === 1 ? "produto" : "produtos"}</span>
              </div>
              <ul>
                ${group.items.slice(0, 4).map((item) => `<li>${escapeHtml(item.name)} <b>${formatNumber(dashboardQuantityToBuy(item))} ${escapeHtml(item.unit)}</b></li>`).join("")}
              </ul>
            </article>
          `).join("")}
        </div>
        ${supplierGroups.length > visibleGroups.length ? `<p class="manager-executive-note">Mostrando 8 de ${formatNumber(supplierGroups.length)} fornecedores.</p>` : ""}
      ` : '<div class="mini-empty">Sem fornecedores com compras sugeridas.</div>'}
    </section>
  `;
}

function isExecutiveRupture(item) {
  const purchaseStatus = normalizeText(item.purchaseStatus || item.statusCompra);
  if (purchaseStatus) return purchaseStatus.includes("ruptura");
  if (normalizeText(item.status).includes("ruptura")) return true;
  return isRupture(item);
}

function dashboardQuantityToBuy(item) {
  return numberValue(item.orderQuantity);
}

function isInventoryRecount(item) {
  const status = normalizeText(item.inventoryStatus || item.statusInventario || item.inventoryState);
  return status.includes("recontar");
}

function compareCountHistoryEntries(a, b) {
  return String(b.countDate || "").localeCompare(String(a.countDate || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

function latestCountsByProduct(entries) {
  const latest = new Map();
  for (const entry of entries) {
    for (const key of countProductKeys(entry)) {
      if (key && !latest.has(key)) latest.set(key, entry);
    }
  }
  return latest;
}

function latestCountForItem(item, latestMap) {
  return latestMap.get(item.id) || latestMap.get(normalizeText(item.name)) || null;
}

function countProductKeys(entry) {
  return [entry.productId, normalizeText(entry.productName)].filter(Boolean);
}

function daysSinceCount(countDate, referenceDate = todayDateText()) {
  const count = new Date(`${countDate}T00:00:00`);
  const reference = new Date(`${referenceDate}T00:00:00`);
  if (Number.isNaN(count.getTime()) || Number.isNaN(reference.getTime())) return 0;
  return Math.max(0, Math.floor((reference - count) / 86400000));
}

function revenueGrossTotal(record) {
  if (record && Object.prototype.hasOwnProperty.call(record, "grossTotal")) return numberValue(record.grossTotal);
  return (
    numberValue(record?.coins) +
    numberValue(record?.mbway) +
    numberValue(record?.uberEats) +
    numberValue(record?.glovo) +
    numberValue(record?.bolt) +
    numberValue(record?.multibanco) +
    numberValue(record?.cash)
  );
}

function handleManagerDashboardAction(event) {
  const target = event.target.closest("[data-dashboard-action], [data-action]");
  if (!target) return;
  const action = target.dataset.dashboardAction || target.dataset.action;
  if (action === "dashboard-ruptures") {
    elements.statusFilter.value = "low";
    setManagerView("inventario");
    render();
    elements.searchInput.focus();
    return;
  }
  if (action === "dashboard-purchases" || action === "dashboard-suppliers") return setManagerView("pedidos");
  if (action === "dashboard-recount") return setManagerView("registos");
  if (action === "critical") {
    elements.statusFilter.value = "low";
    setManagerView("inventario");
    render();
    elements.searchInput.focus();
    return;
  }
  if (action === "relatorio") return setManagerView("faturacao");
  if (action === "atividades") return setManagerView("atividades");
  if (action === "faturas") return setManagerView("faturas");
  if (action === "ponto") return setManagerView("ponto");
  if (action === "notion") return setManagerView("notion");
  if (action === "funcionarios") return setManagerView("funcionarios");
  if (action === "registos") return setManagerView("registos");
  if (action === "producao" || action === "movimentos") return setManagerView("movimentos");
  if (action === "pedidos") return setManagerView("pedidos");
  if (action === "consulta") {
    setManagerView("inventario");
    elements.searchInput.focus();
    return;
  }
  setManagerView("inventario");
}

function renderNotionDashboard() {
  if (!elements.notionDivisionList) return;
  const dashboardUrl = appLinks.managementDashboardUrl || DEFAULT_NOTION_MANAGEMENT_DASHBOARD_URL;
  if (dashboardUrl) {
    elements.managerNotionDashboardLink.href = dashboardUrl;
    elements.managerNotionDashboardLink.hidden = false;
  } else {
    elements.managerNotionDashboardLink.hidden = true;
  }

  renderNotionMasterDashboard();

  const managementLinks = appLinks.managementLinks || {};
  elements.notionDivisionList.innerHTML = NOTION_MANAGEMENT_DIVISIONS.map((division) => {
    const notionUrl = managementLinks[division.id] || dashboardUrl;
    return `
      <article class="notion-division-card tone-${escapeHtml(division.tone)}">
        <div class="notion-division-icon">${AcaiUI.icon(division.iconName)}</div>
        <div>
          <strong>${escapeHtml(division.label)}</strong>
          <p>${escapeHtml(division.description)}</p>
        </div>
        <div class="notion-division-actions">
          <button class="button ghost" data-notion-view="${escapeHtml(division.view)}" type="button">Abrir no app</button>
          ${notionUrl ? `<a class="button primary" href="${escapeHtml(notionUrl)}" target="_blank" rel="noopener">Notion</a>` : ""}
        </div>
      </article>
    `;
  }).join("");

  const linkedCount = NOTION_MANAGEMENT_DIVISIONS.filter((division) => managementLinks[division.id]).length;
  elements.notionLinkStatus.textContent = dashboardUrl || linkedCount
    ? `${linkedCount} divisões com link direto próprio; as demais abrem o Dashboard Gestão principal.`
    : "Adicione NOTION_MANAGEMENT_DASHBOARD_URL no .env/Render para abrir a página Dashboard Gestão do Notion diretamente.";
}

function renderNotionMasterDashboard() {
  if (!elements.notionMasterDashboard) return;
  const dashboardData = getExecutiveDashboardData(todayDateText());
  const ruptures = dashboardData.ruptures;
  const todayPurchases = dashboardData.purchases;
  const supplierGroups = dashboardData.supplierGroups;
  const updatedAt = latestItemUpdateText();

  elements.notionMasterDashboard.innerHTML = `
    <section class="notion-master-card">
      <div class="section-heading">
        <div>
          <h3>Base Mestre</h3>
          <p class="panel-subtitle">Leitura operacional da base carregada do Notion.</p>
        </div>
        <div class="row-actions">
          <button class="button ghost" data-notion-master-action="refresh" type="button">Atualizar Notion</button>
          <button class="button primary" data-notion-master-action="purchases" type="button">Ver compras</button>
        </div>
      </div>

      <div class="notion-master-stats">
        ${notionMetricCard("Produtos", items.length, "Total na base mestre")}
        ${notionMetricCard("Rupturas", ruptures.length, "Status de compra RUPTURA")}
        ${notionMetricCard("Comprar hoje", todayPurchases.length, "Quantidade Comprar > 0")}
        ${notionMetricCard("Fornecedores", supplierGroups.length, "Com solicitação")}
      </div>

      <div class="notion-master-grid">
        ${notionRupturesPanel(ruptures)}
        ${notionTodayPurchasesPanel(todayPurchases)}
        ${notionSupplierPurchasesPanel(supplierGroups)}
      </div>

      <p class="notion-source-note">Fonte: preenchimento do Notion carregado no app${updatedAt ? ` | última atualização: ${escapeHtml(updatedAt)}` : ""}.</p>
    </section>
  `;
}

function notionMetricCard(label, value, description) {
  return `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(formatNumber(value))}</strong>
      <p>${escapeHtml(description)}</p>
    </article>
  `;
}

function notionRupturesPanel(ruptures) {
  const rows = ruptures.slice(0, 6).map((item) => `
    <article class="notion-mini-row">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml([supplierLabel(item), item.category].filter(Boolean).join(" | "))}</span>
      </div>
      <b>${formatNumber(item.quantity)} ${escapeHtml(item.unit)}</b>
    </article>
  `).join("");

  return `
    <section class="notion-master-panel tone-red">
      <div class="notion-master-panel-head">
        <div>
          <span>Rupturas</span>
          <strong>${formatNumber(ruptures.length)} produtos</strong>
        </div>
        <button class="text-action" data-notion-master-action="ruptures" type="button">Ver no estoque</button>
      </div>
      <div class="notion-mini-list">${rows || '<div class="mini-empty">Sem rupturas na base carregada.</div>'}</div>
    </section>
  `;
}

function notionTodayPurchasesPanel(todayPurchases) {
  const rows = todayPurchases.slice(0, 6).map((item) => `
    <article class="notion-mini-row">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(supplierLabel(item))}</span>
      </div>
      <b>${formatNumber(dashboardQuantityToBuy(item))} ${escapeHtml(item.unit)}</b>
    </article>
  `).join("");

  return `
    <section class="notion-master-panel tone-orange">
      <div class="notion-master-panel-head">
        <div>
          <span>Comprar hoje</span>
          <strong>Qtd comprar &gt; 0</strong>
        </div>
        <button class="text-action" data-notion-master-action="today" type="button">Abrir lista</button>
      </div>
      <div class="notion-mini-list">${rows || '<div class="mini-empty">Sem compras para hoje.</div>'}</div>
    </section>
  `;
}

function notionSupplierPurchasesPanel(supplierGroups) {
  const rows = supplierGroups.slice(0, 7).map((group) => {
    const preview = group.items.slice(0, 2).map((item) => item.name).join(", ");
    return `
      <article class="notion-mini-row">
        <div>
          <strong>${escapeHtml(group.supplier)}</strong>
          <span>${escapeHtml(orderDaySummary(group.items))}${preview ? ` | ${escapeHtml(preview)}` : ""}</span>
        </div>
        <b>${formatNumber(group.items.length)}</b>
      </article>
    `;
  }).join("");

  return `
    <section class="notion-master-panel tone-green">
      <div class="notion-master-panel-head">
        <div>
          <span>Compras por fornecedor</span>
          <strong>${formatNumber(supplierGroups.length)} grupos</strong>
        </div>
        <button class="text-action" data-notion-master-action="purchases" type="button">Ver todos</button>
      </div>
      <div class="notion-mini-list">${rows || '<div class="mini-empty">Sem fornecedores com compras sugeridas.</div>'}</div>
    </section>
  `;
}

async function handleNotionMasterAction(event) {
  const button = event.target.closest("[data-notion-master-action]");
  if (!button) return;
  const action = button.dataset.notionMasterAction;

  if (action === "refresh") {
    await pullFromNotion();
    renderNotionDashboard();
    return;
  }

  if (action === "ruptures") {
    setManagerView("inventario");
    elements.statusFilter.value = "low";
    elements.searchInput.value = "";
    render();
    return;
  }

  if (action === "today" || action === "purchases") {
    setManagerView("pedidos");
  }
}

function handleNotionDivisionAction(event) {
  const button = event.target.closest("[data-notion-view]");
  if (!button) return;
  setManagerView(button.dataset.notionView);
}

function renderUpcomingInvoices() {
  if (!elements.managerUpcomingInvoices) return;
  const upcomingInvoices = invoiceRecords
    .filter((record) => {
      const dueDate = invoiceDueDate(record);
      return normalizeInvoiceStatusName(record.status) !== "Pago" && dueDate && Number.isFinite(daysUntil(dueDate));
    })
    .sort((a, b) => daysUntil(invoiceDueDate(a)) - daysUntil(invoiceDueDate(b)) || String(a.supplier || "").localeCompare(String(b.supplier || "")))
    .slice(0, 6);

  elements.managerUpcomingInvoices.innerHTML = "";
  if (upcomingInvoices.length === 0) {
    elements.managerUpcomingInvoices.innerHTML =
      '<div class="mini-empty">Sem faturas pendentes com vencimento definido.</div>';
    return;
  }

  const list = document.createElement("div");
  list.className = "upcoming-invoice-list";
  for (const record of upcomingInvoices) list.appendChild(renderUpcomingInvoiceRow(record));
  elements.managerUpcomingInvoices.appendChild(list);
}

function renderUpcomingInvoiceRow(record) {
  const dueDate = invoiceDueDate(record);
  const days = daysUntil(dueDate);
  const row = document.createElement("article");
  row.className = `upcoming-invoice-row ${invoiceDueClass(days)}`;
  row.innerHTML = `
    <div class="upcoming-invoice-main">
      <strong>${escapeHtml(record.supplier || record.title || "Fatura")}</strong>
      <span>${escapeHtml(record.invoiceNumber || "Sem número")} | ${escapeHtml(record.category || "Geral")}</span>
    </div>
    <div class="upcoming-invoice-amount">
      <strong>${formatCurrency(record.amount || 0)}</strong>
      <span>${escapeHtml(normalizeInvoiceStatusName(record.status))}</span>
    </div>
    <div class="upcoming-invoice-due">
      <strong>${formatDate(dueDate)}</strong>
      <span>${escapeHtml(invoiceDueLabel(days))}</span>
    </div>
  `;
  return row;
}

function invoiceDueClass(days) {
  if (days < 0) return "is-overdue";
  if (days === 0) return "is-today";
  if (days <= 3) return "is-soon";
  return "is-upcoming";
}

function invoiceDueLabel(days) {
  if (days < 0) return `${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"} em atraso`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  return `Vence em ${days} dias`;
}

function invoiceDueDate(record) {
  return String(record?.dueDate || "").slice(0, 10);
}

function topMovedProducts(todayMovements) {
  const outgoing = todayMovements.filter((movement) => movement.type === "out");
  const counts = new Map();
  for (const movement of outgoing) {
    const name = movement.itemName || "";
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + numberValue(movement.quantity));
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([name]) => name)
    .join(", ");
}

function criticalRatio(item) {
  const minimum = Math.max(numberValue(item.minimum), numberValue(item.dailyMinimum), 1);
  return numberValue(item.quantity) / minimum;
}

async function fetchRevenueRecords() {
  elements.revenueFeedback.textContent = "A carregar faturação...";
  try {
    const response = await fetch("/api/revenue-records");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao carregar faturação.");
    revenueRecords = result.records || [];
    renderRevenueRecords();
    renderManagerDashboard();
    elements.revenueFeedback.textContent = `${revenueRecords.length} registos de faturação.`;
  } catch (error) {
    revenueRecords = [];
    renderRevenueRecords();
    renderManagerDashboard();
    elements.revenueFeedback.textContent = error.message || "Erro ao carregar faturação.";
  }
}

async function saveRevenueRecord(event) {
  event.preventDefault();
  const payload = getRevenuePayload();
  hideRevenueWhatsappShare();
  elements.revenueFeedback.textContent = "A guardar faturação...";

  try {
    const response = await fetch("/api/revenue-records/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record: payload }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao guardar faturação.");
    revenueRecords = result.records || [];
    renderRevenueRecords();
    renderManagerDashboard();
    resetRevenueForm();
    renderRevenueWhatsappShare(result.record, result.notion);
    if (result.notion?.synced) {
      elements.revenueFeedback.textContent = "Faturação guardada e sincronizada com o Notion.";
    } else if (result.notion?.configured === false) {
      elements.revenueFeedback.textContent = "Faturação guardada. Configure NOTION_REVENUE_DATABASE_ID para sincronizar com o Notion.";
    } else {
      elements.revenueFeedback.textContent = `Faturação guardada localmente. Notion: ${result.notion?.error || "não sincronizado."}`;
    }
  } catch (error) {
    elements.revenueFeedback.textContent = error.message || "Erro ao guardar faturação.";
  }
}

function getRevenuePayload() {
  return {
    id: elements.revenueId.value,
    date: elements.revenueDate.value,
    coins: numberValue(elements.revenueCoins.value),
    mbway: numberValue(elements.revenueMbway.value),
    uberEats: numberValue(elements.revenueUberEats.value),
    glovo: numberValue(elements.revenueGlovo.value),
    bolt: numberValue(elements.revenueBolt.value),
    multibanco: numberValue(elements.revenueMultibanco.value),
    cash: numberValue(elements.revenueCash.value),
    fuel: numberValue(elements.revenueFuel.value),
    expenses: [
      { description: elements.revenueExpense1Description.value.trim(), amount: numberValue(elements.revenueExpense1.value) },
      { description: elements.revenueExpense2Description.value.trim(), amount: numberValue(elements.revenueExpense2.value) },
      { description: elements.revenueExpense3Description.value.trim(), amount: numberValue(elements.revenueExpense3.value) },
    ],
    orders: numberValue(elements.revenueOrders.value),
    dayNotes: [...elements.revenueForm.querySelectorAll("input[name='dayNotes']:checked")].map((input) => input.value),
    otherObservation: elements.revenueOtherObservation.value.trim(),
  };
}

function updateRevenueTotals() {
  const payload = getRevenuePayload();
  const gross = payload.coins + payload.mbway + payload.uberEats + payload.glovo + payload.bolt + payload.multibanco + payload.cash;
  const expenses = payload.fuel + payload.expenses.reduce((total, expense) => total + expense.amount, 0);
  elements.revenueTotals.querySelector('[data-field="gross"]').textContent = formatCurrency(gross);
  elements.revenueTotals.querySelector('[data-field="expenses"]').textContent = formatCurrency(expenses);
  elements.revenueTotals.querySelector('[data-field="net"]').textContent = formatCurrency(gross - expenses);
  toggleRevenueOtherObservation();
}

function renderRevenueRecords() {
  elements.revenueList.innerHTML = "";
  if (revenueRecords.length === 0) {
    elements.revenueList.innerHTML = '<div class="empty-state"><h3>Sem faturação</h3><p>Guarda o primeiro fecho diário acima.</p></div>';
    return;
  }

  for (const record of revenueRecords.slice(0, 60)) {
    const entry = document.createElement("article");
    entry.className = "revenue-record";
    const notes = Array.isArray(record.dayNotes) && record.dayNotes.length ? record.dayNotes.join(", ") : "Sem obs";
    entry.innerHTML = `
      <div>
        <strong>${formatDate(record.date)}</strong>
        <span>${escapeHtml(notes)} | ${formatNumber(record.orders)} pedidos</span>
      </div>
      <div>
        <strong>${formatCurrency(record.grossTotal || 0)}</strong>
        <span>Total faturação</span>
      </div>
      <div>
        <strong>${formatCurrency(record.expenseTotal || 0)}</strong>
        <span>Despesas</span>
      </div>
      <div>
        <strong>${formatCurrency(record.netTotal || 0)}</strong>
        <span>Líquido</span>
      </div>
      <div class="row-actions">
        <button class="icon-button" data-action="edit-revenue" data-id="${escapeHtml(record.id)}" type="button">Editar</button>
        <button class="icon-button danger" data-action="delete-revenue" data-id="${escapeHtml(record.id)}" type="button">Apagar</button>
      </div>
    `;
    elements.revenueList.appendChild(entry);
  }
}

function renderRevenueWhatsappShare(record, notion) {
  if (!elements.revenueWhatsappShare) return;
  const message = buildRevenueWhatsappMessage(record, notion);
  if (!message || WHATSAPP_RECIPIENTS.length === 0) return;

  const buttons = WHATSAPP_RECIPIENTS.map((recipient) => {
    const href = `https://wa.me/${recipient.phone}?text=${encodeURIComponent(message)}`;
    return `<a class="button whatsapp-button" href="${href}" target="_blank" rel="noopener">${escapeHtml(recipient.label)}</a>`;
  }).join("");

  elements.revenueWhatsappShare.innerHTML = `
    <div>
      <strong>Enviar resumo por WhatsApp</strong>
      <span>A mensagem da faturação está pronta. Abre cada contacto e confirma o envio.</span>
    </div>
    <div class="row-actions">${buttons}</div>
  `;
  elements.revenueWhatsappShare.hidden = false;
}

function hideRevenueWhatsappShare() {
  if (!elements.revenueWhatsappShare) return;
  elements.revenueWhatsappShare.hidden = true;
  elements.revenueWhatsappShare.innerHTML = "";
}

function buildRevenueWhatsappMessage(record, notion) {
  if (!record) return "";

  const receivedTotal =
    numberValue(record.grossTotal) ||
    numberValue(record.coins) +
      numberValue(record.mbway) +
      numberValue(record.uberEats) +
      numberValue(record.glovo) +
      numberValue(record.bolt) +
      numberValue(record.multibanco) +
      numberValue(record.cash);
  const extraExpenses = (Array.isArray(record.expenses) ? record.expenses : [])
    .map((expense, index) => {
      const description = String(expense.description || "").trim();
      return {
        description: description || `Despesa ${index + 1}`,
        hasDescription: Boolean(description),
        amount: numberValue(expense.amount),
      };
    })
    .filter((expense) => expense.hasDescription || expense.amount > 0);
  const expenseTotal =
    numberValue(record.expenseTotal) ||
    numberValue(record.fuel) + extraExpenses.reduce((total, expense) => total + expense.amount, 0);
  const netTotal = numberValue(record.netTotal) || receivedTotal - expenseTotal;
  const notes = Array.isArray(record.dayNotes) && record.dayNotes.length ? record.dayNotes.join(", ") : "Sem observação";
  const notionStatus = notion?.synced ? "sincronizado" : "não sincronizado";

  const lines = [
    `Faturação diária - ${formatDate(record.date)}`,
    record.updatedAt ? `Registado em: ${formatDateTime(record.updatedAt)}` : "",
    "",
    "Recebimentos:",
    `- Moedas: ${formatCurrency(numberValue(record.coins))}`,
    `- MBWAY: ${formatCurrency(numberValue(record.mbway))}`,
    `- Uber Eats: ${formatCurrency(numberValue(record.uberEats))}`,
    `- Glovo: ${formatCurrency(numberValue(record.glovo))}`,
    `- Bolt: ${formatCurrency(numberValue(record.bolt))}`,
    `- Multibanco: ${formatCurrency(numberValue(record.multibanco))}`,
    `- Dinheiro: ${formatCurrency(numberValue(record.cash))}`,
    `Total faturação: ${formatCurrency(receivedTotal)}`,
    "",
    "Despesas:",
    `- Combustível: ${formatCurrency(numberValue(record.fuel))}`,
  ];

  if (extraExpenses.length) {
    for (const expense of extraExpenses) {
      lines.push(`- ${expense.description}: ${formatCurrency(expense.amount)}`);
    }
  } else {
    lines.push("- Sem despesas adicionais");
  }

  lines.push(
    `Total despesas: ${formatCurrency(expenseTotal)}`,
    `Total líquido: ${formatCurrency(netTotal)}`,
    "",
    `Qtd de pedidos: ${formatNumber(numberValue(record.orders))}`,
    `Obs do dia: ${notes}`,
  );

  if (record.otherObservation) {
    lines.push(`Observação: ${record.otherObservation}`);
  }

  lines.push(`Notion: ${notionStatus}`);
  return lines.filter(Boolean).join("\n");
}

function handleRevenueAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "edit-revenue") fillRevenueForm(button.dataset.id);
  if (button.dataset.action === "delete-revenue") deleteRevenueRecord(button.dataset.id);
}

function fillRevenueForm(id) {
  const record = revenueRecords.find((entry) => entry.id === id);
  if (!record) return;
  elements.revenueId.value = record.id;
  elements.revenueDate.value = record.date;
  elements.revenueCoins.value = valueForInput(record.coins);
  elements.revenueMbway.value = valueForInput(record.mbway);
  elements.revenueUberEats.value = valueForInput(record.uberEats);
  elements.revenueGlovo.value = valueForInput(record.glovo);
  elements.revenueBolt.value = valueForInput(record.bolt);
  elements.revenueMultibanco.value = valueForInput(record.multibanco);
  elements.revenueCash.value = valueForInput(record.cash);
  elements.revenueFuel.value = valueForInput(record.fuel);
  elements.revenueExpense1Description.value = record.expenses?.[0]?.description || "";
  elements.revenueExpense1.value = valueForInput(record.expenses?.[0]?.amount);
  elements.revenueExpense2Description.value = record.expenses?.[1]?.description || "";
  elements.revenueExpense2.value = valueForInput(record.expenses?.[1]?.amount);
  elements.revenueExpense3Description.value = record.expenses?.[2]?.description || "";
  elements.revenueExpense3.value = valueForInput(record.expenses?.[2]?.amount);
  elements.revenueOrders.value = valueForInput(record.orders);
  for (const input of elements.revenueForm.querySelectorAll("input[name='dayNotes']")) {
    input.checked = (record.dayNotes || []).includes(input.value);
  }
  elements.revenueOtherObservation.value = record.otherObservation || "";
  updateRevenueTotals();
  elements.revenueFeedback.textContent = `A editar faturação de ${formatDate(record.date)}.`;
  hideRevenueWhatsappShare();
  elements.revenueDate.focus();
}

function resetRevenueForm() {
  elements.revenueForm.reset();
  elements.revenueId.value = "";
  elements.revenueDate.value = todayDateText();
  elements.revenueOtherObservationWrap.hidden = true;
  updateRevenueTotals();
}

async function deleteRevenueRecord(id) {
  if (!confirm("Apagar este registo de faturação?")) return;
  try {
    const response = await fetch("/api/revenue-records/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao apagar faturação.");
    revenueRecords = result.records || [];
    renderRevenueRecords();
    renderManagerDashboard();
    hideRevenueWhatsappShare();
    elements.revenueFeedback.textContent = "Registo de faturação apagado.";
  } catch (error) {
    elements.revenueFeedback.textContent = error.message || "Erro ao apagar faturação.";
  }
}

function toggleRevenueOtherObservation() {
  elements.revenueOtherObservationWrap.hidden = !elements.revenueOtherToggle.checked;
}

async function fetchInvoiceRecords() {
  elements.invoiceFeedback.textContent = "A carregar faturas...";
  try {
    const response = await fetch("/api/invoices");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao carregar faturas.");
    invoiceRecords = result.records || [];
    renderInvoiceRecords();
    renderManagerDashboard();
    elements.invoiceFeedback.textContent = `${invoiceRecords.length} faturas cadastradas.`;
  } catch (error) {
    invoiceRecords = [];
    renderInvoiceRecords();
    renderManagerDashboard();
    elements.invoiceFeedback.textContent = error.message || "Erro ao carregar faturas.";
  }
}

async function syncInvoiceRecords() {
  elements.invoiceFeedback.textContent = "A sincronizar faturas com o Notion...";
  try {
    const response = await fetch("/api/invoices/sync", { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao sincronizar faturas.");
    invoiceRecords = result.records || [];
    renderInvoiceRecords();
    renderManagerDashboard();
    const failed = result.failed ? ` ${result.failed} com erro.` : "";
    elements.invoiceFeedback.textContent = `${result.synced || 0} faturas sincronizadas com o Notion.${failed}`;
  } catch (error) {
    elements.invoiceFeedback.textContent = error.message || "Erro ao sincronizar faturas.";
  }
}

async function uploadInvoiceFile() {
  const file = elements.invoiceFile.files?.[0];
  if (!file) return;
  elements.invoiceFeedback.textContent = "A guardar arquivo e tentar leitura...";

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const response = await fetch("/api/invoices/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        dataUrl,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao guardar arquivo.");

    setInvoiceFile(result.file);
    applyInvoiceDraft(result.draft || {});
    elements.invoiceFeedback.textContent = result.extractionMessage || "Arquivo guardado.";
  } catch (error) {
    elements.invoiceFeedback.textContent = error.message || "Erro ao guardar arquivo.";
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao consegui ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function setInvoiceFile(file) {
  elements.invoiceFileUrl.value = file?.url || "";
  elements.invoiceOriginalFileName.value = file?.originalName || "";
  elements.invoiceStoredFileName.value = file?.storedName || "";
  elements.invoiceContentType.value = file?.contentType || "";
  elements.invoiceFileSize.value = file?.size || "";
  renderInvoiceFileInfo(file);
}

function renderInvoiceFileInfo(file) {
  if (!file?.url) {
    elements.invoiceFileInfo.textContent = "Nenhum arquivo selecionado.";
    return;
  }
  elements.invoiceFileInfo.innerHTML = `
    <a href="${escapeHtml(file.url)}" target="_blank" rel="noopener">${escapeHtml(file.originalName || "Arquivo")}</a>
    <span>${formatBytes(file.size)} guardados</span>
  `;
}

function applyInvoiceDraft(draft) {
  setDraftField(elements.invoiceSupplier, draft.supplier);
  setDraftField(elements.invoiceNumber, draft.invoiceNumber);
  setDraftField(elements.invoiceIssueDate, draft.issueDate);
  setDraftField(elements.invoiceDueDate, draft.dueDate);
  setDraftField(elements.invoiceAmount, numberValue(draft.amount) ? valueForInput(draft.amount) : "");
  setDraftField(elements.invoiceVat, numberValue(draft.vat) ? valueForInput(draft.vat) : "");
  setDraftField(elements.invoiceCategory, draft.category || "Geral");
  setDraftField(elements.invoiceNotes, draft.notes);
  elements.invoiceStatus.value = draft.status || "Pendente";
}

function setDraftField(field, value) {
  if (!field) return;
  field.value = value === undefined || value === null ? "" : value;
}

async function saveInvoiceRecord(event) {
  event.preventDefault();
  const payload = getInvoicePayload();
  elements.invoiceFeedback.textContent = "A guardar fatura...";

  try {
    const response = await fetch("/api/invoices/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record: payload }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao guardar fatura.");
    invoiceRecords = result.records || [];
    renderInvoiceRecords();
    renderManagerDashboard();
    resetInvoiceForm();
    if (result.notion?.synced) {
      elements.invoiceFeedback.textContent = "Fatura guardada e sincronizada com o Notion.";
    } else if (result.notion?.configured === false) {
      elements.invoiceFeedback.textContent = "Fatura guardada. Configure NOTION_INVOICE_DATABASE_ID para sincronizar com o Notion.";
    } else {
      elements.invoiceFeedback.textContent = `Fatura guardada localmente. Notion: ${result.notion?.error || "não sincronizado."}`;
    }
  } catch (error) {
    elements.invoiceFeedback.textContent = error.message || "Erro ao guardar fatura.";
  }
}

function getInvoicePayload() {
  return {
    id: elements.invoiceId.value,
    supplier: elements.invoiceSupplier.value.trim(),
    invoiceNumber: elements.invoiceNumber.value.trim(),
    issueDate: elements.invoiceIssueDate.value,
    dueDate: elements.invoiceDueDate.value,
    amount: numberValue(elements.invoiceAmount.value),
    vat: numberValue(elements.invoiceVat.value),
    status: elements.invoiceStatus.value,
    category: elements.invoiceCategory.value.trim() || "Geral",
    notes: elements.invoiceNotes.value.trim(),
    fileUrl: elements.invoiceFileUrl.value,
    originalFileName: elements.invoiceOriginalFileName.value,
    storedFileName: elements.invoiceStoredFileName.value,
    contentType: elements.invoiceContentType.value,
    fileSize: numberValue(elements.invoiceFileSize.value),
  };
}

function renderInvoiceRecords() {
  elements.invoiceList.innerHTML = "";
  if (invoiceRecords.length === 0) {
    elements.invoiceList.innerHTML = '<div class="empty-state"><h3>Sem faturas</h3><p>Guarda a primeira fatura acima.</p></div>';
    return;
  }

  for (const group of groupInvoicesByMonth(invoiceRecords.slice(0, 120))) {
    const section = document.createElement("section");
    section.className = "invoice-month-group";
    section.innerHTML = `
      <div class="invoice-month-heading">
        <div>
          <h3>${escapeHtml(group.label)}</h3>
          <span>${group.records.length} faturas | ${formatCurrency(group.total)}</span>
        </div>
      </div>
      <div class="invoice-month-list"></div>
    `;
    const monthList = section.querySelector(".invoice-month-list");
    for (const record of group.records) {
      monthList.appendChild(renderInvoiceRecord(record));
    }
    elements.invoiceList.appendChild(section);
  }
}

function renderInvoiceRecord(record) {
  const entry = document.createElement("article");
  entry.className = `invoice-record ${invoiceStatusClass(record.status)}`;
  entry.innerHTML = `
    <div>
      <strong>${escapeHtml(record.supplier || record.title || "Fatura")}</strong>
      <span>${escapeHtml(record.invoiceNumber || "Sem numero")} | ${escapeHtml(record.category || "Geral")}</span>
    </div>
    <div>
      <strong>${formatCurrency(record.amount || 0)}</strong>
      <span>Valor</span>
    </div>
    <div>
      <strong>${formatDate(record.dueDate)}</strong>
      <span>Vencimento</span>
    </div>
    <div>
      <label class="invoice-status-field ${invoiceStatusClass(record.status)}">
        <span>Estado</span>
        <select data-invoice-status="${escapeHtml(record.id)}">
          ${invoiceStatusOptions(record.status)}
        </select>
      </label>
      <span>${record.fileUrl ? `<a href="${escapeHtml(record.fileUrl)}" target="_blank" rel="noopener">Arquivo</a>` : "Sem arquivo"}</span>
    </div>
    <div class="row-actions">
      <button class="icon-button" data-action="edit-invoice" data-id="${escapeHtml(record.id)}" type="button">Editar</button>
      <button class="icon-button danger" data-action="delete-invoice" data-id="${escapeHtml(record.id)}" type="button">Apagar</button>
    </div>
  `;
  return entry;
}

function groupInvoicesByMonth(records) {
  const groups = new Map();
  for (const record of records) {
    const key = invoiceMonthKey(record);
    if (!groups.has(key)) {
      groups.set(key, { key, label: invoiceMonthLabel(record), records: [], total: 0 });
    }
    const group = groups.get(key);
    group.records.push(record);
    group.total += numberValue(record.amount);
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function invoiceMonthKey(record) {
  const dateText = record.dueDate || record.issueDate || record.createdAt || "";
  if (!dateText) return "9999-99";
  return String(dateText).slice(0, 7);
}

function invoiceMonthLabel(record) {
  const dateText = record.dueDate || record.issueDate || record.createdAt || "";
  if (!dateText) return "Sem mês definido";
  const date = new Date(`${String(dateText).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Sem mês definido";
  return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(date);
}

function invoiceStatusOptions(currentStatus) {
  return ["Pendente", "Pago", "Por pagar"]
    .map((status) => `<option value="${status}" ${normalizeInvoiceStatusName(currentStatus) === status ? "selected" : ""}>${status}</option>`)
    .join("");
}

function handleInvoiceAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "edit-invoice") fillInvoiceForm(button.dataset.id);
  if (button.dataset.action === "delete-invoice") deleteInvoiceRecord(button.dataset.id);
}

async function handleInvoiceStatusChange(event) {
  const select = event.target.closest("select[data-invoice-status]");
  if (!select) return;
  const id = select.dataset.invoiceStatus;
  const status = normalizeInvoiceStatusName(select.value);
  const record = invoiceRecords.find((entry) => entry.id === id);
  if (!record) return;

  const previousStatus = record.status;
  record.status = status;
  renderInvoiceRecords();
  renderManagerDashboard();
  elements.invoiceFeedback.textContent = "A atualizar estado da fatura...";

  try {
    const response = await fetch("/api/invoices/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao atualizar estado.");
    invoiceRecords = result.records || [];
    renderInvoiceRecords();
    renderManagerDashboard();
    if (result.notion?.synced) {
      elements.invoiceFeedback.textContent = "Estado atualizado e sincronizado com o Notion.";
    } else {
      elements.invoiceFeedback.textContent = `Estado atualizado. Notion: ${result.notion?.message || result.notion?.error || "não sincronizado."}`;
    }
  } catch (error) {
    record.status = previousStatus;
    renderInvoiceRecords();
    renderManagerDashboard();
    elements.invoiceFeedback.textContent = error.message || "Erro ao atualizar estado.";
  }
}

function fillInvoiceForm(id) {
  const record = invoiceRecords.find((entry) => entry.id === id);
  if (!record) return;
  elements.invoiceId.value = record.id;
  elements.invoiceSupplier.value = record.supplier || "";
  elements.invoiceNumber.value = record.invoiceNumber || "";
  elements.invoiceIssueDate.value = record.issueDate || "";
  elements.invoiceDueDate.value = record.dueDate || "";
  elements.invoiceAmount.value = valueForInput(record.amount);
  elements.invoiceVat.value = valueForInput(record.vat);
  elements.invoiceStatus.value = normalizeInvoiceStatusName(record.status);
  elements.invoiceCategory.value = record.category || "Geral";
  elements.invoiceNotes.value = record.notes || "";
  setInvoiceFile({
    url: record.fileUrl,
    originalName: record.originalFileName,
    storedName: record.storedFileName,
    contentType: record.contentType,
    size: record.fileSize,
  });
  elements.invoiceFeedback.textContent = `A editar fatura ${record.invoiceNumber || record.supplier || ""}.`;
  elements.invoiceSupplier.focus();
}

function resetInvoiceForm() {
  elements.invoiceForm.reset();
  elements.invoiceId.value = "";
  setInvoiceFile(null);
  elements.invoiceStatus.value = "Pendente";
  elements.invoiceCategory.value = "Geral";
}

async function deleteInvoiceRecord(id) {
  if (!confirm("Apagar este registo de fatura? O arquivo guardado não será removido.")) return;
  try {
    const response = await fetch("/api/invoices/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao apagar fatura.");
    invoiceRecords = result.records || [];
    renderInvoiceRecords();
    renderManagerDashboard();
    elements.invoiceFeedback.textContent = "Registo de fatura apagado.";
  } catch (error) {
    elements.invoiceFeedback.textContent = error.message || "Erro ao apagar fatura.";
  }
}

function invoiceStatusClass(status) {
  if (status === "Pago") return "paid";
  if (normalizeInvoiceStatusName(status) === "Por pagar") return "unpaid";
  return "pending";
}

function normalizeInvoiceStatusName(status) {
  if (status === "Pago") return "Pago";
  if (status === "Por pagar" || status === "Atrasado") return "Por pagar";
  return "Pendente";
}

function valueForInput(value) {
  return numberValue(value) ? String(numberValue(value)) : "";
}

function renderTable() {
  elements.inventoryBody.innerHTML = "";
  const filteredItems = getFilteredItems();
  elements.managerCountInfo.textContent = `${filteredItems.length} de ${items.length} produtos visiveis`;
  elements.emptyState.hidden = filteredItems.length > 0;

  for (const item of filteredItems) {
    const row = elements.rowTemplate.content.firstElementChild.cloneNode(true);
    const status = getStatus(item);
    row.dataset.id = item.id;
    row.querySelector('[data-field="name"]').textContent = item.name;
    row.querySelector('[data-field="meta"]').textContent = [item.category, item.supplier, item.orderDay].filter(Boolean).join(" | ");
    row.querySelector('[data-field="quantity"]').textContent = `${formatNumber(item.quantity)} ${item.unit}`;
    row.querySelector('[data-field="minimum"]').innerHTML = `
      <strong>${formatNumber(item.dailyMinimum)} ${escapeHtml(item.unit)}</strong>
      <span>diario</span>
      <strong>${formatNumber(item.minimum)} ${escapeHtml(item.unit)}</strong>
      <span>semanal</span>
    `;
    row.querySelector('[data-field="controlType"]').textContent = controlTypeDisplay(item.controlType);
    row.querySelector('[data-field="expiresAt"]').textContent = formatDate(item.expiresAt);
    const pill = row.querySelector('[data-field="status"]');
    pill.textContent = status.label;
    pill.classList.add(status.className);
    elements.inventoryBody.appendChild(row);
  }
}

async function fetchUsers() {
  elements.userFeedback.textContent = "A carregar acessos...";

  try {
    const response = await fetch("/api/users");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao carregar acessos.");
    renderUsers(result.users || []);
    elements.userFeedback.textContent = `${result.users?.length || 0} acessos cadastrados.`;
  } catch (error) {
    elements.userList.innerHTML = '<div class="empty-state"><h3>Sem acessos</h3><p>Nao foi possivel carregar os acessos.</p></div>';
    elements.userFeedback.textContent = error.message || "Erro ao carregar acessos.";
  }
}

function renderUsers(users) {
  elements.userList.innerHTML = "";
  if (users.length === 0) {
    elements.userList.innerHTML = '<div class="empty-state"><h3>Sem acessos</h3><p>Cadastra o primeiro acesso acima.</p></div>';
    return;
  }

  for (const sector of ["Gestao", "Sala", "Cozinha"]) {
    const sectorUsers = users.filter((user) => user.sector === sector).sort((a, b) => a.name.localeCompare(b.name));
    if (sectorUsers.length === 0) continue;

    const section = document.createElement("section");
    section.className = "user-sector";
    section.innerHTML = `<h3>${sector}</h3>`;

    for (const user of sectorUsers) {
      const row = document.createElement("article");
      row.className = `user-row${user.active ? "" : " paused"}`;
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(user.name)}</strong>
          <span>${escapeHtml(user.username)}</span>
        </div>
        <div>
          <strong>${escapeHtml(user.sector)}</strong>
          <span>${escapeHtml(userRoleLabel(user.role))}</span>
        </div>
        <span class="status-pill ${user.active ? "status-ok" : "status-low"}">${user.active ? "Ativo" : "Pausado"}</span>
        <div class="row-actions">
          <button class="icon-button" data-action="edit-user" data-id="${escapeHtml(user.id)}" type="button">Editar</button>
          <button class="icon-button" data-action="reset-user-password" data-id="${escapeHtml(user.id)}" type="button">Senha</button>
          <button class="icon-button" data-action="toggle-user" data-id="${escapeHtml(user.id)}" data-active="${user.active ? "false" : "true"}" type="button">${user.active ? "Pausar" : "Ativar"}</button>
          <button class="icon-button danger" data-action="delete-user" data-id="${escapeHtml(user.id)}" type="button">Excluir</button>
        </div>
      `;
      row.dataset.user = JSON.stringify(user);
      section.appendChild(row);
    }

    elements.userList.appendChild(section);
  }
}

function userRoleLabel(role) {
  if (role === "admin") return "Administrador";
  if (role === "manager") return "Gestor - acesso total";
  return "Funcionario";
}

async function fetchTimeRecords() {
  if (!elements.timeRecordList) return;
  const date = elements.timeRecordDate.value || todayDateText();
  elements.timeRecordList.innerHTML = '<div class="empty-state"><h3>A carregar ponto</h3><p>A consultar os registos do dia.</p></div>';

  try {
    const response = await fetch(`/api/time-records?date=${encodeURIComponent(date)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao carregar ponto.");
    timeRecords = result.records || [];
    renderTimeRecords();
  } catch (error) {
    timeRecords = [];
    elements.timeRecordSummary.innerHTML = "";
    elements.timeRecordList.innerHTML = `<div class="empty-state"><h3>Sem ponto</h3><p>${escapeHtml(error.message || "Nao foi possivel carregar o ponto.")}</p></div>`;
  }
}

function renderTimeRecords() {
  const records = [...timeRecords].sort((a, b) => {
    const sectorCompare = String(a.employeeSector || "").localeCompare(String(b.employeeSector || ""));
    if (sectorCompare !== 0) return sectorCompare;
    return String(a.employeeName || "").localeCompare(String(b.employeeName || ""));
  });
  const completed = records.filter((record) => Boolean(record.entryAt && record.exitAt)).length;
  const inLunch = records.filter((record) => Boolean(record.lunchStartAt && !record.lunchEndAt)).length;
  const open = records.filter((record) => Boolean(record.entryAt && !record.exitAt)).length;

  elements.timeRecordSummary.innerHTML = `
    <article class="time-summary-card">
      <span>Funcionários com ponto</span>
      <strong>${formatNumber(records.length)}</strong>
    </article>
    <article class="time-summary-card">
      <span>Em serviço</span>
      <strong>${formatNumber(open)}</strong>
    </article>
    <article class="time-summary-card">
      <span>Em almoço</span>
      <strong>${formatNumber(inLunch)}</strong>
    </article>
    <article class="time-summary-card">
      <span>Dias fechados</span>
      <strong>${formatNumber(completed)}</strong>
    </article>
  `;

  elements.timeRecordList.innerHTML = "";
  if (records.length === 0) {
    elements.timeRecordList.innerHTML = '<div class="empty-state"><h3>Sem registos de ponto</h3><p>Ainda ninguém registou ponto nesta data.</p></div>';
    return;
  }

  records.forEach((record) => elements.timeRecordList.appendChild(renderTimeRecordRow(record)));
}

function renderTimeRecordRow(record) {
  const status = timeRecordStatus(record);
  const row = document.createElement("article");
  row.className = "time-record-row";
  row.innerHTML = `
    <div class="time-record-person">
      <strong>${escapeHtml(record.employeeName || "Funcionario")}</strong>
      <span>${escapeHtml(record.employeeSector || "Sem setor")} | ${escapeHtml(record.employeeUsername || "sem utilizador")}</span>
      <span>${escapeHtml(timeLocationText(record.lastLocation))}</span>
    </div>
    <div class="time-record-cell">
      <span>Entrada</span>
      <strong>${formatTime(record.entryAt)}</strong>
    </div>
    <div class="time-record-cell">
      <span>Pausa almoço</span>
      <strong>${formatTime(record.lunchStartAt)}</strong>
    </div>
    <div class="time-record-cell">
      <span>Retorno almoço</span>
      <strong>${formatTime(record.lunchEndAt)}</strong>
    </div>
    <div class="time-record-cell">
      <span>Saída</span>
      <strong>${formatTime(record.exitAt)}</strong>
    </div>
    <span class="time-status ${status.className}">${escapeHtml(status.label)}</span>
  `;
  return row;
}

function timeRecordStatus(record) {
  if (record.entryAt && record.exitAt) return { label: "Dia fechado", className: "complete" };
  if (record.lunchStartAt && !record.lunchEndAt) return { label: "Em almoço", className: "lunch" };
  if (record.entryAt) return { label: "Em serviço", className: "open" };
  return { label: "Sem entrada", className: "missing" };
}

function timeLocationText(location) {
  if (!location) return "Sem validação geográfica";
  if (location.status === "inside") {
    const distance = Number.isFinite(Number(location.distanceMeters)) ? `${Math.round(Number(location.distanceMeters))} m da loja` : "dentro da loja";
    const accuracy = Number.isFinite(Number(location.accuracyMeters)) ? `precisão ${Math.round(Number(location.accuracyMeters))} m` : "";
    return [`Localização validada`, distance, accuracy].filter(Boolean).join(" | ");
  }
  if (location.status === "outside") return "Tentativa fora da loja";
  if (location.status === "low_accuracy") return "GPS com baixa precisão";
  return "Sem validação geográfica";
}

async function saveUser(event) {
  event.preventDefault();
  const payload = {
    id: elements.userId.value,
    name: elements.userName.value.trim(),
    username: elements.userUsername.value.trim(),
    sector: elements.userSector.value,
    role: elements.userRole.value,
    password: elements.userPassword.value,
    active: elements.userActive.checked,
  };

  try {
    const response = await fetch("/api/users/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao guardar acesso.");
    renderUsers(result.users || []);
    elements.userFeedback.textContent = `Acesso de ${payload.name} guardado.`;
    resetUserForm();
  } catch (error) {
    elements.userFeedback.textContent = error.message || "Erro ao guardar acesso.";
  }
}

function handleUserAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "edit-user") return fillUserForm(button.closest(".user-row"));
  if (button.dataset.action === "reset-user-password") return resetUserPassword(id);
  if (button.dataset.action === "toggle-user") return toggleUser(id, button.dataset.active === "true");
  if (button.dataset.action === "delete-user") return deleteUser(id);
}

function fillUserForm(row) {
  if (!row?.dataset.user) return;
  const user = JSON.parse(row.dataset.user);
  elements.userId.value = user.id;
  elements.userName.value = user.name;
  elements.userUsername.value = user.username;
  elements.userSector.value = user.sector;
  elements.userRole.value = user.role || "employee";
  elements.userPassword.value = "";
  elements.userActive.checked = user.active;
  elements.userFeedback.textContent = `A editar acesso de ${user.name}.`;
  elements.userName.focus();
}

function resetUserForm() {
  elements.userForm.reset();
  elements.userId.value = "";
  elements.userSector.value = "Sala";
  elements.userRole.value = "employee";
  elements.userActive.checked = true;
}

async function resetUserPassword(id) {
  try {
    const response = await fetch("/api/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao reiniciar senha.");
    renderUsers(result.users || []);
    elements.userFeedback.textContent = `Senha provisoria: ${result.temporaryPassword}`;
  } catch (error) {
    elements.userFeedback.textContent = error.message || "Erro ao reiniciar senha.";
  }
}

async function toggleUser(id, active) {
  try {
    const response = await fetch("/api/users/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao alterar acesso.");
    renderUsers(result.users || []);
    elements.userFeedback.textContent = active ? "Acesso ativado." : "Acesso pausado.";
  } catch (error) {
    elements.userFeedback.textContent = error.message || "Erro ao alterar acesso.";
  }
}

async function deleteUser(id) {
  const confirmed = confirm("Excluir este funcionario e bloquear o acesso?");
  if (!confirmed) return;

  try {
    const response = await fetch("/api/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao excluir funcionario.");
    renderUsers(result.users || []);
    elements.userFeedback.textContent = "Funcionario excluido.";
  } catch (error) {
    elements.userFeedback.textContent = error.message || "Erro ao excluir funcionario.";
  }
}

function renderPurchaseSuggestions() {
  const suggestions = getPurchaseSuggestions();
  prunePurchaseSelection(suggestions);
  const selectedSuggestions = suggestions.filter((item) => selectedPurchaseIds.has(item.id));
  elements.purchaseCountInfo.textContent = `${suggestions.length} produtos sugeridos`;
  elements.selectedPurchaseInfo.textContent = `${selectedSuggestions.length} selecionados`;
  elements.selectAllPurchasesButton.disabled = suggestions.length === 0;
  elements.clearPurchasesButton.disabled = selectedSuggestions.length === 0;
  elements.copyPurchasesButton.disabled = selectedSuggestions.length === 0;

  if (suggestions.length === 0) {
    elements.purchaseList.innerHTML = '<div class="empty-state"><h3>Sem solicitações sugeridas</h3><p>Depois da contagem, os produtos abaixo do minimo aparecem aqui.</p></div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const group of groupBySupplier(suggestions)) {
    const section = document.createElement("section");
    section.className = "purchase-group";
    const selectedInGroup = group.items.filter((item) => selectedPurchaseIds.has(item.id)).length;
    section.innerHTML = `
      <div class="purchase-heading">
        <div>
          <h3>${escapeHtml(group.supplier)}</h3>
          <span>${group.items.length} produtos | ${selectedInGroup} selecionados</span>
        </div>
        <span class="order-pill">${escapeHtml(orderDaySummary(group.items))}</span>
      </div>
    `;

    const rows = document.createElement("div");
    rows.className = "purchase-items";
    for (const item of group.items) {
      const quantityToOrder = getQuantityToOrder(item);
      const row = document.createElement("label");
      row.className = "purchase-row";
      row.innerHTML = `
        <input data-purchase-id="${escapeHtml(item.id)}" type="checkbox" ${selectedPurchaseIds.has(item.id) ? "checked" : ""} />
        <div class="purchase-product">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml([item.category, item.orderDay].filter(Boolean).join(" | "))}</span>
        </div>
        <div class="purchase-numbers">
          <span>Atual</span>
          <strong>${formatNumber(item.quantity)} ${escapeHtml(item.unit)}</strong>
        </div>
        <div class="purchase-numbers">
          <span>Comprar</span>
          <strong>${formatNumber(quantityToOrder)} ${escapeHtml(item.unit)}</strong>
        </div>
        <div class="purchase-numbers">
          <span>Min. semanal</span>
          <strong>${formatNumber(item.minimum)} ${escapeHtml(item.unit)}</strong>
        </div>
      `;
      rows.appendChild(row);
    }

    section.appendChild(rows);
    fragment.appendChild(section);
  }

  elements.purchaseList.innerHTML = "";
  elements.purchaseList.appendChild(fragment);
}

function renderMovements() {
  elements.movementList.innerHTML = "";
  if (movements.length === 0) {
    elements.movementList.innerHTML = '<div class="empty-state"><h3>Sem movimentos</h3><p>Entradas, saidas e contagens aparecem aqui.</p></div>';
    return;
  }

  for (const movement of movements.slice(0, 16)) {
    const entry = document.createElement("article");
    entry.className = "movement";
    const label = movement.type === "in" ? "Entrada" : movement.type === "out" ? "Saida" : "Contagem";
    entry.innerHTML = `
      <span class="movement-type ${movement.type}">${label}</span>
      <div>
        <strong>${escapeHtml(movement.itemName)}</strong>
        <small>${escapeHtml(movement.reason || "Sem motivo informado")}</small>
      </div>
      <small>${formatNumber(movement.quantity)} ${movement.unit} | ${formatDateTime(movement.createdAt)}</small>
    `;
    elements.movementList.appendChild(entry);
  }
}

async function fetchCountRecords() {
  elements.countRecordList.innerHTML = '<div class="empty-state"><h3>A carregar histórico de contagens</h3></div>';

  try {
    const response = await fetch("/api/count-records");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao carregar histórico de contagens.");
    countRecords = result.records || [];
    countHistoryEntries = Array.isArray(result.entries) ? result.entries : flattenClientCountRecords(countRecords);
    renderCountHistory();
    renderManagerDashboard();
  } catch (error) {
    elements.countRecordList.innerHTML = `<div class="empty-state"><h3>Sem histórico</h3><p>${escapeHtml(error.message || "Nao foi possivel carregar o historico.")}</p></div>`;
    renderManagerDashboard();
  }
}

function renderCountHistory() {
  const entries = getFilteredCountHistory();
  renderCountHistorySummary(entries);
  renderCountProductHistory(entries);
  renderCountRecords(entries);
}

function getFilteredCountHistory() {
  const product = normalizeText(elements.countFilterProduct.value);
  const employee = normalizeText(elements.countFilterEmployee.value);
  const sector = normalizeText(elements.countFilterSector.value);
  const supplier = normalizeText(elements.countFilterSupplier.value);
  const date = elements.countFilterDate.value;
  const mode = elements.countHistoryMode.value;
  if (mode === "employee" && !employee) return [];

  return countHistoryEntries
    .filter((entry) => !date || entry.countDate === date)
    .filter((entry) => !product || normalizeText(entry.productName).includes(product))
    .filter((entry) => !employee || normalizeText(`${entry.employeeName} ${entry.employeeUsername}`).includes(employee))
    .filter((entry) => !sector || normalizeText(entry.sector).includes(sector))
    .filter((entry) => !supplier || normalizeText(entry.supplier).includes(supplier))
    .filter((entry) => mode !== "employee" || normalizeText(`${entry.employeeName} ${entry.employeeUsername}`).includes(employee))
    .sort((a, b) => String(b.countDate || "").localeCompare(String(a.countDate || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function renderCountHistorySummary(entries) {
  const latest = entries[0];
  const products = new Set(entries.map((entry) => entry.productName)).size;
  const employees = new Set(entries.map((entry) => entry.employeeName || entry.employeeUsername).filter(Boolean)).size;
  elements.countHistorySummary.innerHTML = `
    <article>
      <span>Registos</span>
      <strong>${formatNumber(entries.length)}</strong>
    </article>
    <article>
      <span>Produtos</span>
      <strong>${formatNumber(products)}</strong>
    </article>
    <article>
      <span>Funcionários</span>
      <strong>${formatNumber(employees)}</strong>
    </article>
    <article>
      <span>Última contagem</span>
      <strong>${latest ? formatDate(latest.countDate) : "-"}</strong>
      <small>${latest ? escapeHtml(latest.employeeName || latest.employeeUsername || "Sem responsável") : ""}</small>
    </article>
  `;
}

function renderCountProductHistory(entries) {
  if (!selectedCountProduct) {
    elements.countProductHistory.hidden = true;
    elements.countProductHistory.innerHTML = "";
    return;
  }

  const productEntries = countHistoryEntries
    .filter((entry) => entry.productName === selectedCountProduct)
    .sort((a, b) => String(b.countDate || "").localeCompare(String(a.countDate || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const latest = productEntries[0];
  elements.countProductHistory.hidden = false;
  elements.countProductHistory.innerHTML = `
    <div class="count-product-history-head">
      <div>
        <span>Histórico do produto</span>
        <strong>${escapeHtml(selectedCountProduct)}</strong>
        <small>Último responsável: ${escapeHtml(latest?.employeeName || latest?.employeeUsername || "-")} | Última quantidade: ${latest ? `${formatNumber(latest.quantity)} ${escapeHtml(latest.unit)}` : "-"}</small>
      </div>
      <button class="button ghost" data-action="close-product-history" type="button">Fechar</button>
    </div>
    <div class="count-product-history-list">
      ${productEntries.slice(0, 12).map((entry) => `
        <article>
          <strong>${formatDate(entry.countDate)} - ${formatNumber(entry.quantity)} ${escapeHtml(entry.unit)}</strong>
          <span>${escapeHtml(entry.employeeName || entry.employeeUsername || "Sem responsável")} | ${escapeHtml(entry.sector || "Sem setor")} | ${escapeHtml(entry.supplier || "Sem fornecedor")}</span>
          ${entry.observation ? `<p>${escapeHtml(entry.observation)}</p>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function renderCountRecords(entries) {
  elements.countRecordList.innerHTML = "";
  if (entries.length === 0) {
    elements.countRecordList.innerHTML = '<div class="empty-state"><h3>Sem contagens</h3><p>Quando um funcionario guardar contagens, o historico aparece aqui.</p></div>';
    return;
  }

  const isAdmin = elements.countHistoryMode.value === "admin";
  for (const record of groupCountEntries(entries).slice(0, 80)) {
    const entry = document.createElement("article");
    entry.className = "count-record";
    const items = record.items;
    const requestedCount = items.filter((item) => item.requested).length;
    const itemRows = items
      .map(
        (item) => `
          <div class="count-record-item${item.requested ? " requested" : ""}">
            <input data-record-id="${escapeHtml(item.recordId)}" data-record-item-id="${escapeHtml(item.itemRecordId)}" type="checkbox" ${item.requested ? "checked" : ""} ${item.source === "notion" ? "disabled" : ""} />
            <span>
              <button class="link-button" data-action="show-product-history" data-product="${escapeHtml(item.productName)}" type="button">${escapeHtml(item.productName)}</button>
              <small>${formatNumber(item.quantity)} ${escapeHtml(item.unit)} | ${escapeHtml(item.supplier || "Sem fornecedor")}${item.observation ? ` | ${escapeHtml(item.observation)}` : ""}${item.requested ? " | solicitado" : ""}</small>
            </span>
            ${isAdmin && item.source !== "notion" ? `
              <div class="count-record-admin">
                <input data-edit-quantity="${escapeHtml(item.id)}" type="number" min="0" step="1" value="${escapeHtml(item.quantity)}" />
                <input data-edit-observation="${escapeHtml(item.id)}" type="text" value="${escapeHtml(item.observation || "")}" placeholder="Observação" />
                <button class="button ghost" data-action="save-count-correction" data-entry-id="${escapeHtml(item.id)}" type="button">Corrigir</button>
              </div>
            ` : ""}
          </div>
        `,
      )
      .join("");
    entry.innerHTML = `
      <div class="count-record-head">
        <div>
          <strong>${escapeHtml(record.employeeName || record.employeeUsername || "Funcionario")}</strong>
          <span>${escapeHtml(record.sector || "Sem setor")} | ${formatDate(record.countDate)} | ${formatDateTime(record.createdAt)}</span>
        </div>
        <button class="button ghost" data-action="share-count-record" data-record-id="${escapeHtml(record.id)}" type="button">Abrir no Notas</button>
      </div>
      <div class="count-record-products">
        <strong>${record.itemCount || items.length} produtos preenchidos | ${requestedCount} solicitados</strong>
        <div class="count-record-items">${itemRows}</div>
      </div>
    `;
    elements.countRecordList.appendChild(entry);
  }
}

async function handleCountRecordChange(event) {
  const input = event.target.closest("[data-record-item-id]");
  if (!input) return;
  await updateCountRecordItemStatus(input.dataset.recordId, input.dataset.recordItemId, input.checked);
}

function handleCountRecordClick(event) {
  const productButton = event.target.closest("button[data-action='show-product-history']");
  if (productButton) {
    selectedCountProduct = productButton.dataset.product || "";
    renderCountHistory();
    elements.countProductHistory.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const closeButton = event.target.closest("button[data-action='close-product-history']");
  if (closeButton) {
    selectedCountProduct = "";
    renderCountHistory();
    return;
  }

  const correctionButton = event.target.closest("button[data-action='save-count-correction']");
  if (correctionButton) return saveCountCorrection(correctionButton.dataset.entryId);

  const shareButton = event.target.closest("button[data-action='share-count-record']");
  if (shareButton) shareCountRecordToNotes(shareButton.dataset.recordId);
}

async function updateCountRecordItemStatus(recordId, itemId, requested) {
  try {
    const response = await fetch("/api/count-records/item-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, itemId, requested }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao atualizar produto.");
    countRecords = result.records || [];
    countHistoryEntries = flattenClientCountRecords(countRecords);
    renderCountHistory();
  } catch (error) {
    setSyncStatus(error.message || "Nao foi possivel marcar como solicitado.", "error");
    fetchCountRecords();
  }
}

async function saveCountCorrection(entryId) {
  const entry = countHistoryEntries.find((item) => item.id === entryId);
  if (!entry) return;
  const quantityInput = elements.countRecordList.querySelector(`[data-edit-quantity="${cssEscape(entryId)}"]`);
  const observationInput = elements.countRecordList.querySelector(`[data-edit-observation="${cssEscape(entryId)}"]`);

  try {
    const response = await fetch("/api/count-records/item-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: entry.recordId,
        itemId: entry.itemRecordId,
        quantity: quantityInput?.value || entry.quantity,
        observation: observationInput?.value || "",
        correctedBy: "Administrador",
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao corrigir contagem.");
    countRecords = result.records || [];
    countHistoryEntries = Array.isArray(result.entries) ? result.entries : flattenClientCountRecords(countRecords);
    setSyncStatus("Contagem corrigida pelo perfil administrador.", "success");
    renderCountHistory();
  } catch (error) {
    setSyncStatus(error.message || "Nao foi possivel corrigir a contagem.", "error");
  }
}

function clearCountHistoryFilters() {
  elements.countFilterProduct.value = "";
  elements.countFilterEmployee.value = "";
  elements.countFilterSector.value = "";
  elements.countFilterSupplier.value = "";
  elements.countFilterDate.value = "";
  selectedCountProduct = "";
  renderCountHistory();
}

function flattenClientCountRecords(records) {
  return (records || []).flatMap((record) =>
    (record.items || []).map((item) => ({
      id: `${record.id}:${item.id}`,
      recordId: record.id,
      itemRecordId: item.id,
      source: record.source || "local",
      countDate: record.countDate || "",
      createdAt: record.createdAt || "",
      productId: item.itemId || "",
      productName: item.name || "Produto sem nome",
      quantity: numberValue(item.quantity),
      unit: item.unit || "",
      employeeName: record.employeeName || record.employeeUsername || "",
      employeeUsername: record.employeeUsername || "",
      observation: item.observation || "",
      sector: record.employeeSector || record.sector || "",
      supplier: item.supplier || "",
      requested: item.requested === true,
      expiresAt: item.expiresAt || "",
    })),
  );
}

function groupCountEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = [entry.recordId, entry.countDate, entry.employeeName, entry.createdAt].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        id: entry.recordId,
        countDate: entry.countDate,
        createdAt: entry.createdAt,
        employeeName: entry.employeeName,
        employeeUsername: entry.employeeUsername,
        sector: entry.sector,
        items: [],
      });
    }
    groups.get(key).items.push(entry);
  }
  return [...groups.values()];
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value));
  return String(value).replace(/"/g, '\\"');
}

async function shareCountRecordToNotes(recordId) {
  let record = countRecords.find((entry) => entry.id === recordId);
  if (!record) {
    const group = groupCountEntries(countHistoryEntries).find((entry) => entry.id === recordId);
    if (group) {
      record = {
        id: group.id,
        countDate: group.countDate,
        createdAt: group.createdAt,
        employeeName: group.employeeName,
        employeeSector: group.sector,
        items: group.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          requested: item.requested,
          expiresAt: item.expiresAt,
        })),
      };
    }
  }
  if (!record) return;
  const text = buildCountRecordNoteText(record);

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Lista de produtos solicitados",
        text,
      });
      setSyncStatus("Lista enviada. No iPhone, escolhe Notas; se necessario, toca no botao de checklist do Notas.", "success");
      return;
    }
    await navigator.clipboard.writeText(text);
    setSyncStatus("Lista copiada em formato checklist. No iPhone, cola no app Notas.", "success");
  } catch {
    await navigator.clipboard.writeText(text).catch(() => {});
    setSyncStatus("Se o Notas nao abrir automaticamente, a checklist ficou preparada para copiar.", "warning");
  }
}

function buildCountRecordNoteText(record) {
  const items = Array.isArray(record.items) ? record.items : [];
  const requestedItems = items.filter((item) => item.requested);
  const list = requestedItems.length ? requestedItems : items;
  const lines = [
    `Lista de produtos - ${formatDate(record.countDate)}`,
    `Responsavel: ${record.employeeName || record.employeeUsername || "Funcionario"}`,
    `Setor: ${record.employeeSector || "Sem setor"}`,
    "",
  ];

  for (const item of list) {
    lines.push(`${item.requested ? "☑" : "☐"} ${item.name}: ${formatNumber(item.quantity)} ${item.unit}${item.expiresAt ? ` | validade ${formatDate(item.expiresAt)}` : ""}`);
  }

  if (requestedItems.length === 0) {
    lines.push("", "Nenhum item foi marcado como solicitado ainda.");
  }

  return lines.join("\n");
}

function saveActivity(event) {
  event.preventDefault();
  const now = new Date().toISOString();
  const id = elements.activityId.value || crypto.randomUUID();
  const activity = normalizeActivity({
    id,
    title: elements.activityTitle.value,
    type: elements.activityType.value,
    status: elements.activityStatus.value,
    notes: elements.activityNotes.value,
    createdAt: now,
    updatedAt: now,
  });

  const index = activities.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    activity.createdAt = activities[index].createdAt || activity.createdAt;
    activities[index] = activity;
  } else {
    activities.unshift(activity);
  }

  persistActivities();
  renderActivities();
  renderManagerDashboard();
  resetActivityForm();
  setSyncStatus("Atividade guardada.", "success");
}

function renderActivities() {
  const pending = activities.filter((activity) => activity.status === "Pendente").length;
  const resolved = activities.filter((activity) => activity.status === "Resolvido").length;
  const ideas = activities.filter((activity) => activity.type === "ideia").length;
  const pendencies = activities.filter((activity) => activity.type === "pendencia").length;

  elements.activitySummary.innerHTML = `
    <article><strong>${pending}</strong><span>Pendentes</span></article>
    <article><strong>${resolved}</strong><span>Resolvidos</span></article>
    <article><strong>${ideas}</strong><span>Ideias</span></article>
    <article><strong>${pendencies}</strong><span>Pendências</span></article>
  `;

  elements.activityList.innerHTML = "";
  if (activities.length === 0) {
    elements.activityList.innerHTML = '<div class="empty-state"><h3>Sem atividades</h3><p>Regista ideias e pendências para acompanhar a operação.</p></div>';
    return;
  }

  const groups = [
    { type: "ideia", title: "Ideias", empty: "Sem ideias registadas." },
    { type: "pendencia", title: "Pendências", empty: "Sem pendências registadas." },
  ];

  for (const group of groups) {
    const groupActivities = activities
      .filter((activity) => activity.type === group.type)
      .sort((a, b) => activityStatusPriority(a.status) - activityStatusPriority(b.status) || b.updatedAt.localeCompare(a.updatedAt));
    const section = document.createElement("section");
    section.className = "activity-group";
    section.innerHTML = `
      <div class="activity-group-heading">
        <div>
          <h3>${group.title}</h3>
          <span>${groupActivities.length} atividades</span>
        </div>
      </div>
    `;
    const list = document.createElement("div");
    list.className = "activity-group-list";

    if (groupActivities.length === 0) {
      list.innerHTML = `<div class="mini-empty">${group.empty}</div>`;
    } else {
      for (const activity of groupActivities) list.appendChild(renderActivityRow(activity));
    }

    section.appendChild(list);
    elements.activityList.appendChild(section);
  }
}

function renderActivityRow(activity) {
  const row = document.createElement("article");
  row.className = `activity-row ${activity.status === "Resolvido" ? "resolved" : "pending"}`;
  row.innerHTML = `
    <div class="activity-main">
      <strong>${escapeHtml(activity.title)}</strong>
      <span>${activity.notes ? escapeHtml(activity.notes) : "Sem observações"} | ${formatDateTime(activity.updatedAt)}</span>
    </div>
    <label class="activity-status-select">
      Estado
      <select data-activity-status="${escapeHtml(activity.id)}">
        <option value="Pendente" ${activity.status === "Pendente" ? "selected" : ""}>Pendente</option>
        <option value="Resolvido" ${activity.status === "Resolvido" ? "selected" : ""}>Resolvido</option>
      </select>
    </label>
    <div class="row-actions">
      <button class="icon-button" data-action="edit-activity" data-id="${escapeHtml(activity.id)}" type="button">Editar</button>
      <button class="icon-button danger" data-action="delete-activity" data-id="${escapeHtml(activity.id)}" type="button">Apagar</button>
    </div>
  `;
  return row;
}

function handleActivityStatusChange(event) {
  const select = event.target.closest("[data-activity-status]");
  if (!select) return;
  const activity = activities.find((entry) => entry.id === select.dataset.activityStatus);
  if (!activity) return;
  activity.status = normalizeActivityStatus(select.value);
  activity.updatedAt = new Date().toISOString();
  persistActivities();
  renderActivities();
  renderManagerDashboard();
}

function handleActivityAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const activity = activities.find((entry) => entry.id === button.dataset.id);
  if (!activity) return;

  if (button.dataset.action === "edit-activity") {
    fillActivityForm(activity);
    return;
  }

  if (button.dataset.action === "delete-activity") {
    deleteActivity(activity);
  }
}

function fillActivityForm(activity) {
  elements.activityId.value = activity.id;
  elements.activityTitle.value = activity.title;
  elements.activityType.value = activity.type;
  elements.activityStatus.value = activity.status;
  elements.activityNotes.value = activity.notes || "";
  elements.activityTitle.focus();
}

function deleteActivity(activity) {
  if (!confirm(`Apagar "${activity.title}" da lista de atividades?`)) return;
  activities = activities.filter((entry) => entry.id !== activity.id);
  persistActivities();
  renderActivities();
  renderManagerDashboard();
}

function clearResolvedActivities() {
  const resolvedCount = activities.filter((activity) => activity.status === "Resolvido").length;
  if (resolvedCount === 0) return;
  if (!confirm(`Apagar ${resolvedCount} atividades resolvidas?`)) return;
  activities = activities.filter((activity) => activity.status !== "Resolvido");
  persistActivities();
  renderActivities();
  renderManagerDashboard();
}

function resetActivityForm() {
  elements.activityForm.reset();
  elements.activityId.value = "";
  elements.activityType.value = "ideia";
  elements.activityStatus.value = "Pendente";
}

function persistActivities() {
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
}

function seedActivityList() {
  if (localStorage.getItem(ACTIVITIES_SEED_KEY) === "1") return;

  const now = new Date().toISOString();
  const existingTitles = new Set(activities.map((activity) => normalizeText(activity.title)));
  const seededActivities = ACTIVITY_SEED_ITEMS.filter((activity) => !existingTitles.has(normalizeText(activity.title))).map((activity) =>
    normalizeActivity({
      type: "pendencia",
      status: "Pendente",
      createdAt: now,
      updatedAt: now,
      ...activity,
    }),
  );

  if (seededActivities.length > 0) {
    activities = [...seededActivities, ...activities];
    persistActivities();
  }

  localStorage.setItem(ACTIVITIES_SEED_KEY, "1");
}

function normalizeActivity(activity) {
  const now = new Date().toISOString();
  return {
    id: activity.id || crypto.randomUUID(),
    title: String(activity.title || "").trim() || "Atividade sem título",
    type: normalizeActivityType(activity.type),
    status: normalizeActivityStatus(activity.status),
    notes: String(activity.notes || "").trim(),
    createdAt: activity.createdAt || now,
    updatedAt: activity.updatedAt || activity.createdAt || now,
  };
}

function normalizeActivityType(type) {
  return normalizeText(type).startsWith("pend") ? "pendencia" : "ideia";
}

function normalizeActivityStatus(status) {
  return normalizeText(status).startsWith("resol") ? "Resolvido" : "Pendente";
}

function activityStatusPriority(status) {
  return status === "Resolvido" ? 1 : 0;
}

function getPurchaseSuggestions() {
  return items
    .filter(shouldSuggestPurchase)
    .sort((a, b) => {
      const supplierOrder = supplierLabel(a).localeCompare(supplierLabel(b));
      if (supplierOrder !== 0) return supplierOrder;
      return b.minimum - b.quantity - (a.minimum - a.quantity) || a.name.localeCompare(b.name);
    });
}

function isRupture(item) {
  return numberValue(item.quantity) <= 0;
}

function isPurchaseDueToday(item) {
  return matchesOrderDay(item.orderDay, todayOrderDay());
}

function todayOrderDay() {
  const days = ["Domingo", "Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado"];
  return days[new Date().getDay()];
}

function matchesOrderDay(value, expectedDay) {
  const expected = normalizeOrderDayName(expectedDay);
  return String(value || "")
    .split(/[,;/]+/)
    .map(normalizeOrderDayName)
    .some((day) => day && day === expected);
}

function normalizeOrderDayName(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized.startsWith("seg") || normalized === "2" || normalized === "segunda") return "segunda-feira";
  if (normalized.startsWith("ter") || normalized === "3" || normalized === "terca") return "terca-feira";
  if (normalized.startsWith("qua") || normalized === "4" || normalized === "quarta") return "quarta-feira";
  if (normalized.startsWith("qui") || normalized === "5" || normalized === "quinta") return "quinta-feira";
  if (normalized.startsWith("sex") || normalized === "6" || normalized === "sexta") return "sexta-feira";
  if (normalized.startsWith("sab") || normalized === "7" || normalized === "sabado") return "sabado";
  if (normalized.startsWith("dom") || normalized === "1" || normalized === "domingo") return "domingo";
  return normalized;
}

function latestItemUpdateText() {
  const latest = items
    .map((item) => new Date(item.updatedAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return latest ? formatDateTime(new Date(latest).toISOString()) : "";
}

function shouldSuggestPurchase(item) {
  return getQuantityToOrder(item) > 0 || isTruthyPurchaseFlag(item.shouldBuy);
}

function getQuantityToOrder(item) {
  if (item.orderQuantity > 0) return item.orderQuantity;
  if (item.quantity < item.minimum) return roundQuantity(item.minimum - item.quantity);
  if (isTruthyPurchaseFlag(item.shouldBuy) && item.dailyMinimum > 0) return item.dailyMinimum;
  return 0;
}

function isTruthyPurchaseFlag(value) {
  const normalized = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return ["sim", "yes", "true", "comprar", "1"].includes(normalized);
}

function groupBySupplier(entries) {
  const groups = new Map();
  for (const item of entries) {
    const supplier = supplierLabel(item);
    if (!groups.has(supplier)) groups.set(supplier, []);
    groups.get(supplier).push(item);
  }
  return [...groups.entries()].map(([supplier, groupItems]) => ({ supplier, items: groupItems }));
}

function supplierLabel(item) {
  return item.supplier?.trim() || "Sem fornecedor";
}

function orderDaySummary(entries) {
  const days = [...new Set(entries.map((item) => item.orderDay).filter(Boolean))];
  if (days.length === 0) return "Sem dia definido";
  if (days.length === 1) return days[0];
  return days.join(", ");
}

function handlePurchaseSelection(event) {
  const input = event.target.closest("[data-purchase-id]");
  if (!input) return;
  if (input.checked) selectedPurchaseIds.add(input.dataset.purchaseId);
  else selectedPurchaseIds.delete(input.dataset.purchaseId);
  persistPurchaseSelection();
  renderPurchaseSuggestions();
}

function selectAllPurchases() {
  for (const item of getPurchaseSuggestions()) selectedPurchaseIds.add(item.id);
  persistPurchaseSelection();
  renderPurchaseSuggestions();
}

function clearPurchaseSelection() {
  selectedPurchaseIds.clear();
  elements.purchaseOutput.hidden = true;
  elements.purchaseOutput.value = "";
  persistPurchaseSelection();
  renderPurchaseSuggestions();
}

async function copySelectedPurchases() {
  const selected = getPurchaseSuggestions().filter((item) => selectedPurchaseIds.has(item.id));
  if (selected.length === 0) return;
  const text = buildPurchaseText(selected);
  elements.purchaseOutput.value = text;

  try {
    await navigator.clipboard.writeText(text);
    elements.purchaseOutput.hidden = true;
    setSyncStatus(`${selected.length} produtos copiados para a area de transferencia.`, "success");
  } catch {
    elements.purchaseOutput.hidden = false;
    elements.purchaseOutput.focus();
    elements.purchaseOutput.select();
    copyTextFallback(text);
    setSyncStatus(`${selected.length} produtos preparados abaixo para copiar manualmente.`, "warning");
  }
}

function buildPurchaseText(selected) {
  const lines = [`Lista de solicitações - ${new Date().toLocaleDateString("pt-PT")}`];
  for (const group of groupBySupplier(selected)) {
    lines.push("", `Fornecedor: ${group.supplier}`);
    for (const item of group.items) {
      lines.push(`- ${item.name}: pedir ${formatNumber(getQuantityToOrder(item))} ${item.unit} (atual ${formatNumber(item.quantity)} | min. semanal ${formatNumber(item.minimum)})`);
    }
  }
  return lines.join("\n");
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function prunePurchaseSelection(suggestions) {
  const validIds = new Set(suggestions.map((item) => item.id));
  let changed = false;
  for (const id of selectedPurchaseIds) {
    if (!validIds.has(id)) {
      selectedPurchaseIds.delete(id);
      changed = true;
    }
  }
  if (changed) persistPurchaseSelection();
}

function persistPurchaseSelection() {
  localStorage.setItem(PURCHASE_SELECTION_KEY, JSON.stringify([...selectedPurchaseIds]));
}

function renderControlTypeOptions() {
  const options = uniqueControlTypeOptions([...REQUIRED_CONTROL_TYPES, ...items.flatMap((item) => splitControlTypes(item.controlType))]);
  populateControlTypeSelect(elements.managerControlTypeFilter, options, { all: true });
  populateControlTypeSelect(elements.controlType, options, { blank: true });
}

function populateControlTypeSelect(select, options, config = {}) {
  if (!select) return;
  const currentValue = select.value || (config.all ? "all" : "");
  select.innerHTML = config.all ? '<option value="all">Todos</option>' : '<option value="">Sem tipo definido</option>';
  for (const option of options) {
    const entry = document.createElement("option");
    entry.value = option.value;
    entry.textContent = option.label;
    select.appendChild(entry);
  }
  const selectedOption = options.find((option) => option.value === currentValue || option.label === currentValue || sameControlType(option.value, currentValue));
  select.value = selectedOption?.value || (config.all ? "all" : "");
}

function uniqueControlTypeOptions(values) {
  const options = new Map();
  for (const value of values) {
    const option = controlTypeOptionMeta(value);
    if (!option?.key) continue;
    if (!options.has(option.key)) options.set(option.key, option);
  }
  return [...options.values()].sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label));
}

function controlTypeOptionMeta(value) {
  const label = String(value || "").trim();
  if (!label) return null;
  const override = CONTROL_TYPE_OPTION_OVERRIDES.find((entry) => entry.aliases.some((alias) => normalizeText(alias) === normalizeText(label)));
  if (override) return override;
  return {
    key: normalizeText(label),
    value: label,
    label,
    priority: 100,
  };
}

function getFilteredItems() {
  const term = elements.searchInput.value.trim().toLowerCase();
  const status = elements.statusFilter.value;
  const category = elements.categoryFilter.value;
  const controlType = elements.managerControlTypeFilter.value;
  const salaFrequency = elements.managerSalaFrequencyFilter.value;

  return items
    .filter((item) => {
      const haystack = `${item.name} ${item.category} ${item.supplier} ${item.controlType} ${item.notes}`.toLowerCase();
      return !term || haystack.includes(term);
    })
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => matchesControlTypeFilter(item, controlType))
    .filter((item) => matchesSalaFrequencyFilter(item, salaFrequency))
    .filter((item) => {
      if (status === "all") return true;
      if (status === "low") return isLowStock(item);
      if (status === "expiring") return isExpiringSoon(item);
      return !isLowStock(item) && !isExpiringSoon(item);
    })
    .sort((a, b) => getStatus(b).priority - getStatus(a).priority || a.name.localeCompare(b.name));
}

function matchesControlTypeFilter(item, filter) {
  if (filter === "all") return true;
  return splitControlTypes(item.controlType).some((entry) => sameControlType(entry, filter));
}

function matchesSalaFrequencyFilter(item, filter) {
  if (filter === "all") return true;
  const frequency = filter === "weekly" ? "Semanal" : "Diário";
  return splitControlTypes(item.controlType).some((entry) => sameControlType(entry, "Controle da Sala")) &&
    splitControlTypes(item.controlType).some((entry) => sameControlType(entry, frequency));
}

function controlTypeDisplay(value) {
  const labels = splitControlTypes(value).map((entry) => controlTypeOptionMeta(entry)?.label || entry).filter(Boolean);
  return labels.length ? labels.join(", ") : "-";
}

function ensureControlTypeOption(select, value) {
  const label = String(value || "").trim();
  if (!select || !label) return;
  const hasOption = [...select.options].some((option) => option.value === label);
  if (hasOption) return;
  const option = document.createElement("option");
  option.value = label;
  option.textContent = controlTypeDisplay(label);
  select.appendChild(option);
}

function splitControlTypes(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sameControlType(left, right) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
}

function clearManagerFilters() {
  elements.searchInput.value = "";
  elements.statusFilter.value = "all";
  elements.categoryFilter.value = "all";
  elements.managerControlTypeFilter.value = "all";
  elements.managerSalaFrequencyFilter.value = "all";
  render();
}

async function checkNotionStatus() {
  try {
    const response = await fetch("/api/notion/status");
    if (!response.ok) return;
    const status = await response.json();
    if (!status.configured) {
      setSyncStatus("Configura o Notion no ficheiro .env para ativar a sincronizacao.", "warning");
      return;
    }
    await pullFromNotion({ automatic: true });
  } catch {
    setSyncStatus("Abre a app pelo server.js para ativar a sincronizacao com Notion.", "warning");
  }
}

async function pullFromNotion(options = {}) {
  elements.pullButton.disabled = true;
  setSyncStatus(options.automatic ? "A carregar base do Notion..." : "A carregar produtos do Notion...", "warning");

  try {
    const response = await fetch("/api/notion/items");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha ao carregar do Notion");
    items = result.items.map(normalizeItem);
    persist();
    render();
    const database = result.databaseTitle ? ` de "${result.databaseTitle}"` : "";
    const prefix = options.automatic ? "Base carregada automaticamente" : "Notion carregado";
    setSyncStatus(`${prefix}${database}: ${items.length} produtos na app.`, "success");
  } catch (error) {
    setSyncStatus(error.message || "Nao foi possivel carregar do Notion.", "error");
  } finally {
    elements.pullButton.disabled = false;
  }
}

async function syncWithNotion(options = {}) {
  elements.syncButton.disabled = true;
  setSyncStatus(options.message || "A sincronizar produtos com o Notion...", "warning");

  try {
    const response = await fetch("/api/notion/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Falha na sincronizacao");
    const skipped = result.skippedProperties?.length ? ` Campos ignorados: ${result.skippedProperties.join(", ")}.` : "";
    const database = result.databaseTitle ? ` em "${result.databaseTitle}"` : "";
    if (!options.quietSuccess) setSyncStatus(`Notion sincronizado${database}: ${result.created} criados, ${result.updated} atualizados.${skipped}`, "success");
    return result;
  } catch (error) {
    setSyncStatus(error.message || "Nao foi possivel sincronizar com o Notion.", "error");
    if (options.throwOnError) throw error;
    return null;
  } finally {
    elements.syncButton.disabled = false;
  }
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const content = String(reader.result || "");
      const imported = file.name.toLowerCase().endsWith(".csv") ? importCsvItems(content) : importJsonItems(content);
      items = mergeItems(imported.items);
      movements = imported.movements || movements;
      activities = imported.activities || activities;
      persist();
      persistActivities();
      render();
      renderActivities();
      renderManagerDashboard();
    } catch {
      alert("Nao foi possivel importar este ficheiro.");
    } finally {
      elements.importFile.value = "";
    }
  });
  reader.readAsText(file);
}

function exportData() {
  const payload = JSON.stringify({ items, movements, activities, exportedAt: new Date().toISOString() }, null, 2);
  downloadBlob(new Blob([payload], { type: "application/json" }), `estoque-acai-${new Date().toISOString().slice(0, 10)}.json`);
}

function downloadCsvTemplate() {
  const headers = ["produto", "categoria", "unidade", "quantidade", "minimo_semanal", "minimo_diario", "custo_unitario", "validade", "fornecedor", "dia_de_pedido", "observacoes"];
  const example = ["Polpa de acai", "Ingredientes", "kg", "20", "10", "2", "4.80", "2026-07-30", "Fornecedor principal", "Segunda-feira", "Congelador 1"];
  const csv = [headers, example].map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "modelo-estoque-acai.csv");
}

function importJsonItems(content) {
  const data = JSON.parse(content);
  if (!Array.isArray(data.items)) throw new Error("Formato invalido");
  return {
    items: data.items.map(normalizeItem),
    movements: Array.isArray(data.movements) ? data.movements : [],
    activities: Array.isArray(data.activities) ? data.activities.map(normalizeActivity) : undefined,
  };
}

function importCsvItems(content) {
  const rows = parseCsv(content).filter((row) => row.some((cell) => cell.trim()));
  const headers = rows[0].map(normalizeHeader);
  const importedItems = rows.slice(1).map((row) => rowToItem(headers, row)).filter((item) => item.name.trim());
  return { items: importedItems };
}

function rowToItem(headers, row) {
  const data = {};
  headers.forEach((header, index) => {
    data[header] = row[index] || "";
  });
  return normalizeItem({
    name: data.produto || data.nome || data.name,
    category: data.categoria || data.category,
    unit: data.unidade || data.unit,
    quantity: data.quantidade || data.quantity || data.qtd,
    minimum: data.minimo_semanal || data.estoque_minimo || data.minimo || data.minimum || data.min,
    dailyMinimum: data.minimo_diario || data.daily_minimum || data.dailyminimum,
    unitCost: data.custo_unitario || data.custo || data.unit_cost || data.unitcost,
    expiresAt: normalizeDate(data.validade || data.expires_at || data.expiresat),
    supplier: data.fornecedor || data.supplier,
    orderDay: data.dia_de_pedido || data.dia_pedido || data.order_day || data.orderday,
    notes: data.observacoes || data.observacao || data.notes,
  });
}

function mergeItems(importedItems) {
  const byName = new Map(items.map((item) => [item.name.trim().toLowerCase(), item]));
  const merged = [...items];
  for (const importedItem of importedItems) {
    const existing = byName.get(importedItem.name.trim().toLowerCase());
    if (existing) {
      const index = merged.findIndex((item) => item.id === existing.id);
      merged[index] = { ...importedItem, id: existing.id, updatedAt: new Date().toISOString() };
    } else {
      merged.unshift(importedItem);
    }
  }
  return merged;
}

function clearMovements() {
  const confirmed = confirm("Limpar todo o historico de movimentos?");
  if (!confirmed) return;
  movements = [];
  persist();
  renderMovements();
}

function getStatus(item) {
  if (isExpired(item)) return { label: "Vencido", className: "status-expired", priority: 4 };
  if (isLowStock(item) && isExpiringSoon(item)) return { label: "Minimo e validade", className: "status-expiring", priority: 3 };
  if (isLowStock(item)) return { label: "Abaixo do minimo", className: "status-low", priority: 2 };
  if (isExpiringSoon(item)) return { label: "A vencer", className: "status-expiring", priority: 1 };
  return { label: "OK", className: "status-ok", priority: 0 };
}

function isLowStock(item) {
  return item.quantity <= item.minimum;
}

function isExpiringSoon(item) {
  if (!item.expiresAt) return false;
  const days = daysUntil(item.expiresAt);
  return days >= 0 && days <= EXPIRING_DAYS;
}

function isExpired(item) {
  return item.expiresAt ? daysUntil(item.expiresAt) < 0 : false;
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

function setSyncStatus(message, tone) {
  elements.syncBanner.hidden = false;
  elements.syncBanner.className = `sync-banner ${tone}`;
  elements.syncStatus.textContent = message;
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

function setField(id, value) {
  document.querySelector(`#${id}`).value = value ?? "";
}

function numberValue(value) {
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(/\.(?=\d{3}(,|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundQuantity(value) {
  return Math.round(value * 100) / 100;
}

function daysUntil(dateText) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateText}T00:00:00`);
  return Math.ceil((date - today) / 86400000);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value);
}

function formatBytes(value) {
  const bytes = numberValue(value);
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024)} KB`;
  return `${formatNumber(bytes / (1024 * 1024))} MB`;
}

function formatDate(dateText) {
  if (!dateText) return "Sem data";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(`${dateText}T00:00:00`));
}

function formatDateTime(dateText) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(dateText));
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

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseCsv(content) {
  const separator = detectCsvSeparator(content);
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (char === '"' && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === separator && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  rows.push(row);
  return rows;
}

function detectCsvSeparator(content) {
  const firstLine = content.split(/\r?\n/, 1)[0] || "";
  return firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";
}

function normalizeHeader(value) {
  return String(value).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value) {
  const text = String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}
