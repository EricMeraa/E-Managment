import { Order } from "../entities/Order";

export interface EarningsReportData {
  totalOrders: number;
  totalRevenue: number;
  totalItemsSold: number;
}

export interface IOrderRepository {
  saveOrder(order: Order): Promise<Order>;
  getEarningsReport(): Promise<EarningsReportData>;
}