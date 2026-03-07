/**
 * polyfills.
 * 
 * The utility polyfill holds random utility functions that are used throughout the project
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file polyfills @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

String.prototype.titleCase = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

//Adding a java like string.equalsIgnoreCase method to the String prototype in Javascript
String.prototype.equalsIgnoreCase = function(value: string){

	if(typeof value !== 'string')
		throw 'You can only pass a string to be compared';

  return this.localeCompare(value, undefined, { sensitivity: 'accent' }) === 0;
  
};

if(typeof window.crypto !== 'object'){
  window.crypto = {} as Crypto;
}

if(typeof window.crypto.randomUUID !== 'function'){
	//https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
  window.crypto.randomUUID = function() {
    return (([1e7] as any)+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, (c:any) =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }
}





// Polyfills

if ( typeof Number.EPSILON === 'undefined' ) {
  // @ts-expect-error
	Number.EPSILON = Math.pow( 2, - 52 );
}

//

if ( Math.sign === undefined ) {

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign
	Math.sign = function ( x ) {
		return ( x < 0 ) ? - 1 : ( x > 0 ) ? 1 : + x;
	};

}

export {};