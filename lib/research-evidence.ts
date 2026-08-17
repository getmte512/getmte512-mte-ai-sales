export type ResearchSource = { sourceType:"linkedin"|"company_website"; sourceUrl:string; confidence:"high"|"medium" };

export function chooseResearchSource(input:{linkedinUrl?:string|null;website?:string|null}):ResearchSource|null{
  const linkedinUrl=input.linkedinUrl?.trim()??"";
  const website=input.website?.trim()??"";
  if(linkedinUrl)return{sourceType:"linkedin",sourceUrl:linkedinUrl,confidence:"high"};
  if(website)return{sourceType:"company_website",sourceUrl:website,confidence:"medium"};
  return null;
}
