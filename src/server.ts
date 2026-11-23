import { randomUUID } from "crypto";
import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import fs from "fs";
import multer from "multer";
import path from "path";
import { AuthController } from "./adapters/controllers/AuthController";
import { CartController } from "./adapters/controllers/CartController";
import { SalesController } from "./adapters/controllers/SalesController";
import { EarningsReportPresenter } from "./adapters/presenters/EarningsReportPresenter";
import { CheckEarnings } from "./application/use-cases/CheckEarnings";
import { InventoryMaintenance } from "./application/use-cases/InventoryMaintenance";
import { ManageSession } from "./application/use-cases/ManageSession";
import { ManageShoppingCart } from "./application/use-cases/ManageShoppingCart";
import { RegisterSale } from "./application/use-cases/RegisterSale";
import { FileLogger } from "./infrastructure/logging/FileLogger";
import { MariaDBOrderRepository } from "./infrastructure/repositories/MariaDBOrderRepository";
import { MariaDBProductRepository } from "./infrastructure/repositories/MariaDBProductRepository";
import { MariaDBUserRepository } from "./infrastructure/repositories/MariaDBUserRepository";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const sessionSecret = process.env.SESSION_SECRET || "e-managment-local-secret-change-in-prod";
const publicDir = path.join(process.cwd(), "public");
const productUploadsDir = path.join(publicDir, "uploads", "products");

fs.mkdirSync(productUploadsDir, { recursive: true });

const allowedMimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const uploadProductImage = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, productUploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = allowedMimeToExt[file.mimetype] || ".jpg";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeToExt[file.mimetype]) {
      cb(new Error("Formato no permitido. Usa JPG, PNG o WEBP (máximo 3 MB)."));
      return;
    }
    cb(null, true);
  },
});

function requireAdminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Sesion no iniciada. Debe iniciar sesion para continuar." });
    return;
  }
  if (req.session.role !== "ADMIN") {
    res.status(403).json({ error: "Acceso denegado: se requiere perfil de Administrador." });
    return;
  }
  next();
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    name: "emanagment.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 4,
    },
  })
);

app.get(["/admin", "/admin.html"], (_req: Request, res: Response) => {
  const adminFile = path.join(publicDir, "admin.html");
  if (!fs.existsSync(adminFile)) {
    res
      .status(404)
      .type("text/plain; charset=utf-8")
      .send("No se encontro public/admin.html.");
    return;
  }
  res.sendFile(adminFile);
});

app.use(express.static(publicDir));

const userRepository = new MariaDBUserRepository();
const productRepository = new MariaDBProductRepository();
const orderRepository = new MariaDBOrderRepository();
const fileLogger = new FileLogger();
const earningsPresenter = new EarningsReportPresenter();

const manageSession = new ManageSession(userRepository);
const manageShoppingCart = new ManageShoppingCart(productRepository);
const registerSale = new RegisterSale(orderRepository, productRepository, fileLogger);
const checkEarnings = new CheckEarnings(orderRepository);
const inventoryMaintenance = new InventoryMaintenance(productRepository);

const authController = new AuthController(manageSession);
const cartController = new CartController(manageShoppingCart);
const salesController = new SalesController(
  inventoryMaintenance,
  registerSale,
  checkEarnings,
  manageShoppingCart,
  earningsPresenter
);

app.get("/api/auth/me", authController.me);
app.post("/api/auth/register", authController.register);
app.post("/api/auth/login", authController.login);
app.post("/api/auth/logout", authController.logout);

app.get("/api/products", salesController.getProducts);
app.post(
  "/api/products",
  requireAdminMiddleware,
  uploadProductImage.single("image"),
  salesController.createProduct
);
app.put(
  "/api/products/:productId",
  requireAdminMiddleware,
  uploadProductImage.single("image"),
  salesController.updateProduct
);
app.delete("/api/products/:productId", requireAdminMiddleware, salesController.deleteProduct);

app.get("/api/cart", cartController.getCart);
app.post("/api/cart/items", cartController.addItem);
app.delete("/api/cart/items/:productId", cartController.removeItem);

app.post("/api/orders/checkout", salesController.checkout);
app.get("/api/earnings", requireAdminMiddleware, salesController.getEarnings);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === "LIMIT_FILE_SIZE"
        ? "La imagen supera el limite de 3 MB."
        : `Error al subir imagen: ${err.message}`;
    res.status(400).json({ error: msg });
    return;
  }
  const message =
    err instanceof Error && err.message
      ? err.message
      : "Error interno del servidor.";
  console.error("[E-Managment Error]", err);
  if (!res.headersSent) {
    res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`E-Managment escuchando en http://localhost:${port}`);
});