import { Product } from "../../domain/entities/Product";
import { IProductRepository } from "../../domain/repositories/IProductRepository";
import { prisma } from "../database/connection";

export class MariaDBProductRepository implements IProductRepository {
  private resolveExpiresAt(now: Date, ttlInput?: unknown): Date {
    const fallbackMs = 3 * 60 * 1000;
    if (typeof ttlInput === "number" && Number.isFinite(ttlInput) && ttlInput > 0) {
      const ms = ttlInput < 1000 ? ttlInput * 60 * 1000 : ttlInput;
      return new Date(now.getTime() + ms);
    }
    if (typeof ttlInput === "string" && ttlInput.trim() !== "") {
      const parsed = Number(ttlInput);
      if (Number.isFinite(parsed) && parsed > 0) {
        const ms = parsed < 1000 ? parsed * 60 * 1000 : parsed;
        return new Date(now.getTime() + ms);
      }
    }
    return new Date(now.getTime() + fallbackMs);
  }

  public async getAllActive(onlyNew = false): Promise<Product[]> {
    await this.releaseExpiredReservations();
    const now = new Date();
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(onlyNew ? { isNew: true } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const products: Product[] = [];
    for (const row of rows) {
      const reservedAgg = await prisma.stockReservation.aggregate({
        where: {
          productId: row.id,
          expiresAt: { gt: now },
        },
        _sum: { quantity: true },
      });
      const reserved = reservedAgg._sum.quantity ?? 0;
      const availableStock = Math.max(0, row.stock - reserved);

      products.push(
        new Product({
          id: row.id,
          name: row.name,
          brand: row.brand,
          size: row.size,
          color: row.color,
          category: row.category,
          price: Number(row.price),
          stock: availableStock,
          imageUrl: row.imageUrl ?? null,
          isActive: row.isActive,
          isNew: row.isNew,
        })
      );
    }

    return products;
  }

  public async releaseExpiredReservations(): Promise<void> {
    const now = new Date();
    await prisma.stockReservation.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });
  }

  public async getProductById(productId: string): Promise<Product | null> {
    const row = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!row) {
      return null;
    }
    return new Product({
      id: row.id,
      name: row.name,
      brand: row.brand,
      size: row.size,
      color: row.color,
      category: row.category,
      price: Number(row.price),
      stock: row.stock,
      imageUrl: row.imageUrl ?? null,
      isActive: row.isActive,
      isNew: row.isNew,
    });
  }

  public async lockTemporaryStock(
    productIdOrPayload:
      | string
      | { productId: string; userId: string; quantity: number; ttlMinutes?: number },
    userIdArg?: string,
    quantityArg?: number,
    ttlMinutesArg?: number
  ): Promise<void> {
    const productId =
      typeof productIdOrPayload === "string"
        ? productIdOrPayload
        : productIdOrPayload.productId;
    const userId =
      typeof productIdOrPayload === "string"
        ? String(userIdArg ?? "")
        : productIdOrPayload.userId;
    const quantity =
      typeof productIdOrPayload === "string"
        ? Number(quantityArg ?? 1)
        : productIdOrPayload.quantity;
    const ttlRaw =
      typeof productIdOrPayload === "string"
        ? ttlMinutesArg
        : productIdOrPayload.ttlMinutes;

    const now = new Date();
    const expiresAt = this.resolveExpiresAt(now, ttlRaw);

    await prisma.$transaction(async (tx) => {
      await tx.stockReservation.deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: now } },
            { productId, userId },
          ],
        },
      });

      const product = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!product || !product.isActive) {
        throw new Error("Producto no disponible.");
      }

      const reservedAgg = await tx.stockReservation.aggregate({
        where: {
          productId,
          expiresAt: { gt: now },
        },
        _sum: { quantity: true },
      });
      const reserved = reservedAgg._sum.quantity ?? 0;

      if (product.stock - reserved < quantity) {
        throw new Error("Stock insuficiente para reservar temporalmente.");
      }

      await tx.stockReservation.create({
        data: {
          productId,
          userId,
          quantity,
          expiresAt,
        },
      });
    });
  }

  public async decreaseStock(productId: string, quantity: number): Promise<void> {
    await prisma.product.update({
      where: { id: productId },
      data: {
        stock: {
          decrement: quantity,
        },
      },
    });
  }

  public async saveProduct(product: Product): Promise<Product> {
    const saved = await prisma.product.create({
      data: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        size: product.size,
        color: product.color,
        category: product.category,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl ?? null,
        isActive: product.isActive !== false,
        isNew: Boolean(product.isNew),
      },
    });

    return new Product({
      id: saved.id,
      name: saved.name,
      brand: saved.brand,
      size: saved.size,
      color: saved.color,
      category: saved.category,
      price: Number(saved.price),
      stock: saved.stock,
      imageUrl: saved.imageUrl ?? null,
      isActive: saved.isActive,
      isNew: saved.isNew,
    });
  }

  public async updateProduct(product: Product): Promise<Product> {
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        name: product.name,
        brand: product.brand,
        size: product.size,
        color: product.color,
        category: product.category,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl ?? null,
        isActive: product.isActive !== false,
        isNew: Boolean(product.isNew),
      },
    });

    return new Product({
      id: updated.id,
      name: updated.name,
      brand: updated.brand,
      size: updated.size,
      color: updated.color,
      category: updated.category,
      price: Number(updated.price),
      stock: updated.stock,
      imageUrl: updated.imageUrl ?? null,
      isActive: updated.isActive,
      isNew: updated.isNew,
    });
  }

  public async deleteProduct(productId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!existing || !existing.isActive) {
        throw new Error("La prenda no existe o ya fue eliminada del catálogo.");
      }

      await tx.stockReservation.deleteMany({
        where: { productId },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          isActive: false,
          stock: 0,
        },
      });
    });
  }
}