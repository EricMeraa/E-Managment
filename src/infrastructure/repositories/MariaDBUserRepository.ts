import { prisma } from "../database/connection";
import { User, UserRole } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/repositories/IUserRepository";

export class MariaDBUserRepository implements IUserRepository {
  public async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const record = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!record) {
      return null;
    }

    return new User({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      role: (record.role as UserRole) ?? "CUSTOMER",
    });
  }

  public async findById(id: string): Promise<User | null> {
    const record = await prisma.user.findUnique({
      where: { id: id.trim() },
    });

    if (!record) {
      return null;
    }

    return new User({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      role: (record.role as UserRole) ?? "CUSTOMER",
    });
  }

  public async saveUser(user: User): Promise<User> {
    const record = await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
      },
    });

    return new User({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      role: (record.role as UserRole) ?? "CUSTOMER",
    });
  }
}