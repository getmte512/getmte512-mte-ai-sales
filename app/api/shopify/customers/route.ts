import{NextResponse}from"next/server";
import{requireSales}from"@/lib/authorization";
import{createAdminClient}from"@/lib/supabase/admin";
import{buildShopifyCustomerInsights,recommendShopifyCustomerAction,summarizeShopifyCustomerInsights}from"@/lib/shopify-customer-insights";

export async function GET(){
  try{
    await requireSales();
    const supabase=createAdminClient();
    const[{data:orders,error:orderError},{data:contacts,error:contactError}]=await Promise.all([supabase.from("shopify_orders").select("contact_id,amount,currency_code,ordered_at,fulfillment_status").not("contact_id","is",null),supabase.from("contacts").select("id,company_name,buyer_name,email,phone")]);
    if(orderError||contactError)throw orderError||contactError;
    const insights=buildShopifyCustomerInsights(orders??[]);
    const contactById=new Map((contacts??[]).map(contact=>[contact.id,contact]));
    const now=new Date().toISOString();
    const customers=insights.map(item=>({...item,...recommendShopifyCustomerAction(item,now),contact:contactById.get(item.contactId)??null})).sort((a,b)=>({urgent:0,high:1,medium:2,low:3}[a.priority]-{urgent:0,high:1,medium:2,low:3}[b.priority]||b.revenue-a.revenue));
    return NextResponse.json({customers,summary:summarizeShopifyCustomerInsights(insights)});
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to load Shopify customer insights.";
    return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Assigned team access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:500});
  }
}
