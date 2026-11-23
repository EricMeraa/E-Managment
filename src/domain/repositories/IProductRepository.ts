import { Product } from "../entities/Product";

export interface IProductRepository {
  getAllActive(onlyNew?: boolean): Promise<Product[]>;
  getProductById(productId: string): Promise<Product | null>;
  lockTemporaryStock(
    productIdOrPayload:
      | string
      | { productId: string; userId: string; quantity: number; ttlMinutes?: number },
    userId?: string,
    quantity?: number,
    ttlMinutes?: number
  ): Promise<void>;
  decreaseStock(productId: string, quantity: number): Promise<void>;
  saveProduct(product: Product): Promise<Product>;
  updateProduct(product: Product): Promise<Product>;
  deleteProduct(productId: string): Promise<void>;
}