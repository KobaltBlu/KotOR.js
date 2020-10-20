/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GUICheckbox class.
 */

class GUICheckBox extends GUIControl{

  constructor(menu = null, control = null, parent = null, scale = false){
    super(menu, control, parent, scale);

    this.value = 0;
    this.onValueChanged = undefined;

    this.widget.selected = new THREE.Group();
    this.widget.highlightSelected = new THREE.Group();
    this.widget.add(this.widget.selected);
    this.widget.add(this.widget.highlightSelected);

    //----------//
    // Selected
    //----------//

    this.selected = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      edge: '',
      fill: {
        texture: '',
        material: undefined,
        mesh: undefined,
        geometry: undefined
      },
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.selected.geometry = new THREE.BufferGeometry();
    
    this.selected.edge_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    this.selected.edge_material.defines.USE_MAP = '';
    this.selected.edge_material.uniforms.diffuse.value = this.selected.color;

    this.selected.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.selected.corner_material.defines.USE_MAP = '';
    this.selected.corner_material.uniforms.diffuse.value = this.selected.color;

    this.selected.mesh = new THREE.Mesh( this.selected.geometry, [this.selected.edge_material, this.selected.corner_material] );
    this.widget.selected.add(this.selected.mesh);

    //---------------//
    // Selected Fill
    //---------------//
    
    this.selected.fill.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.selected.fill.material.defines.USE_MAP = '';
    this.selected.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.selected.fill.geometry = new THREE.PlaneBufferGeometry( 1, 1, 1 );
    this.selected.fill.mesh = new THREE.Mesh( this.selected.fill.geometry, this.selected.fill.material );

    this.widget.selected.add( this.selected.fill.mesh );

    //--------------------//
    // Highlight Selected
    //--------------------//

    this.highlightSelected = {
      color: new THREE.Color(0, 0.658824, 0.980392),
      corner: '',
      edge: '',
      fill: {
        texture: '',
        material: undefined,
        mesh: undefined,
        geometry: undefined
      },
      fillstyle: -1,
      dimension: 0,
      inneroffset: 0,
      inneroffsety: 0,
      pulsing: 0
    };

    this.highlightSelected.geometry = new THREE.BufferGeometry();
    
    this.highlightSelected.edge_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    this.highlightSelected.edge_material.defines.USE_MAP = '';
    this.highlightSelected.edge_material.uniforms.diffuse.value = this.highlightSelected.color;

    this.highlightSelected.corner_material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.highlightSelected.corner_material.defines.USE_MAP = '';
    this.highlightSelected.corner_material.uniforms.diffuse.value = this.highlightSelected.color;

    this.highlightSelected.mesh = new THREE.Mesh( this.highlightSelected.geometry, [this.highlightSelected.edge_material, this.highlightSelected.corner_material] );
    this.widget.highlightSelected.add(this.highlightSelected.mesh);

    //-------------------------//
    // Highlight Selected Fill
    //-------------------------//
    
    this.highlightSelected.fill.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib.odysseyGUI.uniforms
      ]),
      vertexShader: THREE.ShaderLib.odysseyGUI.vertexShader,
      fragmentShader: THREE.ShaderLib.odysseyGUI.fragmentShader,
      side: THREE.FrontSide,
      fog: false,
      visible: true
    });
    //this.highlightSelected.fill.material.defines.USE_MAP = '';
    this.highlightSelected.fill.material.uniforms.diffuse.value = new THREE.Color(0xFFFFFF);
    this.highlightSelected.fill.geometry = new THREE.PlaneBufferGeometry( 1, 1, 1 );
    this.highlightSelected.fill.mesh = new THREE.Mesh( this.highlightSelected.fill.geometry, this.highlightSelected.fill.material );

    this.widget.highlightSelected.add( this.highlightSelected.fill.mesh );

    if(this.control instanceof Struct){
      
      //Selected
      this.hasSelected = control.HasField('SELECTED');
      if(this.hasSelected){
        let selected = control.GetFieldByLabel('SELECTED').GetChildStructs()[0];

        if(selected.HasField('COLOR')){
          let color = selected.GetFieldByLabel('COLOR').GetVector();
          this.selected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.selected.color === 'undefined'){
          this.selected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.selected.dimension = selected.GetFieldByLabel('DIMENSION').GetValue() || 0;
        this.selected.corner = selected.GetFieldByLabel('CORNER').GetValue();
        this.selected.edge = selected.GetFieldByLabel('EDGE').GetValue();
        this.selected.fill.texture = selected.GetFieldByLabel('FILL').GetValue();
        this.selected.fillstyle = selected.GetFieldByLabel('FILLSTYLE').GetValue() || 0;
        this.selected.inneroffset = this.selected.inneroffsety = selected.GetFieldByLabel('INNEROFFSET').GetValue() || 0;

        if(selected.HasField('INNEROFFSETY'))
          this.selected.inneroffsety = selected.GetFieldByLabel('INNEROFFSETY').GetValue();

        this.selected.pulsing = selected.GetFieldByLabel('PULSING').GetValue() || 0;
      }
      
      //Highlight Selected
      this.hashighlightSelected = control.HasField('HILIGHTSELECTED');
      if(this.hashighlightSelected){
        let highlightSelected = control.GetFieldByLabel('HILIGHTSELECTED').GetChildStructs()[0];

        if(highlightSelected.HasField('COLOR')){
          let color = highlightSelected.GetFieldByLabel('COLOR').GetVector();
          this.highlightSelected.color.setRGB(color.x, color.y, color.z)
        }

        if(typeof this.highlightSelected.color === 'undefined'){
          this.highlightSelected.color = new THREE.Color(1, 1, 1); //this.defaultColor;
        }

        this.highlightSelected.dimension = highlightSelected.GetFieldByLabel('DIMENSION').GetValue() || 0;
        this.highlightSelected.corner = highlightSelected.GetFieldByLabel('CORNER').GetValue();
        this.highlightSelected.edge = highlightSelected.GetFieldByLabel('EDGE').GetValue();
        this.highlightSelected.fill.texture = highlightSelected.GetFieldByLabel('FILL').GetValue();
        this.highlightSelected.fillstyle = highlightSelected.GetFieldByLabel('FILLSTYLE').GetValue() || 0;
        this.highlightSelected.inneroffset = this.highlightSelected.inneroffsety = highlightSelected.GetFieldByLabel('INNEROFFSET').GetValue() || 0;

        if(highlightSelected.HasField('INNEROFFSETY'))
          this.highlightSelected.inneroffsety = highlightSelected.GetFieldByLabel('INNEROFFSETY').GetValue();

        this.highlightSelected.pulsing = highlightSelected.GetFieldByLabel('PULSING').GetValue() || 0;
      }

    }

    //Control Textures

    //----------//
    // Selected
    //----------//

    if(this.selected.edge != ''){
      TextureLoader.enQueue(this.selected.edge, this.selected.edge_material, TextureLoader.Type.TEXTURE, (texture) => {
        if(!texture){
          console.log('initTextures', this.selected.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.selected.corner != ''){
      TextureLoader.enQueue(this.selected.corner, this.selected.corner_material, TextureLoader.Type.TEXTURE, (texture) => {
        if(!texture){
          console.log('initTextures', this.selected.corner, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.selected.fill.texture != ''){
      this.selected.fill.material.transparent = true;
      TextureLoader.enQueue(this.selected.fill.texture, this.selected.fill.material, TextureLoader.Type.TEXTURE, (texture) => {
        if(texture == null){
          this.selected.fill.material.uniforms.opacity.value = 0.01;
        }
      });
    }else{
      this.selected.fill.material.visible = false;
    }

    //--------------------//
    // Highlight Selected
    //--------------------//

    if(this.highlightSelected.edge != ''){
      TextureLoader.enQueue(this.highlightSelected.edge, this.highlightSelected.edge_material, TextureLoader.Type.TEXTURE, (texture) => {
        if(!texture){
          console.log('initTextures', this.highlightSelected.edge, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.highlightSelected.corner != ''){
      TextureLoader.enQueue(this.highlightSelected.corner, this.highlightSelected.corner_material, TextureLoader.Type.TEXTURE, (texture) => {
        if(!texture){
          console.log('initTextures', this.highlightSelected.corner, texture);
          return;
        }

        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    }

    if(this.highlightSelected.fill.texture != ''){
      this.highlightSelected.fill.material.transparent = true;
      TextureLoader.enQueue(this.highlightSelected.fill.texture, this.highlightSelected.fill.material, TextureLoader.Type.TEXTURE, (texture) => {
        if(texture == null){
          this.highlightSelected.fill.material.uniforms.opacity.value = 0.01;
        }
      });
    }else{
      this.highlightSelected.fill.material.visible = false;
    }

    //Control Input Events

    //Selected
    this.attachEventListenters( this.selected.mesh );

    //Highlight Selected
    this.attachEventListenters( this.highlightSelected.mesh );

    this.addEventListener( 'mouseMove', () => { });

    this.addEventListener( 'click', () =>{
      console.log('click', this);
      this.setValue(!this.value);
    });

    this.addEventListener( 'mouseDown', (e) => {
      e.stopPropagation();
    });

    this.addEventListener( 'mouseUp', () => { });

    let cbSize = this.extent.height;
    this.selected.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.highlightSelected.fill.mesh.scale.set(cbSize, cbSize, 1);
    
    this.selected.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.highlightSelected.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);

    this.selected.fill.material.uniforms.diffuse.value.setRGB(0, 0.658824, 0.980392);
    this.highlightSelected.fill.material.uniforms.diffuse.value.setRGB(1, 1, 0);

  }

  buildFill(){
    super.buildFill();
    let cbSize = this.extent.height;
    this.border.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.border.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.border.fill.material.uniforms.diffuse.value.setRGB(0, 0.658824, 0.980392);
  }

  buildHighlightFill(){
    super.buildHighlightFill();
    let cbSize = this.extent.height;
    this.highlight.fill.mesh.scale.set(cbSize, cbSize, 1);
    this.highlight.fill.mesh.position.set(-(this.extent.width/2 - cbSize/2), 0, this.zOffset);
    this.highlight.fill.material.uniforms.diffuse.value.setRGB(1, 1, 0);
  }

  hideHighlight(){}
  hideBorder(){}
  hideFill(){}
  hideHighlightFill(){}

  updateCBVisualState(){
    this.border.fill.mesh.visible = false;
    this.selected.fill.mesh.visible = false;
    this.highlight.fill.mesh.visible = false;
    this.highlightSelected.fill.mesh.visible = false;

    if(this.hover){
      if(this.value){
        this.highlightSelected.fill.mesh.visible = true;
      }else{
        this.highlight.fill.mesh.visible = true;
      }
    }else{
      if(this.value){
        this.selected.fill.mesh.visible = true;
      }else{
        this.border.fill.mesh.visible = true;
      }
    }

  }

  onHoverOut(){

    this.hover = false;
    this.pulsing = false;

    this.text.material.uniforms.diffuse.value.setRGB(0, 0.658824, 0.980392);

    if(typeof this.onMouseOut === 'function')
      this.onMouseOut();

    this.updateCBVisualState();
  }

  onHoverIn(){

    if(!this.hover && typeof this.onHover === 'function')
      this.onHover();

    this.hover = true;
    this.pulsing = true;

    this.text.material.uniforms.diffuse.value.setRGB(1, 1, 0);

    if(typeof this.onMouseIn === 'function')
      this.onMouseIn();

    this.updateCBVisualState();

    if(this.isClickable()){
      Game.guiAudioEmitter.PlaySound('gui_scroll');
    }
    
  }

  onINIPropertyAttached(){
    if(this.iniProperty)
      this.setValue(this.iniProperty.value);
  }

  setValue(value = 0){

    this.value = value ? 1 : 0;

    if(this.iniProperty)
      this.iniProperty.value = this.value;
    
    if(typeof this.onValueChanged === 'function')
      this.onValueChanged(this.value);

    this.updateCBVisualState();
  }

}

module.exports = GUICheckBox;