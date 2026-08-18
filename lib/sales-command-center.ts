export type CommandCenterItem={id:string;kind:"buyer_reply"|"task"|"prospect_review"|"account_action";title:string;action:string;reason:string;priority:number;href:string;contactId?:string|null};
export type CommandReply={id:string;contactId?:string|null;companyName?:string|null;receivedAt:string;reviewStatus:string;priorityScore:number;priorityReasons:string[]};
export type CommandTask={id:string;contactId:string;companyName?:string|null;title:string;dueAt?:string|null;completedAt?:string|null};
export type CommandProspect={id:string;companyName:string;buyerName?:string|null;confidence:string;status:string;discoveredAt:string};
export type CommandAccountAction={contactId:string;companyName:string;priority:number;action:string;reason:string};

function taskPriority(task:CommandTask,today:string){if(task.completedAt)return 0;if(!task.dueAt)return 45;const due=task.dueAt.slice(0,10);if(due<today)return 85;if(due===today)return 75;return 50;}
function prospectPriority(prospect:CommandProspect,nowMs:number){let score=prospect.confidence==="high"?62:52;const ageHours=Math.max(0,(nowMs-Date.parse(prospect.discoveredAt))/3600000);if(ageHours>=48)score+=10;else if(ageHours>=24)score+=5;return Math.min(80,score);}

export function buildSalesCommandCenter(input:{today:string;nowMs?:number;replies:CommandReply[];tasks:CommandTask[];prospects:CommandProspect[];accountActions:CommandAccountAction[]}){
 const nowMs=input.nowMs??Date.now();const items:CommandCenterItem[]=[];
 for(const reply of input.replies){if(reply.reviewStatus!=="unreviewed")continue;items.push({id:`reply:${reply.id}`,kind:"buyer_reply",title:reply.companyName||"Buyer reply",action:"Review buyer reply",reason:reply.priorityReasons.join(" · ")||"Unreviewed buyer reply",priority:100+reply.priorityScore,href:"/delivery",contactId:reply.contactId});}
 for(const task of input.tasks){const priority=taskPriority(task,input.today);if(!priority)continue;const due=task.dueAt?.slice(0,10);items.push({id:`task:${task.id}`,kind:"task",title:task.companyName||"Sales task",action:task.title,reason:due?due<input.today?`Task overdue since ${due}`:due===input.today?"Task due today":`Task due ${due}`:"Open sales task",priority,href:"/",contactId:task.contactId});}
 for(const prospect of input.prospects){if(prospect.status!=="pending")continue;items.push({id:`prospect:${prospect.id}`,kind:"prospect_review",title:prospect.companyName,action:prospect.buyerName?`Review ${prospect.buyerName}`:"Review prospect evidence",reason:`${prospect.confidence} confidence candidate awaiting human review`,priority:prospectPriority(prospect,nowMs),href:"/prospects"});}
 for(const account of input.accountActions){items.push({id:`account:${account.contactId}`,kind:"account_action",title:account.companyName,action:account.action,reason:account.reason,priority:Math.min(90,Math.max(1,Math.round(account.priority/3))),href:"/strategy",contactId:account.contactId});}
 const kindOrder:Record<CommandCenterItem["kind"],number>={buyer_reply:0,task:1,prospect_review:2,account_action:3};items.sort((a,b)=>b.priority-a.priority||kindOrder[a.kind]-kindOrder[b.kind]||a.title.localeCompare(b.title));
 return{items,topItems:items.slice(0,20),summary:{buyerReplies:items.filter(i=>i.kind==="buyer_reply").length,openTasks:items.filter(i=>i.kind==="task").length,prospectReviews:items.filter(i=>i.kind==="prospect_review").length,accountActions:items.filter(i=>i.kind==="account_action").length}};
}
