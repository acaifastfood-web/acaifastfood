const STORAGE_KEY = "acai-fast-food-stock-v1";
const MOVEMENTS_KEY = "acai-fast-food-movements-v1";
const EXPIRING_DAYS = 7;
const todayText = new Date().toISOString().slice(0, 10);

const seedItems = [
  {
    id: crypto.randomUUID(),
    name: "Polpa de acai",
    category: "Ingredientes",
    unit: "kg",
    quantity: 18,
    minimum: 25,
    unitCost: 4.8,
    expiresAt: addDays(6),
    supplier: "Fornecedor principal",
    notes: "Congelador 1",
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Copos 500 ml",
    category: "Embalagens",
    unit: "un",
    quantity: 420,
    minimum: 200,
    unitCost: 0.11,
    expiresAt: "",
    supplier: "Embalagens Norte",
    notes: "",
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Granola",
    category: "Ingredientes",
    unit: "kg",
    quantity: 8,
    minimum: 6,
    unitCost: 3.2,
    expiresAt: addDays(15),
    supplier: "Mercado local",
    notes: "Prateleira seca",
    updatedAt: new Date().toISOString(),
  },
];

let items = load(STORAGE_KEY, seedItems);
let movements = load(MOVEMENTS_KEY, []);

const elements = {
  managerModeButton: document.querySelector("#managerModeButton"),
  staffModeButton: document.querySelector("#staffModeButton"),
  managerOnlyActions: document.querySelectorAll(".manager-only"),
  managerView: document.querySelector("#managerView"),
  staffView: document.querySelector("#staffView"),
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
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  totalItems: document.querySelector("#totalItems"),
  lowStockItems: document.querySelector("#lowStockItems"),
  expiringItems: document.querySelector("#expiringItems"),
  stockValue: document.querySelector("#stockValue"),
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
  countDate: document.querySelector("#countDate"),
  staffSearchInput: document.querySelector("#staffSearchInput"),
  clearStaffSearchButton: document.querySelector("#clearStaffSearchButton"),
  staffCountInfo: document.querySelector("#staffCountInfo"),
  countList: document.querySelector("#countList"),
  saveCountsButton: document.querySelector("#saveCountsButton"),
};

elements.managerModeButton.addEventListener("click", () => setMode("manager"));
elements.staffModeButton.addEventListener("click", () => setMode("staff"));
elements.form.addEventListener("submit", saveItem);
elements.resetFormButton.addEventListener("click", resetForm);
elements.searchInput.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);
elements.categoryFilter.addEventListener("change", render);
elements.clearFiltersButton.addEventListener("click", clearManagerFilters);
elements.staffSearchInput.addEventListener("input", renderCountList);
elements.clearStaffSearchButton.addEventListener("click", clearStaffSearch);
elements.inventoryBody.addEventListener("click", handleTableAction);
elements.movementForm.addEventListener("submit", applyMovement);
elements.templateButton.addEventListener("click", downloadCsvTemplate);
elements.pullButton.addEventListener("click", pullFromNotion);
elements.syncButton.addEventListener("click", syncWithNotion);
elements.exportButton.addEventListener("click", exportData);
elements.importFile.addEventListener("change", importData);
elements.clearMovementsButton.addEventListener("click", clearMovements);
elements.saveCountsButton.addEventListener("click", saveDailyCounts);

elements.countDate.value = todayText;
render();
checkNotionStatus();

function setMode(mode) {
  const staffMode = mode === "staff";
  elements.managerView.hidden = staffMode;
  elements.staffView.hidden = !staffMode;
  elements.managerModeButton.classList.toggle("active", !staffMode);
  elements.staffModeButton.classList.toggle("active", staffMode);
  elements.managerOnlyActions.forEach((entry) => {
    entry.hidden = staffMode;
  });
  if (staffMode) renderCountList();
}

function saveItem(event) {
  event.preventDefault();
  const formData = new FormData(elements.form);
  const id = elements.itemId.value || crypto.randomUUID();
  const item = {
    id,
    name: String(formData.get("name")).trim(),
    category: formData.get("category"),
    unit: formData.get("unit"),
    quantity: numberValue(formData.get("quantity")),
    minimum: numberValue(formData.get("minimum")),
    unitCost: numberValue(formData.get("unitCost")),
    expiresAt: formData.get("expiresAt") || "",
    supplier: String(formData.get("supplier") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
    updatedAt: new Date().toISOString(),
  };

  const existingIndex = items.findIndex((entry) => entry.id === id);
  if (existingIndex >= 0) {
    items[existingIndex] = item;
  } else {
    items.unshift(item);
  }

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

  if (button.dataset.action === "edit") {
    fillForm(item);
  }

  if (button.dataset.action === "delete") {
    deleteItem(item);
  }

  if (button.dataset.action === "move") {
    openMovement(item);
  }
}

function deleteItem(item) {
  const confirmed = confirm(`Apagar "${item.name}" do estoque?`);
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
  setField("unitCost", item.unitCost);
  setField("expiresAt", item.expiresAt);
  setField("supplier", item.supplier);
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
  movements = movements.slice(0, 60);

  persist();
  elements.movementDialog.close();
  render();
}

function render() {
  renderSummary();
  renderTable();
  renderMovements();
  renderCountList();
}

function renderSummary() {
  const lowStock = items.filter(isLowStock).length;
  const expiring = items.filter(isExpiringSoon).length;
  const value = items.reduce((total, item) => total + item.quantity * item.unitCost, 0);

  elements.totalItems.textContent = String(items.length);
  elements.lowStockItems.textContent = String(lowStock);
  elements.expiringItems.textContent = String(expiring);
  elements.stockValue.textContent = formatCurrency(value);
}

function renderTable() {
  elements.inventoryBody.innerHTML = "";
  const filteredItems = getFilteredItems();

  elements.emptyState.hidden = filteredItems.length > 0;
  for (const item of filteredItems) {
    const row = elements.rowTemplate.content.firstElementChild.cloneNode(true);
    const status = getStatus(item);
    row.dataset.id = item.id;
    row.querySelector('[data-field="name"]').textContent = item.name;
    row.querySelector('[data-field="meta"]').textContent = [item.category, item.supplier].filter(Boolean).join(" | ");
    row.querySelector('[data-field="quantity"]').textContent = `${formatNumber(item.quantity)} ${item.unit}`;
    row.querySelector('[data-field="minimum"]').textContent = `${formatNumber(item.minimum)} ${item.unit}`;
    row.querySelector('[data-field="expiresAt"]').textContent = formatDate(item.expiresAt);

    const pill = row.querySelector('[data-field="status"]');
    pill.textContent = status.label;
    pill.classList.add(status.className);

    elements.inventoryBody.appendChild(row);
  }
}

function renderMovements() {
  elements.movementList.innerHTML = "";
  if (movements.length === 0) {
    elements.movementList.innerHTML = '<div class="empty-state"><h3>Sem movimentos</h3><p>Entradas e saidas aparecem aqui.</p></div>';
    return;
  }

  for (const movement of movements.slice(0, 12)) {
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

function renderCountList() {
  elements.countList.innerHTML = "";
  const term = elements.staffSearchInput.value.trim().toLowerCase();
  const filteredItems = items
    .filter((item) => {
      const haystack = `${item.name} ${item.supplier} ${item.category}`.toLowerCase();
      return !term || haystack.includes(term);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  elements.staffCountInfo.textContent = `${filteredItems.length} de ${items.length} produtos visiveis`;

  if (filteredItems.length === 0) {
    elements.countList.innerHTML = '<div class="empty-state"><h3>Sem produtos</h3><p>Ajusta a pesquisa ou carrega a base do Notion.</p></div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of filteredItems) {
    const row = document.createElement("article");
    row.className = "count-row";
    row.innerHTML = `
      <div class="count-product">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml([item.category, item.supplier].filter(Boolean).join(" | "))}</span>
      </div>
      <div class="count-minimum">
        <span>Minimo</span>
        <strong>${formatNumber(item.minimum)} ${escapeHtml(item.unit)}</strong>
      </div>
      <label class="count-input">
        Contagem
        <input data-count-id="${escapeHtml(item.id)}" type="number" min="0" step="0.01" placeholder="${formatNumber(item.quantity)}" />
      </label>
    `;
    fragment.appendChild(row);
  }
  elements.countList.appendChild(fragment);
}

function clearManagerFilters() {
  elements.searchInput.value = "";
  elements.statusFilter.value = "all";
  elements.categoryFilter.value = "all";
  render();
}

function clearStaffSearch() {
  elements.staffSearchInput.value = "";
  renderCountList();
}

function getFilteredItems() {
  const term = elements.searchInput.value.trim().toLowerCase();
  const status = elements.statusFilter.value;
  const category = elements.categoryFilter.value;

  return items
    .filter((item) => {
      const haystack = `${item.name} ${item.category} ${item.supplier} ${item.notes}`.toLowerCase();
      return !term || haystack.includes(term);
    })
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => {
      if (status === "all") return true;
      if (status === "low") return isLowStock(item);
      if (status === "expiring") return isExpiringSoon(item);
      return !isLowStock(item) && !isExpiringSoon(item);
    })
    .sort((a, b) => {
      const aStatus = getStatus(a).priority;
      const bStatus = getStatus(b).priority;
      return bStatus - aStatus || a.name.localeCompare(b.name);
    });
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

function exportData() {
  const payload = JSON.stringify({ items, movements, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  downloadBlob(blob, `estoque-acai-${new Date().toISOString().slice(0, 10)}.json`);
}

function downloadCsvTemplate() {
  const headers = [
    "produto",
    "categoria",
    "unidade",
    "quantidade",
    "estoque_minimo",
    "custo_unitario",
    "validade",
    "fornecedor",
    "observacoes",
  ];
  const example = [
    "Polpa de acai",
    "Ingredientes",
    "kg",
    "20",
    "10",
    "4.80",
    "2026-07-30",
    "Fornecedor principal",
    "Congelador 1",
  ];
  const csv = [headers, example].map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, "modelo-estoque-acai.csv");
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
      persist();
      render();
    } catch (error) {
      alert("Nao foi possivel importar este ficheiro. Usa JSON exportado pela app ou CSV com o modelo indicado.");
    } finally {
      elements.importFile.value = "";
    }
  });
  reader.readAsText(file);
}

function importJsonItems(content) {
  const data = JSON.parse(content);
  if (!Array.isArray(data.items)) throw new Error("Formato invalido");
  return {
    items: data.items.map(normalizeItem),
    movements: Array.isArray(data.movements) ? data.movements : [],
  };
}

function importCsvItems(content) {
  const rows = parseCsv(content).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) throw new Error("CSV vazio");

  const headers = rows[0].map(normalizeHeader);
  const importedItems = rows
    .slice(1)
    .map((row) => rowToItem(headers, row))
    .filter((item) => item.name.trim());

  if (importedItems.length === 0) throw new Error("CSV sem produtos");
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
    minimum: data.estoque_minimo || data.minimo || data.minimum || data.min,
    unitCost: data.custo_unitario || data.custo || data.unit_cost || data.unitcost,
    expiresAt: normalizeDate(data.validade || data.expires_at || data.expiresat),
    supplier: data.fornecedor || data.supplier,
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
    if (!options.quietSuccess) {
      setSyncStatus(`Notion sincronizado${database}: ${result.created} criados, ${result.updated} atualizados.${skipped}`, "success");
    }
    return result;
  } catch (error) {
    setSyncStatus(error.message || "Nao foi possivel sincronizar com o Notion.", "error");
    if (options.throwOnError) throw error;
    return null;
  } finally {
    elements.syncButton.disabled = false;
  }
}

async function saveDailyCounts() {
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

  for (const update of updates) {
    const counted = roundQuantity(numberValue(update.value));
    const previous = update.item.quantity;
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
  movements = movements.slice(0, 60);

  persist();
  render();
  setSyncStatus(`${updates.length} contagens guardadas. A sincronizar com o Notion...`, "warning");

  try {
    await syncWithNotion({ message: "A enviar contagem para o Notion...", quietSuccess: true, throwOnError: true });
    setSyncStatus(`${updates.length} contagens guardadas e sincronizadas com o Notion.`, "success");
  } catch {
    setSyncStatus(`${updates.length} contagens guardadas nesta app. A sincronizacao com Notion falhou.`, "error");
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

function setSyncStatus(message, tone) {
  elements.syncBanner.hidden = false;
  elements.syncBanner.className = `sync-banner ${tone}`;
  elements.syncStatus.textContent = message;
}

function normalizeItem(item) {
  return {
    id: item.id || crypto.randomUUID(),
    name: String(item.name || "Produto sem nome"),
    category: item.category || "Outros",
    unit: item.unit || "un",
    quantity: numberValue(item.quantity),
    minimum: numberValue(item.minimum),
    unitCost: numberValue(item.unitCost),
    expiresAt: item.expiresAt || "",
    supplier: item.supplier || "",
    notes: item.notes || "",
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
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
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
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
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(,|$))/g, "")
    .replace(",", ".");
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

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(dateText) {
  if (!dateText) return "Sem data";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(`${dateText}T00:00:00`));
}

function formatDateTime(dateText) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateText));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}
