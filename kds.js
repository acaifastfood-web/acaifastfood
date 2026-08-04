if (window.location.protocol === "file:") {
  window.location.replace("http://localhost:4173/kds.html");
}

const AUTH_KEY = "acai-fast-food-auth-v1";
const KDS_CENTER_KEY = "acai-fast-food-kds-center-v1";
const channelLabels = { counter: "Mesa", takeaway: "Retirada", delivery: "Entrega" };

let auth = loadAuth();
let orders = [];
let loading = false;
let refreshTimer;
let activeDialogOrderId = "";
let activeCenter = localStorage.getItem(KDS_CENTER_KEY) || "all";
let deletedOrders = [];

const elements = {
  authScreen: document.querySelector("#authScreen"), loginForm: document.querySelector("#loginForm"), loginUserSelect: document.querySelector("#loginUserSelect"), loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"), loginStatus: document.querySelector("#loginStatus"), operatorName: document.querySelector("#operatorName"),
  logoutButton: document.querySelector("#logoutButton"), refreshButton: document.querySelector("#refreshButton"), toast: document.querySelector("#toast"),
  activeCount: document.querySelector("#activeCount"), averageTime: document.querySelector("#averageTime"),
  allOrders: document.querySelector("#allOrders"), currentClock: document.querySelector("#currentClock"), currentDate: document.querySelector("#currentDate"),
  kdsBoard: document.querySelector("#kdsBoard"),
  orderControlDialog: document.querySelector("#orderControlDialog"), dialogOrderNumber: document.querySelector("#dialogOrderNumber"), dialogOrderTime: document.querySelector("#dialogOrderTime"),
  dialogOrderMeta: document.querySelector("#dialogOrderMeta"), orderItemsForm: document.querySelector("#orderItemsForm"), dialogItemList: document.querySelector("#dialogItemList"),
  dialogMessage: document.querySelector("#dialogMessage"),
  cancelOrderButton: document.querySelector("#cancelOrderButton"), closeOrderDialogButton: document.querySelector("#closeOrderDialogButton"),
  restoreOrdersButton: document.querySelector("#restoreOrdersButton"), restoreOrdersDialog: document.querySelector("#restoreOrdersDialog"),
  restoreOrdersList: document.querySelector("#restoreOrdersList"), restoreOrdersMessage: document.querySelector("#restoreOrdersMessage"),
  closeRestoreDialogButton: document.querySelector("#closeRestoreDialogButton"), closeRestoreDialogFooterButton: document.querySelector("#closeRestoreDialogFooterButton"),
};

elements.loginForm.addEventListener("submit", login);
elements.loginUserSelect.addEventListener("change", selectLoginUser);
elements.logoutButton.addEventListener("click", logout);
elements.refreshButton.addEventListener("click", () => loadOrders(true));
elements.kdsBoard.addEventListener("click", handleBoardAction);
elements.dialogItemList.addEventListener("click", handleDialogItemAction);
elements.cancelOrderButton.addEventListener("click", cancelDialogOrder);
elements.closeOrderDialogButton.addEventListener("click", closeOrderDialog);
elements.restoreOrdersButton.addEventListener("click", openRestoreOrders);
elements.closeRestoreDialogButton.addEventListener("click", () => elements.restoreOrdersDialog.close());
elements.closeRestoreDialogFooterButton.addEventListener("click", () => elements.restoreOrdersDialog.close());
elements.restoreOrdersList.addEventListener("click", handleRestoreAction);
elements.orderControlDialog.addEventListener("close", () => { activeDialogOrderId = ""; });
document.querySelectorAll("[data-center-filter]").forEach((button) => button.addEventListener("click", () => setCenterFilter(button.dataset.centerFilter)));

setCenterFilter(activeCenter); loadLoginUsers(); restoreSession();
setInterval(() => renderBoard(), 1000);
updateClock(); setInterval(updateClock, 1000);

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
    auth.user = result.user; saveAuth(); showApp(); await loadOrders(); startRefresh();
  } catch { auth = null; saveAuth(); showLogin("A sessão terminou. Entra novamente."); }
}

async function login(event) {
  event.preventDefault(); setStatus("A entrar…");
  try {
    const result = await api("/api/auth/login", { username: elements.loginUsername.value.trim(), password: elements.loginPassword.value });
    auth = { token: result.token, user: result.user }; saveAuth(); elements.loginPassword.value = ""; showApp(); await loadOrders(); startRefresh();
  } catch (error) { setStatus(error.message, "error"); }
}

async function logout() {
  const token = auth?.token; clearInterval(refreshTimer); auth = null; orders = []; saveAuth(); renderBoard(); showLogin();
  if (token) { try { await api("/api/auth/logout", { authToken: token }); } catch {} }
}

function showLogin(message = "") { elements.authScreen.hidden = false; elements.operatorName.textContent = "Sem sessão"; setStatus(message); setTimeout(() => elements.loginUsername.focus(), 50); }
function showApp() { elements.authScreen.hidden = true; elements.operatorName.textContent = auth?.user?.name || auth?.user?.username || "Cozinha"; setStatus(""); }
function startRefresh() { clearInterval(refreshTimer); refreshTimer = setInterval(() => loadOrders(), 3000); }

async function loadOrders(showFeedback = false) {
  if (!auth?.token || loading) return;
  loading = true;
  try {
    const result = await api("/api/orders/list", { authToken: auth.token, activeOnly: true });
    const previousIds = new Set(orders.map((order) => order.id));
    orders = result.orders || [];
    const newEntries = orders.filter((order) => order.status === "new" && !previousIds.has(order.id));
    renderBoard();
    if (activeDialogOrderId && elements.orderControlDialog.open) renderOrderDialog();
    if (newEntries.length && previousIds.size) showToast(`${newEntries.length} novo${newEntries.length > 1 ? "s" : ""} pedido${newEntries.length > 1 ? "s" : ""}`);
    if (showFeedback) showToast("KDS atualizado");
  } catch (error) {
    if (error.status === 401) { clearInterval(refreshTimer); auth = null; saveAuth(); showLogin(error.message); }
  } finally { loading = false; }
}

function renderBoard() {
  const visibleOrders = orders.filter((order) => activeCenter === "all" || visibleOrderItems(order).length > 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  elements.allOrders.innerHTML = ticketList(visibleOrders, "Sem pedidos ativos.");
  elements.activeCount.textContent = visibleOrders.length;
  const average = visibleOrders.length ? Math.round(visibleOrders.reduce((total, order) => total + elapsedMinutes(order.createdAt), 0) / visibleOrders.length) : 0;
  elements.averageTime.textContent = `${average} min`;
  if (activeDialogOrderId && elements.orderControlDialog.open) {
    const dialogOrder = orders.find((order) => order.id === activeDialogOrderId);
    if (dialogOrder) elements.dialogOrderTime.textContent = elapsedLabel(dialogOrder.createdAt);
  }
}

function setCenterFilter(center) {
  activeCenter = ["all", "Balcão", "Cozinha", "Açaí"].includes(center) ? center : "all";
  localStorage.setItem(KDS_CENTER_KEY, activeCenter);
  document.querySelectorAll("[data-center-filter]").forEach((button) => button.classList.toggle("active", button.dataset.centerFilter === activeCenter));
  renderBoard();
}

function ticketList(entries, emptyText) {
  return entries.length ? entries.map(ticketHtml).join("") : `<div class="kds-empty">${emptyText}</div>`;
}

function ticketHtml(order) {
  const minutes = elapsedMinutes(order.createdAt);
  const timingClass = minutes >= 15 ? " is-late" : minutes >= 8 ? " is-warning" : " is-fresh";
  const centers = productionCenters(order);
  const cardName = order.customerName || order.table || channelLabels[order.channel] || "Local";
  const centerCode = centers.map((center) => ({ "Açaí": "A", "Cozinha": "C", "Balcão": "B" }[center] || center.slice(0, 1))).join("+");
  const items = visibleOrderItems(order).map((item) => {
    const itemStatus = item.itemStatus || "pending";
    const statusLabel = itemStatus === "ready" ? "Pronto" : itemStatus === "cancelled" ? "Cancelado" : "";
    const isNaturalJuice = normalizeItemText(item).includes("sumo natural");
    const juiceFlavor = isNaturalJuice ? naturalJuiceFlavor(item) : "";
    const itemDetails = isNaturalJuice
      ? (juiceFlavor ? `<small class="juice-flavor"><strong>${escapeHtml(juiceFlavor)}</strong></small>` : "")
      : `${item.variant ? `<small>${escapeHtml(item.variant)}</small>` : ""}${item.modifiers?.length ? `<small>${item.modifiers.map(displayModifier).map(escapeHtml).join(" · ")}</small>` : ""}`;
    return `<li class="ticket-item item-${itemStatus}"><span class="ticket-qty">${item.quantity}</span><span><strong>${escapeHtml(item.name)}</strong>${itemDetails}${item.notes ? `<small class="item-observation"><strong>OBS.: ${escapeHtml(item.notes)}</strong></small>` : ""}${statusLabel ? `<small class="item-state-label">${statusLabel}</small>` : ""}</span></li>`;
  }).join("");
  return `<article class="ticket${timingClass}" data-status="${order.status}" data-id="${order.id}">
    <header class="ticket-head"><div class="ticket-title"><strong>#${order.number}</strong><span>${elapsedLabel(order.createdAt)}</span><em>${escapeHtml(cardName)}</em></div><span class="ticket-center-badge">${escapeHtml(centerCode)}</span></header>
    <div class="ticket-command-row">
      <button class="ticket-command command-finish" data-action="open-items" data-id="${order.id}" type="button" title="Abrir itens do pedido" aria-label="Abrir itens do pedido"><span aria-hidden="true">✓</span></button>
      <button class="ticket-command command-cancel" data-action="cancel" data-id="${order.id}" type="button" title="Apagar pedido" aria-label="Apagar pedido"><span aria-hidden="true">×</span></button>
    </div>
    <ul class="ticket-items">${items}</ul>
    ${order.notes ? `<p class="ticket-note">${escapeHtml(order.notes)}</p>` : ""}
  </article>`;
}

async function handleBoardAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    const ticket = event.target.closest(".ticket[data-id]");
    if (ticket) openOrderDialog(ticket.dataset.id);
    return;
  }
  const order = orders.find((entry) => entry.id === button.dataset.id);
  if (!order) return;
  if (button.dataset.action === "open-items") {
    openOrderDialog(order.id);
    return;
  }
  button.disabled = true;
  try {
    if (button.dataset.action === "cancel") {
      const reason = prompt(`Motivo para apagar o pedido #${order.number}:`, "Cancelado pelo cliente");
      if (reason === null) return;
      const result = await api("/api/orders/cancel", { authToken: auth.token, orderId: order.id, reason });
      deletedOrders.unshift(result.order); orders = orders.filter((entry) => entry.id !== order.id); renderBoard(); showToast(`Pedido #${order.number} apagado. Pode restaurá-lo no menu superior.`);
    }
  } catch (error) {
    showToast(error.message);
    if (error.status === 401) { auth = null; saveAuth(); showLogin(error.message); }
  } finally { button.disabled = false; }
}

function openOrderDialog(orderId) {
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) return;
  activeDialogOrderId = orderId;
  renderOrderDialog();
  if (!elements.orderControlDialog.open) elements.orderControlDialog.showModal();
}

function renderOrderDialog() {
  const order = orders.find((entry) => entry.id === activeDialogOrderId);
  if (!order) return closeOrderDialog();
  elements.dialogOrderNumber.textContent = `#${order.number}`;
  elements.dialogOrderTime.textContent = elapsedLabel(order.createdAt);
  elements.dialogOrderMeta.textContent = `${productionCenters(order).join(" + ")} · ${channelLabels[order.channel] || "Local"}${order.table ? ` · ${order.table}` : ""}${order.customerName ? ` · ${order.customerName}` : ""}`;
  elements.dialogItemList.innerHTML = visibleOrderItems(order).map((item) => {
    const details = [item.variant, ...(item.modifiers || []).map(displayModifier), itemProductionCenters(item).join(" + ")].filter(Boolean);
    return `<article class="dialog-item item-pending"><span class="dialog-item-qty">${item.quantity}×</span><span class="dialog-item-name"><strong>${escapeHtml(item.name)}</strong><small>${details.map(escapeHtml).join(" · ")}</small>${item.notes ? `<small class="dialog-item-observation"><strong>OBS.: ${escapeHtml(item.notes)}</strong></small>` : ""}</span><div class="dialog-item-actions"><button class="item-finish-button" data-item-action="ready" data-item-id="${item.id}" type="button">✓ Finalizar</button><button class="item-cancel-button" data-item-action="cancelled" data-item-id="${item.id}" type="button">× Cancelar</button></div></article>`;
  }).join("");
  elements.dialogMessage.textContent = order.notes ? `Observações: ${order.notes}` : "";
}

function handleDialogItemAction(event) {
  const button = event.target.closest("button[data-item-action]");
  if (!button) return;
  updateSingleItem(button.dataset.itemId, button.dataset.itemAction);
}

async function updateSingleItem(itemId, action) {
  const order = orders.find((entry) => entry.id === activeDialogOrderId);
  if (!order) return;
  const item = order.items.find((entry) => entry.id === itemId);
  if (!item) return;
  if (action === "cancelled" && !confirm(`Cancelar ${item.name} do pedido #${order.number}?`)) return;
  const itemIds = [itemId];
  const printWindow = action === "ready" ? window.open("", "_blank", "width=420,height=720") : null;
  if (printWindow) writeItemTickets(printWindow, order, itemIds, false);
  setDialogBusy(true);
  try {
    const result = await api("/api/orders/items", { authToken: auth.token, orderId: order.id, itemIds, action });
    if (["cancelled", "delivered"].includes(result.order.status)) {
      orders = orders.filter((entry) => entry.id !== order.id); closeOrderDialog();
    } else {
      orders = orders.map((entry) => entry.id === order.id ? result.order : entry); renderBoard(); renderOrderDialog();
    }
    if (action === "ready" && printWindow) {
      writeItemTickets(printWindow, result.order, itemIds, true);
      showToast(`${item.name} finalizado e enviado para impressão`);
    } else if (action === "ready") {
      showToast(`${item.name} finalizado. Permite pop-ups para imprimir.`);
    } else {
      showToast(`${item.name} cancelado`);
    }
  } catch (error) {
    if (printWindow) printWindow.close();
    elements.dialogMessage.textContent = error.message;
  }
  finally { setDialogBusy(false); }
}

async function cancelDialogOrder() {
  const order = orders.find((entry) => entry.id === activeDialogOrderId);
  if (!order) return;
  const reason = prompt(`Motivo do cancelamento do pedido #${order.number}:`, "Cancelado pelo cliente");
  if (reason === null) return;
  setDialogBusy(true);
  try {
    const result = await api("/api/orders/cancel", { authToken: auth.token, orderId: order.id, reason });
    deletedOrders.unshift(result.order); orders = orders.filter((entry) => entry.id !== order.id); closeOrderDialog(); renderBoard(); showToast(`Pedido #${order.number} apagado. Pode restaurá-lo no menu superior.`);
  } catch (error) { elements.dialogMessage.textContent = error.message; }
  finally { setDialogBusy(false); }
}

function setDialogBusy(busy) {
  elements.orderControlDialog.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
}

function closeOrderDialog() {
  activeDialogOrderId = "";
  if (elements.orderControlDialog.open) elements.orderControlDialog.close();
}

async function openRestoreOrders() {
  elements.restoreOrdersMessage.textContent = "A carregar…";
  elements.restoreOrdersList.innerHTML = "";
  if (!elements.restoreOrdersDialog.open) elements.restoreOrdersDialog.showModal();
  try {
    const result = await api("/api/orders/list", { authToken: auth.token, activeOnly: false });
    deletedOrders = (result.orders || []).filter((order) => order.status === "cancelled" && order.cancelReason);
    renderDeletedOrders();
  } catch (error) { elements.restoreOrdersMessage.textContent = error.message; }
}

function renderDeletedOrders() {
  elements.restoreOrdersMessage.textContent = `${deletedOrders.length} pedido${deletedOrders.length === 1 ? "" : "s"} disponível${deletedOrders.length === 1 ? "" : "eis"}`;
  elements.restoreOrdersList.innerHTML = deletedOrders.length ? deletedOrders.map((order) => {
    const location = order.customerName || order.table || channelLabels[order.channel] || "Local";
    const cancelledAt = order.cancelledAt || order.updatedAt;
    return `<article class="restore-order-row"><div class="restore-order-number">#${order.number}</div><div><strong>${escapeHtml(location)}</strong><span>${escapeHtml(order.items.map((item) => `${item.quantity}× ${item.name}`).join(" · "))}</span><small>Apagado ${formatDateTime(cancelledAt)}${order.cancelledBy ? ` por ${escapeHtml(order.cancelledBy)}` : ""} · Motivo: ${escapeHtml(order.cancelReason)}</small></div><button data-restore-id="${order.id}" type="button">↺ Restaurar</button></article>`;
  }).join("") : '<div class="restore-empty"><strong>Nenhum pedido apagado</strong><span>Os pedidos retirados pelo botão vermelho aparecerão aqui.</span></div>';
}

async function handleRestoreAction(event) {
  const button = event.target.closest("button[data-restore-id]");
  if (!button) return;
  const order = deletedOrders.find((entry) => entry.id === button.dataset.restoreId);
  if (!order || !confirm(`Restaurar o pedido #${order.number} no KDS?`)) return;
  button.disabled = true;
  try {
    const result = await api("/api/orders/restore", { authToken: auth.token, orderId: order.id });
    deletedOrders = deletedOrders.filter((entry) => entry.id !== order.id);
    orders.push(result.order); renderDeletedOrders(); renderBoard(); showToast(`Pedido #${order.number} restaurado no KDS`);
  } catch (error) { elements.restoreOrdersMessage.textContent = error.message; button.disabled = false; }
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

async function api(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result.error || "Não foi possível concluir a operação."); error.status = response.status; throw error; }
  return result;
}

function elapsedMinutes(date) { return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000)); }
function elapsedLabel(date) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].filter((_, index) => hours > 0 || index > 0).map((value) => String(value).padStart(2, "0")).join(":");
}
function updateClock() {
  const now = new Date();
  elements.currentClock.textContent = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  elements.currentDate.textContent = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
}
function loadAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; } }
function saveAuth() { if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); else localStorage.removeItem(AUTH_KEY); }
function setStatus(message, tone = "") { elements.loginStatus.textContent = message || ""; elements.loginStatus.className = `form-status${tone ? ` ${tone}` : ""}`; }
function showToast(message) { elements.toast.textContent = message; elements.toast.hidden = false; setTimeout(() => { elements.toast.hidden = true; }, 3000); }
function productionCenters(order) {
  const centers = [...new Set((order.items || []).flatMap(itemProductionCenters))];
  const priority = { "Açaí": 1, "Cozinha": 2, "Balcão": 3 };
  return centers.filter(Boolean).sort((a, b) => (priority[a] || 9) - (priority[b] || 9));
}
function visibleOrderItems(order) {
  const pendingItems = (order.items || []).filter((item) => !["ready", "cancelled"].includes(item.itemStatus || "pending"));
  if (activeCenter === "all") return pendingItems;
  return pendingItems.filter((item) => itemProductionCenters(item).includes(activeCenter));
}
function itemProductionCenters(item) {
  return Array.isArray(item.productionCenters) && item.productionCenters.length ? item.productionCenters : [item.productionCenter || inferProductionCenter(item)];
}
function inferProductionCenter(item) {
  const text = String(`${item.productId || ""} ${item.name || ""}`).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/batido|sumo natural/.test(text)) return "Açaí";
  if (/agua|coca|sumo|bebida/.test(text)) return "Balcão";
  if (/tapioca|wrap|pao|salgado/.test(text)) return "Cozinha";
  return "Açaí";
}
function displayModifier(value) {
  return String(value || "").replace(/^(Complemento|Fruta|Topping|Sabor|Chantilly):\s*/i, "");
}
function normalizeItemText(item) {
  return String(`${item?.productId || ""} ${item?.name || ""}`).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function naturalJuiceFlavor(item) {
  const flavor = (item?.modifiers || []).find((value) => /^Sabor:\s*/i.test(String(value)));
  return flavor ? displayModifier(flavor) : "";
}
function writeItemTickets(printWindow, order, itemIds, shouldPrint) {
  const selectedItems = (order.items || []).filter((item) => itemIds.includes(item.id));
  const tickets = selectedItems.map((item) => {
    const modifiers = (item.modifiers || []).map((value) => `<li>${escapeHtml(displayModifier(value))}</li>`).join("");
    return `<section class="production-ticket"><header><strong>AÇAÍ FAST FOOD</strong><span>${escapeHtml(itemProductionCenters(item).join(" + "))}</span></header><div class="order-number">#${order.number}</div><div class="order-meta">${escapeHtml(channelLabels[order.channel] || "Mesa")}${order.table ? ` · ${escapeHtml(order.table)}` : ""}${order.customerName ? ` · ${escapeHtml(order.customerName)}` : ""}<br>${new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.createdAt))}</div><div class="product"><b>${item.quantity}×</b><strong>${escapeHtml(item.name)}</strong></div>${item.variant ? `<div class="variant">${escapeHtml(item.variant)}</div>` : ""}${modifiers ? `<ul>${modifiers}</ul>` : ""}${item.notes ? `<div class="item-note">OBS.: ${escapeHtml(item.notes)}</div>` : ""}<footer>ITEM FINALIZADO</footer></section>`;
  }).join("");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Tickets pedido #${order.number}</title><style>@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{font:13px ui-monospace,monospace;color:#000;margin:0}.production-ticket{min-height:90mm;padding:2mm 0;page-break-after:always}.production-ticket:last-child{page-break-after:auto}header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:5px}header strong{font-size:14px}header span{font-weight:900}.order-number{text-align:center;font-size:38px;font-weight:950;margin:8px 0 2px}.order-meta{text-align:center;border-bottom:1px dashed #000;padding-bottom:8px}.product{display:grid;grid-template-columns:38px 1fr;gap:6px;align-items:start;margin-top:12px}.product b,.product strong{font-size:18px}.variant{margin:5px 0 0 44px;font-weight:800}ul{margin:8px 0 0 44px;padding:0;list-style:none}li{margin:3px 0}.item-note{margin-top:12px;border:2px solid #000;padding:8px;font-size:15px;font-weight:950}footer{margin-top:16px;border-top:1px dashed #000;padding-top:6px;text-align:center;font-size:11px;font-weight:900}</style></head><body>${tickets}</body></html>`);
  printWindow.document.close();
  if (shouldPrint) setTimeout(() => { printWindow.focus(); printWindow.print(); }, 180);
}
function writeReceipt(printWindow, order, shouldPrint) {
  const centers = productionCenters(order).join(" + ");
  const itemRows = (order.items || []).map((item) => `<tr><td>${item.quantity}×</td><td>${escapeHtml(item.name)}${item.variant ? `<small>${escapeHtml(item.variant)}</small>` : ""}${item.modifiers?.length ? `<small>${item.modifiers.map(displayModifier).map(escapeHtml).join("<br>")}</small>` : ""}${item.notes ? `<small><strong>Obs.:</strong> ${escapeHtml(item.notes)}</small>` : ""}</td><td>${money(item.quantity * item.unitPrice)}</td></tr>`).join("");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>Pedido #${order.number}</title><style>@page{size:80mm auto;margin:4mm}body{font:13px ui-monospace,monospace;color:#000;margin:0}h1{text-align:center;font-size:18px;margin:0 0 4px}.meta{text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px}.number{text-align:center;font-size:34px;font-weight:900;margin:8px 0}table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:4px 0;border-bottom:1px dotted #aaa}td:first-child{width:28px}td:last-child{text-align:right;white-space:nowrap}small{display:block}.note{border:1px solid #000;padding:6px;margin-top:8px}.total{display:flex;justify-content:space-between;font-size:16px;font-weight:900;margin-top:10px}.footer{text-align:center;margin-top:15px;font-size:11px}@media print{button{display:none}}</style></head><body><h1>AÇAÍ FAST FOOD</h1><div class="meta">${escapeHtml(centers)} · ${escapeHtml(channelLabels[order.channel] || "Local")}<br>${new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.createdAt))}</div><div class="number">#${order.number}</div><table>${itemRows}</table>${order.notes ? `<div class="note"><strong>Observações:</strong><br>${escapeHtml(order.notes)}</div>` : ""}<div class="total"><span>Total</span><span>${money(order.total)}</span></div><div class="footer">Pedido finalizado · ${escapeHtml(order.createdBy || "Operador")}</div></body></html>`);
  printWindow.document.close();
  if (shouldPrint) setTimeout(() => { printWindow.focus(); printWindow.print(); }, 180);
}
function money(value) { return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(value || 0)); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]); }
