/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The UTWObject class.
 */

class UTWObject {

  constructor(gff = undefined){
    this.mesh = null;
    this.gff = gff;
    this.moduleObject = null;
    this.resType = UTWObject.ResType;
  }

  LoadModel (onLoad = null) {

    let mdlLoader = new THREE.MDLLoader();

    let appearance = this.gff.GetFieldByLabel('Appearance') == null ? 1 : this.gff.GetFieldByLabel('Appearance').Value;

    //throw 'Waypoint '+this.gff.GetFieldByLabel('Appearance').Value+' not found';

    if(onLoad != null)
      onLoad(this.mesh);

  }

  /*static FromTemplate(ResRef = null, onLoad = null){

    let utw = new UTWObject();

    if(ResRef != null){
      //console.log('UTWObject', ResRef, UTWObject.ResType);
      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTWObject.ResType,
        onLoad: (gff) => {
          //console.log('UTWObject load complete');
          utw.gff = gff;
          if(onLoad != null)
            onLoad(utw);
        },
        onFail: () => {
          console.error('Failed to load waypoint template');
        }
      });

    }

  }*/

}

UTWObject.ResType = ResourceTypes['utw'];
UTWObject.texture = null;//THREE.ImageUtils.loadTexture( 'images/helper_waypoint.png' );

module.exports = UTWObject;
