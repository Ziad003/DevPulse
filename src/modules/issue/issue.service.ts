import type { Request } from "express";
import { pool } from "../../db";
import { UserRoles, type IIssue } from "../../type";

const createIssueIntoDB = async (payLoad: IIssue, reporterId: number) => {
  const { title, description, type, status } = payLoad;
  const result = await pool.query(
    `
            INSERT INTO issues (title,description,type,status,reporter_id) VALUES($1,$2,$3,COALESCE($4,'open'),$5) RETURNING *
        `,
    [title, description, type, status, reporterId],
  );

  return result.rows[0];
};

const getAllIssuesFromDB = async (reqQuery: {
  sort: string | null;
  type: string | null;
  status: string | null;
}) => {
  if (reqQuery.sort) {
    const result = await pool.query(`
                SELECT * FROM issues
                ORDER BY created_at ${reqQuery.sort === "oldest" ? "ASC" : "DESC"}
            `);
    const data = await Promise.all(
      result.rows.map(async (issue) => {
        const reporterDetails = await pool.query(
          `
                         SELECT id,name,role FROM users WHERE id=$1
                    `,
          [issue.reporter_id],
        );
        return {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          type: issue.type,
          status: issue.status,
          reporter: reporterDetails.rows[0],
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        };
      }),
    );
    return data;
  } else if (reqQuery.type) {
    const result = await pool.query(
      `
                SELECT * FROM issues WHERE type=$1
            `,
      [reqQuery.type],
    );

    if (result.rows.length === 0) {
      throw new Error(`No issues found for type: ${reqQuery.type}`);
    }

    const data = await Promise.all(
      result.rows.map(async (issue) => {
        const reporterDetails = await pool.query(
          `
                         SELECT id,name,role FROM users WHERE id=$1
                    `,
          [issue.reporter_id],
        );
        return {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          type: issue.type,
          status: issue.status,
          reporter: reporterDetails.rows[0],
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        };
      }),
    );
    return data;
  } else if (reqQuery.status) {
    const result = await pool.query(
      `
                SELECT * FROM issues WHERE status=$1
            `,
      [reqQuery.status],
    );

    if (result.rows.length === 0) {
      throw new Error(`No issues found for status: ${reqQuery.status}`);
    }

    const data = await Promise.all(
      result.rows.map(async (issue) => {
        const reporterDetails = await pool.query(
          `
                         SELECT id,name,role FROM users WHERE id=$1
                    `,
          [issue.reporter_id],
        );
        return {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          type: issue.type,
          status: issue.status,
          reporter: reporterDetails.rows[0],
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        };
      }),
    );
    return data;
  }
};

const getIssueByIdFromDB = async (issueId: string) => {
  const result = await pool.query(
    `
            SELECT * FROM issues WHERE id=$1
        `,
    [issueId],
  );

  if (result.rows.length === 0) {
    throw new Error(`No issue found with id: ${issueId}`);
  }

  const reporterDetails = await pool.query(
    `
                SELECT id,name,role FROM users WHERE id=$1
            `,
    [result.rows[0].reporter_id],
  );
  return {
    id: result.rows[0].id,
    title: result.rows[0].title,
    description: result.rows[0].description,
    type: result.rows[0].type,
    status: result.rows[0].status,
    reporter: reporterDetails.rows[0],
    created_at: result.rows[0].created_at,
    updated_at: result.rows[0].updated_at,
  };
};

const updateIssueByIdInDB = async (
  req: Request,
  issueId: string,
  payLoad: Partial<IIssue>,
) => {
  const { title, description, type } = payLoad;
  const userRole = req.user?.role;
  const userId = req.user?.id;

  const issueResult = await pool.query(`SELECT * FROM issues WHERE id = $1`, [
    issueId,
  ]);

  if (issueResult.rows.length === 0) {
    const error: any = new Error(`No issue found with id: ${issueId}`);
    error.statusCode = 404;
    throw error;
  }

  if (userRole === UserRoles.maintainer) {
    const result = await pool.query(
      `
            UPDATE issues SET title=COALESCE($1,title), description=COALESCE($2,description), type=COALESCE($3,type), updated_at=NOW() WHERE id=$4 RETURNING *
        `,
      [title, description, type, issueId],
    );

    if (result.rows.length === 0) {
    const error: any = new Error(`No issue found with id: ${issueId}`);
    error.statusCode = 404;
    throw error;
  }

    return result.rows[0];
  } else if (userRole === UserRoles.contributor) {
    const getIssueByIdAndStatus = await pool.query(
      `
                SELECT * FROM issues WHERE reporter_id=$1 AND id=$2 AND status='open' 
            `,
      [userId, issueId],
    );

    if (getIssueByIdAndStatus.rows.length === 0) {
      const error: any = new Error(
    "You can only update issues that you reported and are in 'open' status.",
  );

  error.statusCode = 403;
  throw error;
    }

    const resut = await pool.query(
      `
                UPDATE issues SET 
                title=COALESCE($1,title), 
                description=COALESCE($2,description), 
                type=COALESCE($3,type), 
                updated_at=NOW() 
                WHERE id=$4 
                AND reporter_id=$5
                AND status='open'
                RETURNING *
            `,
      [title, description, type, issueId, userId],
    );
    return resut.rows[0];
  }
};


export const issueService = {
  createIssueIntoDB,
  getAllIssuesFromDB,
  getIssueByIdFromDB,
  updateIssueByIdInDB,
};
