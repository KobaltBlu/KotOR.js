/**
 * ResourceTypeInfo.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ResourceTypeInfo.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const ResourceTypeInfo = {
    "NA"  : 'Unknown',
    "res" : "Resource",
    "bmp" : 'Bitmap Image',
    "tga" : 'TGA Image',
    "wav" : 'Wave File',
    "plt" : 'Plot Template',
    "ini" : 'INI Config File',
    "txt" : 'Text File',
    "mdl" : 'Binary Model',
    "nss" : 'Script Source',
    "ncs" : 'Script Compiled',
    "are" : 'Module Area',
    "set" : 'SET',
    "ifo" : 'Module Info',
    "bic" : 'Character File',
    "wok" : 'Walkmesh: Model',
    "2da" : '2D Array',
    "txi" : 'Texture Info',
    "git" : 'Dynamic Area Info',
    "uti" : 'Template: Item',
    "utc" : 'Template: Creature',
    "dlg" : 'Conversation File',
    "itp" : 'Template: Pallet',
    "utt" : 'Template: Trigger',
    "dds" : 'DDS Image',
    "uts" : 'Template: Sound',
    "ltr" : 'Letter File',
    "gff" : 'Generic File Format',
    "fac" : 'Template: Faction',
    "ute" : 'Template: Encounter',
    "utd" : 'Template: Door',
    "utp" : 'Template: Placeable',
    "dtf" : 2045,
    "gic" : 'Game Comment',
    "gui" : 'GUI File',
    "utm" : 'Template: Merchant',
    "dwk" : 'Walkmesh: Door',
    "pwk" : 'Walkmesh: Placeable',
    "jrl" : 'Journal',
    "sav" : 'Save',
    "utw" : 'Template: Waypoint',
    "ssf" : 'SoundSet',
    "hak" : 'HakPack',
    "nwm" : 'NWN Mod Archive',
    "bik" : 'Bink Video',
    "ptm" : 'Plot Manager',
    "ptt" : 'Plot Wizard Template',

    "lyt" : 'Layout',
    "vis" : 'Visible Rooms Layout',
    "rim" : 'RIM Archive',
    "pth" : 'AI Path',
    "lip" : 'Lip Sync',
    "bwm" : 3005,
    "txb" : 3006,
    "tpc" : 'TPC Texture',
    "mdx" : 'Binary Model-X',
    "rsv" : 3009,
    "sig" : 3010,
    "xbx" : 3011,

    "erf" : 'ERF Texture Archive',
    "bif" : 'BIF Archive',
    "key" : 'BIF Archive KEY',

    getKeyByValue: function( value: any ) {
        for( let prop in this ) {
            if( this.hasOwnProperty( prop ) ) {
                 if( this[ prop ] === value )
                     return prop;
            }
        }
    }

}
