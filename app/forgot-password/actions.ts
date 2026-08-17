"use server";
import{redirect}from"next/navigation";import{createUserClient}from"@/lib/supabase/server";import{passwordResetRedirectUrl}from"@/lib/account-setup";
export async function requestPasswordReset(formData:FormData){const email=String(formData.get("email")??"").trim();if(email){try{const supabase=await createUserClient();await supabase.auth.resetPasswordForEmail(email,{redirectTo:passwordResetRedirectUrl(process.env.NEXT_PUBLIC_APP_URL)})}catch{}}redirect("/forgot-password?sent=1");}
