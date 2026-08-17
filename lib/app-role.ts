export type AppRole="admin"|"sales";
export function roleAllows(actual:AppRole,required:AppRole){return actual==="admin"||actual===required;}
