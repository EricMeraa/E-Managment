import { Product, ProductProps } from "../../domain/entities/Product";
import { IProductRepository } from "../../domain/repositories/IProductRepository";

export interface RegisterProductInput {
  id: string;
  name: string;
  brand: string;
  size: string;
  color: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  isNew?: boolean;
  isActive?: boolean;
}

export interface UpdateProductInput {
  id: string;
  name: string;
  brand: string;
  size: string;
  color: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  isNew?: boolean;
  isActive?: boolean;
}

export class InventoryMaintenance {
  private readonly productRepository: IProductRepository;

  constructor(productRepository: IProductRepository) {
    this.productRepository = productRepository;
  }

  public async listCatalog(onlyNew = false): Promise<Product[]> {
    return this.productRepository.getAllActive(onlyNew);
  }

  public async getProducts(onlyNew = false): Promise<Product[]> {
    return this.listCatalog(onlyNew);
  }

  public async addProduct(input: RegisterProductInput): Promise<Product> {
    const productProps: ProductProps = {
      id: input.id,
      name: input.name,
      brand: input.brand,
      size: input.size,
      color: input.color,
      category: input.category,
      price: Number(input.price),
      stock: Number(input.stock),
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive !== false,
      isNew: Boolean(input.isNew ?? true),
    };

    const product = new Product(productProps);
    return this.productRepository.saveProduct(product);
  }

  public async createProduct(input: RegisterProductInput): Promise<Product> {
    return this.addProduct(input);
  }

  public async registerProduct(input: RegisterProductInput): Promise<Product> {
    return this.addProduct(input);
  }

  public async updateProduct(input: UpdateProductInput): Promise<Product> {
    const cleanId = String(input.id ?? "").trim();
    if (!cleanId) {
      throw new Error("El identificador de la prenda es obligatorio para editar.");
    }

    const existing = await this.productRepository.getProductById(cleanId);
    if (!existing) {
      throw new Error("La prenda que intentas editar no existe.");
    }

    const resolvedImageUrl =
      input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl;

    const updatedEntity = new Product({
      id: cleanId,
      name: input.name,
      brand: input.brand,
      size: input.size,
      color: input.color,
      category: input.category,
      price: Number(input.price),
      stock: Number(input.stock),
      imageUrl: resolvedImageUrl,
      isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
      isNew: input.isNew !== undefined ? Boolean(input.isNew) : existing.isNew,
    });

    return this.productRepository.updateProduct(updatedEntity);
  }

  public async editProduct(input: UpdateProductInput): Promise<Product> {
    return this.updateProduct(input);
  }

  public async removeProduct(productId: string): Promise<void> {
    const cleanId = String(productId ?? "").trim();
    if (!cleanId) {
      throw new Error("El identificador de la prenda es obligatorio.");
    }
    await this.productRepository.deleteProduct(cleanId);
  }
}