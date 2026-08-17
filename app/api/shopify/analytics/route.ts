import{NextResponse}from"next/server";
import{requireSales}from"@/lib/authorization";
import{createAdminClient}from"@/lib/supabase/admin";
import{buildShopifySalesAnalytics}from"@/lib/shopify-sales-analytics";

export async function GET(){try{await requireSales();const supabase=createAdminClient();const{data,error}=await supabase.from("shopify_orders").select("amount,currency_code,ordered_at,fulfillment_status").order("ordered_at",{ascending:true});if(error)throw error;return NextResponse.json(buildShopifySalesAnalytics(data??[]));}catch(error){const message=error instanceof Error?error.message:"Unable to load Shopify sales analytics.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Assigned team access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:500});}}
