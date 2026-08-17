import{z}from"zod";
export const addPilotSchema=z.object({contactId:z.string().uuid(),confirmation:z.literal("ADD_TO_CONTROLLED_PILOT")});
export const updatePilotSchema=z.object({id:z.string().uuid(),status:z.enum(["selected","invited","active","completed","paused"]),feedbackNotes:z.string().trim().max(4000)});
export function summarizePilot(records:{status:string}[]){return{total:records.length,selected:records.filter(r=>r.status==="selected").length,active:records.filter(r=>r.status==="active"||r.status==="invited").length,completed:records.filter(r=>r.status==="completed").length,paused:records.filter(r=>r.status==="paused").length};}
