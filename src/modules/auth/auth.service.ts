import config from "../../config";
import { pool } from "../../db";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { ILoginUser, IUser } from "../../type";

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

const loginUserIntoDB = async (payLoad: ILoginUser) => {
  const { email, password } = payLoad;

  const getUsers = await pool.query(
    `
      SELECT * FROM users WHERE email=$1
    `,
    [email],
  );

  if (getUsers.rows.length == 0) {
    throw new Error("User not found");
  }
  const user = getUsers.rows[0];
  const matchPassword = await bcrypt.compare(password, user.password);

  if (!matchPassword) {
    throw new Error("Invalid credentials. Wrong password!");
  }

  const jwtpaylaod = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    create_at: user.created_at,
    updated_at: user.updated_at,
  };

  const accessToken = jwt.sign(jwtpaylaod, config.secret as string, {
    expiresIn: "1d",
  });

  return { accessToken, user: jwtpaylaod };
};

export const authService = {
  signupUserIntoDB,
  checkEmailInDB,
  loginUserIntoDB,
};
