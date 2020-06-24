/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The LIPObject class.
 */

class LIPObject {

  constructor(file = null, onComplete = null){
    this.file = file;
    this.HeaderSize = 21;

    this.Header = {
      FileType: 'LIP ',
      FileVersion: 'V1.0',
      Length: 1,
      EntryCount: 0,
      Unknown1: [0, 0, 0, 0, 0]
    };

    this.keyframes = [];

    this.time = 0;
    this.lastTime = 0;
    this.elapsed = 0;
    this.anim = null;
    

    if(this.file != null){
      this.readFile( (ref) => {
        if(typeof onComplete == 'function')
          onComplete(ref);
      })
    }

  }

  readFile(onComplete = null){
    
    try{

      if(this.file instanceof Buffer){

        if(!this.file.length){

          this.Header.Length = 1;
          this.Header.EntryCount = 1;

          this.keyframes.push({
            time: 0.5,
            shape: 6
          });

          if(typeof onComplete == 'function')
            onComplete(this);
          return;
        }

        var header = Buffer.from(this.file, 0, this.HeaderSize);
        this.Reader = new BinaryReader(header);

        this.Header = {};

        this.Header.FileType = this.Reader.ReadChars(4);
        this.Header.FileVersion = this.Reader.ReadChars(4);
        this.Header.Length = this.Reader.ReadSingle();
        this.Header.EntryCount = this.Reader.ReadUInt32()-1;
        this.Header.Unknown1 = this.Reader.ReadBytes(5); 

        header = this.Reader = null;

        this.lipDataOffset = 21;
        this.Reader = new BinaryReader(this.file);
        this.Reader.Seek(this.lipDataOffset);

        for (let i = 0; i < this.Header.EntryCount; i++) {
          let keyframe = {};
          keyframe.time = this.Reader.ReadSingle();
          keyframe.shape = this.Reader.ReadByte();
          this.keyframes.push(keyframe);
        }

        header = this.Reader = null;

        if(typeof onComplete == 'function')
          onComplete(this);

      }else{
        fs.open(this.file, 'r', (e, fd) => {
          if (e) {
            console.error('LIPObject', 'LIP Header Read', status.message);
            return;
          }
          var header = Buffer.alloc(this.HeaderSize);
          fs.read(fd, header, 0, this.HeaderSize, 0, (e, num) => {
            this.Reader = new BinaryReader(header);
            this.Header = {};

            this.Header.FileType = this.Reader.ReadChars(4);
            this.Header.FileVersion = this.Reader.ReadChars(4);
            this.Header.Length = this.Reader.ReadSingle();
            this.Header.EntryCount = this.Reader.ReadUInt32()-1;
            this.Header.Unknown1 = this.Reader.ReadBytes(5);

            header = this.Reader = null;

            this.lipDataOffset = 21;
            header = Buffer.alloc(this.HeaderSize + (5 * this.Header.EntryCount));
            fs.read(fd, header, 0, this.HeaderSize + (5 * this.Header.EntryCount), 0, (e, num) => {
              this.Reader = new BinaryReader(header);
              this.Reader.Seek(this.lipDataOffset);

              for (let i = 0; i < this.Header.EntryCount; i++) {
                let keyframe = {};
                keyframe.time = this.Reader.ReadSingle();
                keyframe.shape = this.Reader.ReadByte();
                this.keyframes.push(keyframe);
              }

              header = this.Reader = null;

              fs.close(fd, function(e) {

                if(typeof onComplete == 'function')
                  onComplete(this);

                if (e) {
                  console.error('LIPObject', "close error:  " + error.message);
                } else {
                  console.log('LIPObject', "File was closed!");
                }
              });

            });

          });

        });
      }
    }catch(e){
      console.error('LIPObject', 'LIP Open Error', e);
      if(typeof onComplete == 'function')
        onComplete(this);
    }
  }

  update(delta = 0, model = null){
    if(model){

      let lastFrame = 0;
      let framesLen = this.keyframes.length;
      for(let f = 0; f < framesLen; f++){
        if(this.keyframes[f].time <= this.elapsed){
          lastFrame = f;
        }
      }

      let last = this.keyframes[lastFrame];
      let next = this.keyframes[lastFrame + 1];
      if (lastFrame + 1 >= this.keyframes.length || last.time >= this.elapsed) {
        next = this.keyframes[0];
      }

      if(!last){
        last = {
          time: 0,
          shape: 0
        };
      }

      let fl = 0;
      if(last){
        fl = Math.abs((this.elapsed - last.time) / (next.time - last.time));
        if(fl == Infinity)
          fl = 1;
      }
      
      if(fl > 1){
        fl = 1;
      }
      
      if(this.anim == null){
        this.anim = model.getAnimationByName('talk');
      }
      
      if(this.anim){

        for(let i = 0; i < this.anim.nodes.length; i++){

          let node = this.anim.nodes[i];
          let modelNode = model.nodes.get(node.name);
      
          if(typeof modelNode != 'undefined'){
            
            this.anim._position.x = this.anim._position.y = this.anim._position.z = 0;
            this.anim._quaternion.x = this.anim._quaternion.y = this.anim._quaternion.z = 0;
            this.anim._quaternion.w = 1;
            //console.log(fl);
            node.controllers.forEach( (controller) => {
              modelNode.lipping = true;
              let last_frame = controller.data[last.shape];
              let next_frame = controller.data[next.shape];
              if(!last_frame){
                last_frame = controller.data[0];
              }
              if(!next_frame){
                next_frame = controller.data[0];
              }
              if(last_frame){
                switch(controller.type){
                  case AuroraModel.ControllerType.Position:
                    if(modelNode.controllers.get(AuroraModel.ControllerType.Position)){
                      this.anim._position.copy(modelNode.controllers.get(AuroraModel.ControllerType.Position).data[0]);
                    }
                    modelNode.position.copy(last_frame).add(this.anim._position);
                    modelNode.position.lerp(this.anim._position.add(next_frame), fl);
                  break;
                  case AuroraModel.ControllerType.Orientation:
                    modelNode.quaternion.copy(last_frame);
                    modelNode.quaternion.slerp(this.anim._quaternion.copy(next_frame), fl);
                  break;
                }
                modelNode.updateMatrix();
              }

            });

          }

        }

      }

      if(this.elapsed >= this.Header.Length){
        
        if(model.moduleObject)
          model.moduleObject.lipObject = undefined;

        if(this.anim){
          for(let i = 0; i < this.anim.nodes.length; i++){
  
            let modelNode = model.animNodeCache[this.anim.nodes[i].name];
            if(typeof modelNode != 'undefined'){
              modelNode.lipping = false;
            }
            
          }
        }

      }else{
        this.elapsed += delta;
      }
      this.lastTime = this.elapsed;
    }
  }

  reIndexKeyframes(){
    this.keyframes.sort((a,b) => (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0)); 
    this.Header.EntryCount = this.keyframes.length;
  }

  export( onComplete = null ){

    //this.reIndexKeyframes();

    let writer = new BinaryWriter();

    //Write the header to the buffer
    writer.WriteChars(this.Header.FileType);
    writer.WriteChars(this.Header.FileVersion);
    writer.WriteSingle(this.Header.Length);
    writer.WriteUInt32(this.Header.EntryCount + 1);
    writer.WriteByte(0);
    writer.WriteByte(0);
    writer.WriteByte(0);
    writer.WriteByte(0);
    writer.WriteByte(0);

    //Write the keyframe data to the buffer
    for (let i = 0; i < this.Header.EntryCount; i++) {
      let keyframe = this.keyframes[i];
      writer.WriteSingle(keyframe.time);
      writer.WriteByte(keyframe.shape);
    }

    console.log('Exporting LIP file to ', this.file);

    fs.writeFile(this.file, writer.buffer, (err) => {

      if (err) {
        console.error(err);
      }else{
        console.log('LIP file exported to ', this.file);
      }

      if(typeof onComplete === 'function')
        onComplete(err);

    });


  }

  async exportAs( onComplete = null ){

    let payload = await dialog.showSaveDialog({
      title: 'Export LIP',
      defaultPath: this.file,
      filters: [
        {name: 'LIP', extensions: ['lip']}
      ]
    });

    if(!payload.canceled && typeof payload.filePath != 'undefined'){
      this.file = payload.filePath;
      this.export(onComplete);
    }else{
      console.warning('LIP export aborted');
      if(typeof onComplete === 'function')
        onComplete();
    }

  }


}

module.exports = LIPObject;