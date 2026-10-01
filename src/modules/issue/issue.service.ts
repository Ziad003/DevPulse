import { pool } from "../../db"
import type { IIssue } from "../../type"

const createIssueIntoDB=async(payLoad:IIssue,reporterId:number)=>{ 
    const {title,description,type,status}=payLoad
    const result=await pool.query(`
            INSERT INTO issues (title,description,type,status,reporter_id) VALUES($1,$2,$3,COALESCE($4,'open'),$5) RETURNING *
        `,[title,description,type,status,reporterId])
    
        return result.rows[0]
};

const getAllIssuesFromDB=async(reqQuery:{sort:string|null,type:string|null,status:string|null})=>{
    if(reqQuery.sort){
         const result=await pool.query(`
                SELECT * FROM issues
                ORDER BY created_at ${reqQuery.sort==="oldest" ? "ASC" : "DESC"}
            `)
        const data=await Promise.all(
            result.rows.map(async(issue)=>{
                const reporterDetails=await pool.query(`
                         SELECT id,name,role FROM users WHERE id=$1
                    `,[issue.reporter_id]);
                    return{
                        id:issue.id,
                        title:issue.title,
                        description:issue.description,
                        type:issue.type,
                        status:issue.status,
                        reporter:reporterDetails.rows[0],
                        created_at:issue.created_at,
                        updated_at:issue.updated_at
                    }
            })
        );
        return data;
    }else if(reqQuery.type){
        const result=await pool.query(`
                SELECT * FROM issues WHERE type=$1
            `,[reqQuery.type]);

            if(result.rows.length===0){
                throw new Error(`No issues found for type: ${reqQuery.type}`);
            }

        const data=await Promise.all(
            result.rows.map(async(issue)=>{
                const reporterDetails=await pool.query(`
                         SELECT id,name,role FROM users WHERE id=$1
                    `,[issue.reporter_id]);
                    return{
                        id:issue.id,
                        title:issue.title,
                        description:issue.description,
                        type:issue.type,
                        status:issue.status,
                        reporter:reporterDetails.rows[0],
                        created_at:issue.created_at,
                        updated_at:issue.updated_at
                    }
            })
        );
        return data;
    }else if(reqQuery.status){
        const result=await pool.query(`
                SELECT * FROM issues WHERE status=$1
            `,[reqQuery.status]);
    
        if(result.rows.length===0){
            throw new Error(`No issues found for status: ${reqQuery.status}`);
        }

            const data=await Promise.all(
            result.rows.map(async(issue)=>{
                const reporterDetails=await pool.query(`
                         SELECT id,name,role FROM users WHERE id=$1
                    `,[issue.reporter_id]);
                    return{
                        id:issue.id,
                        title:issue.title,
                        description:issue.description,
                        type:issue.type,
                        status:issue.status,
                        reporter:reporterDetails.rows[0],
                        created_at:issue.created_at,
                        updated_at:issue.updated_at
                    }
            })
        );
        return data;
}
}

export const issueService={
    createIssueIntoDB,
    getAllIssuesFromDB
}