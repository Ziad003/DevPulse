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
router.get("/:id",issueController.getIssueById);
router.patch("/:id",auth(UserRoles.maintainer,UserRoles.contributor),issueController.updateIssueById);
router.delete("/:id",auth(UserRoles.maintainer),issueController.deleteIssueById);

export const issueRouter = router;
