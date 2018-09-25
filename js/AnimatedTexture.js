/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AnimatedTexture class.
 */

class AnimatedTexture {

  constructor(texture, tilesHoriz = 0, tilesVert = 0, numTiles, tileDispDuration){
  	// note: texture passed by reference, will be updated by the update function.

  	this.tilesHorizontal = tilesHoriz;
  	this.tilesVertical = tilesVert;
    this.texture = texture;
  	// how many images does this spritesheet contain?
  	//  usually equals tilesHoriz * tilesVert, but not necessarily,
  	//  if there at blank tiles at the bottom of the spritesheet.
  	this.numberOfTiles = numTiles;
  	this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
  	this.texture.repeat.set( 1 / this.tilesHorizontal, 1 / this.tilesVertical );

  	// how long should each image be displayed?
  	this.tileDisplayDuration = tileDispDuration;

  	// how long has the current image been displayed?
  	this.currentDisplayTime = 0;
    this.maxDisplayTime = this.tilesHorizontal * this.tilesVertical * this.tileDisplayDuration;

  	// which image is currently being displayed?
  	this.currentTile = 0;

  }

  CurrentFrame(){
    let result = 0;
    for (; this.currentDisplayTime % this.maxDisplayTime == 0; this.currentDisplayTime /= this.maxDisplayTime)
        result++;
    return result;
  }

  Update(delta){

    if(this.texture != null){

      this.currentDisplayTime += delta * .1;
      if (this.currentDisplayTime > 1){
        this.currentDisplayTime = 0;
      }

      this.currentTile = this.numberOfTiles * this.currentDisplayTime;//Math.floor( this.currentDisplayTime / this.numberOfTiles );
      let currentColumn = this.currentTile / this.tilesHorizontal;
      this.texture.offset.y = currentColumn;
      let currentRow = Math.floor( this.currentTile / this.tilesHorizontal );
      this.texture.offset.x = currentRow / this.tilesVertical;

    }

  }

}

module.exports = AnimatedTexture;
