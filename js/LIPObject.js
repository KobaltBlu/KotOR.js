/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The LIPObject class.
 */

class LIPObject {

  constructor(file = null, onComplete = null){
    this.file = file;
    this.lips = [];
    this.HeaderSize = 21;

    if(typeof file != 'string'){
      this.inMemory = true;
    }else{
      this.inMemory = false;
      this.pathInfo = path.parse(this.file);
    }

    try{

      if(this.inMemory){

        var header = Buffer.from(this.file, 0, this.HeaderSize);
        this.Reader = new BinaryReader(header);

        this.Header = {};

        this.Header.FileType = this.Reader.ReadChars(4);
        this.Header.FileVersion = this.Reader.ReadChars(4);
        this.Header.Unknown1 = this.Reader.ReadBytes(4); 
        this.Header.EntryCount = this.Reader.ReadUInt32()-1;
        this.Header.Unknown2 = this.Reader.ReadBytes(5); 

        header = this.Reader = null;

        this.lipDataOffset = 21;
        this.Reader = new BinaryReader(this.file);
        this.Reader.Seek(this.lipDataOffset);

        for (let i = 0; i < this.Header.EntryCount; i++) {
          let lip = {};
          lip.Position = this.Reader.ReadSingle();
          lip.Shape = this.Reader.ReadByte();
          this.lips.push(lip);
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
          var header = new Buffer(this.HeaderSize);
          fs.read(fd, header, 0, this.HeaderSize, 0, (e, num) => {
            this.Reader = new BinaryReader(header);
            this.Header = {};

            this.Header.FileType = this.Reader.ReadChars(4);
            this.Header.FileVersion = this.Reader.ReadChars(4);
            this.Header.Unknown1 = this.Reader.ReadBytes(4); 
            this.Header.EntryCount = this.Reader.ReadUInt32()-1;
            this.Header.Unknown2 = this.Reader.ReadBytes(5); 

            header = this.Reader = null;

            this.lipDataOffset = 21;
            header = new Buffer(this.HeaderSize + (5 * this.Header.EntryCount));
            fs.read(fd, header, 0, this.HeaderSize + (5 * this.Header.EntryCount), 0, (e, num) => {
              this.Reader = new BinaryReader(header);
              this.Reader.Seek(this.lipDataOffset);

              for (let i = 0; i < this.Header.EntryCount; i++) {
                let lip = {};
                lip.Position = this.Reader.ReadSingle();
                lip.Shape = this.Reader.ReadByte();
                this.lips.push(lip);
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


}

module.exports = LIPObject;