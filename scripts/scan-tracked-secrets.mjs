import{execFileSync}from"node:child_process";import{readFileSync}from"node:fs";

const files=execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);const findings=[];
const forbiddenFiles=[/^\.env\.local$/i,/\.pem$/i,/\.key$/i];
const secretPatterns=[
  {name:"Supabase service-role assignment",pattern:/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!$|replace-|your-)[^\s#]+/im},
  {name:"Shopify private access token",pattern:/\bshpat_[A-Za-z0-9]{20,}\b/},
  {name:"Private key material",pattern:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/},
  {name:"Retired local secret name",pattern:/\bmte_local_final\b/i},
];
for(const file of files){if(forbiddenFiles.some(pattern=>pattern.test(file))){findings.push(`${file}: forbidden tracked secret file type`);continue}if(file==="scripts/scan-tracked-secrets.mjs"||/\.(?:png|jpe?g|gif|webp|ico|woff2?|pdf|docx)$/i.test(file))continue;let content;try{content=readFileSync(file,"utf8")}catch{continue}for(const rule of secretPatterns)if(rule.pattern.test(content))findings.push(`${file}: ${rule.name}`)}
if(findings.length){console.error("Potential committed secret material detected:");for(const finding of findings)console.error(`- ${finding}`);console.error("Matched values were intentionally not printed.");process.exitCode=1;}else console.log(`PASS  Scanned ${files.length} tracked files. No known secret material was detected.`);
