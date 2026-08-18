export type ReviewPeriod="week"|"month";
export type ReviewOrder={orderedAt:string;amount:number};
export type ReviewDelivery={deliveredAt:string|null;status:string};
export type ReviewReply={receivedAt:string};
export type ReviewTask={completedAt:string|null};
export type ReviewProspect={reviewedAt:string|null;status:string};
export type ReviewSample={deliveredAt:string|null};
export type ReviewCommandDecision={decidedAt:string;outcome:"completed"|"dismissed"|"deferred"};
export type ReviewInputs={orders:ReviewOrder[];deliveries:ReviewDelivery[];replies:ReviewReply[];tasks:ReviewTask[];prospects:ReviewProspect[];samples:ReviewSample[];commandDecisions:ReviewCommandDecision[]};
export type ReviewMetric={current:number;previous:number;delta:number;deltaPct:number|null};

function dateKey(value:string){return value.slice(0,10)}
function addDays(date:string,days:number){const value=new Date(`${date}T00:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)}
function metric(current:number,previous:number):ReviewMetric{return{current,previous,delta:current-previous,deltaPct:previous===0?null:Math.round(((current-previous)/previous)*1000)/10}}
function inWindow(value:string|null,start:string,endExclusive:string){if(!value)return false;const date=dateKey(value);return date>=start&&date<endExclusive}
function countWindow<T>(items:T[],getDate:(item:T)=>string|null,start:string,endExclusive:string,predicate?:(item:T)=>boolean){return items.filter(item=>(!predicate||predicate(item))&&inWindow(getDate(item),start,endExclusive)).length}
function sumWindow<T>(items:T[],getDate:(item:T)=>string|null,getValue:(item:T)=>number,start:string,endExclusive:string){return Math.round(items.reduce((total,item)=>inWindow(getDate(item),start,endExclusive)?total+getValue(item):total,0)*100)/100}

export function buildSalesOperatingReview(input:ReviewInputs,period:ReviewPeriod,asOf:string){
 const days=period==="week"?7:30;const end=addDays(asOf,1);const currentStart=addDays(end,-days);const previousStart=addDays(currentStart,-days);
 const currentRevenue=sumWindow(input.orders,item=>item.orderedAt,item=>item.amount,currentStart,end);const previousRevenue=sumWindow(input.orders,item=>item.orderedAt,item=>item.amount,previousStart,currentStart);
 const currentDeliveries=countWindow(input.deliveries,item=>item.deliveredAt,currentStart,end,item=>item.status==="delivered");const previousDeliveries=countWindow(input.deliveries,item=>item.deliveredAt,previousStart,currentStart,item=>item.status==="delivered");
 const currentReplies=countWindow(input.replies,item=>item.receivedAt,currentStart,end);const previousReplies=countWindow(input.replies,item=>item.receivedAt,previousStart,currentStart);
 const currentCompleted=countWindow(input.commandDecisions,item=>item.decidedAt,currentStart,end,item=>item.outcome==="completed");const previousCompleted=countWindow(input.commandDecisions,item=>item.decidedAt,previousStart,currentStart,item=>item.outcome==="completed");
 const currentDismissed=countWindow(input.commandDecisions,item=>item.decidedAt,currentStart,end,item=>item.outcome==="dismissed");const currentDeferred=countWindow(input.commandDecisions,item=>item.decidedAt,currentStart,end,item=>item.outcome==="deferred");
 const currentOrders=countWindow(input.orders,item=>item.orderedAt,currentStart,end);const previousOrders=countWindow(input.orders,item=>item.orderedAt,previousStart,currentStart);
 const currentTasks=countWindow(input.tasks,item=>item.completedAt,currentStart,end);const previousTasks=countWindow(input.tasks,item=>item.completedAt,previousStart,currentStart);
 const currentProspects=countWindow(input.prospects,item=>item.reviewedAt,currentStart,end,item=>item.status==="accepted");const previousProspects=countWindow(input.prospects,item=>item.reviewedAt,previousStart,currentStart,item=>item.status==="accepted");
 const currentSamples=countWindow(input.samples,item=>item.deliveredAt,currentStart,end);const previousSamples=countWindow(input.samples,item=>item.deliveredAt,previousStart,currentStart);
 const currentReplyRatio=currentDeliveries?Math.round((currentReplies/currentDeliveries)*1000)/10:null;const previousReplyRatio=previousDeliveries?Math.round((previousReplies/previousDeliveries)*1000)/10:null;
 const signals:string[]=[];if(currentRevenue>previousRevenue)signals.push("Revenue increased versus the previous comparable period.");else if(currentRevenue<previousRevenue)signals.push("Revenue decreased versus the previous comparable period.");if(currentReplies>previousReplies)signals.push("Buyer reply volume increased.");if(currentTasks<previousTasks)signals.push("Fewer sales tasks were completed than in the previous period.");if(currentDeferred>currentCompleted&&currentDeferred>0)signals.push("More command-center cards were deferred than completed; review workload or prioritization.");if(!signals.length)signals.push("No major period-over-period movement crossed the operating-review rules.");
 return{period,window:{currentStart,currentEnd:asOf,previousStart,previousEnd:addDays(currentStart,-1),days},metrics:{revenue:metric(currentRevenue,previousRevenue),orders:metric(currentOrders,previousOrders),outreachDelivered:metric(currentDeliveries,previousDeliveries),buyerReplies:metric(currentReplies,previousReplies),tasksCompleted:metric(currentTasks,previousTasks),prospectsAccepted:metric(currentProspects,previousProspects),samplesDelivered:metric(currentSamples,previousSamples),commandCardsCompleted:metric(currentCompleted,previousCompleted)},activity:{commandCardsDismissed:currentDismissed,commandCardsDeferred:currentDeferred,replyToDeliveryRatio:{current:currentReplyRatio,previous:previousReplyRatio}},signals};
}
