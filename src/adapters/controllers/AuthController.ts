import { randomUUID } from "crypto";
import { Request, Response } from "express";
import "express-session";
import { ManageSession } from "../../application/use-cases/ManageSession";
import { UserRole } from "../../domain/entities/User";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: string;
    userName?: string;
    userEmail?: string;
  }
}

export class AuthController {
  private readonly manageSession: ManageSession;

  constructor(manageSession: ManageSession) {
    this.manageSession = manageSession;
  }

  public me = async (req: Request, res: Response): Promise<void> => {
    if (!req.session?.userId) {
      res.status(401).json({ error: "Sesion no iniciada." });
      return;
    }

    res.status(200).json({
      id: req.session.userId,
      name: req.session.userName ?? "",
      email: req.session.userEmail ?? "",
      role: req.session.role ?? "CUSTOMER",
    });
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.body?.id ?? "").trim() || randomUUID();
      const name = String(req.body?.name ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const password = String(req.body?.password ?? "");
      const requestedRole = String(req.body?.role ?? "CUSTOMER").trim().toUpperCase();
      const role: UserRole = requestedRole === "ADMIN" ? "ADMIN" : "CUSTOMER";

      if (!name || !email || !password) {
        res.status(400).json({ error: "Nombre, correo y contrasena son obligatorios." });
        return;
      }

      const user = await this.manageSession.register({
        id,
        name,
        email,
        password,
        role,
      });

      if (req.session) {
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
      }

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrar usuario.";
      res.status(400).json({ error: message });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const password = String(req.body?.password ?? "");

      if (!email || !password) {
        res.status(401).json({ error: "Credenciales invalidas." });
        return;
      }

      const user = await this.manageSession.login({
        email,
        password,
      });

      if (req.session) {
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
      }

      res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al iniciar sesion.";
      res.status(401).json({ error: message });
    }
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    if (!req.session) {
      res.status(200).json({ ok: true });
      return;
    }

    req.session.destroy(() => {
      res.status(200).json({ ok: true });
    });
  };
}