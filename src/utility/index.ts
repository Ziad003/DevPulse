import type { Response } from "express"

interface IGlobalResponse<T>{
    statusCode:number,
    success:boolean,
    message:string,
    data?:T,
    error?:any
}

export const globalResponseHandler=<T>(res:Response,data:IGlobalResponse<T>)=>{
        res.status(data.statusCode).json({
            success:data.success,
            message:data.message,
            data:data.data,
            error:data.error
        })
}