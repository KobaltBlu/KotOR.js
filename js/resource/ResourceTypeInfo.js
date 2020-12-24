/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ResourceTypeInfo object.
 */

module.exports = {
    "NA"  : 'Unknown',
    "res" : "Resource",
    "bmp" : 'Bitmap Image',
    "tga" : 'TGA Image',
    "wav" : 'Wave File',
    "plt" : 'Plot Template',
    "ini" : 'INI File',
    "txt" : 'Text File',
    "mdl" : 'Binary Model',
    "nss" : 'Script Source',
    "ncs" : 'Script Compiled',
    "are" : 'Module Area',
    "set" : 'SET',
    "ifo" : 'Module Info',
    "bic" : 'BIC',
    "wok" : 'Walkmesh: Model',
    "2da" : '2D Array',
    "txi" : 'Texture Info',
    "git" : 'Dynamic Area Info',
    "uti" : 'Template: Item',
    "utc" : 'Template: Creature',
    "dlg" : 'Dialog',
    "itp" : 'Template: Pallet',
    "utt" : 'Template: Trigger',
    "dds" : 'DDS Image',
    "uts" : 'Template: Sound',
    "ltr" : 2036,
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
    "hak" : 2061,
    "nwm" : 2062,
    "bik" : 'Bink Video',
    "ptm" : 2065,
    "ptt" : 2066,

    "lyt" : 'Layout',
    "vis" : 'Visible Rooms Layout',
    "rim" : 'RIM Archive',
    "pth" : 'AI Path',
    "lip" : 'Lip Animations',
    "bwm" : 3005,
    "txb" : 3006,
    "tpc" : 3007,
    "mdx" : 'Binary Model-X',
    "rsv" : 3009,
    "sig" : 3010,
    "xbx" : 3011,

    "erf" : 'ERF Texture Archive',
    "bif" : 'BIF Archive',
    "key" : 'BIF Archive KEY',

    getKeyByValue: function( value ) {
        for( let prop in this ) {
            if( this.hasOwnProperty( prop ) ) {
                 if( this[ prop ] === value )
                     return prop;
            }
        }
    }

}
