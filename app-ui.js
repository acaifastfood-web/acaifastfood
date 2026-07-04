(function () {
  const icons = {
    dashboard:
      '<path d="M4 13h7V4H4v9Z"/><path d="M13 20h7V4h-7v16Z"/><path d="M4 20h7v-5H4v5Z"/>',
    stock:
      '<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    alert:
      '<path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 8v5"/><path d="M12 17h.01"/>',
    production:
      '<path d="M4 17h16"/><path d="M6 17V9a6 6 0 0 1 12 0v8"/><path d="M9 9h6"/><path d="M9 13h6"/>',
    movement:
      '<path d="M7 7h10l-3-3"/><path d="M17 17H7l3 3"/><path d="M17 7l-10 10"/>',
    sales:
      '<path d="M4 19V5"/><path d="M8 19v-7"/><path d="M12 19v-9"/><path d="M16 19v-4"/><path d="M20 19V8"/>',
    orders:
      '<path d="M6 3h12v18H6z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h4"/>',
    more:
      '<path d="M12 12h.01"/><path d="M19 12h.01"/><path d="M5 12h.01"/>',
    bell:
      '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    arrow:
      '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    search:
      '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    plus:
      '<path d="M12 5v14"/><path d="M5 12h14"/>',
    check:
      '<path d="m20 6-11 11-5-5"/>',
    notion:
      '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>',
    external:
      '<path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
  };

  function icon(name) {
    const paths = icons[name] || icons.dashboard;
    return `<svg class="ui-icon" aria-hidden="true" viewBox="0 0 24 24">${paths}</svg>`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return entities[char];
    });
  }

  function nodeFromHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  function StatCard({ iconName = "dashboard", value = "0", label = "", description = "", tone = "purple", action = "" }) {
    return nodeFromHtml(`
      <button class="stat-card tone-${escapeHtml(tone)}" type="button" ${action ? `data-action="${escapeHtml(action)}"` : ""}>
        <span class="stat-card-icon">${icon(iconName)}</span>
        <span class="stat-card-value">${escapeHtml(value)}</span>
        <span class="stat-card-label">${escapeHtml(label)}</span>
        <span class="stat-card-description">${escapeHtml(description)}</span>
        <span class="stat-card-arrow">${icon("arrow")}</span>
      </button>
    `);
  }

  function CriticalStockList({ items = [], limit = 4, emptyText = "Sem itens críticos." }) {
    const rows = items.slice(0, limit).map((item) => {
      const minimum = Math.max(Number(item.minimum || 0), Number(item.dailyMinimum || 0), 1);
      const quantity = Number(item.quantity || 0);
      const progress = Math.max(0, Math.min(100, Math.round((quantity / minimum) * 100)));
      const initials = String(item.name || "?").trim().slice(0, 2).toUpperCase();
      return `
        <article class="critical-row">
          <span class="critical-thumb">${escapeHtml(initials)}</span>
          <div class="critical-main">
            <strong>${escapeHtml(item.name || "Produto")}</strong>
            <div class="stock-progress" aria-label="Progresso de estoque">
              <span style="width: ${progress}%"></span>
            </div>
          </div>
          <div class="critical-numbers">
            <strong>${escapeHtml(formatNumber(quantity))}</strong>
            <span>min. ${escapeHtml(formatNumber(minimum))}</span>
          </div>
        </article>
      `;
    });

    if (rows.length === 0) {
      rows.push(`<div class="mini-empty">${escapeHtml(emptyText)}</div>`);
    }
    return nodeFromHtml(`<div class="critical-list">${rows.join("")}</div>`);
  }

  function QuickActionButton({ iconName = "plus", label = "", tone = "purple", action = "" }) {
    return nodeFromHtml(`
      <button class="quick-action tone-${escapeHtml(tone)}" type="button" ${action ? `data-action="${escapeHtml(action)}"` : ""}>
        <span>${icon(iconName)}</span>
        <strong>${escapeHtml(label)}</strong>
      </button>
    `);
  }

  function DailySummaryCard({ sales = "0,00 EUR", orders = "0", ticket = "0,00 EUR", topProducts = "Sem dados" }) {
    return nodeFromHtml(`
      <div class="daily-summary-grid">
        <div><span>Vendas no mês</span><strong>${escapeHtml(sales)}</strong></div>
        <div><span>Pedidos no mês</span><strong>${escapeHtml(orders)}</strong></div>
        <div><span>Ticket médio</span><strong>${escapeHtml(ticket)}</strong></div>
        <div class="daily-summary-wide"><span>Mais vendidos</span><strong>${escapeHtml(topProducts)}</strong></div>
      </div>
    `);
  }

  function BottomNavigation({ items = [], active = "" }) {
    const buttons = items
      .map(
        (item) => `
          <button class="bottom-nav-item${item.id === active ? " active" : ""}" type="button" data-nav-target="${escapeHtml(item.id)}" ${
            item.view ? `data-view-target="${escapeHtml(item.view)}"` : ""
          }>
            ${icon(item.iconName || "dashboard")}
            <span>${escapeHtml(item.label)}</span>
          </button>
        `,
      )
      .join("");
    return nodeFromHtml(`<nav class="bottom-navigation" aria-label="Navegação principal">${buttons}</nav>`);
  }

  function AppHeader({ greeting = "", subtitle = "", logo = "logo-acai.png" }) {
    return nodeFromHtml(`
      <div class="app-header-content">
        <img class="app-logo" src="${escapeHtml(logo)}" alt="Acai Fast Food" />
        <div class="app-header-copy">
          <p class="eyebrow">${escapeHtml(subtitle)}</p>
          <h1>${escapeHtml(greeting)}</h1>
        </div>
      </div>
    `);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  window.AcaiUI = {
    AppHeader,
    BottomNavigation,
    CriticalStockList,
    DailySummaryCard,
    QuickActionButton,
    StatCard,
    icon,
  };
})();
