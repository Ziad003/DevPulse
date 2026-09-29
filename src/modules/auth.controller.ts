import type { Request, Response } from "express"
import { authService } from "./auth.service"
import { globalResponseHandler } from "../utility"
import { allowedRoles } from "../type";

const signupUser=async(req:Request,res:Response)=>{
    try {
        const { name, email, password, role } = req.body;
   if(!name || !email || !password){
    return globalResponseHandler(res, {
      statusCode: 400,
      success: false,
      message: "Missing required fields: name, email, and password are required.",
    });
   }

   if(await authService.checkEmailInDB(email)){
    return globalResponseHandler(res,{
        statusCode:400,
        success:false,
        message:"Email already taken. User a different email."
    })
   }

   if(role && !allowedRoles.includes(role)){
    return globalResponseHandler(res,{
        statusCode:400,
        success:false,
        message:"Invalid role"
    })
   }

        const result=await authService.signupUserIntoDB(req.body)

        globalResponseHandler(res,{
            statusCode:201,
            success:true,
            message:"User registered successfully",
            data:result.rows[0]

        })
    } catch (error:any) {
        globalResponseHandler(res,{
            statusCode:500,
            success:false,
            message:error.message,
            error:error
        })
    }
}

export const  authController={
    signupUser
}