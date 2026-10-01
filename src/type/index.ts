export type IUser={
    name:string,
    email:string,
    password:string,
    role: "contributor"|"maintainer"
}

export type IIssue={
    title:string,
    description:string,
    type:"bug"| "feature_request",
    status?:"open" | "in_progress" | "resolved",
}

export type ILoginUser={
    email:string,
    password:string
}

export const UserRoles={
    contributor:"contributor",
    maintainer:"maintainer"
}as const;

export const allowedRoles=["contributor","maintainer"] as const
export type ROLES="contributor" | "maintainer";
export const allowedTypes = ["bug", "feature_request"] as const;

export const TYPE=["bug","feature_request"] as const;