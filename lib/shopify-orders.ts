export type ShopifyOrderPreview = { id:string; name:string; createdAt:string; financialStatus:string; fulfillmentStatus:string; amount:number; currencyCode:string; crmContactId:string|null };

export function summarizeShopifyOrders(orders:ShopifyOrderPreview[]){
  return {
    total:orders.length,
    matched:orders.filter(order=>order.crmContactId).length,
    unfulfilled:orders.filter(order=>order.fulfillmentStatus==="UNFULFILLED"||order.fulfillmentStatus==="PARTIALLY_FULFILLED").length,
    revenue:orders.reduce((sum,order)=>sum+order.amount,0),
    currencyCode:orders.find(order=>order.currencyCode)?.currencyCode??"USD"
  };
}
