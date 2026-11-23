export type UserRole = "CUSTOMER" | "ADMIN";

export interface UserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export class User {
  public readonly id: string;
  public readonly name: string;
  public readonly email: string;
  public readonly passwordHash: string;
  public readonly role: UserRole;

  constructor(props: UserProps) {
    if (!props.id || !props.id.trim()) {
      throw new Error("El identificador del usuario es obligatorio.");
    }
    if (!props.name || props.name.trim().length < 2) {
      throw new Error("El nombre del usuario debe tener al menos 2 caracteres.");
    }
    const normalizedEmail = String(props.email ?? "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("El correo electronico no es valido.");
    }
    if (!props.passwordHash || !props.passwordHash.trim()) {
      throw new Error("La contrasena cifrada es obligatoria.");
    }

    this.id = props.id.trim();
    this.name = props.name.trim();
    this.email = normalizedEmail;
    this.passwordHash = props.passwordHash;
    this.role = props.role === "ADMIN" ? "ADMIN" : "CUSTOMER";
  }

  public static validatePasswordPolicy(plainPassword: string): void {
    if (typeof plainPassword !== "string" || plainPassword.trim().length < 6) {
      throw new Error("La contrasena debe tener al menos 6 caracteres.");
    }
  }
}