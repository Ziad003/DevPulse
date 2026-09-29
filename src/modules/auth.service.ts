import { pool } from "../db";
import type { IUser } from "../type";
import bcrypt from "bcryptjs";
import { globalResponseHandler } from "../utility";

const signupUserIntoDB = async (payLoad: IUser) => {
  const { name, email, password, role } = payLoad;

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `
            INSERT INTO users (name,email,password,role)
            VALUES ($1,$2,$3,COALESCE($4,'contributor')) RETURNING *
        `,
    [name, email, hashedPassword, role],
  );
  delete result.rows[0].password;
  return result;
};

const checkEmailInDB = async (email: string) => {
  const result = await pool.query(
    `
            SELECT * FROM users WHERE email=$1
        `,
    [email],
  );

  return result.rows.length > 0;
};

export const authService = {
  signupUserIntoDB,
  checkEmailInDB,
};
