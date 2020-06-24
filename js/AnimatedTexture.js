/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AnimatedTexture class.
 */

class AnimatedTexture {

  constructor(texture, tilesHoriz = 0, tilesVert = 0, fps = 30, isBump = false){
    // note: texture passed by reference, will be updated by the update function.
    
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

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

      let deltaMax = (1.0 / this.fps) * this.numberOfTiles;
      let time = (this.currentDisplayTime % deltaMax) / deltaMax;
      
      let frameIndex = Math.floor((time * this.numberOfTiles) % this.numberOfTiles);

      let column = (( frameIndex % this.tilesHorizontal ));
      let row = ( (frameIndex - column) / this.tilesHorizontal );

      let columnNorm = column / this.tilesHorizontal;
      let rowNorm = row / this.tilesVertical;

      this.texture.offset.y = rowNorm;//columnNorm;//(column / (this.tilesHorizontal));
      this.texture.offset.x = columnNorm;//(row / (this.tilesVertical));

      // this.texture.offset.y = 0;
      // this.texture.offset.x = 0;

      // this.texture.repeat.y = 1;
      // this.texture.repeat.x = 1;

      this.texture.updateMatrix();

      if(frameIndex == this.numberOfTiles - 1){
        this.currentDisplayTime = 0.0;
      }else{
        this.currentDisplayTime += 0.1;//delta; //Setting this to a fixed value fixes jittering water bumpmaps
      }

    }

  }

}

module.exports = AnimatedTexture;
