import { User, UserRole } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/repositories/IUserRepository";

export interface RegisterUserInput {
  id: string;
  name: string;
  email: string;
  password: string;
  passwordHash: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  passwordHash: string;
}

export class ManageSession {
  private readonly userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  public async register(input: RegisterUserInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error("El correo electronico ya esta registrado.");
    }

    User.validatePasswordPolicy(input.password);

    const newUser = new User({
      id: input.id,
      name: input.name,
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      role: input.role ?? "CUSTOMER",
    });

    return this.userRepository.saveUser(newUser);
  }

  public async login(input: LoginInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user || user.passwordHash !== input.passwordHash) {
      throw new Error("Credenciales invalidas.");
    }
    return user;
  }

  public assertAuthenticated(sessionUserId?: string): string {
    if (!sessionUserId || !sessionUserId.trim()) {
      throw new Error("Sesion no iniciada. Debe iniciar sesion para continuar.");
    }
    return sessionUserId.trim();
  }
}