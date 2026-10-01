import { Router } from "express";
import { issueController } from "./issue.controller";
import auth from "../../middleware/auth";
import { UserRoles } from "../../type";

const router = Router();

router.post(
  "/",
  auth(UserRoles.contributor, UserRoles.maintainer),
  issueController.createIssue,
);

router.get("/",issueController.getAllIssues);

export const issueRouter = router;
