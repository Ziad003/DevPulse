import { Pool } from "pg";
import config from "../config";

export const pool = new Pool({
  connectionString: config.connection_string,
});

export const initDB = async () => {
  try {
    await pool.query(`
                CREATE TABLE IF NOT EXISTS users(
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(30) NOT NULL,
                    email VARCHAR(50) UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role VARCHAR(15) DEFAULT 'contributor' CHECK (role IN ('contributor','maintainer')),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
    await pool.query(`
                CREATE TABLE IF NOT EXISTS issues(
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(150) NOT NULL,
                    description TEXT NOT NULL CHECK(LENGTH(description) >= 20),
                    type VARCHAR(20) NOT NULL CHECK (type IN ('bug','feature_request')),
                    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status In ('open','in_progress','resolved')),
                    reporter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

    console.log("Database initialization successfull");
  } catch (error) {
    throw new Error(
      "Database initialization failed" + (error as Error).message,
    );
  }
};
