
export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export interface OrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
}

export interface OrderItemData {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderProps {
  id: string;
  userId: string;
  paymentMethod: string;
  status?: OrderStatus;
  items: OrderItemInput[];
  createdAt?: Date;
}

export class Order {
  public readonly id: string;
  public readonly userId: string;
  public readonly paymentMethod: string;
  public readonly status: OrderStatus;
  public readonly items: OrderItemData[];
  public readonly totalAmount: number;
  public readonly createdAt: Date;

  constructor(props: OrderProps) {
    if (!props.id || !props.id.trim()) {
      throw new Error("El identificador de la orden es obligatorio.");
    }
    if (!props.userId || !props.userId.trim()) {
      throw new Error("La orden debe estar asociada a un cliente.");
    }
    if (!props.paymentMethod || !props.paymentMethod.trim()) {
      throw new Error("El metodo de pago es obligatorio.");
    }
    if (!Array.isArray(props.items) || props.items.length === 0) {
      throw new Error("La orden debe incluir al menos un producto.");
    }

    this.id = props.id.trim();
    this.userId = props.userId.trim();
    this.paymentMethod = props.paymentMethod.trim();
    this.status = props.status ?? "CONFIRMED";
    this.createdAt = props.createdAt ?? new Date();

    this.items = props.items.map((item) => {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Cantidad invalida para " + item.productName);
      }
      if (item.availableStock <= 0 || item.quantity > item.availableStock) {
        throw new Error(
          "La cantidad solicitada excede la existencia disponible de " + item.productName
        );
      }
      if (
        typeof item.unitPrice !== "number" ||
        Number.isNaN(item.unitPrice) ||
        item.unitPrice <= 0
      ) {
        throw new Error("Precio unitario invalido para " + item.productName);
      }

      const subtotal = Number((item.unitPrice * item.quantity).toFixed(2));
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
      };
    });

    const total = this.items.reduce((sum, current) => sum + current.subtotal, 0);
    this.totalAmount = Number(total.toFixed(2));
  }
}