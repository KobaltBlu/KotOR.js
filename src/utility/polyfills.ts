/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The utility polyfill holds random utility functions that are used throughout the project
 */

//@ts-ignore
String.prototype.titleCase = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

//Adding a java like string.equalsIgnoreCase method to the String prototype in Javascript
//@ts-ignore
String.prototype.equalsIgnoreCase = function(value: string){

	if(typeof value !== 'string')
		throw 'You can only pass a string to be compared';

  return this.localeCompare(value, undefined, { sensitivity: 'accent' }) === 0;
  
};


/*
// Note that the API is still vendor-prefixed in browsers implementing it
document.addEventListener("pointerlockchange", function( event ) {
  //console.log(event, document.pointerLockElement)
});

// Note that the API is still vendor-prefixed in browsers implementing it
document.addEventListener("pointerlockerror", function( event ) {
  //console.log('plError', event)
});*/





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