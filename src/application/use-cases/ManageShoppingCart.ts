import { IProductRepository } from "../../domain/repositories/IProductRepository";

export interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CartSnapshot {
  items: CartItem[];
  total: number;
}

export class ManageShoppingCart {
  private readonly productRepository: IProductRepository;
  private readonly cartsByUser: Map<string, Map<string, number>>;
  private readonly lockMinutes = 3;

  constructor(productRepository: IProductRepository) {
    this.productRepository = productRepository;
    this.cartsByUser = new Map();
  }

  public async getCart(userId: string): Promise<CartSnapshot> {
    const userCart = this.cartsByUser.get(userId) ?? new Map<string, number>();
    const items: CartItem[] = [];
    let total = 0;

    for (const [productId, quantity] of userCart.entries()) {
      const product = await this.productRepository.getProductById(productId);
      if (!product || !product.isActive) {
        userCart.delete(productId);
        continue;
      }
      const subtotal = Number((product.price * quantity).toFixed(2));
      total += subtotal;
      items.push({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity,
        subtotal,
      });
    }

    return {
      items,
      total: Number(total.toFixed(2)),
    };
  }

  public async addItem(userId: string, productId: string, quantity = 1): Promise<CartSnapshot> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("La cantidad debe ser un numero entero mayor a cero.");
    }

    const product = await this.productRepository.getProductById(productId);
    if (!product || !product.isActive || !product.isAvailableForSale(quantity)) {
      throw new Error("La prenda seleccionada no esta disponible o no tiene stock suficiente.");
    }

    const userCart = this.cartsByUser.get(userId) ?? new Map<string, number>();
    const currentQty = userCart.get(productId) ?? 0;
    const nextQty = currentQty + quantity;

    if (!product.isAvailableForSale(nextQty)) {
      throw new Error("Inventario insuficiente para la cantidad solicitada.");
    }

    const lockFn = this.productRepository.lockTemporaryStock as unknown as (
      ...args: unknown[]
    ) => Promise<void>;
    await lockFn.call(this.productRepository, {
      productId,
      userId,
      quantity: nextQty,
      ttlMinutes: this.lockMinutes,
    });

    userCart.set(productId, nextQty);
    this.cartsByUser.set(userId, userCart);

    return this.getCart(userId);
  }

  public async removeItem(userId: string, productId: string): Promise<CartSnapshot> {
    const userCart = this.cartsByUser.get(userId);
    if (userCart) {
      userCart.delete(productId);
    }
    return this.getCart(userId);
  }

  public async clearCart(userId: string): Promise<void> {
    this.cartsByUser.delete(userId);
  }
}