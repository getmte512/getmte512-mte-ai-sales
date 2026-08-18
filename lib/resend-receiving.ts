export type ReceivedEmail={id:string;from:string;to:string[];subject:string;text:string|null;headers:Record<string,unknown>;message_id:string;created_at:string};
export async function retrieveReceivedEmail(apiKey:string,emailId:string,fetchImpl:typeof fetch=fetch):Promise<ReceivedEmail>{
 const response=await fetchImpl(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,{headers:{Authorization:`Bearer ${apiKey}`,Accept:"application/json"}});const body=await response.json().catch(()=>null) as ReceivedEmail|{message?:string}|null;if(!response.ok)throw new Error(body&&"message"in body&&body.message?body.message:`Unable to retrieve received email (${response.status}).`);return body as ReceivedEmail;
}
