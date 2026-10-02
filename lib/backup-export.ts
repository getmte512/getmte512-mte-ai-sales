export const BACKUP_PAGE_SIZE=1000;

export type BackupReadError={code?:string;message?:string;details?:string;hint?:string};
export type BackupPageResult={data:unknown[]|null;error:BackupReadError|null};
export type BackupPageFetcher=(table:string,from:number,to:number)=>Promise<BackupPageResult>;

export class BackupTableReadError extends Error{
  constructor(public readonly table:string,public readonly databaseError:BackupReadError){
    super(`Backup export failed while reading ${table}.`);
    this.name="BackupTableReadError";
  }
}

export async function readCompleteBackupTable(table:string,fetchPage:BackupPageFetcher,pageSize=BACKUP_PAGE_SIZE){
  const rows:unknown[]=[];
  for(let from=0;;from+=pageSize){
    const result=await fetchPage(table,from,from+pageSize-1);
    if(result.error)throw new BackupTableReadError(table,result.error);
    const page=result.data??[];
    rows.push(...page);
    if(page.length<pageSize)return rows;
  }
}
