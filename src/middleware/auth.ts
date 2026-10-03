import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config";
import { pool } from "../db";
import type { ROLES } from "../type";
import { globalResponseHandler } from "../utility";



const auth = (...roles: ROLES[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.log(roles);
    try {
      // console.log("This is protected route");
      // console.log(req.headers.authorization)

      const token = req.headers.authorization;
      console.log(token);
      if (!token) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized access!!" });
      }

      const decoded = jwt.verify(
        token as string,
        config.secret as string,
      ) as JwtPayload;

      const userData = await pool.query(
        `
                SELECT * FROM users WHERE email=$1
            `,
        [decoded.email],
      );

      // console.log(userData);

      const user = userData.rows[0];

      //validation with logic
      if (userData.rows.length === 0) {
        return res.status(403).json({ success: false, message: "User not found!!" });
      }

      // console.log("Auth Role: ",user.role)

      if (roles.length && !roles.includes(user.role)) {
        return globalResponseHandler(res,{
          statusCode:403,
          success:false,
          message:"Access denied. You do not have the required role to perform this action."
        })
      }

      req.user = decoded;

      next();
    } catch (error:any) {
      globalResponseHandler(res, {
        statusCode: 500,
        success: false,
        message: "Internal Server Error",
        error:error
      });
    }
  };
};

export default auth;
