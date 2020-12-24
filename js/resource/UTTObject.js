/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The UTTObject class.
 */

class UTTObject {

  constructor(gff = undefined){
    this.mesh = null;
    this.moduleObject = null;
    this.gff = gff;
    this.resType = UTTObject.ResType;
  }

  static FromTemplate(ResRef = null, onLoad = null){

    let utt = new UTTObject();

    if(ResRef != null){
      //console.log('UTTObject', ResRef, UTTObject.ResType);
      TemplateLoader.Load({
        ResRef: ResRef,
        ResType: UTTObject.ResType,
        onLoad: (gff) => {
          //console.log('UTTObject load complete');
          utt.gff = gff;
          if(onLoad != null)
            onLoad(utt);
        },
        onFail: () => {
          console.error('Failed to load trigger template');
        }
      });

    }

  }

}

UTTObject.ResType = ResourceTypes['utt'];

UTTObject.Type = {
  GENERIC: 0,
  TRANSITION: 1,
  TRAP: 2,
}

module.exports = UTTObject;
