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

export function canChangeRole(actorId:string,targetId:string,currentRole:string|null,nextRole:"admin"|"sales"){
  return !(actorId===targetId&&currentRole==="admin"&&nextRole!=="admin");
}
