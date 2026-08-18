export type AppRole="admin"|"sales"|"retailer";
export function roleAllows(actual:AppRole,required:AppRole){
 if(actual==="admin")return true;
 if(required==="sales")return actual==="sales";
 return actual===required;
}
