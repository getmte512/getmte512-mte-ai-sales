import{createAdminClient}from"@/lib/supabase/admin";import{requireUser}from"@/lib/supabase/server";import{roleAllows,type AppRole}from"@/lib/app-role";
export async function requireRole(required:AppRole){const user=await requireUser();const supabase=createAdminClient();const{data,error}=await supabase.from("app_user_roles").select("role").eq("user_id",user.id).single();if(error||!data||!roleAllows(data.role as AppRole,required))throw new Error("FORBIDDEN");return{user,role:data.role as AppRole};}
export async function requireAdmin(){return requireRole("admin");}
export async function requireSales(){return requireRole("sales");}
