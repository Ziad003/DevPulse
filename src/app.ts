import express, { urlencoded, type Request, type Response } from "express"
import { authRouter } from "./modules/auth/auth.routes";
import { issueRouter } from "./modules/issue/issue.routes";
import globalErrorHandler from "./middleware/globalErrorhandler";

const app = express()

app.use(express.json());
app.use(urlencoded({extended:true}));
app.use(express.text())

app.get('/', (req:Request, res:Response) => {
  res.send('Welcome to DevPulse!');
})

app.use('/api/auth',authRouter)
app.use("/api/issues",issueRouter)


app.use(globalErrorHandler)


export default app;