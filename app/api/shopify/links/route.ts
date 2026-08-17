import{NextResponse}from"next/server";
import{requireAdmin}from"@/lib/authorization";
import{createAdminClient}from"@/lib/supabase/admin";
import{revokeShopifyLinkSchema,summarizeShopifyLinks}from"@/lib/shopify-link-management";

export async function GET(){
  try{
    await requireAdmin();
    const supabase=createAdminClient();
    const{data,error}=await supabase.from("shopify_customer_links").select("id,shopify_customer_gid,contact_id,match_confidence,match_reasons,updated_at,contacts(company_name,buyer_name,email)").order("updated_at",{ascending:false});
    if(error)throw error;
    const links=data??[];
    return NextResponse.json({links,summary:summarizeShopifyLinks(links)});
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to load Shopify customer links.";
    return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Administrator access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:500});
  }
}

export async function DELETE(request:Request){
  try{
    const{user}=await requireAdmin();
    const body=revokeShopifyLinkSchema.parse(await request.json());
    const supabase=createAdminClient();
    const{data:link,error:readError}=await supabase.from("shopify_customer_links").select("id,shopify_customer_gid,contact_id").eq("id",body.linkId).single();
    if(readError)throw readError;
    const{error:deleteError}=await supabase.from("shopify_customer_links").delete().eq("id",body.linkId);
    if(deleteError)throw deleteError;
    const{error:auditError}=await supabase.from("audit_events").insert({action:"shopify_customer_link_revoked",entity_type:"shopify_customer_link",entity_id:body.linkId,actor_id:user.id,metadata:{shopifyCustomerGid:link.shopify_customer_gid,contactId:link.contact_id,reason:body.reason,shopifyChanged:false}});
    if(auditError)throw auditError;
    return NextResponse.json({revoked:true,shopifyChanged:false});
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to revoke Shopify customer link.";
    return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Administrator access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:400});
  }
}
