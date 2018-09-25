/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleCamera class.
 */

class ModuleCamera extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super();
    this.template = gff;
  }

  Load( onLoad = null ){

    this.InitProperties( () => {

      //console.log('ModuleCamera', 'Loaded')
      if(onLoad != null)
        onLoad(this);

    });
    
  }

  InitProperties( onLoad = null ){

    if(this.template.RootNode.HasField('CameraID'))
      this.cameraID = this.template.GetFieldByLabel('CameraID').GetValue();

    if(this.template.RootNode.HasField('FieldOfView'))
      this.fov = this.template.GetFieldByLabel('FieldOfView').GetValue();

    if(this.template.RootNode.HasField('Height'))
      this.height = this.template.GetFieldByLabel('Height').GetValue();

    if(this.template.RootNode.HasField('MicRange'))
      this.micRange = this.template.GetFieldByLabel('MicRange').GetValue();

    if(this.template.RootNode.HasField('Orientation'))
      this.orientation = this.template.GetFieldByLabel('Orientation').GetOrientation();

    if(this.template.RootNode.HasField('Pitch'))
      this.pitch = this.template.GetFieldByLabel('Pitch').GetValue();

    if(this.template.RootNode.HasField('Position'))
      this.position = this.template.GetFieldByLabel('Position').GetVector();

  }

}

module.exports = ModuleCamera;