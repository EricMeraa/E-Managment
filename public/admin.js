const adminState = {
  products: [],
  searchQuery: "",
  createBusy: false,
  logoutBusy: false,
  editingId: null,
  removeExistingImage: false,
  deletingIds: new Set(),
};

function showAdminStatus(message, isError = false) {
  const banner = document.getElementById("adminStatusBanner");
  if (!banner) return;
  banner.textContent = message;
  banner.className = isError ? "status-banner err" : "status-banner ok";
}

function clearAdminStatus() {
  const banner = document.getElementById("adminStatusBanner");
  if (!banner) return;
  banner.textContent = "";
  banner.className = "status-banner";
}

async function parseJsonSafe(res) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" ? parsed : {};
  } catch (_err) {
    return { error: raw };
  }
}

function isLogoutConfirmOpen() {
  const modal = document.getElementById("logoutConfirmModal");
  return Boolean(modal && modal.style.display !== "none" && modal.style.display !== "");
}

function openLogoutConfirmModal() {
  clearAdminStatus();
  const backdrop = document.getElementById("overlayBackdrop");
  const modal = document.getElementById("logoutConfirmModal");
  if (backdrop) backdrop.style.display = "block";
  if (modal) modal.style.display = "flex";
  document.getElementById("btnCancelLogout")?.focus();
}

function closeLogoutConfirmModal() {
  const modal = document.getElementById("logoutConfirmModal");
  const backdrop = document.getElementById("overlayBackdrop");
  if (modal) modal.style.display = "none";
  if (backdrop) backdrop.style.display = "none";
}

async function confirmAdminLogout() {
  if (adminState.logoutBusy) return;
  adminState.logoutBusy = true;

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
      closeLogoutConfirmModal();
      window.location.href = "/";
      return;
    }

    const data = await parseJsonSafe(res);
    closeLogoutConfirmModal();
    showAdminStatus(
      data?.error || `No se pudo cerrar sesión (HTTP ${res.status}).`,
      true
    );
  } catch (_err) {
    closeLogoutConfirmModal();
    showAdminStatus("Sin conexión con el servidor al cerrar sesión.", true);
  } finally {
    adminState.logoutBusy = false;
    if (confirmBtn) confirmBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
  }
}

function requestAdminLogout() {
  const modal = document.getElementById("logoutConfirmModal");
  if (modal) {
    openLogoutConfirmModal();
    return;
  }
  if (window.confirm("¿Estás seguro de cerrar sesión?")) {
    void confirmAdminLogout();
  }
}

function clearImagePreview(markRemoveExisting = false) {
  const input = document.getElementById("prodImage");
  const box = document.getElementById("imagePreviewBox");
  const img = document.getElementById("imagePreviewImg");
  if (input) input.value = "";
  if (img) img.removeAttribute("src");
  if (box) box.style.display = "none";
  if (markRemoveExisting && adminState.editingId) {
    adminState.removeExistingImage = true;
  }
}

function setImagePreviewUrl(url) {
  const box = document.getElementById("imagePreviewBox");
  const img = document.getElementById("imagePreviewImg");
  const input = document.getElementById("prodImage");
  if (input) input.value = "";
  if (url && box && img) {
    img.src = url;
    box.style.display = "flex";
  } else {
    clearImagePreview(false);
  }
}

function resetFormToCreateMode() {
  adminState.editingId = null;
  adminState.removeExistingImage = false;
  const hiddenId = document.getElementById("editingProductId");
  const form = document.getElementById("adminCreateForm");
  const titleEl = document.getElementById("formCardTitle");
  const subtitleEl = document.getElementById("formCardSubtitle");
  const submitBtn = document.getElementById("btnCreateProduct");
  const cancelBtn = document.getElementById("btnCancelEdit");
  const isNewCheckbox = document.getElementById("prodIsNew");

  if (hiddenId) hiddenId.value = "";
  if (form) form.reset();
  clearImagePreview(false);
  if (isNewCheckbox) isNewCheckbox.checked = true;
  if (titleEl) titleEl.textContent = "Agregar nueva prenda";
  if (subtitleEl) {
    subtitleEl.textContent = "Publica artículos con fotografía directamente en la colección de la tienda.";
  }
  if (submitBtn) submitBtn.textContent = "Publicar prenda en inventario";
  if (cancelBtn) cancelBtn.style.display = "none";
}

function startEditingProduct(productId) {
  const item = adminState.products.find((p) => String(p?.id ?? "") === String(productId));
  if (!item) return;

  adminState.editingId = String(item.id);
  adminState.removeExistingImage = false;

  const hiddenId = document.getElementById("editingProductId");
  const nameEl = document.getElementById("prodName");
  const brandEl = document.getElementById("prodBrand");
  const categoryEl = document.getElementById("prodCategory");
  const sizeEl = document.getElementById("prodSize");
  const colorEl = document.getElementById("prodColor");
  const priceEl = document.getElementById("prodPrice");
  const stockEl = document.getElementById("prodStock");
  const isNewEl = document.getElementById("prodIsNew");
  const titleEl = document.getElementById("formCardTitle");
  const subtitleEl = document.getElementById("formCardSubtitle");
  const submitBtn = document.getElementById("btnCreateProduct");
  const cancelBtn = document.getElementById("btnCancelEdit");

  if (hiddenId) hiddenId.value = String(item.id);
  if (nameEl) nameEl.value = String(item.name ?? "");
  if (brandEl) brandEl.value = String(item.brand ?? "");
  if (categoryEl) categoryEl.value = String(item.category ?? "Playeras Hombre");
  if (sizeEl) sizeEl.value = String(item.size ?? "M");
  if (colorEl) colorEl.value = String(item.color ?? "");
  if (priceEl) priceEl.value = String(Number(item.price ?? 0));
  if (stockEl) stockEl.value = String(Number(item.stock ?? 0));
  if (isNewEl) isNewEl.checked = Boolean(item.isNew);

  const currentImg = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  setImagePreviewUrl(currentImg);

  if (titleEl) titleEl.textContent = `Editar prenda: ${String(item.name ?? "")}`;
  if (subtitleEl) {
    subtitleEl.textContent = "Modifica datos o sube una nueva foto; si no eliges archivo, se conserva la actual.";
  }
  if (submitBtn) submitBtn.textContent = "Guardar cambios de la prenda";
  if (cancelBtn) cancelBtn.style.display = "inline-block";

  nameEl?.focus();
  nameEl?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function switchAdminTab(tab) {
  const viewInv = document.getElementById("viewInventory");
  const viewEarn = document.getElementById("viewEarnings");
  const tabInv = document.getElementById("tabInventory");
  const tabEarn = document.getElementById("tabEarnings");

  const isInventory = tab === "inventory";
  if (viewInv) viewInv.style.display = isInventory ? "block" : "none";
  if (viewEarn) viewEarn.style.display = isInventory ? "none" : "block";
  if (tabInv) tabInv.className = isInventory ? "nav-tab active" : "nav-tab";
  if (tabEarn) tabEarn.className = isInventory ? "nav-tab" : "nav-tab active";

  if (!isInventory) {
    void loadEarningsReport();
  }
}

async function verifyAdminAccess() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!res.ok) {
      window.location.href = "/";
      return false;
    }

    const user = await parseJsonSafe(res);
    const role = String(user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      window.location.href = "/";
      return false;
    }

    const badge = document.getElementById("adminUserBadge");
    if (badge) {
      badge.textContent = `${String(user?.name || user?.email || "Admin")} · ADMIN`;
    }
    return true;
  } catch (_err) {
    showAdminStatus("No se pudo verificar la sesión con el servidor.", true);
    return false;
  }
}

function renderInventoryTable() {
  const tbody = document.getElementById("adminProductsBody");
  const countEl = document.getElementById("inventorySummaryCount");
  if (!tbody) return;

  const query = adminState.searchQuery.trim().toLowerCase();
  const filtered = adminState.products.filter((item) => {
    if (!query) return true;
    const text = `${item?.name ?? ""} ${item?.brand ?? ""} ${item?.category ?? ""} ${item?.color ?? ""}`.toLowerCase();
    return text.includes(query);
  });

  if (countEl) {
    const total = adminState.products.length;
    countEl.textContent = `${total} ${total === 1 ? "prenda activa" : "prendas activas"}`;
  }

  tbody.innerHTML = "";
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">No se encontraron prendas en el inventario.</td></tr>`;
    return;
  }

  for (const item of filtered) {
    const tr = document.createElement("tr");
    const stock = Number(item?.stock ?? 0);
    const price = Number(item?.price ?? 0).toFixed(2);
    const id = String(item?.id ?? "");
    const name = String(item?.name ?? "Prenda");
    const imageUrl = typeof item?.imageUrl === "string" ? item.imageUrl.trim() : "";
    const isDeleting = adminState.deletingIds.has(id);

    const thumbHtml = imageUrl
      ? `<img src="${imageUrl}" alt="${name}" class="admin-thumb" loading="lazy" />`
      : `<div class="admin-thumb-placeholder">Sin foto</div>`;

    const statusBadge =
      stock <= 0
        ? `<span class="badge-tag soldout">Agotado</span>`
        : item?.isNew
        ? `<span class="badge-tag new">Nuevo</span>`
        : `<span class="badge-tag">Activo</span>`;

    tr.innerHTML = `
      <td>${thumbHtml}</td>
      <td>
        <span class="prod-main">${name}</span>
        <span class="prod-sub">${String(item?.brand || "E-Managment")}</span>
      </td>
      <td>${String(item?.category || "")}</td>
      <td>Talla ${String(item?.size || "")} · ${String(item?.color || "")}</td>
      <td>$${price}</td>
      <td><strong>${stock}</strong> uds</td>
      <td>${statusBadge}</td>
      <td>
        <button
          type="button"
          class="btn-secondary btn-xs"
          data-edit-id="${id}"
          ${isDeleting ? "disabled" : ""}
        >
          Editar
        </button>
        <button
          type="button"
          class="btn-danger"
          data-delete-id="${id}"
          data-delete-name="${name}"
          ${isDeleting ? "disabled" : ""}
        >
          ${isDeleting ? "Eliminando..." : "Eliminar"}
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

function renderValuationTable() {
  const tbody = document.getElementById("inventoryValuationBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (adminState.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No hay prendas activas registradas.</td></tr>`;
    return;
  }

  for (const item of adminState.products) {
    const price = Number(item?.price ?? 0);
    const stock = Number(item?.stock ?? 0);
    const valuation = (price * stock).toFixed(2);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${String(item?.name ?? "Prenda")}</strong></td>
      <td>${String(item?.brand || "E-Managment")}</td>
      <td>$${price.toFixed(2)}</td>
      <td>${stock} uds</td>
      <td><strong>$${valuation}</strong></td>
    `;
    tbody.appendChild(tr);
  }
}

async function loadInventory() {
  try {
    const res = await fetch("/api/products", { credentials: "same-origin" });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      showAdminStatus(data?.error || "No se pudo cargar el inventario.", true);
      return;
    }
    adminState.products = Array.isArray(data) ? data : [];
    renderInventoryTable();
    renderValuationTable();
  } catch (_err) {
    showAdminStatus("Sin conexión con el servidor al cargar inventario.", true);
  }
}

async function loadEarningsReport() {
  const grid = document.getElementById("earningsMetricsGrid");
  if (!grid) return;

  try {
    const res = await fetch("/api/earnings", { credentials: "same-origin" });
    const data = await parseJsonSafe(res);
    if (res.status === 401 || res.status === 403) {
      showAdminStatus(data?.error || "Acceso restringido a administradores.", true);
      return;
    }
    if (!res.ok) {
      showAdminStatus(data?.error || "No se pudo consultar el reporte financiero.", true);
      return;
    }

    const totalStock = adminState.products.reduce((acc, item) => acc + Number(item?.stock ?? 0), 0);

    grid.innerHTML = `
      <div class="metric-card"><span>Ventas confirmadas</span><strong>${String(data?.totalOrders ?? 0)}</strong></div>
      <div class="metric-card"><span>Prendas vendidas</span><strong>${String(data?.totalItemsSold ?? 0)}</strong></div>
      <div class="metric-card"><span>Ganancias acumuladas</span><strong>${String(data?.formattedRevenue ?? "$0.00")}</strong></div>
      <div class="metric-card"><span>Unidades disponibles</span><strong>${String(totalStock)}</strong></div>
    `;
    renderValuationTable();
  } catch (_err) {
    showAdminStatus("Sin conexión con el servidor al consultar ganancias.", true);
  }
}

async function handleCreateProduct(event) {
  event.preventDefault();
  if (adminState.createBusy) return;

  const name = String(document.getElementById("prodName")?.value ?? "").trim();
  const brand = String(document.getElementById("prodBrand")?.value ?? "").trim();
  const category = String(document.getElementById("prodCategory")?.value ?? "").trim();
  const size = String(document.getElementById("prodSize")?.value ?? "").trim();
  const color = String(document.getElementById("prodColor")?.value ?? "").trim();
  const price = Number(document.getElementById("prodPrice")?.value);
  const stock = Number(document.getElementById("prodStock")?.value);
  const isNew = Boolean(document.getElementById("prodIsNew")?.checked);
  const imageInput = document.getElementById("prodImage");
  const file = imageInput?.files?.[0] ?? null;

  if (!name || !brand || !category || !size || !color) {
    showAdminStatus("Verifica que nombre, marca, categoría, talla y color estén completos.", true);
    return;
  }

  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    showAdminStatus("Verifica que precio y existencias sean valores válidos.", true);
    return;
  }

  if (file && file.size > 3 * 1024 * 1024) {
    showAdminStatus("La imagen supera el máximo permitido de 3 MB.", true);
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("brand", brand);
  formData.append("category", category);
  formData.append("size", size);
  formData.append("color", color);
  formData.append("price", String(price));
  formData.append("stock", String(stock));
  formData.append("isNew", String(isNew));
  if (file) {
    formData.append("image", file, file.name);
  } else if (adminState.editingId && adminState.removeExistingImage) {
    formData.append("removeImage", "true");
  }

  const isEditing = Boolean(adminState.editingId);
  const url = isEditing
    ? `/api/products/${encodeURIComponent(adminState.editingId)}`
    : "/api/products";
  const method = isEditing ? "PUT" : "POST";

  adminState.createBusy = true;
  const btn = document.getElementById("btnCreateProduct");
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(url, {
      method,
      credentials: "same-origin",
      body: formData,
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      showAdminStatus(
        data?.error || `No se pudo ${isEditing ? "actualizar" : "registrar"} la prenda (HTTP ${res.status}).`,
        true
      );
      return;
    }

    const savedName = String(data?.name || name);
    resetFormToCreateMode();

    showAdminStatus(
      isEditing
        ? `Prenda "${savedName}" actualizada correctamente.`
        : `Prenda "${savedName}" agregada al inventario.`
    );
    await loadInventory();
    await loadEarningsReport();
  } catch (_err) {
    showAdminStatus("Sin conexión con el servidor al guardar la prenda.", true);
  } finally {
    adminState.createBusy = false;
    if (btn) btn.disabled = false;
  }
}

async function handleDeleteProduct(productId, productName) {
  if (!productId || adminState.deletingIds.has(productId)) return;
  const confirmed = window.confirm(`¿Deseas eliminar "${productName}" del catálogo de la tienda?`);
  if (!confirmed) return;

  adminState.deletingIds.add(productId);
  renderInventoryTable();

  try {
    const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      showAdminStatus(data?.error || `No se pudo eliminar la prenda (HTTP ${res.status}).`, true);
      return;
    }

    if (adminState.editingId === productId) {
      resetFormToCreateMode();
    }

    showAdminStatus(`Prenda "${productName}" eliminada del catálogo.`);
    await loadInventory();
    await loadEarningsReport();
  } catch (_err) {
    showAdminStatus("Sin conexión con el servidor al eliminar la prenda.", true);
  } finally {
    adminState.deletingIds.delete(productId);
    renderInventoryTable();
  }
}

document.getElementById("prodImage")?.addEventListener("change", (event) => {
  const file = event.target?.files?.[0];
  const box = document.getElementById("imagePreviewBox");
  const img = document.getElementById("imagePreviewImg");
  if (!file || !box || !img) {
    clearImagePreview(false);
    return;
  }
  adminState.removeExistingImage = false;
  const reader = new FileReader();
  reader.onload = () => {
    img.src = String(reader.result || "");
    box.style.display = "flex";
  };
  reader.readAsDataURL(file);
});

document.getElementById("btnClearImage")?.addEventListener("click", () => clearImagePreview(true));
document.getElementById("btnCancelEdit")?.addEventListener("click", resetFormToCreateMode);
document.getElementById("tabInventory")?.addEventListener("click", () => switchAdminTab("inventory"));
document.getElementById("tabEarnings")?.addEventListener("click", () => switchAdminTab("earnings"));
document.getElementById("adminCreateForm")?.addEventListener("submit", handleCreateProduct);
document.getElementById("btnRefreshEarnings")?.addEventListener("click", async () => {
  await loadInventory();
  await loadEarningsReport();
  showAdminStatus("Reporte financiero actualizado.");
});

document.getElementById("inventorySearch")?.addEventListener("input", (event) => {
  adminState.searchQuery = event.target?.value || "";
  renderInventoryTable();
});

document.getElementById("adminProductsBody")?.addEventListener("click", async (event) => {
  const target = event.target;
  const editBtn = target instanceof Element ? target.closest("button[data-edit-id]") : null;
  if (editBtn) {
    const editId = editBtn.getAttribute("data-edit-id");
    if (editId) {
      startEditingProduct(editId);
    }
    return;
  }

  const deleteBtn = target instanceof Element ? target.closest("button[data-delete-id]") : null;
  if (!deleteBtn) return;
  const id = deleteBtn.getAttribute("data-delete-id");
  const name = deleteBtn.getAttribute("data-delete-name") || "esta prenda";
  if (id) {
    await handleDeleteProduct(id, name);
  }
});

document.getElementById("btnAdminLogout")?.addEventListener("click", (event) => {
  event.preventDefault();
  requestAdminLogout();
});

document.getElementById("btnConfirmLogout")?.addEventListener("click", async () => {
  await confirmAdminLogout();
});

document.getElementById("btnCancelLogout")?.addEventListener("click", closeLogoutConfirmModal);
document.getElementById("btnCancelLogoutTop")?.addEventListener("click", closeLogoutConfirmModal);

document.getElementById("overlayBackdrop")?.addEventListener("click", () => {
  if (isLogoutConfirmOpen()) {
    closeLogoutConfirmModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isLogoutConfirmOpen()) {
    closeLogoutConfirmModal();
  }
});

(async function initAdminPage() {
  try {
    const allowed = await verifyAdminAccess();
    if (!allowed) return;
    await loadInventory();
    await loadEarningsReport();
  } catch (err) {
    const msg = err instanceof Error && err.message ? err.message : "Error al iniciar el panel.";
    showAdminStatus(msg, true);
  }
})();