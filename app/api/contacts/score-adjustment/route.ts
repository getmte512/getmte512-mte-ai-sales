import{NextResponse}from"next/server";import{z}from"zod";import{requireSales}from"@/lib/authorization";import{createAdminClient}from"@/lib/supabase/admin";import{validateLeadScoreAdjustment}from"@/lib/lead-score-adjustments";
const schema=z.object({contact_id:z.string().uuid(),adjustment:z.number().int(),reason:z.string()});
export async function POST(request:Request){
 try{
  const{user}=await requireSales();const parsed=schema.parse(await request.json());const value=validateLeadScoreAdjustment(parsed);const supabase=createAdminClient();
  const{data:contact,error:contactError}=await supabase.from("contacts").select("id").eq("id",parsed.contact_id).single();if(contactError||!contact)return NextResponse.json({error:"Contact not found."},{status:404});
  const{data,error}=await supabase.from("lead_score_adjustments").insert({contact_id:parsed.contact_id,adjustment:value.adjustment,reason:value.reason,adjusted_by:user.id}).select("id,contact_id,adjustment,reason,created_at").single();if(error)throw error;
  return NextResponse.json({adjustment:data});
 }catch(error){const message=error instanceof Error?error.message:"Unable to adjust score.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Assigned team access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:400});}
}
