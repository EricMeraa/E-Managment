export interface ProductProps {
  id: string;
  name: string;
  brand: string;
  size: string;
  color: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  isActive?: boolean;
  isNew?: boolean;
}

export class Product {
  public readonly id: string;
  public readonly name: string;
  public readonly brand: string;
  public readonly size: string;
  public readonly color: string;
  public readonly category: string;
  public readonly price: number;
  public readonly stock: number;
  public readonly imageUrl: string | null;
  public readonly isActive: boolean;
  public readonly isNew: boolean;

  constructor(props: ProductProps) {
    if (!props.id || !props.id.trim()) {
      throw new Error("El producto debe tener un identificador unico.");
    }
    if (!props.name || !props.name.trim()) {
      throw new Error("El nombre de la prenda es obligatorio.");
    }
    if (!Number.isFinite(props.price) || props.price <= 0) {
      throw new Error("El precio debe ser mayor a cero.");
    }
    if (!Number.isInteger(props.stock) || props.stock < 0) {
      throw new Error("El stock no puede ser negativo.");
    }

    this.id = props.id.trim();
    this.name = props.name.trim();
    this.brand = props.brand.trim();
    this.size = props.size.trim();
    this.color = props.color.trim();
    this.category = props.category.trim();
    this.price = props.price;
    this.stock = props.stock;
    this.imageUrl = props.imageUrl ? String(props.imageUrl).trim() : null;
    this.isActive = props.isActive !== false;
    this.isNew = Boolean(props.isNew);
  }

  public isAvailableForSale(quantity = 1): boolean {
    return this.isActive && Number.isInteger(quantity) && quantity > 0 && this.stock >= quantity;
  }

  public isAvailable(quantity = 1): boolean {
    return this.isAvailableForSale(quantity);
  }
}