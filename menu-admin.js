if (window.location.protocol === "file:") window.location.replace("http://localhost:4173/menu-admin.html");

const AUTH_KEY = "acai-fast-food-auth-v1";
let auth = loadAuth();
let items = [];
let editingId = "";

const el = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));

el.loginForm.addEventListener("submit", login);
el.logoutButton.addEventListener("click", logout);
el.newProductButton.addEventListener("click", () => openProductDialog());
el.newCategoryProductButton.addEventListener("click", () => openProductDialog());
el.closeDialogButton.addEventListener("click", closeProductDialog);
el.cancelDialogButton.addEventListener("click", closeProductDialog);
el.productForm.addEventListener("submit", saveProduct);
el.deleteProductButton.addEventListener("click", deleteProduct);
el.productTableBody.addEventListener("click", handleTableClick);
el.productTableBody.addEventListener("change", handleTableChange);
el.productSearch.addEventListener("input", renderProducts);
el.categoryFilter.addEventListener("change", renderProducts);
el.centerFilter.addEventListener("change", renderProducts);
el.statusFilter.addEventListener("change", renderProducts);
el.exportButton.addEventListener("click", exportCsv);
document.querySelector(".section-tabs").addEventListener("click", switchView);
el.categoryList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-category]");
  if (!card) return;
  el.categoryFilter.value = card.dataset.category;
  showView("products"); renderProducts();
});

restoreSession();

async function restoreSession() {
  if (!auth?.token) return showLogin();
  try {
    const result = await api("/api/auth/session", { authToken: auth.token });
    auth.user = result.user; saveAuth();
    if (!["manager", "admin"].includes(result.user.role)) throw new Error("Esta área é exclusiva da gestão.");
    await loadMenu();
  } catch (error) { auth = null; saveAuth(); showLogin(error.message); }
}

async function login(event) {
  event.preventDefault(); setMessage(el.loginMessage, "A entrar…", true);
  try {
    const result = await api("/api/auth/login", { username: el.loginUsername.value.trim(), password: el.loginPassword.value });
    if (!["manager", "admin"].includes(result.user.role)) throw new Error("Este utilizador não tem acesso à gestão do menu.");
    auth = { token: result.token, user: result.user }; saveAuth(); el.loginPassword.value = ""; await loadMenu();
  } catch (error) { setMessage(el.loginMessage, error.message); }
}

async function logout() {
  const token = auth?.token; auth = null; saveAuth(); showLogin();
  if (token) try { await api("/api/auth/logout", { authToken: token }); } catch {}
}

function showLogin(message = "") { el.authOverlay.hidden = false; setMessage(el.loginMessage, message); setTimeout(() => el.loginUsername.focus(), 60); }

async function loadMenu() {
  let result = await api("/api/menu/list", { authToken: auth.token });
  if (!result.items?.length && window.ACAI_MENU?.length) {
    result = await api("/api/menu/initialize", { authToken: auth.token, items: window.ACAI_MENU });
  }
  items = Array.isArray(result.items) ? result.items : [];
  el.authOverlay.hidden = true; renderAll();
}

function renderAll() {
  const categories = [...new Set(items.map((item) => item.category))].sort(localeSort);
  el.categoryFilter.innerHTML = '<option value="">Todas as categorias</option>' + categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("");
  el.categoryOptions.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
  el.productCount.textContent = items.length; el.categoryCount.textContent = categories.length;
  el.totalProducts.textContent = items.length;
  el.activeProducts.textContent = items.filter((item) => item.active !== false).length;
  el.inactiveProducts.textContent = items.filter((item) => item.active === false).length;
  el.averagePrice.textContent = money(items.reduce((sum, item) => sum + Number(item.price || 0), 0) / Math.max(items.length, 1));
  renderProducts(); renderCategories();
}

function filteredItems() {
  const query = normalize(el.productSearch.value);
  return items.filter((item) => {
    if (query && !normalize(`${item.name} ${item.code} ${item.variant}`).includes(query)) return false;
    if (el.categoryFilter.value && item.category !== el.categoryFilter.value) return false;
    if (el.centerFilter.value && item.productionCenter !== el.centerFilter.value) return false;
    if (el.statusFilter.value === "active" && item.active === false) return false;
    if (el.statusFilter.value === "inactive" && item.active !== false) return false;
    return true;
  }).sort((a, b) => localeSort(a.category, b.category) || localeSort(a.name, b.name));
}

function renderProducts() {
  const visible = filteredItems();
  el.productTableBody.innerHTML = visible.map((item) => `
    <tr>
      <td><div class="product-cell"><span class="product-icon">${escapeHtml(item.icon || "•")}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.variant || "Sem descrição")}</small></span></div></td>
      <td class="code">${escapeHtml(item.code || "—")}</td>
      <td>${escapeHtml(item.category)}</td>
      <td><span class="badge center-${escapeHtml(item.productionCenter)}">${escapeHtml(item.productionCenter)}</span></td>
      <td><label class="switch" title="Mostrar ou ocultar no Caixa"><input data-toggle-id="${escapeHtml(item.id)}" type="checkbox" ${item.active !== false ? "checked" : ""} /><i></i></label></td>
      <td class="price">${money(item.price)}</td>
      <td><div class="row-actions"><button data-edit-id="${escapeHtml(item.id)}" type="button" title="Editar produto">✎</button></div></td>
    </tr>`).join("");
  el.emptyState.hidden = visible.length > 0;
  el.resultCount.textContent = `${visible.length} produto${visible.length === 1 ? "" : "s"}`;
}

function renderCategories() {
  const grouped = new Map();
  for (const item of items) grouped.set(item.category, [...(grouped.get(item.category) || []), item]);
  el.categoryList.innerHTML = [...grouped.entries()].sort(([a], [b]) => localeSort(a, b)).map(([category, products]) => `
    <button class="category-card" data-category="${escapeHtml(category)}" type="button"><span><strong>${escapeHtml(category)}</strong><small>${products.filter((item) => item.active !== false).length} à venda de ${products.length}</small></span><span>${products.length}</span></button>`).join("");
}

function openProductDialog(item = null) {
  editingId = item?.id || ""; el.productForm.reset();
  el.dialogEyebrow.textContent = item ? "Editar produto" : "Novo produto";
  el.dialogTitle.textContent = item ? item.name : "Acrescentar ao menu";
  el.deleteProductButton.hidden = !item;
  el.productName.value = item?.name || ""; el.productPrice.value = item?.price ?? ""; el.productCode.value = item?.code || "";
  el.productCategory.value = item?.category || ""; el.productCenter.value = item?.productionCenter || "Cozinha"; el.productIcon.value = item?.icon || "";
  el.productVariant.value = item?.variant || ""; el.productActive.checked = item?.active !== false; setMessage(el.formMessage, "");
  el.productDialog.showModal(); setTimeout(() => el.productName.focus(), 50);
}

function closeProductDialog() { el.productDialog.close(); editingId = ""; }

async function saveProduct(event) {
  event.preventDefault(); setMessage(el.formMessage, "A guardar…", true); el.saveProductButton.disabled = true;
  const wasEditing = Boolean(editingId);
  const existing = items.find((item) => item.id === editingId);
  const item = { ...existing, id: editingId || undefined, name: el.productName.value, price: el.productPrice.value, code: el.productCode.value, category: el.productCategory.value, productionCenter: el.productCenter.value, icon: el.productIcon.value || "•", variant: el.productVariant.value, active: el.productActive.checked };
  try {
    const result = await api("/api/menu/save", { authToken: auth.token, item }); items = result.items; closeProductDialog(); renderAll(); toast(wasEditing ? "Produto atualizado" : "Produto acrescentado ao menu");
  } catch (error) { setMessage(el.formMessage, error.message); }
  finally { el.saveProductButton.disabled = false; }
}

async function deleteProduct() {
  const item = items.find((entry) => entry.id === editingId); if (!item) return;
  if (!confirm(`Eliminar “${item.name}” do menu? Esta ação não pode ser anulada.`)) return;
  try { const result = await api("/api/menu/delete", { authToken: auth.token, itemId: item.id }); items = result.items; closeProductDialog(); renderAll(); toast("Produto eliminado"); }
  catch (error) { setMessage(el.formMessage, error.message); }
}

function handleTableClick(event) { const button = event.target.closest("[data-edit-id]"); if (button) openProductDialog(items.find((item) => item.id === button.dataset.editId)); }

async function handleTableChange(event) {
  const input = event.target.closest("[data-toggle-id]"); if (!input) return;
  input.disabled = true;
  try { const result = await api("/api/menu/toggle", { authToken: auth.token, itemId: input.dataset.toggleId, active: input.checked }); items = result.items; renderAll(); toast(input.checked ? "Produto disponível no Caixa" : "Produto ocultado do Caixa"); }
  catch (error) { input.checked = !input.checked; toast(error.message); }
  finally { input.disabled = false; }
}

function switchView(event) { const button = event.target.closest("[data-view]"); if (button) showView(button.dataset.view); }
function showView(view) { document.querySelectorAll(".section-tabs [data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view)); el.productsView.hidden = view !== "products"; el.categoriesView.hidden = view !== "categories"; }

function exportCsv() {
  const rows = [["Produto","Código","Categoria","Centro de produção","À venda","Preço","Descrição"], ...filteredItems().map((item) => [item.name,item.code,item.category,item.productionCenter,item.active !== false ? "Sim" : "Não",Number(item.price).toFixed(2),item.variant])];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"','""')}"`).join(";")).join("\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type:"text/csv;charset=utf-8" })); link.download = `menu-acai-fast-food-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
}

async function api(url, body) { const response = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) }); const result = await response.json().catch(() => ({})); if (!response.ok) { const error = new Error(result.error || "Não foi possível concluir a operação."); error.status = response.status; throw error; } return result; }
function loadAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; } }
function saveAuth() { if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); else localStorage.removeItem(AUTH_KEY); }
function setMessage(node, message, success = false) { node.textContent = message || ""; node.classList.toggle("success", success); }
function toast(message) { el.toast.textContent = message; el.toast.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => el.toast.hidden = true, 2600); }
function money(value) { return new Intl.NumberFormat("pt-PT", { style:"currency", currency:"EUR" }).format(Number(value || 0)); }
function localeSort(a, b) { return String(a).localeCompare(String(b), "pt", { sensitivity:"base" }); }
function normalize(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[character]); }
