import{NextResponse}from"next/server";
import{requireAdmin}from"@/lib/authorization";
import{createAdminClient}from"@/lib/supabase/admin";
import{manualMatchApprovalSchema,selectUnapprovedManualMatches}from"@/lib/shopify-reconciliation";

export async function POST(request:Request){
  try{
    const{user}=await requireAdmin();
    const body=manualMatchApprovalSchema.parse(await request.json());
    const supabase=createAdminClient();
    const{data:decisions,error:decisionError}=await supabase.from("shopify_reconciliation_decisions").select("id,shopify_customer_gid,contact_id").in("id",body.decisionIds).eq("decision","manual_match").not("contact_id","is",null);
    if(decisionError)throw decisionError;
    if(!decisions?.length)return NextResponse.json({error:"No eligible reviewed manual matches were found."},{status:400});
    if(decisions.length!==body.decisionIds.length)return NextResponse.json({error:"One or more decisions are no longer eligible for approval."},{status:409});
    const customerGids=decisions.map(decision=>decision.shopify_customer_gid);
    const{data:existingLinks,error:existingError}=await supabase.from("shopify_customer_links").select("shopify_customer_gid").in("shopify_customer_gid",customerGids);
    if(existingError)throw existingError;
    const eligible=selectUnapprovedManualMatches(decisions,(existingLinks??[]).map(link=>link.shopify_customer_gid));
    const alreadyApproved=decisions.length-eligible.length;
    if(!eligible.length)return NextResponse.json({approved:0,alreadyApproved,shopifyChanged:false});
    const now=new Date().toISOString();
    const links=eligible.map(decision=>({shopify_customer_gid:decision.shopify_customer_gid,contact_id:decision.contact_id,match_confidence:"strong",match_reasons:["Manually reviewed CRM match"],reviewed_by:user.id,updated_at:now}));
    const{error:linkError}=await supabase.from("shopify_customer_links").upsert(links,{onConflict:"shopify_customer_gid"});
    if(linkError)throw linkError;
    const{data:run,error:runError}=await supabase.from("shopify_sync_runs").insert({sync_type:"customer_links",status:"approved",reviewed_count:decisions.length,imported_count:eligible.length,exception_count:alreadyApproved,initiated_by:user.id}).select("id").single();
    if(runError)throw runError;
    const{error:auditError}=await supabase.from("audit_events").insert({action:"shopify_manual_matches_approved",entity_type:"shopify_sync_run",entity_id:run.id,actor_id:user.id,metadata:{approved:eligible.length,alreadyApproved,shopifyChanged:false}});
    if(auditError)throw auditError;
    return NextResponse.json({approved:eligible.length,alreadyApproved,shopifyChanged:false});
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to approve manual matches.";
    return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Administrator access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:400});
  }
}
