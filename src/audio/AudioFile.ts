import { ADPCMDecoder } from "@/audio/ADPCMDecoder";
import { AudioFileAudioType } from "@/enums/audio/AudioFileAudioType";
import { AudioFileWaveEncoding } from "@/enums/audio/AudioFileWaveEncoding";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { createScopedLogger, LogScope } from "@/utility/Logger";
import { Utility } from "@/utility/Utility";


const log = createScopedLogger(LogScope.Audio);

/** WAV/RIFF header structure read from audio file. */
export interface IAudioFileHeader {
  riff?: string | Record<string, unknown>;
  riffSize?: number | Record<string, unknown>;
  wave?: string | Record<string, unknown>;
  format?: number;
  sampleRate?: number;
  frameSize?: number;
  channels?: number;
  bits?: number;
  fmt?: string;
  chunkSize?: number;
  bytesPerSec?: number;
  blobSize?: number;
  blobData?: Uint8Array;
  /** 'fact' chunk id */
  fact?: string;
  factSize?: number;
  factBOH?: number;
  /** 'data' chunk id */
  data?: string;
  dataSize?: number;
  dataOffset?: number;
}

/** Options for exporting an audio file. */
export interface IAudioFileExportOptions {
  file?: string | null;
  onComplete?: (() => void) | null;
  onError?: ((err: Error) => void) | null;
}

//Header Tests
const fakeHeaderTest = [0xFF, 0xF3, 0x60, 0xC4];
const riffHeaderTest = [0x52, 0x49, 0x46, 0x46];

//MP3 Tests (reserved for future format detection)
const _lameHeaderTest = [0x4C, 0x41, 0x4D, 0x45];
const _id3HeaderTest = [0x49, 0x44, 0x33];
const _mp3HeaderTest = [0xFF, 0xFB];

/**
 * AudioFile class.
 * 
 * The AudioFile class is a general purpose class used for retrieving and passing on useful audio bytes as some file have extra garbage in the headers.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AudioFile.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AudioFile {
  audioType: AudioFileAudioType;
  data: Uint8Array;
  isProcessed: boolean;
  filename: string | undefined;
  header: IAudioFileHeader = { riff: {}, riffSize: {}, wave: {} };
  reader: BinaryReader;

  constructor(data: Uint8Array){
    log.trace('AudioFile constructor', { dataLength: data?.length ?? 0 });
    this.audioType = AudioFileAudioType.Unknown;
    this.data = data;
    this.isProcessed = false;
  }

  async getBinaryStream(): Promise<Uint8Array>{
    log.trace('getBinaryStream entry', { isProcessed: this.isProcessed, audioType: this.audioType, dataType: typeof this.data });
    log.debug('getBinaryStream', { isProcessed: this.isProcessed, audioType: this.audioType });
    if(typeof this.data == 'string'){
      log.trace('getBinaryStream path branch');
      const info = Utility.filePathInfo(this.data);
      log.trace('getBinaryStream filePathInfo', info.location);

      if(info.location == 'local'){
        this.filename = info.file.name;
        log.trace('getBinaryStream local read', info.path);

        const buffer = await GameFileSystem.readFile(info.path);
        log.trace('getBinaryStream buffer length', buffer?.length);
        try {
          this.reader = new BinaryReader(buffer);
          this.processFile();
          log.trace('getBinaryStream processFile done, returning data');
          return this.data;
        } catch (e) {
          log.error(e instanceof Error ? e : new Error(String(e)));
          throw e;
        }

      }else if(info.location == 'archive'){
        log.trace('getBinaryStream archive', info.archive?.type);
        switch(info.archive.type){
          case 'bif':
            // Global.kotorBIF[info.archive.name].getResourceBuffer(Global.kotorBIF[info.archive.name].getResource(info.file.name, ResourceTypes[info.file.ext]), (buffer) => {
            //   this.reader = new BinaryReader(buffer);
            //   this.processFile(onComplete);
            //   return;
            // }, (e: Error) => {
            //   throw 'Resource not found in BIF archive '+pathInfo.archive.name;
            // });
          break;
        }

      }

    }

    else if(this.reader instanceof BinaryReader){
      log.trace('getBinaryStream BinaryReader branch');
      if(!this.filename) this.filename = 'Unknown';
      if(this.isProcessed){
        log.trace('getBinaryStream already processed, return data');
        return this.data;
      }else{
        this.processFile();
        log.trace('getBinaryStream processFile done');
        return this.data;
      }

    } else {
      log.trace('getBinaryStream data branch');
      if(!this.filename) this.filename = 'Unknown';
      if(this.isProcessed){
        log.trace('getBinaryStream create reader from data, already processed');
        this.reader = new BinaryReader(this.data);
        return this.data;
      }else{
        log.trace('getBinaryStream create reader and processFile');
        this.reader = new BinaryReader(this.data);
        this.processFile();
        return this.data;
      }
    }

    log.trace('getBinaryStream fallback return');
    return;
  }

  processFile(){
    log.trace('processFile entry');
    log.debug('processFile start');
    this.isProcessed = true;
    const flag = this.reader.readBytes(4);
    log.trace('processFile flag bytes', flag?.length);
    const riffSize = this.reader.readUInt32();
    log.trace('processFile riffSize', riffSize);
    this.reader.seek(0);

    if(Utility.ArrayMatch(flag, fakeHeaderTest)) {
      log.trace('processFile fake WAV header match');
      this.audioType = AudioFileAudioType.WAVE;
      log.info('processFile: detected fake WAV header, slicing and reading');
      this.reader = this.reader.slice(470, this.reader.length()); //Remove the fake data
      this.header = this.readWavHeader(this.reader);
      log.trace('AudioFile: read fake WAV header', this.header);
      this.reader.seek(0);
      this.data = this.reader.buffer;
      return;
    }

    if(Utility.ArrayMatch(flag, riffHeaderTest)) {
      log.trace('processFile RIFF header match');
      log.debug('processFile: RIFF header matched');
      this.header = this.readWavHeader(this.reader);
      this.reader.seek(0);

      if(riffSize == 50){
        log.trace('processFile riffSize 50 -> MP3');
        this.audioType = AudioFileAudioType.MP3;
        log.info('processFile: MP3 offset (riffSize=50), slicing');
        this.reader = this.reader.slice(58, this.reader.length()); //Remove the fake data
        // this.header = this.readMP3Header(this.reader);
        this.reader.seek(0);
        this.data = this.reader.buffer; 
      }else{
        log.trace('processFile real WAVE');
        this.audioType = AudioFileAudioType.WAVE;
        log.info('processFile: real WAVE file');
        return;
      }
    }

    log.trace('processFile fallback MP3');
    /*if(Utility.ArrayMatch(flag.slice(0, 3), id3HeaderTest) || 
        Utility.ArrayMatch(flag.slice(0, 2), mp3HeaderTest) ||
        Utility.ArrayMatch(flag.slice(0, 4), lameHeaderTest)) {*/

      this.audioType = AudioFileAudioType.MP3;
      log.info('processFile: MP3 (no RIFF/ID3 match)');
      // this.header = this.readMP3Header(this.reader);
      this.reader.seek(0);

      return;

    /*}

    throw 'Unable to decode AUDIO file';*/
  }

  async getPlayableByteStream(): Promise<Uint8Array> {
    log.trace('getPlayableByteStream entry');
    log.debug('getPlayableByteStream');
    const _b = await this.getBinaryStream();
    log.trace('getPlayableByteStream getBinaryStream done');

    if(!(this.reader instanceof BinaryReader)){
      log.error('AudioFile.getPlayableByteStream: reader is not BinaryReader', this.data);
    }

    this.reader.seek(0);
    log.trace('getPlayableByteStream audioType', this.audioType);

    if(this.audioType == AudioFileAudioType.WAVE){
      log.trace('getPlayableByteStream WAVE branch');
      if(this.header.format == AudioFileWaveEncoding.ADPCM){
        log.trace('getPlayableByteStream ADPCM decode');
        const RAW_PCM_DATA_OFFSET = 60;
        this.reader.seek(RAW_PCM_DATA_OFFSET);
        const dataADPCM = this.reader.readBytes(this.reader.length() - (RAW_PCM_DATA_OFFSET));
        log.trace('getPlayableByteStream ADPCM data length', dataADPCM?.length);
        const adpcm = new ADPCMDecoder({
          sampleRate: this.header.sampleRate,
          frameSize: this.header.frameSize,
          channels: this.header.channels
        }, dataADPCM);

        const decompiled = this.buildWave({
          sampleRate: this.header.sampleRate,
          bytesPerSec: 176400,
          bits: 16,
          channels: this.header.channels
        }, adpcm.pcm);

        log.trace('getPlayableByteStream ADPCM decompiled length', decompiled?.length);
        return decompiled;
      }else if(this.header.format == AudioFileWaveEncoding.PCM){
        log.trace('getPlayableByteStream: PCM, returning buffer');
        return this.reader.buffer;
      }else{
        log.warn('getPlayableByteStream: unsupported WAVE encoding', this.header.format);
        throw new Error('Unsupported WAVE encoding');
      }

    }else if(this.audioType == AudioFileAudioType.MP3){
      log.trace('getPlayableByteStream MP3, returning buffer');
      return this.reader.buffer;
    }else{
      log.error('AudioFile.getPlayableByteStream', this.header);
      throw new Error('Not a valid audio file');
    }

  }

  readMP3Header (_reader: BinaryReader): Record<string, never> {
    return {};
  }

  waveSubChunkParser (header: IAudioFileHeader, reader: BinaryReader) {
    const chunkID = reader.readChars(4);
    log.trace('waveSubChunkParser chunk', chunkID);
    switch(chunkID){
      case 'fmt ':
        log.trace('waveSubChunkParser fmt');
        header.fmt = chunkID;
        header.chunkSize = reader.readUInt32();
        header.format = reader.readUInt16();
        header.channels = reader.readUInt16();
        header.sampleRate = reader.readUInt32();
        header.bytesPerSec = reader.readUInt32();
        header.frameSize = reader.readUInt16();
        header.bits = reader.readUInt16();
        log.trace('waveSubChunkParser fmt values', { format: header.format, channels: header.channels, sampleRate: header.sampleRate });

        if(header.format == AudioFileWaveEncoding.ADPCM){
          header.blobSize = reader.readUInt16();
          header.blobData = reader.readBytes(header.blobSize);
          log.trace('waveSubChunkParser ADPCM blobSize', header.blobSize);
        }
        return true;
      break;
      case 'fact':
        log.trace('waveSubChunkParser fact');
        header.fact = chunkID;
        header.factSize = reader.readUInt32();
        header.factBOH = reader.readUInt32();
        return true;
      break;
      case 'data':
        log.trace('waveSubChunkParser data');
        header.data = chunkID;
        header.dataSize = reader.readUInt32();
        header.dataOffset = reader.tell();
        return false;
      break;
      default:
        log.warn('waveSubChunkParser: unknown WAVE chunk', chunkID);
        throw new Error('Unknown WAVE chunk');
      break;
    }

  }

  readWavHeader (reader: BinaryReader): IAudioFileHeader {
    log.trace('readWavHeader entry');
    const header = {
      riff: reader.readChars(4),
      riffSize: reader.readUInt32(),
      wave: reader.readChars(4)
    };
    log.trace('readWavHeader riff/wave', header.riff, header.wave);

    if(header.wave != 'WAVE'){
      log.error('readWavHeader: not a valid wave header', header.wave);
      throw new Error('Not a valid wave header');
    }

    let parsing = true;
    while(parsing){
      parsing = this.waveSubChunkParser(header, reader);
      log.trace('readWavHeader subChunk loop', parsing);
    }

    log.trace('readWavHeader done');
    return header;
  }

  buildWave(header: IAudioFileHeader & { bits?: number }, data: Uint8Array){
    log.debug('buildWave', { dataLength: data?.length, channels: header.channels, sampleRate: header.sampleRate });
    const _riffHeaderLen = 8;
    const waveHeaderLen = 56;

    const buffer = new Uint8Array( data.length + 44 );//data.length + riffHeaderLen + waveHeaderLen );
    const bWriter = new BinaryWriter(buffer);

    const riffSize = data.length + waveHeaderLen;

    log.trace('buildWave header', { channels: header.channels, sampleRate: header.sampleRate });

    //header.sampleRate = header.sampleRate / 2;
    //header.channels = 2;

    header.bits = 16;

    bWriter.writeChars('RIFF');
    bWriter.writeUInt32(riffSize);
    bWriter.writeChars('WAVE');
    bWriter.writeChars('fmt ');
    bWriter.writeUInt32(16);
    bWriter.writeUInt16(1);
    bWriter.writeUInt16(header.channels);
    bWriter.writeUInt32(header.sampleRate);
    bWriter.writeUInt32(header.sampleRate * 4);
    bWriter.writeUInt16((header.bits * header.channels) / 8);
    bWriter.writeUInt16(header.bits);
    //bWriter.WriteUInt16(0);
    bWriter.writeChars('data');
    bWriter.writeUInt32(data.length);

    bWriter.writeBytes(data);
    log.trace('buildWave writeBytes done, buffer length', buffer.length);

    /* If uncommenting: use log.error(err) and log.info('wave Saved') instead of console. */
    /*fs.writeFile('test.wav', bWriter.buffer, (err) => {
      if (err) {
       return log.error(err);
      }
      log.info('wave Saved');
    });*/

    return buffer;
  }

  getExportableData(): Uint8Array {
    log.trace('getExportableData entry', this.audioType);
    switch(this.audioType){
      case AudioFileAudioType.WAVE:
        log.trace('getExportableData WAVE', this.header.format);
        switch(this.header.format){
          case AudioFileWaveEncoding.ADPCM:
            log.trace('getExportableData ADPCM return reader.buffer');
            /* If uncommenting: use log.debug for rawDataOffset and ADPCMDecoder. */
            /*let rawDataOffset = 60;
            log.debug('rawDataOffset', rawDataOffset);
            this.data.seek(rawDataOffset);
            let dataADPCM = this.data.readBytes(this.data.Length() - (rawDataOffset));
            let adpcm = new ADPCMDecoder({header: this.header, data: new Uint8Array(dataADPCM)});
            log.debug('ADPCMDecoder', adpcm);

            let decompiled = this.buildWave({
              sampleRate: this.header.sampleRate,
              bytesPerSec: 176400,
              bits: 16,
              channels: this.header.channels
            }, adpcm.pcm);

            return decompiled;*/
            return this.reader.buffer;
          break;
          case AudioFileWaveEncoding.PCM:
            log.trace('getExportableData PCM return reader.buffer');
            return this.reader.buffer;
          break;
        }
      break;
      case AudioFileAudioType.MP3:
        log.trace('getExportableData MP3 return reader.buffer');
        return this.reader.buffer;
      break;
    }

    log.trace('getExportableData fallback empty');
    return new Uint8Array(0);

  }

  getExportExtension(){
    log.trace('getExportExtension', this.audioType);
    switch(this.audioType){
      case AudioFileAudioType.MP3:
        return 'mp3';
      case AudioFileAudioType.WAVE:
        return 'wav';
    }
  }

  export( args: IAudioFileExportOptions = {} ){
    log.trace('export entry', { file: args?.file != null });
    const options = Object.assign({
      file: null,
      onComplete: null,
      onError: null
    } as IAudioFileExportOptions, args);

    if(options.file != null){
      log.debug('export file path', options.file);

      // fs.writeFile(args.file, this.getExportableData(), (err) => {
      //   if (err) {
      //     if(typeof args.onError == 'function')
      //       args.onError(err);
      //   }else{
      //     if(typeof args.onComplete == 'function')
      //       args.onComplete();
      //   }
      //   console.log('AudioFile Saved');
      // });

    }

  }

}
