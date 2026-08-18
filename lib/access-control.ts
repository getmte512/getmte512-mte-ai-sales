import{z}from"zod";

const assignableRole=z.enum(["admin","sales","retailer"]);
export const updateUserRoleSchema=z.object({userId:z.string().uuid(),role:assignableRole});
export const inviteUserSchema=z.object({email:z.string().trim().email().max(320),role:assignableRole,confirmation:z.literal("SEND_MTE_TEAM_INVITATION")});
export const revokeUserAccessSchema=z.object({userId:z.string().uuid(),confirmation:z.literal("REVOKE_MTE_TEAM_ACCESS")});
export const retailerPortalAccessSchema=z.object({userId:z.string().uuid(),contactId:z.string().uuid(),confirmation:z.literal("APPROVE_RETAILER_PORTAL_ACCESS")});
export const revokeRetailerPortalAccessSchema=z.object({userId:z.string().uuid(),confirmation:z.literal("REVOKE_RETAILER_PORTAL_ACCESS")});

export function canChangeRole(actorId:string,targetId:string,currentRole:string|null,nextRole:"admin"|"sales"|"retailer"){
  return !(actorId===targetId&&currentRole==="admin"&&nextRole!=="admin");
}
export function canRevokeAccess(actorId:string,targetId:string,currentRole:string|null,adminCount:number){if(!currentRole||actorId===targetId)return false;return currentRole!=="admin"||adminCount>1;}
