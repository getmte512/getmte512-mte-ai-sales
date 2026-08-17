import{z}from"zod";

export const updateUserRoleSchema=z.object({
  userId:z.string().uuid(),
  role:z.enum(["admin","sales"]),
});

export const inviteUserSchema=z.object({
  email:z.string().trim().email().max(320),
  role:z.enum(["admin","sales"]),
  confirmation:z.literal("SEND_MTE_TEAM_INVITATION"),
});

export const revokeUserAccessSchema=z.object({userId:z.string().uuid(),confirmation:z.literal("REVOKE_MTE_TEAM_ACCESS")});

export function canChangeRole(actorId:string,targetId:string,currentRole:string|null,nextRole:"admin"|"sales"){
  return !(actorId===targetId&&currentRole==="admin"&&nextRole!=="admin");
}
export function canRevokeAccess(actorId:string,targetId:string,currentRole:string|null,adminCount:number){if(!currentRole||actorId===targetId)return false;return currentRole!=="admin"||adminCount>1;}
