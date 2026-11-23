import {
  EarningsReportData,
  IOrderRepository,
} from "../../domain/repositories/IOrderRepository";

export interface CheckEarningsInput {
  requesterRole?: string;
}

export class CheckEarnings {
  private readonly orderRepository: IOrderRepository;

  constructor(orderRepository: IOrderRepository) {
    this.orderRepository = orderRepository;
  }

  public async execute(input?: CheckEarningsInput): Promise<EarningsReportData> {
    if (input?.requesterRole && input.requesterRole !== "ADMIN") {
      throw new Error("Acceso denegado. Solo administradores pueden consultar ganancias.");
    }

    const report = await this.orderRepository.getEarningsReport();

    return {
      totalOrders: report.totalOrders,
      totalRevenue: Number(report.totalRevenue.toFixed(2)),
      totalItemsSold: report.totalItemsSold,
    };
  }
}