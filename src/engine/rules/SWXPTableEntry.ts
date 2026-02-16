
/**
 * class SWXPTableEntry
 * - used to get XP table for a class per level
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWXPTableEntry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWXPTableEntry {
  
  level: number = 0;
  cr0: number = 0;
  cr1: number = 0;
  cr2: number = 0;
  cr3: number = 0;
  cr4: number = 0;
  cr5: number = 0;
  cr6: number = 0;
  cr7: number = 0;
  cr8: number = 0;
  cr9: number = 0;
  cr10: number = 0; 
  cr11: number = 0;
  cr12: number = 0;
  cr13: number = 0;
  cr14: number = 0;
  cr15: number = 0;
  cr16: number = 0; 
  cr17: number = 0;
  cr18: number = 0;
  cr19: number = 0;
  cr20: number = 0;
  cr21: number = 0;

  static From2DA(row: import("@/resource/TwoDAObject").ITwoDARowData | Record<string, string | number> = {}): SWXPTableEntry {
    const xpTableEntry = new SWXPTableEntry();

    xpTableEntry.level = parseInt(row.__index);

    if(Object.hasOwn(row,'cr0'))
      xpTableEntry.cr0 = parseInt(row.cr0); 
    
    if(Object.hasOwn(row,'cr1')) 
      xpTableEntry.cr1 = parseInt(row.cr1);
    
    if(Object.hasOwn(row,'cr2'))
      xpTableEntry.cr2 = parseInt(row.cr2); 
    
    if(Object.hasOwn(row,'cr3')) 
      xpTableEntry.cr3 = parseInt(row.cr3);
    
    if(Object.hasOwn(row,'cr4'))
      xpTableEntry.cr4 = parseInt(row.cr4);
    
    if(Object.hasOwn(row,'cr5'))
      xpTableEntry.cr5 = parseInt(row.cr5);
    
    if(Object.hasOwn(row,'cr6'))
      xpTableEntry.cr6 = parseInt(row.cr6);
    
    if(Object.hasOwn(row,'cr7'))
      xpTableEntry.cr7 = parseInt(row.cr7);
    
    if(Object.hasOwn(row,'cr8'))
      xpTableEntry.cr8 = parseInt(row.cr8);
    
    if(Object.hasOwn(row,'cr9'))
      xpTableEntry.cr9 = parseInt(row.cr9);
    
    if(Object.hasOwn(row,'cr10'))
      xpTableEntry.cr10 = parseInt(row.cr10);
    
    if(Object.hasOwn(row,'cr11'))
      xpTableEntry.cr11 = parseInt(row.cr11);
    
    if(Object.hasOwn(row,'cr12'))
      xpTableEntry.cr12 = parseInt(row.cr12);
    
    if(Object.hasOwn(row,'cr13'))
      xpTableEntry.cr13 = parseInt(row.cr13);
    
    if(Object.hasOwn(row,'cr14'))
      xpTableEntry.cr14 = parseInt(row.cr14);
    
    if(Object.hasOwn(row,'cr15'))
      xpTableEntry.cr15 = parseInt(row.cr15);
    
    if(Object.hasOwn(row,'cr16'))
      xpTableEntry.cr16 = parseInt(row.cr16);
    
    if(Object.hasOwn(row,'cr17'))
      xpTableEntry.cr17 = parseInt(row.cr17);
    
    if(Object.hasOwn(row,'cr18'))
      xpTableEntry.cr18 = parseInt(row.cr18);
    
    if(Object.hasOwn(row,'cr19'))
      xpTableEntry.cr19 = parseInt(row.cr19);
    
    if(Object.hasOwn(row,'cr20'))
      xpTableEntry.cr20 = parseInt(row.cr20);    
    
    return xpTableEntry;
  }
}
