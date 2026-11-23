import { randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { User, UserRole } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/repositories/IUserRepository";

export interface RegisterUserInput {
  id: string;
  name: string;
  email: string;
  password: string;
  passwordHash?: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password?: string;
  passwordHash?: string;
}

export class ManageSession {
  private readonly userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  private hashPassword(plainPassword: string): string {
    const salt = randomUUID().replace(/-/g, "");
    const derived = scryptSync(plainPassword, salt, 64).toString("hex");
    return `${salt}:${derived}`;
  }

  private verifyPassword(plainPassword: string, storedHash: string): boolean {
    const parts = storedHash.split(":");
    if (parts.length !== 2) {
      return false;
    }
    const [salt, keyHex] = parts;
    const derived = scryptSync(plainPassword, salt, 64);
    const stored = Buffer.from(keyHex, "hex");
    if (derived.length !== stored.length) {
      return false;
    }
    return timingSafeEqual(derived, stored);
  }

  public async register(input: RegisterUserInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error("El correo electronico ya esta registrado.");
    }

    User.validatePasswordPolicy(input.password);

    const passwordHash =
      input.passwordHash && input.passwordHash.includes(":")
        ? input.passwordHash
        : this.hashPassword(input.password);

    const newUser = new User({
      id: input.id,
      name: input.name,
      email: normalizedEmail,
      passwordHash,
      role: input.role ?? "CUSTOMER",
    });

    return this.userRepository.saveUser(newUser);
  }

  public async login(input: LoginInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Credenciales invalidas.");
    }

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new Error("Credenciales invalidas.");
    }

    if (typeof input.password === "string" && input.password.length > 0) {
      const isValid = this.verifyPassword(input.password, user.passwordHash);
      if (!isValid) {
        throw new Error("Credenciales invalidas.");
      }
      return user;
    }

    if (typeof input.passwordHash === "string" && input.passwordHash.length > 0) {
      if (user.passwordHash !== input.passwordHash) {
        throw new Error("Credenciales invalidas.");
      }
      return user;
    }

    throw new Error("Credenciales invalidas.");
  }

  public assertAuthenticated(sessionUserId?: string): string {
    if (!sessionUserId || !sessionUserId.trim()) {
      throw new Error("Sesion no iniciada. Debe iniciar sesion para continuar.");
    }
    return sessionUserId.trim();
  }
}