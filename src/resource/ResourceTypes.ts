/**
 * ResourceTypes.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ResourceTypes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export const ResourceTypes: any = {
  "NA" : 0xFFFF,
  "res" : 0,
  "bmp" : 1,
  "tga" : 3,
  "wav" : 4,
  "plt" : 6,
  "ini" : 7,
  "txt" : 10,
  "mdl" : 2002,
  "nss" : 2009,
  "ncs" : 2010,
  "mod" : 2011,
  "are" : 2012,
  "set" : 2013,
  "ifo" : 2014,
  "bic" : 2015,
  "wok" : 2016,
  "2da" : 2017,
  "txi" : 2022,
  "git" : 2023,
  "uti" : 2025,
  "utc" : 2027,
  "dlg" : 2029,
  "itp" : 2030,
  "utt" : 2032,
  "dds" : 2033,
  "uts" : 2035,
  "ltr" : 2036,
  "gff" : 2037,
  "fac" : 2038,
  "ute" : 2040,
  "utd" : 2042,
  "utp" : 2044,
  "dtf" : 2045,
  "gic" : 2046,
  "gui" : 2047,
  "utm" : 2051,
  "dwk" : 2052,
  "pwk" : 2053,
  "jrl" : 2056,
  "sav" : 2057,
  "utw" : 2058,
  "ssf" : 2060,
  "hak" : 2061,
  "nwm" : 2062,
  "bik" : 2063,
  "ptm" : 2065,
  "ptt" : 2066,

  "lyt" : 3000,
  "vis" : 3001,
  "rim" : 3002,
  "pth" : 3003,
  "lip" : 3004,
  "bwm" : 3005,
  "txb" : 3006,
  "tpc" : 3007,
  "mdx" : 3008,
  "rsv" : 3009,
  "sig" : 3010,
  "xbx" : 3011,

  "mp3" : 25014,

  "erf" : 9997,
  "bif" : 9998,
  "key" : 9999,

  getKeyByValue: function( value: any ) {
    for( let prop in this ) {
      if( this.hasOwnProperty( prop ) ) {
        if( this[ prop ] == value )
          return prop;
      }
    }
  }
}
