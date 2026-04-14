import { eq } from "drizzle-orm";

import { hashPassword } from "../lib/auth";
import { db } from "./index";
import { roles, users } from "./schema";

async function seed() {
  console.log("Seeding database...");

  const rolesToInsert = ["Преподаватель", "Админ", "Менеджер"];

  for (const roleName of rolesToInsert) {
    const existingRole = await db.select().from(roles).where(eq(roles.name, roleName));
    if (existingRole.length === 0) {
      await db.insert(roles).values({ name: roleName });
      console.log(`Role '${roleName}' created.`);
    } else {
      console.log(`Role '${roleName}' already exists.`);
    }
  }

  const adminRole = await db.select().from(roles).where(eq(roles.name, "Админ"));
  if (adminRole.length > 0) {
    const adminRoleId = adminRole[0].id;

    const existingAdmin = await db.select().from(users).where(eq(users.login, "admin"));
    if (existingAdmin.length === 0) {
      const passwordHash = await hashPassword("admin_password");

      await db.insert(users).values({
        name: "Админ",
        surname: "Тестовый",
        patronymic: "Администраторович",
        login: "admin",
        password: passwordHash,
        roleId: adminRoleId,
      });

      console.log("Test admin account created (login: admin, password: admin_password).");
    } else {
      console.log("Test admin account already exists.");
    }
  } else {
    console.error("Admin role not found!");
  }

  console.log("Seeding finished.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

