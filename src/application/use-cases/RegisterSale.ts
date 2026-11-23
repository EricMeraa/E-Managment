import { randomUUID } from "crypto";
import { Order, OrderItemInput } from "../../domain/entities/Order";
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";
import { IProductRepository } from "../../domain/repositories/IProductRepository";
import { FileLogger } from "../../infrastructure/logging/FileLogger";

export interface RegisterSaleInput {
  userId: string;
  paymentMethod: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export class RegisterSale {
  private readonly orderRepository: IOrderRepository;
  private readonly productRepository: IProductRepository;
  private readonly logger: FileLogger;

  constructor(
    orderRepository: IOrderRepository,
    productRepository: IProductRepository,
    logger: FileLogger
  ) {
    this.orderRepository = orderRepository;
    this.productRepository = productRepository;
    this.logger = logger;
  }

  public async execute(input: RegisterSaleInput): Promise<Order> {
    const productIds = input.items.map((item) => item.productId);

    try {
      if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new Error("La orden debe contener al menos un producto.");
      }

      const items: OrderItemInput[] = [];

      for (const item of input.items) {
        if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error("Cantidad o identificador de producto invalido.");
        }

        const product = await this.productRepository.getProductById(item.productId);
        if (!product || !product.isAvailableForSale(item.quantity)) {
          throw new Error(`Producto agotado o sin existencias suficientes: ${item.productId}`);
        }

        items.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
          availableStock: product.stock,
        });
      }

      const order = new Order({
        id: randomUUID(),
        userId: input.userId,
        paymentMethod: input.paymentMethod,
        items,
        status: "CONFIRMED",
      });

      const repo = this.orderRepository as unknown as {
        saveOrder?: (o: Order) => Promise<Order>;
        saveOrderWithStockDeduction?: (o: Order) => Promise<Order>;
      };

      if (typeof repo.saveOrderWithStockDeduction === "function") {
        return await repo.saveOrderWithStockDeduction(order);
      }
      if (typeof repo.saveOrder === "function") {
        return await repo.saveOrder(order);
      }

      throw new Error("El repositorio de ordenes no implementa un metodo de guardado.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Error desconocido en pago.";
      await this.logger.logPaymentFailure({
        userId: input.userId,
        productIds,
        reason,
      });
      throw error;
    }
  }
}