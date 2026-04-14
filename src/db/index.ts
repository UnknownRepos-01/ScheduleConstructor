import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const poolConnection = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "housemorningdinner",
  database: process.env.DB_NAME || "schedule_db",
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

export const db = drizzle(poolConnection, { schema, mode: "default" });
