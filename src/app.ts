import express, { urlencoded, type Request, type Response } from "express"
import { authRouter } from "./modules/auth.routes";
const app = express()

app.use(express.json());
app.use(urlencoded({extended:true}));
app.use(express.text())

app.get('/', (req:Request, res:Response) => {
  res.send('Welcome to DevPulse!');
})

app.use('/api/auth',authRouter)


export default app;