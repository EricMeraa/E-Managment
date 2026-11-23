const state = {
  onlyNew: false,
  department: "ALL",
  allCatalogCache: [],
  busyProducts: new Set(),
  checkoutBusy: false,
  logoutBusy: false,
  cartItems: [],
  authMode: "login",
  authBusy: false,
  isAuthenticated: false,
  userRole: "CUSTOMER",
};

function readInitialFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const rawDept = String(params.get("dept") || "ALL").toUpperCase();
  if (rawDept === "WOMAN" || rawDept === "MAN") {
    state.department = rawDept;
  } else {
    state.department = "ALL";
  }
  state.onlyNew = params.get("onlyNew") === "true";
}

function updateUrlQuery() {
  const params = new URLSearchParams();
  if (state.department !== "ALL") {
    params.set("dept", state.department);
  }
  if (state.onlyNew) {
    params.set("onlyNew", "true");
  }
  const queryStr = params.toString();
  const nextUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

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

function isLogoutConfirmOpen() {
  const modal = document.getElementById("logoutConfirmModal");
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
  const confirmModal = document.getElementById("logoutConfirmModal");
  const backdrop = document.getElementById("overlayBackdrop");
  const drawer = document.getElementById("cartDrawer");
  if (modal) modal.style.display = "none";
  if (confirmModal) confirmModal.style.display = "none";
  if (backdrop) backdrop.style.display = "block";
  if (drawer) {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const modal = document.getElementById("authModal");
  const confirmModal = document.getElementById("logoutConfirmModal");
  const backdrop = document.getElementById("overlayBackdrop");
  clearInlineAlert("cartStatusBanner");
  if (drawer) {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }
  const hasOther =
    Boolean(modal && modal.style.display !== "none" && modal.style.display !== "") ||
    Boolean(confirmModal && confirmModal.style.display !== "none" && confirmModal.style.display !== "");
  if (backdrop && !hasOther) {
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
  closeLogoutConfirmModal();
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
  const confirmModal = document.getElementById("logoutConfirmModal");
  const backdrop = document.getElementById("overlayBackdrop");
  clearInlineAlert("authStatusBanner");
  resetPasswordVisibility();
  if (modal) modal.style.display = "none";
  const hasOther =
    Boolean(drawer && drawer.classList.contains("open")) ||
    Boolean(confirmModal && confirmModal.style.display !== "none" && confirmModal.style.display !== "");
  if (backdrop && !hasOther) {
    backdrop.style.display = "none";
  }
}

function openLogoutConfirmModal() {
  if (!state.isAuthenticated) return;
  closeCartDrawer();
  closeAuthModal();
  clearStatus();
  const backdrop = document.getElementById("overlayBackdrop");
  const confirmModal = document.getElementById("logoutConfirmModal");
  if (backdrop) backdrop.style.display = "block";
  if (confirmModal) confirmModal.style.display = "flex";
  document.getElementById("btnCancelLogout")?.focus();
}

function closeLogoutConfirmModal() {
  const confirmModal = document.getElementById("logoutConfirmModal");
  const drawer = document.getElementById("cartDrawer");
  const modal = document.getElementById("authModal");
  const backdrop = document.getElementById("overlayBackdrop");
  if (confirmModal) confirmModal.style.display = "none";
  const hasOther =
    Boolean(drawer && drawer.classList.contains("open")) ||
    Boolean(modal && modal.style.display !== "none" && modal.style.display !== "");
  if (backdrop && !hasOther) {
    backdrop.style.display = "none";
  }
}

function closeAllOverlays() {
  closeCartDrawer();
  closeAuthModal();
  closeLogoutConfirmModal();
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

function redirectToLoginRequired() {
  const target = new URL("/index.html", window.location.origin);
  target.searchParams.set("authRequired", "1");
  target.searchParams.set("next", `${window.location.pathname}${window.location.search}`);
  window.location.replace(target.toString());
}

function syncNavState() {
  const womanBtn = document.getElementById("btnFilterWoman");
  const manBtn = document.getElementById("btnFilterMan");
  const allBtn = document.getElementById("btnAllProducts");
  const newBtn = document.getElementById("btnNewProducts");

  if (womanBtn) womanBtn.className = state.department === "WOMAN" ? "hero-nav-btn active" : "hero-nav-btn";
  if (manBtn) manBtn.className = state.department === "MAN" ? "hero-nav-btn active" : "hero-nav-btn";
  if (allBtn) {
    allBtn.className = !state.onlyNew && state.department === "ALL" ? "hero-nav-btn active" : "hero-nav-btn";
  }
  if (newBtn) newBtn.className = state.onlyNew ? "hero-nav-btn active" : "hero-nav-btn";
}

function filterCatalogItems(products) {
  const list = Array.isArray(products) ? products : [];

  return list.filter((item) => {
    const categoryText = String(item?.category ?? "").toLowerCase();
    const isWomanItem =
      categoryText.includes("mujer") || categoryText.includes("woman") || categoryText.includes("femen");
    const isManItem =
      categoryText.includes("hombre") || categoryText.includes("man") || categoryText.includes("mascul");

    if (state.department === "WOMAN" && !isWomanItem) {
      return false;
    }

    if (state.department === "MAN" && (!isManItem || isWomanItem)) {
      return false;
    }

    if (state.onlyNew && !Boolean(item?.isNew)) {
      return false;
    }

    return true;
  });
}

function renderProductMedia(item, brandText, categoryText) {
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

function renderProducts(products) {
  const container = document.getElementById("productsContainer");
  const countEl = document.getElementById("catalogCount");
  if (!container) return;
  container.innerHTML = "";

  const list = Array.isArray(products) ? products : [];
  if (countEl) {
    countEl.textContent = list.length + (list.length === 1 ? " pieza" : " piezas");
  }

  if (list.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No hay prendas disponibles en este filtro.</div>';
    return;
  }

  for (const item of list) {
    const card = document.createElement("article");
    card.className = "product-card";
    const isBusy = state.busyProducts.has(item.id);
    const stockNum = Number(item.stock ?? 0);
    const outOfStock = stockNum <= 0;
    const priceNum = Number(item.price || 0).toFixed(2);
    const brandText = String(item.brand || "E-MANAGMENT");
    const categoryText = String(item.category || "PRENDA");
    const hasImage = typeof item?.imageUrl === "string" && item.imageUrl.trim().length > 0;

    const badgeMarkup = outOfStock
      ? '<span class="tag-pill sold-out">Agotado</span>'
      : item.isNew
      ? '<span class="tag-pill">Nuevo</span>'
      : "<span></span>";

    const buttonLabel = outOfStock
      ? "Sin existencias"
      : isBusy
      ? "Reservando..."
      : "Agregar al carrito";

    card.innerHTML =
      "<div>" +
      '<div class="product-visual' +
      (hasImage ? " has-photo" : "") +
      '">' +
      '<div class="visual-top">' +
      badgeMarkup +
      '<span class="tag-pill">Talla ' +
      escapeHtml(item.size) +
      "</span>" +
      "</div>" +
      renderProductMedia(item, brandText, categoryText) +
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
      '<p class="product-id">ID: ' +
      escapeHtml(item.id) +
      "</p>" +
      "</div>" +
      '<button type="button" class="btn-outline full-width" data-add-id="' +
      escapeHtml(item.id) +
      '"' +
      (isBusy || outOfStock ? " disabled" : "") +
      ">" +
      buttonLabel +
      "</button>";

    container.appendChild(card);
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

function updateCatalogHeader() {
  const deptLabel =
    state.department === "WOMAN"
      ? " · MUJER"
      : state.department === "MAN"
      ? " · HOMBRE"
      : "";

  const eyebrowEl = document.getElementById("catalogEyebrow");
  const titleEl = document.getElementById("catalogTitle");

  if (eyebrowEl) {
    eyebrowEl.textContent = (state.onlyNew ? "ROPA NUEVA" : "CATÁLOGO DISPONIBLE") + deptLabel;
  }
  if (titleEl) {
    titleEl.textContent = (state.onlyNew ? "Novedades" : "Colección") + deptLabel;
  }
}

async function loadProducts() {
  try {
    const query = state.onlyNew ? "?onlyNew=true" : "";
    const res = await fetch("/api/products" + query, { credentials: "same-origin" });
    if (res.status === 401) {
      redirectToLoginRequired();
      return;
    }
    const data = await parseResponseBody(res);
    if (!res.ok) {
      routeActionMessage(data.error || `No se pudo cargar el catálogo (HTTP ${res.status}).`, true);
      return;
    }

    state.allCatalogCache = Array.isArray(data) ? data : [];
    const filtered = filterCatalogItems(state.allCatalogCache);

    updateCatalogHeader();
    syncNavState();
    renderProducts(filtered);
  } catch (_err) {
    routeActionMessage("Sin conexión con el servidor al consultar productos.", true);
  }
}

async function loadCart() {
  try {
    const res = await fetch("/api/cart", { credentials: "same-origin" });
    if (res.status === 401) {
      redirectToLoginRequired();
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

async function addToCart(productId) {
  if (state.busyProducts.has(productId)) return;
  state.busyProducts.add(productId);
  await loadProducts();

  try {
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    const data = await parseResponseBody(res);

    if (res.status === 401) {
      redirectToLoginRequired();
      return;
    }

    if (!res.ok) {
      routeActionMessage(
        data.error || `No se pudo agregar al carrito (HTTP ${res.status}).`,
        true,
        "cartStatusBanner"
      );
      return;
    }

    clearInlineAlert("cartStatusBanner");
    renderCart(data);
    openCartDrawer();
    showInlineAlert("cartStatusBanner", "Prenda agregada al carrito (reserva de 3 minutos).", false);
  } catch (_err) {
    routeActionMessage("Sin conexión con el servidor al actualizar el carrito.", true, "cartStatusBanner");
  } finally {
    state.busyProducts.delete(productId);
    await loadProducts();
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
      redirectToLoginRequired();
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
    await loadProducts();
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
      window.location.href = "/admin.html";
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

async function performLogout() {
  if (state.logoutBusy) return;
  state.logoutBusy = true;
  const confirmBtn = document.getElementById("btnConfirmLogout");
  const cancelBtn = document.getElementById("btnCancelLogout");
  if (confirmBtn) confirmBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;

  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (res.ok) {
      setAuthenticatedUI(false);
      renderCart({ items: [], total: 0 });
      closeAllOverlays();
      redirectToLoginRequired();
    } else {
      const data = await parseResponseBody(res);
      closeLogoutConfirmModal();
      routeActionMessage(data.error || `No se pudo cerrar sesión (HTTP ${res.status}).`, true);
    }
  } catch (_err) {
    closeLogoutConfirmModal();
    routeActionMessage("Sin conexión con el servidor al cerrar sesión.", true);
  } finally {
    state.logoutBusy = false;
    if (confirmBtn) confirmBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
  }
}

function logoutUser() {
  const confirmModal = document.getElementById("logoutConfirmModal");
  if (confirmModal) {
    openLogoutConfirmModal();
    return;
  }
  if (window.confirm("¿Estás seguro de cerrar sesión?")) {
    void performLogout();
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
      redirectToLoginRequired();
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
    await loadProducts();
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
      return false;
    }
    const user = await parseResponseBody(res);
    const label = String(user?.name || user?.email || "Usuario");
    const role = String(user?.role || "CUSTOMER").toUpperCase();
    setAuthenticatedUI(true, label, role);
    return true;
  } catch (_err) {
    setAuthenticatedUI(false);
    return false;
  }
}

async function applyFilter(options = {}) {
  if (!state.isAuthenticated) {
    redirectToLoginRequired();
    return;
  }
  if (typeof options.onlyNew === "boolean") state.onlyNew = options.onlyNew;
  if (typeof options.department === "string") state.department = options.department;
  updateUrlQuery();
  await loadProducts();
}

document.getElementById("btnFilterWoman")?.addEventListener("click", () =>
  applyFilter({ department: "WOMAN", onlyNew: false })
);
document.getElementById("btnFilterMan")?.addEventListener("click", () =>
  applyFilter({ department: "MAN", onlyNew: false })
);
document.getElementById("btnAllProducts")?.addEventListener("click", () =>
  applyFilter({ department: "ALL", onlyNew: false })
);
document.getElementById("btnNewProducts")?.addEventListener("click", () =>
  applyFilter({ department: "ALL", onlyNew: true })
);
document.getElementById("btnResetFilters")?.addEventListener("click", () =>
  applyFilter({ department: "ALL", onlyNew: false })
);

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
document.getElementById("overlayBackdrop")?.addEventListener("click", () => {
  if (!isLogoutConfirmOpen()) closeAllOverlays();
});

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

document.getElementById("btnLogout")?.addEventListener("click", () => logoutUser());
document.getElementById("btnConfirmLogout")?.addEventListener("click", async () => performLogout());
document.getElementById("btnCancelLogout")?.addEventListener("click", () => closeLogoutConfirmModal());
document.getElementById("btnCancelLogoutTop")?.addEventListener("click", () => closeLogoutConfirmModal());

document.getElementById("btnCheckout")?.addEventListener("click", async () => checkoutOrder());

document.getElementById("productsContainer")?.addEventListener("click", async (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-add-id]") : null;
  const productId = target?.getAttribute("data-add-id");
  if (productId) await addToCart(productId);
});

document.getElementById("cartItems")?.addEventListener("click", async (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-remove-id]") : null;
  const productId = target?.getAttribute("data-remove-id");
  if (productId) await removeFromCart(productId);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAllOverlays();
});

(async function init() {
  const ok = await restoreSession();
  if (!ok) {
    redirectToLoginRequired();
    return;
  }
  readInitialFiltersFromUrl();
  await loadProducts();
  await loadCart();
})();