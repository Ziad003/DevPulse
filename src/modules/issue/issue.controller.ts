import type { Request, Response } from "express";
import { globalResponseHandler } from "../../utility";
import { issueService } from "./issue.service";
import { allowedTypes } from "../../type";

const createIssue = async (req: Request, res: Response) => {
  try {
    const repId = req.user?.id;

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

    const result = await issueService.createIssueIntoDB(req.body, repId);

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
}


export const issueController = {
  createIssue,
  getAllIssues,
};
