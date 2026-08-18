import{NextResponse}from"next/server";import{z}from"zod";import{requireSales}from"@/lib/authorization";import{createAdminClient}from"@/lib/supabase/admin";
const schema=z.discriminatedUnion("action",[
 z.object({recommendation_id:z.string().uuid(),action:z.literal("create_task"),confirmation:z.literal("CREATE_RECOMMENDED_FOLLOW_UP_TASK")}),
 z.object({recommendation_id:z.string().uuid(),action:z.literal("apply_pipeline_stage"),confirmation:z.literal("APPLY_RECOMMENDED_PIPELINE_STAGE")}),
]);
function failure(error:unknown){const message=error instanceof Error?error.message:"Unable to apply recommendation.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Sales access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:400});}
export async function POST(request:Request){try{const{user}=await requireSales();const body=schema.parse(await request.json());const supabase=createAdminClient();const rpc=body.action==="create_task"?"apply_conversation_recommendation_task":"apply_conversation_recommendation_pipeline";const{data,error}=await supabase.rpc(rpc,{p_recommendation_id:body.recommendation_id,p_actor_id:user.id});if(error)throw error;return NextResponse.json({result:data,action:body.action});}catch(error){return failure(error)}}
