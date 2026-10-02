import{describe,expect,it,vi}from"vitest";
import{readCompleteBackupTable}from"./backup-export";

describe("complete backup table export",()=>{
  it("reads every page instead of silently truncating at the Data API row limit",async()=>{
    const fetchPage=vi.fn()
      .mockResolvedValueOnce({data:[{id:1},{id:2}],error:null})
      .mockResolvedValueOnce({data:[{id:3}],error:null});

    await expect(readCompleteBackupTable("contacts",fetchPage,2)).resolves.toEqual([{id:1},{id:2},{id:3}]);
    expect(fetchPage).toHaveBeenNthCalledWith(1,"contacts",0,1);
    expect(fetchPage).toHaveBeenNthCalledWith(2,"contacts",2,3);
  });

  it("identifies the table and preserves safe database diagnostics",async()=>{
    const databaseError={code:"42501",message:"permission denied"};
    const fetchPage=vi.fn().mockResolvedValue({data:null,error:databaseError});

    await expect(readCompleteBackupTable("audit_events",fetchPage,2)).rejects.toMatchObject({
      name:"BackupTableReadError",
      message:"Backup export failed while reading audit_events.",
      table:"audit_events",
      databaseError,
    });
  });
});
