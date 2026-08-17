import{z}from"zod";

export const updateUserRoleSchema=z.object({
  userId:z.string().uuid(),
  role:z.enum(["admin","sales"]),
});

export function canChangeRole(actorId:string,targetId:string,currentRole:string|null,nextRole:"admin"|"sales"){
  return !(actorId===targetId&&currentRole==="admin"&&nextRole!=="admin");
}
