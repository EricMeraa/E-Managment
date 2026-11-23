import { appendFile, mkdir } from "fs/promises";
import path from "path";

export interface PaymentFailureLogEntry {
  userId: string;
  productIds: string[];
  reason: string;
}

export class FileLogger {
  private readonly logFilePath: string;

  constructor(logFilePath?: string) {
    this.logFilePath = logFilePath ?? path.join(process.cwd(), "logs", "payment-errors.log");
  }

  public async logPaymentFailure(entry: PaymentFailureLogEntry): Promise<void> {
    await mkdir(path.dirname(this.logFilePath), { recursive: true });
    const timestamp = new Date().toISOString();
    const products = entry.productIds.length > 0 ? entry.productIds.join(",") : "NINGUNO";
    const line = `[${timestamp}] CLIENTE=${entry.userId} PRODUCTOS=${products} ERROR=${entry.reason}\n`;
    await appendFile(this.logFilePath, line, "utf8");
  }

  public async log(message: string): Promise<void> {
    await mkdir(path.dirname(this.logFilePath), { recursive: true });
    const timestamp = new Date().toISOString();
    await appendFile(this.logFilePath, `[${timestamp}] ${message}\n`, "utf8");
  }
}