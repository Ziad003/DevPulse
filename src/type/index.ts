export type IUser={
    name:string,
    email:string,
    password:string,
    role: "contributor"|"maintainer"
}

export const allowedRoles=["contributor","maintainer"] as const