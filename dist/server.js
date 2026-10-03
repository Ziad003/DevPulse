
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
  

// src/app.ts
import express, { urlencoded } from "express";

// src/modules/auth/auth.routes.ts
import { Router } from "express";

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });
var config = {
  connection_string: process.env.CONNECTIONSTRING,
  port: process.env.PORT,
  secret: process.env.JWT_SECRET,
  refresh_secret: process.env.JWT_REFRESH_SECRET
};
var config_default = config;

// src/db/index.ts
import { Pool } from "pg";
var pool = new Pool({
  connectionString: config_default.connection_string
});
var initDB = async () => {
  try {
    await pool.query(`
                CREATE TABLE IF NOT EXISTS users(
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(30) NOT NULL,
                    email VARCHAR(50) UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role VARCHAR(15) DEFAULT 'contributor' CHECK (role IN ('contributor','maintainer')),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
    await pool.query(`
                CREATE TABLE IF NOT EXISTS issues(
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(150) NOT NULL,
                    description TEXT NOT NULL CHECK(LENGTH(description) >= 20),
                    type VARCHAR(20) NOT NULL CHECK (type IN ('bug','feature_request')),
                    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status In ('open','in_progress','resolved')),
                    reporter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
    console.log("Database initialization successfull");
  } catch (error) {
    throw new Error(
      "Database initialization failed" + error.message
    );
  }
};

// src/modules/auth/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var signupUserIntoDB = async (payLoad) => {
  const { name, email, password, role } = payLoad;
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `
            INSERT INTO users (name,email,password,role)
            VALUES ($1,$2,$3,COALESCE($4,'contributor')) RETURNING *
        `,
    [name, email, hashedPassword, role]
  );
  delete result.rows[0].password;
  return result;
};
var checkEmailInDB = async (email) => {
  const result = await pool.query(
    `
            SELECT * FROM users WHERE email=$1
        `,
    [email]
  );
  return result.rows.length > 0;
};
var loginUserIntoDB = async (payLoad) => {
  const { email, password } = payLoad;
  const getUsers = await pool.query(
    `
      SELECT * FROM users WHERE email=$1
    `,
    [email]
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
    updated_at: user.updated_at
  };
  const accessToken = jwt.sign(jwtpaylaod, config_default.secret, {
    expiresIn: "1d"
  });
  return { accessToken, user: jwtpaylaod };
};
var authService = {
  signupUserIntoDB,
  checkEmailInDB,
  loginUserIntoDB
};

// src/utility/index.ts
var globalResponseHandler = (res, data) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    data: data.data,
    error: data.error
  });
};

// src/type/index.ts
var UserRoles = {
  contributor: "contributor",
  maintainer: "maintainer"
};
var allowedRoles = ["contributor", "maintainer"];
var allowedTypes = ["bug", "feature_request"];

// src/modules/auth/auth.controller.ts
var signupUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return globalResponseHandler(res, {
        statusCode: 400,
        success: false,
        message: "Missing required fields: name, email, and password are required."
      });
    }
    if (await authService.checkEmailInDB(email)) {
      return globalResponseHandler(res, {
        statusCode: 400,
        success: false,
        message: "Email already taken. User a different email."
      });
    }
    if (role && !allowedRoles.includes(role)) {
      return globalResponseHandler(res, {
        statusCode: 400,
        success: false,
        message: "Invalid role"
      });
    }
    const result = await authService.signupUserIntoDB(req.body);
    globalResponseHandler(res, {
      statusCode: 201,
      success: true,
      message: "User registered successfully",
      data: result.rows[0]
    });
  } catch (error) {
    globalResponseHandler(res, {
      statusCode: 500,
      success: false,
      message: error.message,
      error
    });
  }
};
var loginUser = async (req, res) => {
  const { accessToken, user } = await authService.loginUserIntoDB(req.body);
  globalResponseHandler(res, {
    statusCode: 200,
    success: true,
    message: "Login successful",
    data: {
      token: accessToken,
      user
    }
  });
};
var authController = {
  signupUser,
  loginUser
};

// src/modules/auth/auth.routes.ts
var router = Router();
router.post("/signup", authController.signupUser);
router.post("/login", authController.loginUser);
var authRouter = router;

// src/modules/issue/issue.routes.ts
import { Router as Router2 } from "express";

// src/modules/issue/issue.service.ts
var createIssueIntoDB = async (payLoad, reporterId) => {
  const { title, description, type, status } = payLoad;
  const result = await pool.query(
    `
            INSERT INTO issues (title,description,type,status,reporter_id) VALUES($1,$2,$3,COALESCE($4,'open'),$5) RETURNING *
        `,
    [title, description, type, status, reporterId]
  );
  return result.rows[0];
};
var getAllIssuesFromDB = async (reqQuery) => {
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
          [issue.reporter_id]
        );
        return {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          type: issue.type,
          status: issue.status,
          reporter: reporterDetails.rows[0],
          created_at: issue.created_at,
          updated_at: issue.updated_at
        };
      })
    );
    return data;
  } else if (reqQuery.type) {
    const result = await pool.query(
      `
                SELECT * FROM issues WHERE type=$1
            `,
      [reqQuery.type]
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
          [issue.reporter_id]
        );
        return {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          type: issue.type,
          status: issue.status,
          reporter: reporterDetails.rows[0],
          created_at: issue.created_at,
          updated_at: issue.updated_at
        };
      })
    );
    return data;
  } else if (reqQuery.status) {
    const result = await pool.query(
      `
                SELECT * FROM issues WHERE status=$1
            `,
      [reqQuery.status]
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
          [issue.reporter_id]
        );
        return {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          type: issue.type,
          status: issue.status,
          reporter: reporterDetails.rows[0],
          created_at: issue.created_at,
          updated_at: issue.updated_at
        };
      })
    );
    return data;
  }
};
var getIssueByIdFromDB = async (issueId) => {
  const result = await pool.query(
    `
            SELECT * FROM issues WHERE id=$1
        `,
    [issueId]
  );
  if (result.rows.length === 0) {
    throw new Error(`No issue found with id: ${issueId}`);
  }
  const reporterDetails = await pool.query(
    `
                SELECT id,name,role FROM users WHERE id=$1
            `,
    [result.rows[0].reporter_id]
  );
  return {
    id: result.rows[0].id,
    title: result.rows[0].title,
    description: result.rows[0].description,
    type: result.rows[0].type,
    status: result.rows[0].status,
    reporter: reporterDetails.rows[0],
    created_at: result.rows[0].created_at,
    updated_at: result.rows[0].updated_at
  };
};
var updateIssueByIdInDB = async (req, issueId, payLoad) => {
  const { title, description, type } = payLoad;
  const userRole = req.user?.role;
  const userId = req.user?.id;
  const issueResult = await pool.query(`SELECT * FROM issues WHERE id = $1`, [
    issueId
  ]);
  if (issueResult.rows.length === 0) {
    const error = new Error(`No issue found with id: ${issueId}`);
    error.statusCode = 404;
    throw error;
  }
  if (userRole === UserRoles.maintainer) {
    const result = await pool.query(
      `
            UPDATE issues SET title=COALESCE($1,title), description=COALESCE($2,description), type=COALESCE($3,type), updated_at=NOW() WHERE id=$4 RETURNING *
        `,
      [title, description, type, issueId]
    );
    if (result.rows.length === 0) {
      const error = new Error(`No issue found with id: ${issueId}`);
      error.statusCode = 404;
      throw error;
    }
    return result.rows[0];
  } else if (userRole === UserRoles.contributor) {
    const getIssueByIdAndStatus = await pool.query(
      `
                SELECT * FROM issues WHERE reporter_id=$1 AND id=$2 AND status='open' 
            `,
      [userId, issueId]
    );
    if (getIssueByIdAndStatus.rows.length === 0) {
      const error = new Error(
        "You can only update issues that you reported and are in 'open' status."
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
      [title, description, type, issueId, userId]
    );
    return resut.rows[0];
  }
};
var deleteIssueByIdFromDB = async (issueId) => {
  const result = await pool.query(`
            DELETE FROM issues WHERE id=$1 RETURNING *
        `, [issueId]);
  if (result.rows.length === 0) {
    const error = new Error(`No issue found with id: ${issueId}`);
    error.statusCode = 404;
    throw error;
  }
};
var issueService = {
  createIssueIntoDB,
  getAllIssuesFromDB,
  getIssueByIdFromDB,
  updateIssueByIdInDB,
  deleteIssueByIdFromDB
};

// src/modules/issue/issue.controller.ts
var createIssue = async (req, res) => {
  try {
    const reqId = req.user?.id;
    const { type, description } = req.body;
    if (type && !allowedTypes.includes(type)) {
      return globalResponseHandler(res, {
        statusCode: 400,
        success: false,
        message: "Invalid type value. Allowed values are: bug, feature_request"
      });
    }
    if (description.length < 20) {
      return globalResponseHandler(res, {
        statusCode: 400,
        success: false,
        message: "Description is too short. Please provide a more detailed description."
      });
    }
    const result = await issueService.createIssueIntoDB(req.body, reqId);
    globalResponseHandler(res, {
      statusCode: 201,
      success: true,
      message: "Issue created successfully",
      data: result
    });
  } catch (error) {
    globalResponseHandler(res, {
      statusCode: 500,
      success: false,
      message: error.message,
      error
    });
  }
};
var getAllIssues = async (req, res) => {
  try {
    const reqQuery = {
      sort: req.query.sort || null,
      type: req.query.type || null,
      status: req.query.status || null
    };
    const result = await issueService.getAllIssuesFromDB(reqQuery);
    globalResponseHandler(res, {
      statusCode: 200,
      success: true,
      message: "Issues retrived successfully",
      data: result
    });
  } catch (error) {
    globalResponseHandler(res, {
      statusCode: 500,
      success: false,
      message: error.message,
      error
    });
  }
};
var getIssueById = async (req, res) => {
  try {
    const issueId = req.params.id;
    const result = await issueService.getIssueByIdFromDB(issueId);
    globalResponseHandler(res, {
      statusCode: 200,
      success: true,
      message: "Issue retrieved successfully",
      data: result
    });
  } catch (error) {
    globalResponseHandler(res, {
      statusCode: 500,
      success: false,
      message: error.message,
      error
    });
  }
};
var updateIssueById = async (req, res) => {
  try {
    const issueId = req.params.id;
    const payLoad = req.body;
    const result = await issueService.updateIssueByIdInDB(req, issueId, payLoad);
    globalResponseHandler(res, {
      statusCode: 200,
      success: true,
      message: "Issue updated successfully"
    });
  } catch (error) {
    globalResponseHandler(res, {
      statusCode: error.statusCode || 500,
      success: false,
      message: error.message,
      error
    });
  }
};
var deleteIssueById = async (req, res) => {
  const id = req.params.id;
  try {
    const result = await issueService.deleteIssueByIdFromDB(id);
    globalResponseHandler(res, {
      statusCode: 200,
      success: true,
      message: "Issue deleted successfully",
      data: result
    });
  } catch (error) {
    globalResponseHandler(res, {
      statusCode: error.statusCode || 500,
      success: false,
      message: error.message,
      error
    });
  }
};
var issueController = {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssueById,
  deleteIssueById
};

// src/middleware/auth.ts
import jwt2 from "jsonwebtoken";
var auth = (...roles) => {
  return async (req, res, next) => {
    console.log(roles);
    try {
      const token = req.headers.authorization;
      console.log(token);
      if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized access!!" });
      }
      const decoded = jwt2.verify(
        token,
        config_default.secret
      );
      const userData = await pool.query(
        `
                SELECT * FROM users WHERE email=$1
            `,
        [decoded.email]
      );
      const user = userData.rows[0];
      if (userData.rows.length === 0) {
        return res.status(403).json({ success: false, message: "User not found!!" });
      }
      if (roles.length && !roles.includes(user.role)) {
        return globalResponseHandler(res, {
          statusCode: 403,
          success: false,
          message: "Access denied. You do not have the required role to perform this action."
        });
      }
      req.user = decoded;
      next();
    } catch (error) {
      globalResponseHandler(res, {
        statusCode: 500,
        success: false,
        message: "Internal Server Error",
        error
      });
    }
  };
};
var auth_default = auth;

// src/modules/issue/issue.routes.ts
var router2 = Router2();
router2.post(
  "/",
  auth_default(UserRoles.contributor, UserRoles.maintainer),
  issueController.createIssue
);
router2.get("/", issueController.getAllIssues);
router2.get("/:id", issueController.getIssueById);
router2.patch("/:id", auth_default(UserRoles.maintainer, UserRoles.contributor), issueController.updateIssueById);
router2.delete("/:id", auth_default(UserRoles.maintainer), issueController.deleteIssueById);
var issueRouter = router2;

// src/middleware/globalErrorhandler.ts
var globalErrorHandler = (err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
};
var globalErrorhandler_default = globalErrorHandler;

// src/app.ts
var app = express();
app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(express.text());
app.get("/", (req, res) => {
  res.send("Welcome to DevPulse!");
});
app.use("/api/auth", authRouter);
app.use("/api/issues", issueRouter);
app.use(globalErrorhandler_default);
var app_default = app;

// src/server.ts
var main = () => {
  initDB();
  app_default.listen(config_default.port, () => {
    console.log(`Example app listening on port ${config_default.port}`);
  });
};
main();
//# sourceMappingURL=server.js.map