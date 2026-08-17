export type ShopifyCustomerOrder={contact_id:string|null;amount:number|string;currency_code:string;ordered_at:string;fulfillment_status:string};

export function buildShopifyCustomerInsights(orders:ShopifyCustomerOrder[]){
  const grouped=new Map<string,{contactId:string;orderCount:number;revenue:number;currencyCode:string;latestOrderAt:string;unfulfilledOrders:number}>();
  for(const order of orders){
    if(!order.contact_id)continue;
    const amount=Number(order.amount);
    if(!Number.isFinite(amount)||amount<0)continue;
    const current=grouped.get(order.contact_id)??{contactId:order.contact_id,orderCount:0,revenue:0,currencyCode:order.currency_code,latestOrderAt:order.ordered_at,unfulfilledOrders:0};
    current.orderCount+=1;
    current.revenue+=amount;
    if(order.ordered_at>current.latestOrderAt)current.latestOrderAt=order.ordered_at;
    if(order.fulfillment_status==="UNFULFILLED"||order.fulfillment_status==="PARTIALLY_FULFILLED")current.unfulfilledOrders+=1;
    grouped.set(order.contact_id,current);
  }
  return[...grouped.values()].sort((a,b)=>b.revenue-a.revenue);
}

export function summarizeShopifyCustomerInsights(insights:ReturnType<typeof buildShopifyCustomerInsights>){return{customers:insights.length,orders:insights.reduce((sum,item)=>sum+item.orderCount,0),revenue:insights.reduce((sum,item)=>sum+item.revenue,0),unfulfilledOrders:insights.reduce((sum,item)=>sum+item.unfulfilledOrders,0),currencyCode:insights[0]?.currencyCode??"USD"};}

export function recommendShopifyCustomerAction(customer:ReturnType<typeof buildShopifyCustomerInsights>[number],now:string){
  const ageDays=Math.max(0,Math.floor((new Date(now).getTime()-new Date(customer.latestOrderAt).getTime())/86400000));
  if(customer.unfulfilledOrders>0)return{priority:"urgent" as const,action:"Review fulfillment",ageDays};
  if(ageDays>=30)return{priority:"high" as const,action:"Prepare reorder outreach",ageDays};
  if(ageDays>=14)return{priority:"medium" as const,action:"Schedule customer follow-up",ageDays};
  return{priority:"low" as const,action:"Nurture relationship",ageDays};
}
