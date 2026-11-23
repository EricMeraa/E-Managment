import { EarningsReportData } from "../../domain/repositories/IOrderRepository";

export interface FormattedEarningsReport {
  totalOrders: number;
  totalItemsSold: number;
  totalRevenue: number;
  formattedRevenue: string;
}

export class EarningsReportPresenter {
  public present(report: EarningsReportData): FormattedEarningsReport {
    const cleanRevenue = Number(Number(report.totalRevenue ?? 0).toFixed(2));
    return {
      totalOrders: Number(report.totalOrders ?? 0),
      totalItemsSold: Number(report.totalItemsSold ?? 0),
      totalRevenue: cleanRevenue,
      formattedRevenue: `$${cleanRevenue.toFixed(2)}`,
    };
  }
}