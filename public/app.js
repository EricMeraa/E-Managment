const state = {
  checkoutBusy: false,
  cartItems: [],
  authMode: "login",
  authBusy: false,
  isAuthenticated: false,
  userRole: "CUSTOMER",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clearStatus() {
  const banner = document.getElementById("statusBanner");
  if (!banner) return;
  banner.textContent = "";
  banner.className = "status-banner";
}

function showStatus(message, isError = false) {
  const banner = document.getElementById("statusBanner");
  if (!banner) return;
  banner.textContent = message;
  banner.className = isError ? "status-banner err" : "status-banner ok";
}

function clearInlineAlert(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = "";
  el.className = "inline-alert";
}

function showInlineAlert(elementId, message, isError = true) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = isError ? "inline-alert err" : "inline-alert ok";
}

function isCartOpen() {
  const drawer = document.getElementById("cartDrawer");
  return Boolean(drawer && drawer.classList.contains("open"));
}

function isAuthModalOpen() {
  const modal = document.getElementById("authModal");
  return Boolean(modal && modal.style.display !== "none" && modal.style.display !== "");
}

function routeActionMessage(message, isError = true, preferredInlineId = "") {
  if (preferredInlineId && document.getElementById(preferredInlineId)) {
    showInlineAlert(preferredInlineId, message, isError);
    if (isError) clearStatus();
    return;
  }
  if (isAuthModalOpen()) {
    showInlineAlert("authStatusBanner", message, isError);
    if (isError) clearStatus();
    return;
  }
  if (isCartOpen()) {
    showInlineAlert("cartStatusBanner", message, isError);
    if (isError) clearStatus();
    return;
  }
  showStatus(message, isError);
}

async function parseResponseBody(res) {
  const rawText = await res.text();
  if (!rawText) return {};
  try {
    const parsed = JSON.parse(rawText);
    return parsed !== null && typeof parsed === "object" ? parsed : {};
  } catch (_err) {
    return { error: rawText };
  }
}

function openCartDrawer() {
  const modal = document.getElementById("authModal");
  const backdrop = document.getElementById("overlayBackdrop");
  const drawer = document.getElementById("cartDrawer");
  if (modal) modal.style.display = "none";
  if (backdrop) backdrop.style.display = "block";
  if (drawer) {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const modal = document.getElementById("authModal");
  const backdrop = document.getElementById("overlayBackdrop");
  clearInlineAlert("cartStatusBanner");
  if (drawer) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }
  if (backdrop && (!modal || modal.style.display === "none")) {
    backdrop.style.display = "none";
  }
}

function resetPasswordVisibility() {
  const passwordEl = document.getElementById("authPassword");
  const toggleBtn = document.getElementById("btnTogglePassword");
  if (passwordEl) {
    passwordEl.type = "password";
    passwordEl.value = "";
  }
  if (toggleBtn) {
    toggleBtn.textContent = "Mostrar";
    toggleBtn.setAttribute("aria-pressed", "false");
  }
}

function togglePasswordVisibility() {
  const passwordEl = document.getElementById("authPassword");
  const toggleBtn = document.getElementById("btnTogglePassword");
  if (!passwordEl || !toggleBtn) return;

  const isHidden = passwordEl.type === "password";
  passwordEl.type = isHidden ? "text" : "password";
  toggleBtn.textContent = isHidden ? "Ocultar" : "Mostrar";
  toggleBtn.setAttribute("aria-pressed", isHidden ? "true" : "false");
}

function openAuthModal(mode = "login", prefillError = "") {
  closeCartDrawer();
  clearStatus();
  clearInlineAlert("authStatusBanner");
  const backdrop = document.getElementById("overlayBackdrop");
  const modal = document.getElementById("authModal");
  if (backdrop) backdrop.style.display = "block";
  if (modal) modal.style.display = "flex";
  setAuthMode(mode);
  if (prefillError) {
    showInlineAlert("authStatusBanner", prefillError, true);
  }
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("overlayBackdrop");
  clearInlineAlert("authStatusBanner");
  resetPasswordVisibility();
  if (modal) modal.style.display = "none";
  if (backdrop && (!drawer || !drawer.classList.contains("open"))) {
    backdrop.style.display = "none";
  }
}

function closeAllOverlays() {
  closeCartDrawer();
  closeAuthModal();
  const backdrop = document.getElementById("overlayBackdrop");
  if (backdrop) backdrop.style.display = "none";
}

function setAuthMode(mode) {
  state.authMode = mode;
  clearInlineAlert("authStatusBanner");
  resetPasswordVisibility();
  const isRegister = mode === "register";
  const authTitle = document.getElementById("authTitle");
  const nameGroup = document.getElementById("nameFieldGroup");
  const roleGroup = document.getElementById("roleFieldGroup");
  const submitBtn = document.getElementById("btnAuthSubmit");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");

  if (authTitle) authTitle.textContent = isRegister ? "Crear cuenta" : "Iniciar sesión";
  if (nameGroup) nameGroup.style.display = isRegister ? "flex" : "none";
  if (roleGroup) roleGroup.style.display = isRegister ? "flex" : "none";
  if (submitBtn) submitBtn.textContent = isRegister ? "Registrarme" : "Entrar";
  if (tabLogin) tabLogin.className = isRegister ? "auth-tab" : "auth-tab active";
  if (tabRegister) tabRegister.className = isRegister ? "auth-tab active" : "auth-tab";

  const focusTarget = isRegister
    ? document.getElementById("authName")
    : document.getElementById("authEmail");
  if (focusTarget) focusTarget.focus();
}

function setAuthenticatedUI(isAuthenticated, label = "", role = "CUSTOMER") {
  state.isAuthenticated = isAuthenticated;
  state.userRole = isAuthenticated && role === "ADMIN" ? "ADMIN" : "CUSTOMER";

  const openAuthBtn = document.getElementById("btnOpenAuth");
  const logoutBtn = document.getElementById("btnLogout");
  const adminBtn = document.getElementById("btnAdminPanel");
  const badge = document.getElementById("userBadge");

  if (openAuthBtn) openAuthBtn.style.display = isAuthenticated ? "none" : "inline-block";
  if (logoutBtn) logoutBtn.style.display = isAuthenticated ? "inline-block" : "none";
  if (adminBtn) {
    adminBtn.style.display = isAuthenticated && state.userRole === "ADMIN" ? "inline-block" : "none";
  }

  if (badge) {
    if (isAuthenticated && label) {
      badge.textContent = state.userRole === "ADMIN" ? `${label} · ADMIN` : label;
      badge.style.display = "inline-block";
    } else {
      badge.textContent = "";
      badge.style.display = "none";
    }
  }
}

function consumeAuthRedirectQuery() {
  const params = new URLSearchParams(window.location.search);
  const needsAuth = params.get("authRequired") === "1";
  const nextRaw = params.get("next") || "";
  if (!needsAuth) return;

  window.history.replaceState({}, "", "/index.html");
  if (!state.isAuthenticated) {
    if (nextRaw.startsWith("/catalogo.html")) {
      window.sessionStorage.setItem("e_managment_next_url", nextRaw);
    }
    openAuthModal("login", "Inicia sesión para entrar al catálogo.");
  }
}

function goToCatalog(options = {}) {
  const params = new URLSearchParams();
  if (typeof options.department === "string" && options.department !== "ALL") {
    params.set("dept", options.department);
  }
  if (typeof options.onlyNew === "boolean" && options.onlyNew) {
    params.set("onlyNew", "true");
  }
  const qs = params.toString();
  const targetUrl = qs ? `/catalogo.html?${qs}` : "/catalogo.html";

  if (!state.isAuthenticated) {
    window.sessionStorage.setItem("e_managment_next_url", targetUrl);
    openAuthModal("login", "Inicia sesión para entrar al catálogo.");
    return;
  }

  window.location.href = targetUrl;
}

function renderNewOnlyMedia(item, brandText, categoryText) {
  const rawImageUrl = typeof item?.imageUrl === "string" ? item.imageUrl.trim() : "";
  const safeName = escapeHtml(item?.name || "Prenda");
  const safeBrand = escapeHtml(brandText);
  const safeCategory = escapeHtml(categoryText);

  if (rawImageUrl) {
    const safeUrl = escapeHtml(rawImageUrl);
    return (
      '<img src="' +
      safeUrl +
      '" alt="' +
      safeName +
      '" class="product-visual-img" loading="lazy" ' +
      "onerror=\"this.classList.add('is-hidden'); const fb = this.nextElementSibling; if (fb) fb.classList.add('is-visible');\" />" +
      '<div class="visual-center product-visual-fallback">' +
      '<span class="visual-category">' +
      safeCategory +
      "</span>" +
      '<span class="visual-monogram">' +
      safeBrand.toUpperCase() +
      "</span>" +
      "</div>"
    );
  }

  return (
    '<div class="visual-center">' +
    '<span class="visual-category">' +
    safeCategory +
    "</span>" +
    '<span class="visual-monogram">' +
    safeBrand.toUpperCase() +
    "</span>" +
    "</div>"
  );
}

function renderNewOnlyProducts(products) {
  const container = document.getElementById("newOnlyContainer");
  const countEl = document.getElementById("newOnlyCount");
  if (!container) return;
  container.innerHTML = "";

  // Solo prendas marcadas como nuevas y con existencia disponible (BR-01)
  const newOnlyList = (Array.isArray(products) ? products : []).filter(
    (item) => Boolean(item?.isNew) === true && Number(item?.stock ?? 0) > 0
  );

  if (countEl) {
    countEl.textContent = newOnlyList.length + (newOnlyList.length === 1 ? " pieza" : " piezas");
  }

  if (newOnlyList.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No hay prendas nuevas disponibles por ahora.</div>';
    return;
  }

  for (const item of newOnlyList) {
    const card = document.createElement("article");
    card.className = "product-card";
    const stockNum = Number(item.stock ?? 0);
    const priceNum = Number(item.price || 0).toFixed(2);
    const brandText = String(item.brand || "E-MANAGMENT");
    const categoryText = String(item.category || "PRENDA");
    const hasImage = typeof item?.imageUrl === "string" && item.imageUrl.trim().length > 0;

    card.innerHTML =
      "<div>" +
      '<div class="product-visual' +
      (hasImage ? " has-photo" : "") +
      '">' +
      '<div class="visual-top">' +
      '<span class="tag-pill">Nuevo</span>' +
      '<span class="tag-pill">Talla ' +
      escapeHtml(item.size) +
      "</span>" +
      "</div>" +
      renderNewOnlyMedia(item, brandText, categoryText) +
      '<div class="visual-bottom">' +
      "<span>Color: " +
      escapeHtml(item.color) +
      "</span>" +
      "<span>Disp: " +
      escapeHtml(stockNum) +
      "</span>" +
      "</div>" +
      "</div>" +
      '<div class="product-title-row">' +
      "<h3>" +
      escapeHtml(item.name) +
      "</h3>" +
      '<span class="product-price">$' +
      priceNum +
      "</span>" +
      "</div>" +
      '<p class="product-specs">' +
      escapeHtml(brandText) +
      " · " +
      escapeHtml(categoryText) +
      " · " +
      escapeHtml(item.color) +
      "</p>" +
      "</div>" +
      '<button type="button" class="btn-outline full-width" data-open-new-catalog="1">' +
      "Entrar al catálogo" +
      "</button>";

    container.appendChild(card);
  }
}

async function loadNewOnlyProducts() {
  try {
    const res = await fetch("/api/products?onlyNew=true", { credentials: "same-origin" });
    if (!res.ok) {
      renderNewOnlyProducts([]);
      return;
    }
    const data = await parseResponseBody(res);
    const items = Array.isArray(data) ? data : [];
    renderNewOnlyProducts(items);
  } catch (_err) {
    renderNewOnlyProducts([]);
  }
}

function renderCart(cart) {
  const itemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  const countEl = document.getElementById("cartCount");
  const items = Array.isArray(cart?.items) ? cart.items : [];
  state.cartItems = items;

  const totalUnits = items.reduce((acc, item) => acc + Number(item.quantity ?? 0), 0);
  if (countEl) countEl.textContent = String(totalUnits);

  if (itemsEl) {
    itemsEl.innerHTML = "";
    if (items.length === 0) {
      itemsEl.innerHTML = '<p class="cart-row-meta">El carrito está vacío.</p>';
    } else {
      for (const item of items) {
        const row = document.createElement("div");
        row.className = "cart-row";
        const unitPrice = Number(item.unitPrice ?? 0).toFixed(2);
        const subtotal = Number(
          item.subtotal ?? Number(item.unitPrice ?? 0) * Number(item.quantity ?? 1)
        ).toFixed(2);
        row.innerHTML =
          "<div>" +
          '<strong class="cart-row-title">' +
          escapeHtml(item.name || item.productId) +
          "</strong>" +
          '<div class="cart-row-meta">Cant: ' +
          escapeHtml(item.quantity) +
          " · $" +
          unitPrice +
          " c/u</div>" +
          '<div class="cart-row-meta">Subtotal: $' +
          subtotal +
          "</div>" +
          "</div>" +
          '<button type="button" class="btn-text" data-remove-id="' +
          escapeHtml(item.productId) +
          '">Quitar</button>';
        itemsEl.appendChild(row);
      }
    }
  }

  const total = Number(cart?.total ?? 0).toFixed(2);
  if (totalEl) totalEl.textContent = "$" + total;
}

async function loadCart() {
  try {
    const res = await fetch("/api/cart", { credentials: "same-origin" });
    if (res.status === 401) {
      renderCart({ items: [], total: 0 });
      return;
    }
    const data = await parseResponseBody(res);
    if (res.ok) {
      renderCart(data);
    } else {
      routeActionMessage(
        data.error || `No se pudo consultar el carrito (HTTP ${res.status}).`,
        true,
        "cartStatusBanner"
      );
    }
  } catch (_err) {
    routeActionMessage("Sin conexión con el servidor al consultar el carrito.", true, "cartStatusBanner");
  }
}

async function removeFromCart(productId) {
  try {
    const res = await fetch("/api/cart/items/" + encodeURIComponent(productId), {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await parseResponseBody(res);
    if (res.status === 401) {
      openAuthModal("login", "Debes iniciar sesión para modificar el carrito.");
      return;
    }
    if (!res.ok) {
      showInlineAlert(
        "cartStatusBanner",
        data.error || `No se pudo quitar la prenda (HTTP ${res.status}).`,
        true
      );
      return;
    }
    clearInlineAlert("cartStatusBanner");
    renderCart(data);
    showInlineAlert("cartStatusBanner", "Prenda retirada del carrito.", false);
  } catch (_err) {
    showInlineAlert("cartStatusBanner", "Sin conexión con el servidor al quitar la prenda.", true);
  }
}

async function submitAuth() {
  if (state.authBusy) return;
  clearInlineAlert("authStatusBanner");

  const nameEl = document.getElementById("authName");
  const emailEl = document.getElementById("authEmail");
  const passwordEl = document.getElementById("authPassword");
  const roleEl = document.getElementById("authRole");
  const submitBtn = document.getElementById("btnAuthSubmit");

  const name = nameEl ? nameEl.value.trim() : "";
  const email = emailEl ? emailEl.value.trim() : "";
  const password = passwordEl ? passwordEl.value : "";
  const role = roleEl ? roleEl.value : "CUSTOMER";

  if (state.authMode === "register" && name.length < 2) {
    showInlineAlert("authStatusBanner", "El nombre debe tener al menos 2 caracteres.", true);
    return;
  }

  if (!email) {
    showInlineAlert("authStatusBanner", "Ingresa tu correo electrónico.", true);
    return;
  }

  if (state.authMode === "register" && !email.includes("@")) {
    showInlineAlert("authStatusBanner", "El correo electrónico no es válido.", true);
    return;
  }

  if (!password) {
    showInlineAlert("authStatusBanner", "Ingresa tu contraseña.", true);
    return;
  }

  if (state.authMode === "register" && password.trim().length < 6) {
    showInlineAlert("authStatusBanner", "La contraseña debe tener al menos 6 caracteres.", true);
    return;
  }

  state.authBusy = true;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const isRegister = state.authMode === "register";
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegister ? { name, email, password, role } : { email, password };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = await parseResponseBody(res);

    if (!res.ok) {
      showInlineAlert(
        "authStatusBanner",
        data.error || `No se pudo completar la autenticación (HTTP ${res.status}).`,
        true
      );
      return;
    }

    const userLabel = String(data.name || data.email || "Usuario");
    const userRole = String(data.role || "CUSTOMER").toUpperCase();
    setAuthenticatedUI(true, userLabel, userRole);
    resetPasswordVisibility();
    closeAllOverlays();

    if (userRole === "ADMIN") {
      window.sessionStorage.removeItem("e_managment_next_url");
      window.location.href = "/admin.html";
      return;
    }

    const pendingNext = window.sessionStorage.getItem("e_managment_next_url");
    if (pendingNext && pendingNext.startsWith("/catalogo.html")) {
      window.sessionStorage.removeItem("e_managment_next_url");
      window.location.href = pendingNext;
      return;
    }

    showStatus((isRegister ? "Cuenta creada como " : "Sesión iniciada como ") + userLabel + ".", false);
    await loadCart();
  } catch (_err) {
    showInlineAlert("authStatusBanner", "Sin conexión con el servidor al autenticar usuario.", true);
  } finally {
    state.authBusy = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function logoutUser() {
  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (res.ok) {
      setAuthenticatedUI(false);
      renderCart({ items: [], total: 0 });
      closeAllOverlays();
      showStatus("Sesión cerrada.", false);
    } else {
      const data = await parseResponseBody(res);
      routeActionMessage(data.error || `No se pudo cerrar sesión (HTTP ${res.status}).`, true);
    }
  } catch (_err) {
    routeActionMessage("Sin conexión con el servidor al cerrar sesión.", true);
  }
}

async function checkoutOrder() {
  if (state.checkoutBusy) return;
  clearInlineAlert("cartStatusBanner");
  state.checkoutBusy = true;
  const btn = document.getElementById("btnCheckout");
  if (btn) btn.disabled = true;

  try {
    const paymentSelect = document.getElementById("paymentMethod");
    const paymentMethod = paymentSelect ? paymentSelect.value : "TARJETA";
    const normalizedItems = (Array.isArray(state.cartItems) ? state.cartItems : [])
      .map((item) => ({
        productId: String(item.productId ?? ""),
        quantity: Number(item.quantity ?? 0),
      }))
      .filter((item) => item.productId.length > 0 && Number.isInteger(item.quantity) && item.quantity > 0);

    if (normalizedItems.length === 0) {
      showInlineAlert("cartStatusBanner", "Tu carrito está vacío.", true);
      return;
    }

    const res = await fetch("/api/orders/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ paymentMethod, items: normalizedItems }),
    });
    const data = await parseResponseBody(res);

    if (res.status === 401) {
      openAuthModal("login", data.error || "Inicia sesión antes de finalizar tu compra.");
      return;
    }

    if (!res.ok) {
      showInlineAlert(
        "cartStatusBanner",
        data.error ||
          (res.status >= 500
            ? "Se perdió la conexión o falló el servidor al finalizar la compra; la operación no se registró."
            : `No se pudo completar la compra (HTTP ${res.status}).`),
        true
      );
      return;
    }

    renderCart({ items: [], total: 0 });
    closeAllOverlays();
    showStatus("Compra registrada con éxito. Orden: " + String(data.id || ""), false);
  } catch (_networkErr) {
    showInlineAlert(
      "cartStatusBanner",
      "Se perdió la conexión al finalizar la compra; la operación no se registró.",
      true
    );
  } finally {
    state.checkoutBusy = false;
    if (btn) btn.disabled = false;
  }
}

async function restoreSession() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!res.ok) {
      setAuthenticatedUI(false);
      return;
    }
    const user = await parseResponseBody(res);
    const label = String(user?.name || user?.email || "Usuario");
    const role = String(user?.role || "CUSTOMER").toUpperCase();
    setAuthenticatedUI(true, label, role);
  } catch (_err) {
    setAuthenticatedUI(false);
  }
}

document.getElementById("btnFilterWoman")?.addEventListener("click", () => goToCatalog({ department: "WOMAN" }));
document.getElementById("btnFilterMan")?.addEventListener("click", () => goToCatalog({ department: "MAN" }));
document.getElementById("btnAllProducts")?.addEventListener("click", () => goToCatalog({ onlyNew: false, department: "ALL" }));
document.getElementById("btnNewProducts")?.addEventListener("click", () => goToCatalog({ onlyNew: true }));
document.getElementById("btnViewAllNew")?.addEventListener("click", () => goToCatalog({ onlyNew: true }));
document.getElementById("brandCatalogLink")?.addEventListener("click", (event) => {
  event.preventDefault();
  goToCatalog({ onlyNew: false, department: "ALL" });
});
document.getElementById("btnEnterCatalog")?.addEventListener("click", (event) => {
  event.preventDefault();
  goToCatalog({ onlyNew: false, department: "ALL" });
});

document.getElementById("newOnlyContainer")?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-open-new-catalog]") : null;
  if (target) {
    goToCatalog({ onlyNew: true });
  }
});

document.getElementById("btnAdminPanel")?.addEventListener("click", () => {
  window.location.href = "/admin.html";
});

document.getElementById("btnOpenCart")?.addEventListener("click", () => {
  clearInlineAlert("cartStatusBanner");
  openCartDrawer();
});
document.getElementById("btnCloseCart")?.addEventListener("click", () => closeAllOverlays());
document.getElementById("btnOpenAuth")?.addEventListener("click", () => openAuthModal("login"));
document.getElementById("btnCloseAuth")?.addEventListener("click", () => closeAllOverlays());
document.getElementById("overlayBackdrop")?.addEventListener("click", () => closeAllOverlays());

document.getElementById("tabLogin")?.addEventListener("click", () => setAuthMode("login"));
document.getElementById("tabRegister")?.addEventListener("click", () => setAuthMode("register"));
document.getElementById("btnTogglePassword")?.addEventListener("click", () => togglePasswordVisibility());

["authName", "authEmail", "authPassword"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", () => clearInlineAlert("authStatusBanner"));
});

document.getElementById("authForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await submitAuth();
});

document.getElementById("btnLogout")?.addEventListener("click", async () => logoutUser());
document.getElementById("btnCheckout")?.addEventListener("click", async () => checkoutOrder());

document.getElementById("cartItems")?.addEventListener("click", async (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-remove-id]") : null;
  const productId = target?.getAttribute("data-remove-id");
  if (productId) {
    await removeFromCart(productId);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllOverlays();
  }
});

(async function init() {
  await restoreSession();
  consumeAuthRedirectQuery();
  await loadNewOnlyProducts();
  await loadCart();
})();