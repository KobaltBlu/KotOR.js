/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AudioFile class is a general purpose class used for retrieving and passing on useful audio bytes 
 * as some file have extra garbage in the headers.
 */

class AudioFile {

  constructor(data = null, onComplete = null){
    this.audioType = AudioFile.AudioType.Unknown;
    this.data = data;
    this.isProcessed = false;

    //Open Binary Stream
    this.GetBinaryStream( (reader) => {

      //console.log(this.data, reader);
      if(typeof onComplete == 'function')
        onComplete(this);

    });

  }

  //Get the binary data and remove any junk bytes that may be padding the file
  GetBinaryStream(onComplete = null){
    //String file path
    if(typeof this.data == 'string'){

      let info = Utility.filePathInfo(this.data);

      if(info.location == 'local'){

        this.filename = info.file.name;

        fs.readFile(info.path, (err, buffer) => {
          if (err) throw err;
          try{
            this.data = new BinaryReader(buffer);
            this.ProcessFile(onComplete);
            return;
          }
          catch (e) {
            console.error(e);
          }

        });

      }else if(info.location == 'archive'){

        switch(info.archive.type){
          case 'bif':
            Global.kotorBIF[info.archive.name].GetResourceData(Global.kotorBIF[info.archive.name].GetResourceByLabel(info.file.name, ResourceTypes[info.file.ext]), (buffer) => {
              this.data = new BinaryReader(buffer);
              this.ProcessFile(onComplete);
              return;
            }, (e) => {
              throw 'Resource not found in BIF archive '+pathInfo.archive.name;
            });
          break;
        }

      }

    }

    //BinaryReader
    else if(this.data instanceof BinaryReader){
      this.filename = 'Unknown';
      if(this.isProcessed){
        if(onComplete != null)
          onComplete( this.data );
      }else{
        this.ProcessFile(onComplete);
      }

    } else {
      this.filename = 'Unknown';
      if(this.isProcessed){
        this.data = new BinaryReader(this.data);
        if(onComplete != null)
          onComplete(this.data);
      }else{
        this.data = new BinaryReader(this.data);
        this.ProcessFile(onComplete);
      }

    }

  }

  ProcessFile(onComplete = null){
    this.isProcessed = true;
    let flag = this.data.ReadBytes(4);
    let riffSize = this.data.ReadUInt32(); //for an MP3 this will be 50
    this.data.Seek(0);
    let fakeHeaderTest = [0xFF, 0xF3, 0x60, 0xC4];
    let riffHeaderTest = [0x52, 0x49, 0x46, 0x46];

    //MP3 Tests
    let lameHeaderTest = [0x4C, 0x41, 0x4D, 0x45];
    let id3HeaderTest = [0x49, 0x44, 0x33];
    let mp3HeaderTest = [0xFF, 0xFB];

    if(Utility.ArrayMatch(flag, fakeHeaderTest)) {
      this.audioType = AudioFile.AudioType.WAVE;

      this.data = this.data.Slice(470, this.data.Length()); //Remove the fake data
      this.header = this.ReadWavHeader(this.data);
      //console.log(this.header);
      this.data.Seek(0);

      if(onComplete != null)
        onComplete(this.data);

      return;

    }

    //Test for RIFF header
    if(Utility.ArrayMatch(flag, riffHeaderTest)) {

      this.header = this.ReadWavHeader(this.data);
      this.data.Seek(0);

      //Test for MP3 offset
      if(riffSize == 50){

        this.audioType = AudioFile.AudioType.MP3;

        this.data =this.data.Slice(58, this.data.Length()); //Remove the fake data
        this.header = this.ReadMP3Header(this.data);
        this.data.Seek(0);
        
        if(onComplete != null)
          onComplete(this.data);
        
        return;
      
      }else{

        //Looks like we have a real wave file
        this.audioType = AudioFile.AudioType.WAVE;
        
        if(onComplete != null)
          onComplete(this.data);
        
        return;
      
      }

    }

    /*if(Utility.ArrayMatch(flag.slice(0, 3), id3HeaderTest) || 
        Utility.ArrayMatch(flag.slice(0, 2), mp3HeaderTest) ||
        Utility.ArrayMatch(flag.slice(0, 4), lameHeaderTest)) {*/

      this.audioType = AudioFile.AudioType.MP3;

      this.header = this.ReadMP3Header(this.data);
      this.data.Seek(0);
      
      if(onComplete != null)
        onComplete(this.data);

      return;

    /*}

    throw 'Unable to decode AUDIO file';*/
  }

  GetPlayableByteStream(onComplete = null){

    this.GetBinaryStream( () => {

      if(!(this.data instanceof BinaryReader))
        console.error('AudioFile.GetPlayableByteStream', this.data);

      this.data.Seek(0);

      if(this.audioType == AudioFile.AudioType.WAVE){
        if(this.header.format == AudioFile.WAVE_ENCODING.ADPCM){

          let rawDataOffset = 60;
          //console.log('rawDataOffset', rawDataOffset);
          this.data.Seek(rawDataOffset);
          let dataADPCM = this.data.ReadBytes(this.data.Length() - (rawDataOffset));
          let adpcm = new ADPCMDecoder({header: this.header, data: Buffer.from(dataADPCM)});
          //console.log('ADPCMDecoder', adpcm);

          let decompiled = this.BuildWave({
            sampleRate: this.header.sampleRate,
            bytesPerSec: 176400,
            bits: 16,
            channels: this.header.channels
          }, adpcm.pcm);

          if(typeof onComplete == 'function')
            onComplete(new Uint8Array(decompiled).buffer);

        }else if(this.header.format == AudioFile.WAVE_ENCODING.PCM){
          let dataBuffer = new Uint8Array(this.data.reader).buffer;
          
          if(onComplete != null)
            onComplete(dataBuffer);
        }else{
          throw 'Unsupported WAVE encoding';
        }

      }else if(this.audioType == AudioFile.AudioType.MP3){
        let dataBuffer = new Uint8Array(this.data.reader).buffer;
        
        if(onComplete != null)
          onComplete(dataBuffer);
      }else{
        console.error('AudioFile.GetPlayableByteStream', this.header);
        throw 'Not a valid audio file'
      }

    });

  }

  ReadMP3Header (reader){

  }

  ReadWavHeader (reader){

    let header = {
      riff: reader.ReadChars(4),
      riffSize: reader.ReadUInt32(),
      wave: reader.ReadChars(4)
    };

    if(header.wave != 'WAVE')
      throw 'Not a valid wave header';

    let subChunkParser = (header, reader) => {
      let chunkID = reader.ReadChars(4);
      switch(chunkID){
        case 'fmt ':
          header.fmt = chunkID;
          header.chunkSize = reader.ReadUInt32();
          header.format = reader.ReadUInt16();
          header.channels = reader.ReadUInt16();
          header.sampleRate = reader.ReadUInt32();
          header.bytesPerSec = reader.ReadUInt32();
          header.frameSize = reader.ReadUInt16();
          header.bits = reader.ReadUInt16();

          if(header.format == AudioFile.WAVE_ENCODING.ADPCM){
            header.blobSize = reader.ReadUInt16();
            header.blobData = reader.ReadBytes(header.blobSize);
          }
          return true;
        break;
        case 'fact':
          header.fact = chunkID;
          header.factSize = reader.ReadUInt32();
          header.factBOH = reader.ReadUInt32();
          return true;
        break;
        case 'data':
          header.data = chunkID;
          header.dataSize = reader.ReadUInt32();
          header.dataOffset = reader.Tell();
          return false;
        break;
        default:
          throw 'Unkown WAVE chunk';
          return false;
        break;
      }

    };

    while(subChunkParser(header, reader))

    return header;

  }

  BuildWave(header, data){

    let riffHeaderLen = 8;
    let waveHeaderLen = 56;

    let buffer = Buffer.alloc( data.length + 44 );//data.length + riffHeaderLen + waveHeaderLen );
    let bWriter = new BinaryWriter(buffer);

    let riffSize = data.length + waveHeaderLen;

    //console.log(header)
    //console.log((header.channels == 2 ? 4 : 2))
    //console.log(header.sampleRate * (header.channels == 2 ? 4 : 2));

    //header.sampleRate = header.sampleRate / 2;
    //header.channels = 2;

	  header.bits = 16;

    bWriter.WriteChars('RIFF');
    bWriter.WriteUInt32(riffSize);
    bWriter.WriteChars('WAVE');
    bWriter.WriteChars('fmt ');
    bWriter.WriteUInt32(16);
    bWriter.WriteUInt16(1);
    bWriter.WriteUInt16( header.channels );
    bWriter.WriteUInt32( header.sampleRate );
    bWriter.WriteUInt32(header.sampleRate * 4);
    bWriter.WriteUInt16( (header.bits*header.channels) / 8 );
    bWriter.WriteUInt16( header.bits );
    //bWriter.WriteUInt16(0);
    bWriter.WriteChars('data');
    bWriter.WriteUInt32(data.length);

    bWriter.WriteBytes(data);

    /*fs.writeFile('test.wav', bWriter.buffer, (err) => {
      if (err) {
       return console.error(err);
      }
      console.log('wave Saved');
    });*/

    return buffer;

  }

  GetExportableData(){

    switch(this.audioType){
      case AudioFile.AudioType.WAVE:
        switch(this.header.format){
          case AudioFile.WAVE_ENCODING.ADPCM:
            /*let rawDataOffset = 60;
            console.log('rawDataOffset', rawDataOffset);
            this.data.Seek(rawDataOffset);
            let dataADPCM = this.data.ReadBytes(this.data.Length() - (rawDataOffset));
            let adpcm = new ADPCMDecoder({header: this.header, data: Buffer.from(dataADPCM)});
            console.log('ADPCMDecoder', adpcm);

            let decompiled = this.BuildWave({
              sampleRate: this.header.sampleRate,
              bytesPerSec: 176400,
              bits: 16,
              channels: this.header.channels
            }, adpcm.pcm);

            return decompiled;*/
            return this.data.reader;
          break;
          case AudioFile.WAVE_ENCODING.PCM:
            return this.data.reader;
          break;
        }
      break;
      case AudioFile.AudioType.MP3:
        return this.data.reader;
      break;
    }

  }

  GetExportExtension(){
    switch(this.audioType){
      case AudioFile.AudioType.MP3:
        return 'mp3';
      break;
      case AudioFile.AudioType.WAVE:
        return 'wav';
      break;
    }
  }

  Export( args = {} ){

    args = Object.assign({
      file: null,
      onComplete: null,
      onError: null
    }, args);

    if(args.file!=null){

      fs.writeFile(args.file, this.GetExportableData(), (err) => {
        if (err) {
          if(typeof args.onError == 'function')
            args.onError(err);
        }else{
          if(typeof args.onComplete == 'function')
            args.onComplete();
        }
        console.log('AudioFile Saved');
      });

    }

  }

}

AudioFile.AudioType = {
  'Unknown': 0,
  'WAVE': 1,
  'MP3': 2
};

AudioFile.WAVE_ENCODING = {
  'PCM': 0x01,
  'ADPCM': 0x11 //Not supported by webkit. Must be converted to PCM
}

module.exports = AudioFile;
