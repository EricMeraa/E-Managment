import { Request, Response } from "express";
import { ManageShoppingCart } from "../../application/use-cases/ManageShoppingCart";

export class CartController {
  private readonly manageShoppingCart: ManageShoppingCart;

  constructor(manageShoppingCart: ManageShoppingCart) {
    this.manageShoppingCart = manageShoppingCart;
  }

  public getCart = async (req: Request, res: Response): Promise<void> => {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: "Sesion no iniciada. Debe iniciar sesion para continuar." });
      return;
    }

    const cart = await this.manageShoppingCart.getCart(userId);
    res.status(200).json(cart);
  };

  public addItem = async (req: Request, res: Response): Promise<void> => {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: "Sesion no iniciada. Debe iniciar sesion para continuar." });
      return;
    }

    try {
      const productId = String(req.body?.productId ?? "").trim();
      const rawQuantity = req.body?.quantity ?? 1;
      const quantity =
        typeof rawQuantity === "number"
          ? rawQuantity
          : typeof rawQuantity === "string" && rawQuantity.trim() !== ""
          ? Number(rawQuantity)
          : NaN;

      if (!Number.isInteger(quantity) || quantity <= 0) {
        res.status(400).json({ error: "La cantidad debe ser un número entero mayor a cero." });
        return;
      }

      const cart = await this.manageShoppingCart.addItem(userId, productId, quantity);
      res.status(200).json(cart);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo agregar al carrito.";
      res.status(400).json({ error: message });
    }
  };

  public removeItem = async (req: Request, res: Response): Promise<void> => {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: "Sesion no iniciada. Debe iniciar sesion para continuar." });
      return;
    }

    try {
      const productId = String(req.params.productId ?? "").trim();
      const cart = await this.manageShoppingCart.removeItem(userId, productId);
      res.status(200).json(cart);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo quitar la prenda.";
      res.status(400).json({ error: message });
    }
  };
}