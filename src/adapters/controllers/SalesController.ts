import { randomUUID } from "crypto";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { CheckEarnings } from "../../application/use-cases/CheckEarnings";
import { InventoryMaintenance } from "../../application/use-cases/InventoryMaintenance";
import { ManageShoppingCart } from "../../application/use-cases/ManageShoppingCart";
import { RegisterSale } from "../../application/use-cases/RegisterSale";
import { EarningsReportPresenter } from "../presenters/EarningsReportPresenter";

interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

interface MulterUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

export class SalesController {
  private readonly inventoryMaintenance: InventoryMaintenance;
  private readonly registerSale: RegisterSale;
  private readonly checkEarnings: CheckEarnings;
  private readonly manageShoppingCart: ManageShoppingCart;
  private readonly earningsPresenter: EarningsReportPresenter;

  constructor(
    inventoryMaintenance: InventoryMaintenance,
    registerSale: RegisterSale,
    checkEarnings: CheckEarnings,
    manageShoppingCart: ManageShoppingCart,
    earningsPresenter: EarningsReportPresenter
  ) {
    this.inventoryMaintenance = inventoryMaintenance;
    this.registerSale = registerSale;
    this.checkEarnings = checkEarnings;
    this.manageShoppingCart = manageShoppingCart;
    this.earningsPresenter = earningsPresenter;
  }

  private assertAdmin(req: Request, res: Response): boolean {
    if (!req.session?.userId) {
      res.status(401).json({ error: "Sesion no iniciada. Debe iniciar sesion para continuar." });
      return false;
    }
    if (req.session.role !== "ADMIN") {
      res.status(403).json({ error: "Acceso denegado: se requiere perfil de Administrador." });
      return false;
    }
    return true;
  }

  private cleanupUploadedFile(file?: MulterUploadedFile): void {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (_err) {
        // Ignorar fallo de limpieza secundaria
      }
    }
  }

  private deletePreviousProductFile(previousImageUrl?: string | null): void {
    if (!previousImageUrl || !previousImageUrl.startsWith("/uploads/products/")) {
      return;
    }
    const safeName = path.basename(previousImageUrl);
    const fullPath = path.join(process.cwd(), "public", "uploads", "products", safeName);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (_err) {
        // Ignorar fallo de borrado de archivo anterior
      }
    }
  }

  public getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const onlyNew = req.query.onlyNew === "true";
      const products = await this.inventoryMaintenance.listCatalog(onlyNew);
      res.status(200).json(products);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al consultar productos.";
      res.status(500).json({ error: message });
    }
  };

  public createProduct = async (req: Request, res: Response): Promise<void> => {
    const uploadedFile = (req as Request & { file?: MulterUploadedFile }).file;

    if (!this.assertAdmin(req, res)) {
      this.cleanupUploadedFile(uploadedFile);
      return;
    }

    try {
      const name = String(req.body?.name ?? "").trim();
      const brand = String(req.body?.brand ?? "").trim();
      const size = String(req.body?.size ?? "").trim();
      const color = String(req.body?.color ?? "").trim();
      const category = String(req.body?.category ?? "").trim();
      const price = Number(req.body?.price);
      const stock = Number(req.body?.stock);
      const isNewRaw = req.body?.isNew;
      const isNew =
        typeof isNewRaw === "boolean"
          ? isNewRaw
          : String(isNewRaw ?? "true").toLowerCase() === "true";

      if (!name || !brand || !size || !color || !category) {
        this.cleanupUploadedFile(uploadedFile);
        res.status(400).json({ error: "Todos los campos descriptivos de la prenda son obligatorios." });
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        this.cleanupUploadedFile(uploadedFile);
        res.status(400).json({ error: "El precio debe ser mayor a cero." });
        return;
      }
      if (!Number.isInteger(stock) || stock < 0) {
        this.cleanupUploadedFile(uploadedFile);
        res.status(400).json({ error: "El inventario inicial debe ser un numero entero igual o mayor a cero." });
        return;
      }

      const imageUrl = uploadedFile?.filename
        ? `/uploads/products/${uploadedFile.filename}`
        : typeof req.body?.imageUrl === "string" && req.body.imageUrl.trim()
        ? req.body.imageUrl.trim()
        : null;

      const created = await this.inventoryMaintenance.addProduct({
        id: String(req.body?.id ?? "").trim() || randomUUID(),
        name,
        brand,
        size,
        color,
        category,
        price,
        stock,
        imageUrl,
        isNew,
        isActive: true,
      });

      res.status(201).json(created);
    } catch (error) {
      this.cleanupUploadedFile(uploadedFile);
      const message = error instanceof Error ? error.message : "No se pudo registrar la prenda.";
      res.status(400).json({ error: message });
    }
  };

  public updateProduct = async (req: Request, res: Response): Promise<void> => {
    const uploadedFile = (req as Request & { file?: MulterUploadedFile }).file;

    if (!this.assertAdmin(req, res)) {
      this.cleanupUploadedFile(uploadedFile);
      return;
    }

    try {
      const productId = String(req.params?.productId ?? "").trim();
      if (!productId) {
        this.cleanupUploadedFile(uploadedFile);
        res.status(400).json({ error: "Identificador de prenda invalido." });
        return;
      }

      const existing = await this.inventoryMaintenance.getProducts(false);
      const current = existing.find((p) => p.id === productId);
      if (!current) {
        this.cleanupUploadedFile(uploadedFile);
        res.status(404).json({ error: "La prenda no existe en el inventario." });
        return;
      }

      const name = String(req.body?.name ?? "").trim();
      const brand = String(req.body?.brand ?? "").trim();
      const size = String(req.body?.size ?? "").trim();
      const color = String(req.body?.color ?? "").trim();
      const category = String(req.body?.category ?? "").trim();
      const price = Number(req.body?.price);
      const stock = Number(req.body?.stock);
      const isNewRaw = req.body?.isNew;
      const isNew =
        typeof isNewRaw === "boolean"
          ? isNewRaw
          : String(isNewRaw ?? current.isNew).toLowerCase() === "true";

      if (!name || !brand || !size || !color || !category) {
        this.cleanupUploadedFile(uploadedFile);
        res.status(400).json({ error: "Todos los campos descriptivos de la prenda son obligatorios." });
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        this.cleanupUploadedFile(uploadedFile);
        res.status(400).json({ error: "El precio debe ser mayor a cero." });
        return;
      }
      if (!Number.isInteger(stock) || stock < 0) {
        this.cleanupUploadedFile(uploadedFile);
        res.status(400).json({ error: "Las existencias deben ser un numero entero igual o mayor a cero." });
        return;
      }

      const removeImage = String(req.body?.removeImage ?? "false").toLowerCase() === "true";
      let nextImageUrl: string | null = current.imageUrl;

      if (uploadedFile?.filename) {
        nextImageUrl = `/uploads/products/${uploadedFile.filename}`;
      } else if (removeImage) {
        nextImageUrl = null;
      }

      const updated = await this.inventoryMaintenance.updateProduct({
        id: productId,
        name,
        brand,
        size,
        color,
        category,
        price,
        stock,
        imageUrl: nextImageUrl,
        isNew,
        isActive: true,
      });

      if (uploadedFile?.filename || removeImage) {
        this.deletePreviousProductFile(current.imageUrl);
      }

      res.status(200).json(updated);
    } catch (error) {
      this.cleanupUploadedFile(uploadedFile);
      const message = error instanceof Error ? error.message : "No se pudo actualizar la prenda.";
      res.status(400).json({ error: message });
    }
  };

  public deleteProduct = async (req: Request, res: Response): Promise<void> => {
    if (!this.assertAdmin(req, res)) {
      return;
    }

    try {
      const productId = String(req.params?.productId ?? "").trim();
      if (!productId) {
        res.status(400).json({ error: "Identificador de prenda invalido." });
        return;
      }

      await this.inventoryMaintenance.removeProduct(productId);
      res.status(200).json({ deleted: true, id: productId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la prenda.";
      res.status(400).json({ error: message });
    }
  };

  public checkout = async (req: Request, res: Response): Promise<void> => {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: "Sesion no iniciada. Debe iniciar sesion para continuar." });
      return;
    }

    try {
      const paymentMethod = String(req.body?.paymentMethod ?? "TARJETA").trim();
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
      const items: CheckoutItemInput[] = rawItems
        .map((item: { productId?: unknown; quantity?: unknown }): CheckoutItemInput => ({
          productId: String(item?.productId ?? "").trim(),
          quantity: Number(item?.quantity ?? 0),
        }))
        .filter(
          (item: CheckoutItemInput): boolean =>
            item.productId.length > 0 && Number.isInteger(item.quantity) && item.quantity > 0
        );

      if (items.length === 0) {
        res.status(400).json({ error: "El carrito esta vacio o contiene cantidades invalidas." });
        return;
      }

      const order = await this.registerSale.execute({
        userId,
        paymentMethod,
        items,
      });

      const cartUseCase = this.manageShoppingCart as unknown as {
        clearCart?: (uid: string) => Promise<void>;
      };
      if (typeof cartUseCase.clearCart === "function") {
        await cartUseCase.clearCart(userId);
      }

      res.status(201).json(order);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al procesar la compra.";
      res.status(400).json({ error: message });
    }
  };

  public getEarnings = async (req: Request, res: Response): Promise<void> => {
    if (!this.assertAdmin(req, res)) {
      return;
    }

    try {
      const report = await this.checkEarnings.execute();
      const presented = this.earningsPresenter.present(report);
      res.status(200).json(presented);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al consultar ganancias.";
      res.status(500).json({ error: message });
    }
  };
}