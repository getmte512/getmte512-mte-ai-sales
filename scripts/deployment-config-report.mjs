const env=process.env;
const production=process.argv.includes("--production");
const required=[
  ["NEXT_PUBLIC_APP_URL",value=>{try{const url=new URL(value);return production?url.protocol==="https:"&&url.hostname!=="localhost":Boolean(url.protocol)}catch{return false}},"public application URL"],
  ["NEXT_PUBLIC_SUPABASE_URL",value=>{try{return new URL(value).protocol==="https:"}catch{return false}},"public Supabase URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY",Boolean,"public Supabase browser key"],
  ["SUPABASE_SERVICE_ROLE_KEY",Boolean,"server-only Supabase service key"],
  ["REVIEW_EVIDENCE_SIGNING_SECRET",value=>String(value??"").length>=32,"server-only evidence signing secret"],
  ["REVIEW_EVIDENCE_SIGNING_KEY_ID",value=>/^[A-Za-z0-9._-]{1,64}$/.test(String(value??"")),"active evidence signing key ID"]
];
const optionalGroups=[
  {name:"Outbound email",keys:["RESEND_API_KEY","OUTREACH_FROM_EMAIL","RESEND_WEBHOOK_SECRET"]},
  {name:"Shopify",keys:["SHOPIFY_SHOP_DOMAIN","SHOPIFY_ADMIN_ACCESS_TOKEN"]},
  {name:"AI discovery",keys:["OPENAI_API_KEY"]},
  {name:"Evidence key rotation",keys:["REVIEW_EVIDENCE_KEY_LIFECYCLE_JSON","REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON","REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS"]}
];
const requiredStatus=required.map(([key,validate,purpose])=>({key,purpose,configured:Boolean(env[key]),valid:Boolean(env[key])&&Boolean(validate(env[key]))}));
const optionalStatus=optionalGroups.map(group=>{const configured=group.keys.filter(key=>Boolean(env[key]));return{name:group.name,configured:configured.length,total:group.keys.length,status:configured.length===0?"not_configured":configured.length===group.keys.length?"configured":"partial"}});
const blockers=requiredStatus.filter(item=>!item.valid).map(item=>item.key);
const partialOptional=optionalStatus.filter(item=>item.status==="partial").map(item=>item.name);
const report={mode:production?"production":"local",ready:blockers.length===0&&partialOptional.length===0,required:requiredStatus,optional:optionalStatus,blockers,partialOptional};
console.log(JSON.stringify(report,null,2));
if(!report.ready)process.exitCode=1;
