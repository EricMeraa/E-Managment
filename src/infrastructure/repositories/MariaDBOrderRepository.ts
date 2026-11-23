import { Order, OrderStatus } from "../../domain/entities/Order";
import {
  EarningsReportData,
  IOrderRepository,
} from "../../domain/repositories/IOrderRepository";
import { prisma } from "../database/connection";

export class MariaDBOrderRepository implements IOrderRepository {
  public async saveOrder(order: Order): Promise<Order> {
    const statusValue: OrderStatus = order.status as OrderStatus;

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            isActive: true,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updated.count === 0) {
          throw new Error(`Stock insuficiente para completar la compra del producto ${item.productId}.`);
        }
      }

      await tx.order.create({
        data: {
          id: order.id,
          userId: order.userId,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          status: statusValue,
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      });

      await tx.stockReservation.deleteMany({
        where: {
          userId: order.userId,
          productId: { in: order.items.map((item) => item.productId) },
        },
      });
    });

    return order;
  }

  public async getEarningsReport(): Promise<EarningsReportData> {
    const confirmedOrders = await prisma.order.findMany({
      where: { status: "CONFIRMED" },
      include: { items: true },
    });

    let totalRevenue = 0;
    let totalItemsSold = 0;

    for (const ord of confirmedOrders) {
      totalRevenue += Number(ord.totalAmount);
      for (const item of ord.items) {
        totalItemsSold += item.quantity;
      }
    }

    return {
      totalOrders: confirmedOrders.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalItemsSold,
    };
  }
}