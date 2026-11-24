# E-
# E-Managment

Plataforma web para la comercialización digital de ropa y la gestión operativa de la marca, evitando la sobreventa en picos de demanda mediante bloqueos temporales de inventario[cite: 1, 10]. Está dirigida a clientes finales (con inicio de sesión para operar) y a administradores internos encargados de gestionar el catálogo, las ventas y los reportes financieros[cite: 10].

## Equipo
- **Eric Gamaliel Bautista Mera** — Expediente: `333380` — Rol: [Indica tu rol, ej. Backend / Arquitectura][cite: 10]
- **Hiram Rodriguez Abello** — Expediente: `333345` — Rol: [Indica su rol, ej. Frontend / Fullstack / Documentación][cite: 10]

## Stack
- **Runtime / Lenguaje:** Node.js (`@types/node ^22.9.0`) y TypeScript (`^5.6.3`)
- **Framework web y sesiones:** Express (`^4.21.1`), `express-session` (`^1.18.1`), `bcryptjs` (`^2.4.3`) y `multer` (`^2.5.0`)
- **ORM y base de datos:** Prisma (`^5.22.0`) y MariaDB / MySQL (implementaciones de repositorio en MariaDB)[cite: 10]
- **Frontend estático:** HTML, CSS y JavaScript servidos desde `public/` (`index.html`, `catalogo.html`, `admin.html`, `app.js`, `catalogo.js`, `admin.js`, `styles.css`, `admin.css`)
- **Despliegue y monitoreo:** Render (`https://e-managment-2.onrender.com`) y UptimeRobot[cite: 1, 7]

## Arquitectura
![Diagrama de arquitectura](docs/arquitectura.png)[cite: 7, 8]

El proyecto aplica **Clean Architecture** manteniendo las dependencias apuntando hacia adentro, de modo que el dominio no dependa del framework web ni de la base de datos[cite: 4, 10]:

- `src/domain/entities/`: Entidades del negocio (`Order.ts`, `Product.ts`, `User.ts`) y reglas de dominio[cite: 10, 24].
- `src/domain/repositories/`: Contratos / interfaces de repositorio (`IOrderRepository.ts`, `IProductRepository.ts`, `IUserRepository.ts`)[cite: 10, 22, 24].
- `src/application/use-cases/`: Casos de uso (`CheckEarnings.ts`, `InventoryMaintenance.ts`, `ManageSession.ts`, `ManageShoppingCart.ts`, `RegisterSale.ts`)[cite: 10, 24].
- `src/adapters/`: Controladores (`AuthController.ts`, `CartController.ts`, `SalesController.ts`) y presenters (`EarningsReportPresenter.ts`)[cite: 10, 23, 24].
- `src/infrastructure/`: Conexión a base de datos (`database/connection.ts`), registro en archivos (`logging/FileLogger.ts`), implementaciones de repositorio (`repositories/MariaDBOrderRepository.ts`, `repositories/MariaDBProductRepository.ts`, `repositories/MariaDBUserRepository.ts`), tipos (`types/`) y arranque del servidor (`server.ts`)[cite: 10, 22].
- `prisma/` y `public/`: Esquema/configuración de Prisma y archivos estáticos del cliente/administración (incluyendo `public/uploads/`)[cite: 23].

## Cómo correrlo
1. **Requisitos:** Node.js (v22 recomendado según `@types/node`) y acceso a una instancia de base de datos compatible configurada con Prisma.
2. **Variables de entorno:** Copia el archivo de ejemplo y rellena las variables necesarias (sin subir secretos al repositorio):
   ```bash
   cp .env.example .env
   ```[cite: 5, 8, 22]
3. **Instalación y sincronización de base de datos:**
   ```bash
   npm install
   npm run prisma:push
   npm run prisma:generate