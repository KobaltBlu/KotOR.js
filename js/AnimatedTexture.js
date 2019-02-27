/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AnimatedTexture class.
 */

class AnimatedTexture {

  constructor(texture, tilesHoriz = 0, tilesVert = 0, fps = 30, isBump = false){
  	// note: texture passed by reference, will be updated by the update function.

  	this.tilesHorizontal = tilesHoriz;
    this.tilesVertical = tilesVert;
    this.fps = fps;
    this.texture = texture;
    this.isBump = isBump;
  	// how many images does this spritesheet contain?
  	//  usually equals tilesHoriz * tilesVert, but not necessarily,
  	//  if there at blank tiles at the bottom of the spritesheet.
  	this.numberOfTiles = tilesHoriz * tilesVert;
  	this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
  	this.texture.repeat.set( 1 / this.tilesHorizontal, 1 / this.tilesVertical );

  	// how long should each image be displayed?
  	this.tileDisplayDuration = 0;

  	// how long has the current image been displayed?
  	this.currentDisplayTime = 0;
    this.maxDisplayTime = 0;//this.tilesHorizontal * this.tilesVertical * this.tileDisplayDuration;

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

      this.currentDisplayTime += ( ((this.fps/60)*0.5) * (0.016));
      
      let frameIndex = Math.floor((this.currentDisplayTime * this.numberOfTiles) % this.numberOfTiles);

      let column = ( frameIndex % (this.tilesHorizontal) );
      let row = ( (frameIndex - column) / (this.tilesHorizontal) );

      if(this.isBump){
        this.texture.offset.y = -(column / (this.tilesHorizontal));
        this.texture.offset.x = -(row / (this.tilesVertical));
      }else{
        //Works with fx_explode_02
        this.texture.offset.x = (column / (this.tilesHorizontal));
        this.texture.offset.y = 1-(row / (this.tilesVertical));
      }

      this.texture.updateMatrix();

      if (this.currentDisplayTime >= 1){
        this.currentDisplayTime = 0;
      }

    }

  }

}

module.exports = AnimatedTexture;
