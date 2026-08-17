export type ShopifyAnalyticsOrder={amount:number|string;currency_code:string;ordered_at:string;fulfillment_status:string};

export function buildShopifySalesAnalytics(orders:ShopifyAnalyticsOrder[]){
  const valid=orders.filter(order=>Number.isFinite(Number(order.amount))&&Number(order.amount)>=0&&!Number.isNaN(new Date(order.ordered_at).getTime()));
  const revenue=valid.reduce((sum,order)=>sum+Number(order.amount),0);
  const fulfilled=valid.filter(order=>order.fulfillment_status==="FULFILLED").length;
  const monthMap=new Map<string,{month:string;orders:number;revenue:number}>();
  for(const order of valid){const month=order.ordered_at.slice(0,7);const current=monthMap.get(month)??{month,orders:0,revenue:0};current.orders+=1;current.revenue+=Number(order.amount);monthMap.set(month,current);}
  const monthly=[...monthMap.values()].sort((a,b)=>a.month.localeCompare(b.month));
  const currentMonthRevenue=monthly.at(-1)?.revenue??0;
  const previousMonthRevenue=monthly.at(-2)?.revenue??null;
  const revenueChangePercent=previousMonthRevenue&&previousMonthRevenue>0?(currentMonthRevenue-previousMonthRevenue)/previousMonthRevenue*100:null;
  return{summary:{orders:valid.length,revenue,averageOrderValue:valid.length?revenue/valid.length:0,fulfillmentRate:valid.length?fulfilled/valid.length*100:0,currencyCode:valid[0]?.currency_code??"USD",currentMonthRevenue,previousMonthRevenue,revenueChangePercent},monthly};
}

export function formatShopifyAnalyticsCsv(analytics:ReturnType<typeof buildShopifySalesAnalytics>){
  const quote=(value:string|number)=>`"${String(value).replaceAll('"','""')}"`;
  return[["Month","Orders","Revenue","Currency"],...analytics.monthly.map(month=>[month.month,month.orders,month.revenue,analytics.summary.currencyCode])].map(row=>row.map(quote).join(",")).join("\r\n");
}
