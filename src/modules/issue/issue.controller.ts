import type { Request, Response } from "express";
import { globalResponseHandler } from "../../utility";
import { issueService } from "./issue.service";
import { allowedTypes } from "../../type";

const createIssue = async (req: Request, res: Response) => {
  try {
    const reqId = req.user?.id;

    const { type, description } = req.body;
    if (type && !allowedTypes.includes(type)) {
      return globalResponseHandler(res, {
        statusCode: 400,
        success: false,
        message: "Invalid type value. Allowed values are: bug, feature_request",
      });
    }
    if (description.length < 20) {
      return globalResponseHandler(res, {
        statusCode: 400,
        success: false,
        message:
          "Description is too short. Please provide a more detailed description.",
      });
    }

    const result = await issueService.createIssueIntoDB(req.body, reqId);

    globalResponseHandler(res, {
      statusCode: 201,
      success: true,
      message: "Issue created successfully",
      data: result,
    });
  } catch (error: any) {
    globalResponseHandler(res, {
      statusCode: 500,
      success: false,
      message: error.message,
      error: error,
    });
  }
};

const getAllIssues=async (req: Request, res: Response) => {
  
  try {
    const reqQuery={
      sort:(req.query.sort as string)||null,
      type:(req.query.type as string)||null,
      status:(req.query.status as string)||null
    }

    const result=await issueService.getAllIssuesFromDB(reqQuery);
    globalResponseHandler(res,{
      statusCode:200,
      success:true,
      message:"Issues retrived successfully",
      data:result
    })
    
  } catch (error: any) {
    globalResponseHandler(res, {
      statusCode: 500,
      success: false,
      message: error.message,
      error: error,
    })
  }
};

const getIssueById=async(req:Request,res:Response)=>{
    try {
        const issueId=req.params.id;
        const result=await issueService.getIssueByIdFromDB(issueId as string);
        globalResponseHandler(res, {
            statusCode: 200,
            success: true,
            message: "Issue retrieved successfully",
            data: result
        });
    } catch (error:any) {
      globalResponseHandler(res, {
        statusCode: 500,
        success: false,
        message: error.message,
        error: error,
      })
    }
  };

  const updateIssueById=async(req:Request,res:Response)=>{
    try {
      const issueId=req.params.id;
      const payLoad=req.body;

      const result=await issueService.updateIssueByIdInDB(req,issueId as string,payLoad);
      globalResponseHandler(res, {
        statusCode: 200,
        success: true,
        message: "Issue updated successfully",
        data: result
      })

    } catch (error:any) {
      globalResponseHandler(res, {
        statusCode: error.statusCode || 500,
        success: false,
        message: error.message,
        error: error,
      })
    }
  };





export const issueController = {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssueById
};
