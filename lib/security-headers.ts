export const securityHeaders=[
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Frame-Options",value:"DENY"},
  {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
  {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
  {key:"Cross-Origin-Opener-Policy",value:"same-origin"}
] as const;

export const requiredSecurityHeaderNames=securityHeaders.map(header=>header.key);
export function hasRequiredSecurityHeaders(headers:readonly string[]){const configured=new Set(headers.map(header=>header.toLowerCase()));return requiredSecurityHeaderNames.every(header=>configured.has(header.toLowerCase()));}
