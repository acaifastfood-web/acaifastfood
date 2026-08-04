if (window.location.protocol === "file:") {
  window.location.replace("http://localhost:4173/pedidos.html");
}

const AUTH_KEY = "acai-fast-food-auth-v1";
let menu = window.ACAI_MENU || [];

let auth = loadAuth();
let cart = [];
let activeCategory = "Todos";
let sending = false;
let serviceMode = "";
let selectedTable = 0;
let occupiedTables = new Set();
let tableOrders = [];
let selectedPaymentItems = new Set();
let customizingProductId = "";
const customizableCategories = new Set(["Açaí", "Pastéis", "Combos", "Hambúrgueres", "Tapiocas", "Batidos"]);

const acaiCustomization = {
  complements: ["Leite em pó", "Granola tradicional", "Granola de chocolate", "Paçoca", "M&Ms", "Chocoballs", "Nutella", "Oreo"],
  fruits: ["Banana", "Morango", "Kiwi", "Manga"],
  toppings: ["Leite condensado", "Morango", "Chocolate", "Caramelo", "Mel"],
};
const naturalJuiceFlavors = ["Abacaxi", "Abacaxi com Hortelã", "Acerola", "Cajá", "Cajú", "Cupuaçú", "Goiaba", "Graviola", "Manga", "Maracujá", "Morango"];

const elements = {
  authScreen: document.querySelector("#authScreen"), loginForm: document.querySelector("#loginForm"),
  loginUserSelect: document.querySelector("#loginUserSelect"), loginUsername: document.querySelector("#loginUsername"), loginPassword: document.querySelector("#loginPassword"), loginStatus: document.querySelector("#loginStatus"),
  operatorName: document.querySelector("#operatorName"), logoutButton: document.querySelector("#logoutButton"),
  categoryTabs: document.querySelector("#categoryTabs"), productGrid: document.querySelector("#productGrid"), productSearch: document.querySelector("#productSearch"),
  cartItems: document.querySelector("#cartItems"), cartCount: document.querySelector("#cartCount"), cartTotal: document.querySelector("#cartTotal"),
  orderChannel: document.querySelector("#orderChannel"), orderTable: document.querySelector("#orderTable"), customerName: document.querySelector("#customerName"),
  paymentMethod: document.querySelector("#paymentMethod"), paymentMethodField: document.querySelector("#paymentMethodField"), orderNotes: document.querySelector("#orderNotes"), sendOrderButton: document.querySelector("#sendOrderButton"),
  orderStatus: document.querySelector("#orderStatus"), toast: document.querySelector("#toast"),
  serviceTabs: document.querySelector(".service-tabs"), tablesPanel: document.querySelector("#tablesPanel"), tableGrid: document.querySelector("#tableGrid"), tablesSummary: document.querySelector("#tablesSummary"),
  orderChannelField: document.querySelector("#orderChannelField"), orderTableField: document.querySelector("#orderTableField"), serviceRequiredMessage: document.querySelector("#serviceRequiredMessage"),
  acaiCustomizationDialog: document.querySelector("#acaiCustomizationDialog"), acaiCustomizationForm: document.querySelector("#acaiCustomizationForm"), customAcaiName: document.querySelector("#customAcaiName"), customAcaiPrice: document.querySelector("#customAcaiPrice"),
  complementsOptions: document.querySelector("#complementsOptions"), fruitsOptions: document.querySelector("#fruitsOptions"), toppingsOptions: document.querySelector("#toppingsOptions"), cancelAcaiCustomization: document.querySelector("#cancelAcaiCustomization"),
  customDialogEyebrow: document.querySelector("#customDialogEyebrow"), customProductExtra: document.querySelector("#customProductExtra"), customProductComment: document.querySelector("#customProductComment"), acaiOnlyGroups: document.querySelectorAll(".acai-only-group"),
  comboConfiguration: document.querySelector("#comboConfiguration"), comboMainField: document.querySelector("#comboMainField"), comboMainOption: document.querySelector("#comboMainOption"),
  comboDrinkOption: document.querySelector("#comboDrinkOption"), comboAcaiSizeOption: document.querySelector("#comboAcaiSizeOption"), comboQuantityNote: document.querySelector("#comboQuantityNote"),
  juiceFlavorGroup: document.querySelector("#juiceFlavorGroup"), juiceFlavorOptions: document.querySelector("#juiceFlavorOptions"), customExtraOption: document.querySelector("#customExtraOption"),
  chantillyChoiceGroup: document.querySelector("#chantillyChoiceGroup"), chantillyChoiceOptions: document.querySelector("#chantillyChoiceOptions"),
  viewTableAccountButton: document.querySelector("#viewTableAccountButton"), transferTableButton: document.querySelector("#transferTableButton"),
  tableAccountDialog: document.querySelector("#tableAccountDialog"), tableAccountTitle: document.querySelector("#tableAccountTitle"), tableOrderCount: document.querySelector("#tableOrderCount"),
  tableAccountTotal: document.querySelector("#tableAccountTotal"), tableAccountOrders: document.querySelector("#tableAccountOrders"), tableAccountMessage: document.querySelector("#tableAccountMessage"),
  transferDestination: document.querySelector("#transferDestination"), confirmTableTransferButton: document.querySelector("#confirmTableTransferButton"),
  closeTableAccountButton: document.querySelector("#closeTableAccountButton"), continueTableButton: document.querySelector("#continueTableButton"),
  closeTableAccountFinalButton: document.querySelector("#closeTableAccountFinalButton"),
  tablePaymentDue: document.querySelector("#tablePaymentDue"), tablePaymentMethod: document.querySelector("#tablePaymentMethod"),
  tableCashReceivedField: document.querySelector("#tableCashReceivedField"), tableCashReceived: document.querySelector("#tableCashReceived"),
  tableChangeResult: document.querySelector("#tableChangeResult"), tableChangeAmount: document.querySelector("#tableChangeAmount"),
  toggleAllPaymentItems: document.querySelector("#toggleAllPaymentItems"),
  tablePaymentMethodField: document.querySelector("#tablePaymentMethodField"), mixedPaymentToggle: document.querySelector("#mixedPaymentToggle"),
  mixedPaymentFields: document.querySelector("#mixedPaymentFields"), mixedPaymentTotal: document.querySelector("#mixedPaymentTotal"), mixedPaymentRemaining: document.querySelector("#mixedPaymentRemaining"),
};

elements.loginForm.addEventListener("submit", login);
elements.loginUserSelect.addEventListener("change", selectLoginUser);
elements.logoutButton.addEventListener("click", logout);
elements.productSearch.addEventListener("input", renderProducts);
elements.categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderCategories(); renderProducts();
});
elements.productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-product-id]");
  if (button) addProduct(button.dataset.productId);
});
elements.cartItems.addEventListener("click", handleCartAction);
elements.sendOrderButton.addEventListener("click", sendOrder);
elements.serviceTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-service-mode]");
  if (button) setServiceMode(button.dataset.serviceMode);
});
elements.tableGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-table-number]");
  if (button) selectTable(Number(button.dataset.tableNumber));
});
elements.viewTableAccountButton.addEventListener("click", () => openTableAccountDialog(false));
elements.transferTableButton.addEventListener("click", () => openTableAccountDialog(true));
elements.closeTableAccountButton.addEventListener("click", closeTableAccountDialog);
elements.continueTableButton.addEventListener("click", closeTableAccountDialog);
elements.confirmTableTransferButton.addEventListener("click", transferTableConsumption);
elements.closeTableAccountFinalButton.addEventListener("click", closeSelectedTableAccount);
elements.tablePaymentMethod.addEventListener("change", updateTablePayment);
elements.tableCashReceived.addEventListener("input", updateTablePayment);
elements.toggleAllPaymentItems.addEventListener("click", toggleAllPaymentItems);
elements.tableAccountOrders.addEventListener("change", handlePaymentItemSelection);
elements.mixedPaymentToggle.addEventListener("change", updateTablePayment);
elements.mixedPaymentFields.addEventListener("input", updateTablePayment);
elements.acaiCustomizationForm.addEventListener("change", updateCustomizationLimits);
elements.acaiCustomizationForm.addEventListener("click", handleCustomizationQuantityClick);
elements.acaiCustomizationForm.addEventListener("submit", confirmAcaiCustomization);
elements.cancelAcaiCustomization.addEventListener("click", closeAcaiCustomization);

renderCategories(); renderProducts(); renderTables(); renderCustomizationOptions(); setServiceMode(""); renderCart(); loadLoginUsers(); restoreSession();
setInterval(loadTableStatus, 5000);

async function loadLoginUsers() {
  try {
    const response = await fetch("/api/users");
    const result = await response.json();
    const users = Array.isArray(result.users) ? result.users.filter((user) => user.active !== false) : [];
    const sectors = [...new Set(users.map((user) => user.sector || "Equipa"))];
    elements.loginUserSelect.innerHTML = '<option value="">Escolher funcionário</option>';
    for (const sector of sectors) {
      const group = document.createElement("optgroup"); group.label = sector;
      for (const user of users.filter((entry) => (entry.sector || "Equipa") === sector)) {
        const option = document.createElement("option"); option.value = user.username; option.textContent = user.name || user.username; group.appendChild(option);
      }
      elements.loginUserSelect.appendChild(group);
    }
  } catch { elements.loginUserSelect.innerHTML = '<option value="">Digitar utilizador manualmente</option>'; }
}

function selectLoginUser() {
  if (!elements.loginUserSelect.value) return;
  elements.loginUsername.value = elements.loginUserSelect.value;
  elements.loginPassword.focus();
}

async function restoreSession() {
  if (!auth?.token) return showLogin();
  try {
    const result = await api("/api/auth/session", { authToken: auth.token });
    auth.user = result.user; saveAuth(); showApp();
  } catch { auth = null; saveAuth(); showLogin("A sessão terminou. Entra novamente."); }
}

async function login(event) {
  event.preventDefault();
  setStatus(elements.loginStatus, "A entrar…");
  try {
    const result = await api("/api/auth/login", { username: elements.loginUsername.value.trim(), password: elements.loginPassword.value });
    auth = { token: result.token, user: result.user }; saveAuth(); elements.loginPassword.value = ""; showApp();
  } catch (error) { setStatus(elements.loginStatus, error.message, "error"); }
}

async function logout() {
  const token = auth?.token; auth = null; saveAuth(); showLogin();
  if (token) { try { await api("/api/auth/logout", { authToken: token }); } catch {} }
}

function showLogin(message = "") {
  elements.authScreen.hidden = false; elements.operatorName.textContent = "Sem sessão"; setStatus(elements.loginStatus, message);
  setTimeout(() => elements.loginUsername.focus(), 50);
}

function showApp() {
  elements.authScreen.hidden = true;
  elements.operatorName.textContent = auth?.user?.name || auth?.user?.username || "Operador";
  setStatus(elements.loginStatus, "");
  loadManagedMenu();
  loadTableStatus();
}

async function loadManagedMenu() {
  if (!auth?.token) return;
  try {
    const result = await api("/api/menu/list", { authToken: auth.token });
    if (!Array.isArray(result.items) || !result.items.length) return;
    menu = result.items.filter((item) => item.active !== false);
    if (activeCategory !== "Todos" && !menu.some((item) => item.category === activeCategory)) activeCategory = "Todos";
    renderCategories(); renderProducts();
  } catch (error) {
    if (error.status === 401) { auth = null; saveAuth(); showLogin(error.message); }
  }
}

function setServiceMode(mode) {
  serviceMode = ["tables", "counter"].includes(mode) ? mode : "";
  elements.serviceTabs.querySelectorAll("[data-service-mode]").forEach((button) => {
    const active = button.dataset.serviceMode === serviceMode;
    button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active));
  });
  elements.tablesPanel.hidden = serviceMode !== "tables";
  elements.orderChannelField.hidden = serviceMode === "tables";
  elements.paymentMethodField.hidden = serviceMode === "tables";
  elements.orderTableField.hidden = !serviceMode;
  elements.orderTable.readOnly = serviceMode === "tables";
  if (serviceMode === "tables") {
    elements.orderChannel.value = "counter";
    elements.orderTable.value = selectedTable ? `Mesa ${selectedTable}` : "";
    elements.orderTable.placeholder = "Selecione uma mesa acima";
  } else if (serviceMode === "counter") {
    selectedTable = 0;
    elements.orderChannel.value = "takeaway";
    elements.orderTable.value = "";
    elements.orderTable.placeholder = "Nome ou referência";
  } else {
    selectedTable = 0;
    elements.orderTable.value = "";
    elements.orderChannelField.hidden = true;
  }
  renderTables(); updateServiceGate(); renderCart();
}

function selectTable(tableNumber) {
  selectedTable = Math.min(50, Math.max(1, Number(tableNumber || 0)));
  elements.orderTable.value = `Mesa ${selectedTable}`;
  renderTables(); updateServiceGate(); renderCart();
  if (ordersForTable(selectedTable).length) openTableAccountDialog(false);
}

function serviceIsReady() {
  return serviceMode === "counter" || (serviceMode === "tables" && selectedTable > 0);
}

function updateServiceGate() {
  const ready = serviceIsReady();
  document.body.classList.toggle("service-not-selected", !ready);
  elements.serviceRequiredMessage.classList.toggle("ready", ready);
  if (serviceMode === "tables" && !selectedTable) elements.serviceRequiredMessage.textContent = "Escolha uma das 50 mesas para liberar o menu.";
  else if (serviceMode === "tables") {
    const account = ordersForTable(selectedTable);
    const accountTotal = unpaidAccountTotal(account);
    elements.serviceRequiredMessage.textContent = account.length
      ? `Mesa ${selectedTable} · ${account.length} pedido(s) · consumo ${money(accountTotal)}. Pode acrescentar produtos.`
      : `Mesa ${selectedTable} selecionada. Pode iniciar o pedido.`;
  }
  else if (serviceMode === "counter") elements.serviceRequiredMessage.textContent = "Retirada | Entrega selecionada. Escolha o tipo e inicie o pedido.";
  else elements.serviceRequiredMessage.textContent = "Selecione uma mesa ou Retirada | Entrega antes de iniciar o pedido.";
}

function renderTables() {
  elements.tableGrid.innerHTML = Array.from({ length: 50 }, (_, index) => {
    const number = index + 1;
    const occupied = occupiedTables.has(number);
    return `<button class="table-button${occupied ? " occupied" : ""}${selectedTable === number ? " selected" : ""}" data-table-number="${number}" type="button" aria-label="Mesa ${number}${occupied ? ", ocupada" : ", livre"}">${number}</button>`;
  }).join("");
  const occupiedCount = occupiedTables.size;
  elements.tablesSummary.textContent = `${50 - occupiedCount} livres · ${occupiedCount} ocupadas`;
  const selectedHasAccount = selectedTable > 0 && ordersForTable(selectedTable).length > 0;
  elements.viewTableAccountButton.disabled = !selectedHasAccount;
  elements.transferTableButton.disabled = !selectedHasAccount;
}

async function loadTableStatus() {
  if (!auth?.token) return;
  try {
    const result = await api("/api/tables/list", { authToken: auth.token });
    tableOrders = (result.orders || []).filter((order) => tableNumberFromOrder(order) > 0);
    occupiedTables = new Set(tableOrders.map(tableNumberFromOrder));
    renderTables(); updateServiceGate();
    if (elements.tableAccountDialog.open) renderTableAccount();
  } catch (error) {
    if (error.status === 401) { auth = null; saveAuth(); showLogin(error.message); }
  }
}

function tableNumberFromOrder(order) {
  const match = String(order?.table || "").match(/mesa\s*(\d+)/i);
  const number = Number(match?.[1] || 0);
  return number >= 1 && number <= 50 ? number : 0;
}

function ordersForTable(tableNumber) {
  return tableOrders.filter((order) => tableNumberFromOrder(order) === Number(tableNumber));
}

function openTableAccountDialog(focusTransfer = false) {
  if (!selectedTable || !ordersForTable(selectedTable).length) return showToast("Esta mesa ainda não tem consumo registado.");
  if (!elements.tableAccountDialog.open) {
    selectedPaymentItems.clear();
    elements.tablePaymentMethod.value = "";
    elements.tableCashReceived.value = "";
    elements.mixedPaymentToggle.checked = false;
    elements.mixedPaymentFields.querySelectorAll("input[data-payment-part]").forEach((input) => { input.value = ""; });
  }
  renderTableAccount();
  if (!elements.tableAccountDialog.open) elements.tableAccountDialog.showModal();
  if (focusTransfer) setTimeout(() => elements.transferDestination.focus(), 50);
}

function renderTableAccount() {
  const account = ordersForTable(selectedTable);
  const total = unpaidAccountTotal(account);
  elements.tableAccountTitle.textContent = `Mesa ${selectedTable}`;
  elements.tableOrderCount.textContent = account.length;
  elements.tableAccountTotal.textContent = money(total);
  elements.tablePaymentDue.textContent = money(total);
  elements.tableAccountMessage.textContent = "";
  elements.tableAccountOrders.innerHTML = account.length ? account.map((order) => {
    const activeItems = (order.items || []).filter((item) => item.itemStatus !== "cancelled");
    const unpaidTotal = activeItems.reduce((sum, item) => sum + unpaidItemQuantity(item) * item.unitPrice, 0);
    return `<article class="table-account-order"><div><strong>Pedido #${order.number}</strong><small>${escapeHtml(order.createdBy || "Operador")} · ${formatOrderTime(order.createdAt)}</small></div><ul>${activeItems.map((item) => {
      const remaining = unpaidItemQuantity(item); const key = `${order.id}:${item.id}`;
      return `<li class="${remaining ? "" : "item-already-paid"}"><label>${remaining ? `<input type="checkbox" data-payment-key="${key}" ${selectedPaymentItems.has(key) ? "checked" : ""}>` : '<span class="paid-item-mark">PAGO</span>'}<span>${remaining || item.quantity}× ${escapeHtml(item.name)}</span></label><b>${remaining ? money(remaining * item.unitPrice) : "—"}</b></li>`;
    }).join("")}</ul><strong class="table-order-total">Por pagar ${money(unpaidTotal)}</strong></article>`;
  }).join("") : '<div class="cart-empty">Sem consumo ativo nesta mesa.</div>';
  elements.transferDestination.innerHTML = Array.from({ length: 50 }, (_, index) => index + 1).filter((number) => number !== selectedTable).map((number) => `<option value="${number}">Mesa ${number}${occupiedTables.has(number) ? " · ocupada (unir consumos)" : " · livre"}</option>`).join("");
  updateTablePayment(); updateToggleAllLabel();
}

async function transferTableConsumption() {
  const fromTable = selectedTable;
  const toTable = Number(elements.transferDestination.value);
  if (!fromTable || !toTable) return;
  const destinationOccupied = occupiedTables.has(toTable);
  const message = destinationOccupied
    ? `A Mesa ${toTable} já tem consumo. Deseja unir todo o consumo da Mesa ${fromTable} nesta mesa?`
    : `Transferir todo o consumo da Mesa ${fromTable} para a Mesa ${toTable}?`;
  if (!confirm(message)) return;
  elements.confirmTableTransferButton.disabled = true;
  elements.tableAccountMessage.textContent = "A transferir consumo…";
  try {
    const result = await api("/api/orders/transfer-table", { authToken: auth.token, fromTable, toTable });
    tableOrders = tableOrders.map((order) => tableNumberFromOrder(order) === fromTable ? { ...order, table: `Mesa ${toTable}` } : order);
    selectedTable = toTable; elements.orderTable.value = `Mesa ${toTable}`;
    occupiedTables = new Set(tableOrders.map(tableNumberFromOrder));
    renderTables(); updateServiceGate(); renderTableAccount();
    showToast(`${result.movedCount} pedido(s) transferido(s) para a Mesa ${toTable}`);
  } catch (error) { elements.tableAccountMessage.textContent = error.message; }
  finally { elements.confirmTableTransferButton.disabled = false; }
}

function closeTableAccountDialog() {
  if (elements.tableAccountDialog.open) elements.tableAccountDialog.close();
}

async function closeSelectedTableAccount() {
  const account = ordersForTable(selectedTable);
  if (!account.length) return;
  const selectedEntries = selectedPaymentEntries();
  const total = selectedEntries.reduce((sum, entry) => sum + unpaidItemQuantity(entry.item) * entry.item.unitPrice, 0);
  if (!selectedEntries.length) { elements.tableAccountMessage.textContent = "Selecione os itens que deseja pagar."; return; }
  const mixed = elements.mixedPaymentToggle.checked;
  const paymentMethod = mixed ? "mixed" : elements.tablePaymentMethod.value;
  const paymentParts = mixedPaymentParts();
  const cashReceived = Number(elements.tableCashReceived.value || 0);
  if (!mixed && !paymentMethod) { elements.tableAccountMessage.textContent = "Escolha a forma de pagamento."; return; }
  if (mixed && Math.abs(paymentParts.reduce((sum, part) => sum + part.amount, 0) - total) > 0.009) { elements.tableAccountMessage.textContent = "Distribua exatamente o total selecionado entre as formas de pagamento."; return; }
  const cashPart = mixed ? paymentParts.find((part) => part.method === "cash")?.amount || 0 : (paymentMethod === "cash" ? total : 0);
  if (cashPart && cashReceived < cashPart) { elements.tableAccountMessage.textContent = "O valor recebido é inferior à parcela em DINHEIRO."; elements.tableCashReceived.focus(); return; }
  const methodLabel = mixed ? paymentParts.map((part) => paymentMethodLabel(part.method)).join(" + ") : paymentMethodLabel(paymentMethod);
  if (!confirm(`Confirmar pagamento de ${selectedEntries.length} item(ns), no valor de ${money(total)}, por ${methodLabel}?`)) return;
  elements.closeTableAccountFinalButton.disabled = true;
  try {
    const result = await api("/api/tables/pay-items", { authToken: auth.token, tableNumber: selectedTable, paymentMethod: mixed ? "" : paymentMethod, cashReceived, paymentParts: mixed ? paymentParts.map((part) => ({ ...part, cashReceived: part.method === "cash" ? cashReceived : 0 })) : undefined, items: selectedEntries.map((entry) => ({ orderId: entry.order.id, itemId: entry.item.id })) });
    tableOrders = tableOrders.filter((order) => tableNumberFromOrder(order) !== selectedTable);
    if (!result.tableClosed) tableOrders.push(...result.orders);
    occupiedTables = new Set(tableOrders.map(tableNumberFromOrder)); selectedPaymentItems.clear();
    elements.tablePaymentMethod.value = ""; elements.tableCashReceived.value = ""; elements.mixedPaymentToggle.checked = false;
    elements.mixedPaymentFields.querySelectorAll("input[data-payment-part]").forEach((input) => { input.value = ""; });
    if (result.tableClosed) closeTableAccountDialog(); else renderTableAccount();
    renderTables(); updateServiceGate();
    showToast(result.payment.changeDue > 0 ? `${result.payment.methodLabel} · Troco ${money(result.payment.changeDue)}` : `Pagamento concluído por ${result.payment.methodLabel}`);
  } catch (error) { elements.tableAccountMessage.textContent = error.message; }
  finally { updateTablePayment(); }
}

function updateTablePayment() {
  const total = selectedPaymentEntries().reduce((sum, entry) => sum + unpaidItemQuantity(entry.item) * entry.item.unitPrice, 0);
  const mixed = elements.mixedPaymentToggle.checked;
  const parts = mixedPaymentParts();
  const distributed = parts.reduce((sum, part) => sum + part.amount, 0);
  const cashPart = mixed ? parts.find((part) => part.method === "cash")?.amount || 0 : 0;
  const isCash = mixed ? cashPart > 0 : elements.tablePaymentMethod.value === "cash";
  const received = Number(elements.tableCashReceived.value || 0);
  elements.tablePaymentMethodField.hidden = mixed;
  elements.mixedPaymentFields.hidden = !mixed;
  elements.tableCashReceivedField.hidden = !isCash;
  elements.tableChangeResult.hidden = !isCash;
  elements.tableChangeAmount.textContent = money(Math.max(0, received - (mixed ? cashPart : total)));
  elements.tablePaymentDue.textContent = money(total);
  elements.mixedPaymentTotal.textContent = money(distributed);
  elements.mixedPaymentRemaining.textContent = money(Math.max(0, total - distributed));
  const paymentReady = mixed ? parts.length > 1 && Math.abs(distributed - total) <= 0.009 : Boolean(elements.tablePaymentMethod.value);
  elements.closeTableAccountFinalButton.disabled = total <= 0 || !paymentReady || (isCash && received < (mixed ? cashPart : total));
}

function paymentMethodLabel(method) {
  return { cash: "DINHEIRO", multibanco: "MULTIBANCO", mbway: "MB WAY", account: "CONTA" }[method] || "";
}
function mixedPaymentParts() { return [...elements.mixedPaymentFields.querySelectorAll("input[data-payment-part]")].map((input) => ({ method: input.dataset.paymentPart, amount: Math.max(0, Number(input.value || 0)) })).filter((part) => part.amount > 0); }

function unpaidItemQuantity(item) { return Math.max(0, Number(item?.quantity || 0) - Number(item?.paidQuantity || 0)); }
function unpaidAccountTotal(account = ordersForTable(selectedTable)) { return account.reduce((sum, order) => sum + (order.items || []).filter((item) => item.itemStatus !== "cancelled").reduce((itemSum, item) => itemSum + unpaidItemQuantity(item) * item.unitPrice, 0), 0); }
function selectedPaymentEntries() {
  const entries = [];
  for (const order of ordersForTable(selectedTable)) for (const item of order.items || []) if (selectedPaymentItems.has(`${order.id}:${item.id}`) && item.itemStatus !== "cancelled" && unpaidItemQuantity(item)) entries.push({ order, item });
  return entries;
}
function handlePaymentItemSelection(event) {
  const input = event.target.closest("input[data-payment-key]"); if (!input) return;
  if (input.checked) selectedPaymentItems.add(input.dataset.paymentKey); else selectedPaymentItems.delete(input.dataset.paymentKey);
  updateTablePayment(); updateToggleAllLabel();
}
function toggleAllPaymentItems() {
  const available = [];
  for (const order of ordersForTable(selectedTable)) for (const item of order.items || []) if (item.itemStatus !== "cancelled" && unpaidItemQuantity(item)) available.push(`${order.id}:${item.id}`);
  const allSelected = available.length && available.every((key) => selectedPaymentItems.has(key));
  if (allSelected) available.forEach((key) => selectedPaymentItems.delete(key)); else available.forEach((key) => selectedPaymentItems.add(key));
  renderTableAccount();
}
function updateToggleAllLabel() {
  const inputs = [...elements.tableAccountOrders.querySelectorAll("input[data-payment-key]")];
  elements.toggleAllPaymentItems.textContent = inputs.length && inputs.every((input) => input.checked) ? "Limpar seleção" : "Selecionar todos";
}

function formatOrderTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function renderCategories() {
  const categories = ["Todos", ...new Set(menu.map((item) => item.category))];
  elements.categoryTabs.innerHTML = categories.map((category) => `<button class="category-tab${category === activeCategory ? " active" : ""}" data-category="${category}" type="button">${category}</button>`).join("");
}

function renderProducts() {
  const query = normalize(elements.productSearch.value);
  const products = menu.filter((item) => (activeCategory === "Todos" || item.category === activeCategory) && (!query || normalize(`${item.name} ${item.variant}`).includes(query)));
  elements.productGrid.innerHTML = products.length ? products.map((item) => `
    <button class="product-card" data-product-id="${item.id}" type="button">
      <span class="product-icon">${item.icon}</span>
      <span><strong>${item.name}</strong><small>${item.variant}</small></span>
      <span class="product-price">${money(item.price)}</span>
    </button>`).join("") : '<div class="empty-products">Nenhum produto encontrado.</div>';
}

function addProduct(productId) {
  if (!serviceIsReady()) {
    showToast("Seleciona uma mesa ou Retirada | Entrega antes de adicionar produtos.");
    return;
  }
  const product = menu.find((item) => item.id === productId);
  if (!product) return;
  if ((customizableCategories.has(product.category) || product.name === "Sumo natural") && !(product.category === "Combos" && !product.name.startsWith("Combo "))) {
    openProductCustomization(product);
    return;
  }
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) existing.quantity += 1;
  else {
    const center = product.productionCenter || productionCenterForCategory(product.category);
    cart.push({ id: crypto.randomUUID(), productId: product.id, name: product.name, variant: product.variant, productionCenter: center, productionCenters: [center], modifiers: [], notes: "", quantity: 1, unitPrice: product.price });
  }
  renderCart();
}

function renderCustomizationOptions() {
  for (const [group, options] of Object.entries(acaiCustomization)) {
    const container = elements[`${group}Options`];
    container.innerHTML = options.map((option) => `
      <div class="custom-option custom-quantity-option" data-custom-option data-group="${escapeHtml(group)}" data-value="${escapeHtml(option)}" data-quantity="0">
        <span>${escapeHtml(option)}</span>
        <div class="custom-quantity-controls">
          <button data-custom-step="-1" type="button" aria-label="Remover ${escapeHtml(option)}">-</button>
          <b data-custom-quantity>0</b>
          <button data-custom-step="1" type="button" aria-label="Adicionar ${escapeHtml(option)}">+</button>
        </div>
      </div>
    `).join("");
  }
  elements.juiceFlavorOptions.innerHTML = naturalJuiceFlavors.map((flavor) => `<label class="custom-option"><input type="radio" name="juiceFlavor" value="${escapeHtml(flavor)}"><span>${escapeHtml(flavor)}</span></label>`).join("");
}

function openProductCustomization(product) {
  customizingProductId = product.id;
  const isAcai = product.category === "Açaí";
  const isCombo = product.category === "Combos";
  const isJuice = product.name === "Sumo natural";
  const isShake = product.category === "Batidos";
  elements.customDialogEyebrow.textContent = isAcai ? "Personalizar Açaí" : isCombo ? "Configurar combo" : isJuice ? "Escolher sabor" : isShake ? "Configurar batido" : "Personalizar produto";
  elements.customAcaiName.textContent = `${product.name} · ${product.variant.split(" · ")[0]}`;
  elements.customAcaiPrice.textContent = money(product.price);
  elements.acaiCustomizationForm.reset();
  resetCustomizationQuantities();
  elements.comboConfiguration.hidden = !isCombo;
  elements.chantillyChoiceGroup.hidden = !isShake;
  elements.chantillyChoiceOptions.querySelectorAll('input[name="chantillyChoice"]').forEach((input) => { input.disabled = !isShake; });
  elements.acaiOnlyGroups.forEach((group) => { group.hidden = !(isAcai || isCombo); });
  elements.customExtraOption.hidden = isJuice || isShake;
  if (isCombo) configureCombo(product);
  updateCustomizationLimits();
  elements.acaiCustomizationDialog.showModal();
}

function closeAcaiCustomization() {
  customizingProductId = "";
  if (elements.acaiCustomizationDialog.open) elements.acaiCustomizationDialog.close();
}

function updateCustomizationLimits() {
  document.querySelectorAll(".custom-option-group[data-group]").forEach((section) => {
    const group = section.dataset.group;
    const limit = Number(section.dataset.limit);
    const selected = customizationGroupTotal(section);
    const options = [...section.querySelectorAll("[data-custom-option]")];
    options.forEach((option) => {
      const quantity = customizationOptionQuantity(option);
      const minusButton = option.querySelector('[data-custom-step="-1"]');
      const plusButton = option.querySelector('[data-custom-step="1"]');
      const quantityLabel = option.querySelector("[data-custom-quantity]");
      option.classList.toggle("selected", quantity > 0);
      option.classList.toggle("is-disabled", quantity === 0 && selected >= limit);
      if (minusButton) minusButton.disabled = quantity <= 0;
      if (plusButton) plusButton.disabled = selected >= limit;
      if (quantityLabel) quantityLabel.textContent = String(quantity);
    });
    const count = document.querySelector(`#${group}Count`);
    if (count) count.textContent = `${selected}/${limit}`;
  });
  const product = menu.find((item) => item.id === customizingProductId);
  if (product) {
    updateJuiceFlavorVisibility(product);
    elements.customAcaiPrice.textContent = money(product.price + customizationSurcharge(product));
  }
}

function handleCustomizationQuantityClick(event) {
  const button = event.target.closest("button[data-custom-step]");
  if (!button) return;
  const option = button.closest("[data-custom-option]");
  const section = option?.closest(".custom-option-group[data-group]");
  if (!option || !section || section.hidden) return;

  const limit = Number(section.dataset.limit);
  const selected = customizationGroupTotal(section);
  const quantity = customizationOptionQuantity(option);
  const step = Number(button.dataset.customStep || 0);
  const available = Math.max(0, limit - selected);
  const nextQuantity = step > 0
    ? quantity + Math.min(step, available)
    : Math.max(0, quantity + step);

  if (nextQuantity === quantity && step > 0) {
    showToast(`Limite de ${limit} seleções atingido.`);
    return;
  }

  option.dataset.quantity = String(nextQuantity);
  updateCustomizationLimits();
}

function resetCustomizationQuantities() {
  elements.acaiCustomizationForm.querySelectorAll("[data-custom-option]").forEach((option) => {
    option.dataset.quantity = "0";
  });
}

function customizationGroupTotal(section) {
  return [...section.querySelectorAll("[data-custom-option]")]
    .reduce((total, option) => total + customizationOptionQuantity(option), 0);
}

function customizationOptionQuantity(option) {
  return Math.max(0, Number(option?.dataset.quantity || 0));
}

function updateJuiceFlavorVisibility(product) {
  const showFlavors = product.name === "Sumo natural" || (product.category === "Combos" && elements.comboDrinkOption.value === "Sumo natural");
  elements.juiceFlavorGroup.hidden = !showFlavors;
  elements.juiceFlavorOptions.querySelectorAll('input[name="juiceFlavor"]').forEach((input) => { input.disabled = !showFlavors; });
}

function comboMetadata(product) {
  if (product.name === "Combo Pastel") return { category: "Pastéis", drinkCount: 1, acaiCount: 1 };
  if (product.name === "Combo Tapioca") return { category: "Tapiocas", drinkCount: 1, acaiCount: 1 };
  if (product.name === "Combo Burger") return { category: "Hambúrgueres", drinkCount: 1, acaiCount: 1 };
  if (product.name === "Combo Hot Dog") return { category: "Hot Dog", drinkCount: 1, acaiCount: 1 };
  if (product.name === "Combo X-Tudo") return { fixedMain: "X-Tudo", drinkCount: 1, acaiCount: 1 };
  if (product.name === "Combo Mega") return { fixedMain: "Itens do Combo Mega", drinkCount: 2, acaiCount: 2 };
  if (product.name === "Combo Mega Family") return { fixedMain: "Itens do Combo Mega Family", drinkCount: 4, acaiCount: 4 };
  return { fixedMain: product.name, drinkCount: 1, acaiCount: 1 };
}

function configureCombo(product) {
  const metadata = comboMetadata(product);
  const mainOptions = metadata.category ? menu.filter((item) => item.category === metadata.category) : [];
  elements.comboMainField.hidden = mainOptions.length === 0;
  elements.comboMainOption.innerHTML = mainOptions.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
  elements.comboQuantityNote.textContent = metadata.acaiCount > 1
    ? `As escolhas de bebida e personalização serão aplicadas às ${metadata.drinkCount} bebidas e aos ${metadata.acaiCount} Açaís incluídos.`
    : "Escolha o produto principal, a bebida e personalize o Açaí incluído.";
}

function customizationSurcharge(product) {
  let surcharge = elements.customProductExtra.checked ? 1 : 0;
  if (product.category !== "Combos") return surcharge;
  const metadata = comboMetadata(product);
  const drinkOption = elements.comboDrinkOption.selectedOptions[0];
  const sizeOption = elements.comboAcaiSizeOption.selectedOptions[0];
  surcharge += Number(drinkOption?.dataset.extraPrice || 0) * metadata.drinkCount;
  surcharge += Number(sizeOption?.dataset.extraPrice || 0) * metadata.acaiCount;
  return surcharge;
}

function buildComboComponents(product, selected, juiceFlavor, note) {
  const metadata = comboMetadata(product);
  const comboVariant = product.name;
  const acaiModifiers = [
    ...customizationModifiers("Complemento", selected.complements),
    ...customizationModifiers("Fruta", selected.fruits),
    ...customizationModifiers("Topping", selected.toppings),
  ];
  const mainModifiers = elements.customProductExtra.checked ? ["Extra (+1,00 €)"] : [];
  const component = (name, variant, productionCenter, quantity = 1, modifiers = []) => ({
    id: crypto.randomUUID(), productId: `${product.id}-${productionCenter}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name, variant: `${comboVariant}${variant ? ` · ${variant}` : ""}`, productionCenter, productionCenters: [productionCenter],
    quantity, unitPrice: 0, modifiers, notes: note,
  });
  const components = [];

  if (product.name === "Combo Mega") {
    components.push(component("Mini salgados diversos", "10 unidades", "Cozinha", 10, mainModifiers));
    components.push(component("Double Bacon", "1 unidade", "Cozinha"));
    components.push(component("X-Bacon", "1 unidade", "Cozinha"));
    components.push(component("Batatas fritas", "2 porções", "Cozinha", 2));
  } else if (product.name === "Combo Mega Family") {
    components.push(component("Mini salgados diversos", "10 unidades", "Cozinha", 10, mainModifiers));
    components.push(component("X-Bacon", "4 unidades", "Cozinha", 4));
    components.push(component("Batatas fritas", "4 porções", "Cozinha", 4));
  } else {
    const mainName = !elements.comboMainField.hidden && elements.comboMainOption.value ? elements.comboMainOption.value : metadata.fixedMain || product.name;
    components.push(component(mainName, "Produto principal", "Cozinha", 1, mainModifiers));
    if (["Combo Burger", "Combo Hot Dog", "Combo X-Tudo"].includes(product.name)) {
      components.push(component("Batatas fritas", "1 porção", "Cozinha"));
    }
  }

  const drinkModifiers = juiceFlavor ? [`Sabor: ${juiceFlavor}`] : [];
  const drinkCenter = elements.comboDrinkOption.value === "Sumo natural" ? "Açaí" : "Balcão";
  components.push(component(elements.comboDrinkOption.value, "Bebida do combo", drinkCenter, metadata.drinkCount, drinkModifiers));
  components.push(component("Açaí", elements.comboAcaiSizeOption.value, "Açaí", metadata.acaiCount, acaiModifiers));
  return components;
}

function confirmAcaiCustomization(event) {
  event.preventDefault();
  const product = menu.find((item) => item.id === customizingProductId);
  if (!product) return closeAcaiCustomization();
  const juiceFlavor = elements.acaiCustomizationForm.querySelector('input[name="juiceFlavor"]:checked')?.value || "";
  const chantillyChoice = elements.acaiCustomizationForm.querySelector('input[name="chantillyChoice"]:checked')?.value || "";
  if (!elements.juiceFlavorGroup.hidden && !juiceFlavor) {
    showToast("Escolhe o sabor do sumo natural.");
    return;
  }
  if (product.category === "Batidos" && !chantillyChoice) {
    showToast("Escolhe se o batido é com ou sem chantilly.");
    return;
  }
  const selected = {};
  for (const group of Object.keys(acaiCustomization)) {
    selected[group] = selectedCustomizationValues(group);
  }
  const modifiers = [];
  if (product.category === "Combos") {
    const metadata = comboMetadata(product);
    if (!elements.comboMainField.hidden && elements.comboMainOption.value) modifiers.push(`Produto: ${elements.comboMainOption.value}`);
    else if (metadata.fixedMain) modifiers.push(`Produto: ${metadata.fixedMain}`);
    modifiers.push(`Bebida: ${elements.comboDrinkOption.value}${juiceFlavor ? ` - ${juiceFlavor}` : ""}${metadata.drinkCount > 1 ? ` ×${metadata.drinkCount}` : ""}`);
    modifiers.push(`Açaí: ${elements.comboAcaiSizeOption.value}${metadata.acaiCount > 1 ? ` ×${metadata.acaiCount}` : ""}`);
  }
  if (["Açaí", "Combos"].includes(product.category)) {
    modifiers.push(...customizationModifiers("Complemento", selected.complements));
    modifiers.push(...customizationModifiers("Fruta", selected.fruits));
    modifiers.push(...customizationModifiers("Topping", selected.toppings));
  }
  if (product.name === "Sumo natural") modifiers.push(`Sabor: ${juiceFlavor}`);
  if (product.category === "Batidos") modifiers.push(`Chantilly: ${chantillyChoice}`);
  if (elements.customProductExtra.checked) modifiers.push("Extra (+1,00 €)");
  const center = product.productionCenter || productionCenterForCategory(product.category);
  const note = elements.customProductComment.value.trim();
  const components = product.category === "Combos" ? buildComboComponents(product, selected, juiceFlavor, note) : [];
  const comboCenters = elements.comboDrinkOption.value === "Sumo natural" ? ["Cozinha", "Açaí"] : ["Cozinha", "Balcão", "Açaí"];
  cart.push({
    id: crypto.randomUUID(), productId: product.id, name: product.name, variant: product.variant.split(" · ")[0],
    productionCenter: center, productionCenters: product.category === "Combos" ? comboCenters : [center], modifiers, notes: note, components, quantity: 1,
    unitPrice: product.price + customizationSurcharge(product),
  });
  closeAcaiCustomization(); renderCart(); showToast(`${product.name} personalizado e adicionado`);
}

function selectedCustomizationValues(group) {
  return [...elements.acaiCustomizationForm.querySelectorAll(`[data-custom-option][data-group="${group}"]`)]
    .flatMap((option) => Array.from({ length: customizationOptionQuantity(option) }, () => option.dataset.value || ""));
}

function customizationModifiers(label, values) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].map(([value, quantity]) => `${label}: ${value}${quantity > 1 ? ` ×${quantity}` : ""}`);
}

function handleCartAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = cart.find((entry) => entry.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === "plus") item.quantity += 1;
  if (button.dataset.action === "minus") item.quantity -= 1;
  if (button.dataset.action === "remove" || item.quantity <= 0) cart = cart.filter((entry) => entry.id !== item.id);
  renderCart();
}

function renderCart() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  elements.cartCount.textContent = String(count); elements.cartTotal.textContent = money(total);
  elements.sendOrderButton.disabled = !cart.length || sending || !serviceIsReady();
  elements.cartItems.innerHTML = cart.length ? cart.map((item) => `
    <article class="cart-row">
      <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.variant)}</small>${item.modifiers?.length ? `<small>${item.modifiers.map(escapeHtml).join(" · ")}</small>` : ""}${item.notes ? `<small>Obs.: ${escapeHtml(item.notes)}</small>` : ""}
        <div class="qty-controls"><button class="qty-button" data-action="minus" data-id="${item.id}" type="button">−</button><span class="qty-number">${item.quantity}</span><button class="qty-button" data-action="plus" data-id="${item.id}" type="button">+</button><button class="remove-item" data-action="remove" data-id="${item.id}" type="button">Remover</button></div>
      </div><span class="cart-line-total">${money(item.quantity * item.unitPrice)}</span>
    </article>`).join("") : '<div class="cart-empty"><div><strong>O pedido está vazio</strong><br><small>Escolhe produtos no menu.</small></div></div>';
}

async function sendOrder() {
  if (!cart.length || sending) return;
  if (!auth?.token) return showLogin("Entra novamente antes de enviar o pedido.");
  if (!serviceIsReady()) {
    setStatus(elements.orderStatus, "Seleciona uma mesa ou Retirada | Entrega antes de enviar.", "error");
    return;
  }
  sending = true; renderCart(); setStatus(elements.orderStatus, "A enviar para a cozinha…");
  try {
    const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const paymentMethod = serviceMode === "tables" ? "" : elements.paymentMethod.value;
    let cashReceived = 0;
    if (paymentMethod === "cash") {
      const receivedText = prompt(`Total ${money(total)}. Valor recebido em dinheiro:`, total.toFixed(2).replace(".", ","));
      if (receivedText === null) { setStatus(elements.orderStatus, "Pagamento cancelado."); return; }
      cashReceived = Number(receivedText.replace(",", "."));
      if (!Number.isFinite(cashReceived) || cashReceived < total) { setStatus(elements.orderStatus, "O valor recebido é inferior ao total do pedido.", "error"); return; }
    }
    const result = await api("/api/orders/create", {
      authToken: auth.token, items: cart, channel: elements.orderChannel.value, table: elements.orderTable.value,
      customerName: elements.customerName.value, paymentMethod, cashReceived, notes: elements.orderNotes.value,
    });
    const number = result.order.number;
    cart = []; elements.customerName.value = ""; elements.orderNotes.value = ""; elements.paymentMethod.value = "cash";
    elements.orderTable.value = "";
    setServiceMode(""); renderCart(); setStatus(elements.orderStatus, `Pedido #${number} enviado. Selecione o próximo atendimento.`, "success");
    showToast(result.order.paymentMethod === "cash" ? `Pedido #${number} · Troco ${money(result.order.changeDue)}` : `Pedido #${number} entrou na cozinha`);
    loadTableStatus(); renderTables();
  } catch (error) {
    if (error.status === 401) { auth = null; saveAuth(); showLogin(error.message); }
    setStatus(elements.orderStatus, error.message, "error");
  } finally { sending = false; renderCart(); }
}

async function api(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result.error || "Não foi possível concluir a operação."); error.status = response.status; throw error; }
  return result;
}

function loadAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; } }
function saveAuth() { if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); else localStorage.removeItem(AUTH_KEY); }
function setStatus(node, message, tone = "") { node.textContent = message || ""; node.className = `form-status${tone ? ` ${tone}` : ""}`; }
function showToast(message) { elements.toast.textContent = message; elements.toast.hidden = false; setTimeout(() => { elements.toast.hidden = true; }, 3200); }
function money(value) { return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(value || 0)); }
function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function productionCenterForCategory(category) {
  if (category === "Bebidas") return "Balcão";
  if (category === "Batidos") return "Açaí";
  if (["Entradas", "Petiscos", "Tostas", "Hambúrgueres", "Hot Dog", "Tapiocas", "Pastéis", "Combos"].includes(category)) return "Cozinha";
  return "Açaí";
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]); }
