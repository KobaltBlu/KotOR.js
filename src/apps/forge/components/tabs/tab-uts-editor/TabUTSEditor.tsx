import React, { useRef, useState, useEffect, useCallback } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTSEditorState } from "../../../states/tabs";
import * as KotOR from "../../../KotOR";
import "../../../styles/tabs/tab-uts-editor.scss";
import { Button, Modal } from "react-bootstrap";
import { FileBrowserNode } from "../../../FileBrowserNode";
import { ForgeState } from "../../../states/ForgeState";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import { FormField } from "../../form-field/FormField";
import { ForgeSound } from "../../../module-editor/ForgeSound";

const SoundSelector = function(props: {onSelect: (resRef: string) => void, onClose: () => void}){
  const [soundResRef, setSoundResRef] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sounds, setSounds] = useState<FileBrowserNode[]>([]);
  const [soundMap, setSoundMap] = useState<Map<string, FileBrowserNode>>(new Map());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioBufferRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const nodes = [...ForgeState.resourceExplorerTab.getStreamSounds(), ...ForgeState.resourceExplorerTab.getBifSounds()].sort((a, b) => a.name.localeCompare(b.name));
    setSounds(nodes);
    setSoundMap(new Map(nodes.map( (node: FileBrowserNode) => [node.name, node] )));
  }, []);

  const close = () => {
    // Stop any playing audio
    if(audioBufferRef.current){
      audioBufferRef.current.disconnect();
      audioBufferRef.current = null;
    }
    setIsPlaying(false);
    setSoundResRef('');
    setSearchQuery('');
    props.onClose();
  }

  const select = () => {
    props.onSelect(soundResRef);
    close();
  }

  const handleSoundClick = (sound: FileBrowserNode) => {
    setSoundResRef(sound.name.split('.')[0]);
  }

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSoundResRef(e.target.value);
  }

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  }

  const previewSound = async () => {
    if(!soundResRef.trim()) return;
    
    try {
      // Stop any currently playing audio
      if(audioBufferRef.current){
        audioBufferRef.current.disconnect();
        audioBufferRef.current = null;
      }
      
      setIsPlaying(true);
      
      // Load and play the sound
      const data = await KotOR.AudioLoader.LoadSound(soundResRef);
      const audioCtx = KotOR.AudioEngine.GetAudioEngine().audioCtx;
      const buffer = await audioCtx.decodeAudioData(data.buffer as ArrayBuffer);
      
      const bufferSourceNode = audioCtx.createBufferSource();
      bufferSourceNode.buffer = buffer;
      bufferSourceNode.connect(KotOR.AudioEngine.sfxChannel.getGainNode());
      
      // Handle when playback ends
      bufferSourceNode.onended = () => {
        setIsPlaying(false);
        audioBufferRef.current = null;
      };
      
      bufferSourceNode.start(0, 0);
      audioBufferRef.current = bufferSourceNode;
      
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
    }
  }

  const stopPreview = () => {
    if(audioBufferRef.current){
      audioBufferRef.current.disconnect();
      audioBufferRef.current = null;
    }
    setIsPlaying(false);
  }

  // Filter sounds based on search query
  const filteredSounds = sounds.filter(sound => 
    sound.name.toLowerCase().includes(searchQuery)
  );

  return (
    <Modal 
      show={true} 
      onHide={props.onClose} 
      backdrop="static" 
      keyboard={false}
      size="lg"
    >
      <Modal.Header closeButton onClick={close}>
        <Modal.Title>Select Sound</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="sound-selector">
          {/* Search input */}
          <div className="mb-3">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search sounds..." 
              value={searchQuery}
              onChange={handleSearchInput}
            />
          </div>

          {/* File browser grid */}
          <div className="file-browser-container">
            <div className="file-browser-grid">
              {filteredSounds.map((sound, index) => (
                <div 
                  className={`file-browser-item ${soundResRef === sound.name ? 'selected' : ''}`}
                  key={`sound-item-${index}-${sound.name}`}
                  onClick={() => handleSoundClick(sound)}
                  title={sound.name}
                >
                  <div className="file-icon">
                    <i className="fa-solid fa-music"></i>
                  </div>
                  <div className="file-name">
                    {sound.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual input */}
          <div className="mt-3">
            <label className="form-label">Or enter ResRef manually:</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Enter Sound ResRef" 
              value={soundResRef} 
              onChange={handleManualInput} 
            />
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button 
          onClick={isPlaying ? stopPreview : previewSound}
          disabled={!soundResRef.trim()}
          className="me-2"
        >
          {isPlaying ? (
            <>
              <i className="fa-solid fa-stop me-1"></i>
              Stop Preview
            </>
          ) : (
            <>
              <i className="fa-solid fa-play me-1"></i>
              Preview
            </>
          )}
        </Button>
        <Button variant="primary" onClick={select} disabled={!soundResRef.trim()}>
          Select
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export const TabUTSEditor = function(props: BaseTabProps){

  const tab: TabUTSEditorState = props.tab as TabUTSEditorState;
  const [selectedTab, setSelectedTab] = useState<string>('basic');
  const [showSoundSelector, setShowSoundSelector] = useState<boolean>(false);

  const [locName, setLocName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [tag, setTag] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [sounds, setSounds] = useState<string[]>([]);

  const [active, setActive] = useState<boolean>(false);
  const [continuous, setContinuous] = useState<boolean>(false);
  const [priority, setPriority] = useState<number>(0);
  const [looping, setLooping] = useState<boolean>(false);
  const [random, setRandom] = useState<boolean>(false);
  const [randomPosition, setRandomPosition] = useState<boolean>(false);
  const [randomRangeX, setRandomRangeX] = useState<number>(0);
  const [randomRangeY, setRandomRangeY] = useState<number>(0);
  const [interval, setInterval] = useState<number>(0);
  const [intervalVariation, setIntervalVariation] = useState<number>(0);
  const [maxDistance, setMaxDistance] = useState<number>(0);
  const [minDistance, setMinDistance] = useState<number>(0);
  const [pitchVariation, setPitchVariation] = useState<number>(0);
  const [positional, setPositional] = useState<boolean>(false);
  const [elevation, setElevation] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0);
  const [volumeVariation, setVolumeVariation] = useState<number>(0);
  const [fixedVariance, setFixedVariance] = useState<number>(0);
  const [generatedType, setGeneratedType] = useState<number>(0);
  const [hours, setHours] = useState<number>(0);
  const [times, setTimes] = useState<number>(0);

  const audioBugfferRef = useRef<AudioBufferSourceNode|null>(null);

  const onBtnAddSound = (resRef: string) => {
    tab.addSound(resRef);
  }

  const onBtnRemoveSound = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    tab.removeSound(index);
  }

  const onBtnPlaySound = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    
    if(audioBugfferRef.current){
      audioBugfferRef.current.disconnect();
      audioBugfferRef.current = null;
    }

    const resRef = sounds[index];
    KotOR.AudioLoader.LoadSound(resRef).then((data: any) => {
      KotOR.AudioEngine.GetAudioEngine().audioCtx.decodeAudioData(data.buffer as ArrayBuffer ).then((buffer: AudioBuffer) => {
        const bufferSourceNode = KotOR.AudioEngine.GetAudioEngine().audioCtx.createBufferSource();
        bufferSourceNode.buffer = buffer;
        bufferSourceNode.connect(KotOR.AudioEngine.sfxChannel.getGainNode());
        bufferSourceNode.start(0, 0);
        audioBugfferRef.current = bufferSourceNode;
      });
    });
  }

  const onBtnStopSound = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    if(audioBugfferRef.current){
      audioBugfferRef.current.disconnect();
      audioBugfferRef.current = null;
    }
  }

  const onBtnMoveUpSound = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    tab.moveSoundUp(index);
  }

  const onBtnMoveDownSound = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    tab.moveSoundDown(index);
  }

  // Helper functions using ForgeSound methods
  const onUpdateResRefField = (setter: (value: string) => void, property: keyof ForgeSound) => 
    tab.sound.createResRefFieldHandler(setter, property, tab.sound, tab);
  
  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof ForgeSound) => 
    tab.sound.createCExoStringFieldHandler(setter, property, tab.sound, tab);
  
  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof ForgeSound) => 
    tab.sound.createCExoLocStringFieldHandler(setter, property, tab.sound, tab);
  
  const onUpdateNumberField = (setter: (value: number) => void, property: keyof ForgeSound, parser: (value: number) => number = (v) => v) => 
    tab.sound.createNumberFieldHandler(setter, property, tab.sound, tab, parser);
  
  const onUpdateBooleanField = (setter: (value: boolean) => void, property: keyof ForgeSound) => 
    tab.sound.createBooleanFieldHandler(setter, property, tab.sound, tab);

  const onSoundChange = useCallback(() => {
    if(!tab || !tab.sound || !tab.blueprint) return;
    setLocName(tab.sound.locName);
    setTag(tab.sound.tag);
    setComments(tab.sound.comment || '');
    setSounds([...tab.sound.soundResRefs]);
    setActive(tab.sound.active);
    setLooping(tab.sound.looping);
    setRandom(tab.sound.random);
    setRandomPosition(tab.sound.randomPosition);
    setInterval(tab.sound.interval);
    setIntervalVariation(tab.sound.intervalVariation);
    setMaxDistance(tab.sound.maxDistance);
    setMinDistance(tab.sound.minDistance);
    setPitchVariation(tab.sound.pitchVariation);
    setPositional(tab.sound.positional);
    setElevation(tab.sound.elevation);
    setVolume(tab.sound.volume);
    setVolumeVariation(tab.sound.volumeVariation);
    setHours(tab.sound.hours);
    setTimes(tab.sound.times);
    setRandomRangeX(tab.sound.randomRangeX);
    setRandomRangeY(tab.sound.randomRangeY);
    setContinuous(tab.sound.continuous);
    setPriority(tab.sound.priority);
  }, [tab]);

  const toggleSoundType = (type: string) => {
    if(type == 'global'){
      tab.sound.positional = !tab.sound.positional;
      if(!tab.sound.positional){
        tab.sound.randomPosition = false;
      }
    }else if(type == 'positional'){
      tab.sound.positional = !tab.sound.positional;
      if(!tab.sound.positional){
        tab.sound.randomPosition = false;
      }
    }else if(type == 'randomPosition'){
      tab.sound.randomPosition = !tab.sound.randomPosition;
      tab.sound.positional = true;
    }
    setPositional(tab.sound.positional);
    setRandomPosition(tab.sound.randomPosition);
    tab.sound.calculatePriority();
    setPriority(tab.sound.priority);
    tab.updateFile();
  }

  const onUpdateLooping = (looping: boolean) => {
    setLooping(looping);
    tab.sound.looping = looping;
    tab.sound.calculatePriority();
    setPriority(tab.sound.priority);
    tab.updateFile();
  }

  useEffect(() => {
    if(!tab) return;
    onSoundChange();
    tab.addEventListener('onEditorFileLoad', onSoundChange);
    tab.addEventListener('onSoundChange', onSoundChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onSoundChange);
      tab.removeEventListener('onSoundChange', onSoundChange);
    };
  }, [tab, onSoundChange]);

  return <>
<div style={{height: '100%'}}>
  <div className="vertical-tabs" style={{height: '100%'}}>
    <div className="vertical-tabs-nav navbar navbar-sidebar-wizard-horizontal" role="navigation">
      <ul className="tabs-menu" style={{textAlign: 'center'}}>
        <li className={`btn btn-tab ${selectedTab == 'basic' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('basic') }>Basic</a></li>
        <li className={`btn btn-tab ${selectedTab == 'position' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('position') }>Position</a></li>
      </ul>
    </div>
    <div className="vertical-tabs-container">
      <div className="tabs" style={{position: 'absolute', top:0, bottom: 0, left: 0, right: 0, overflowY: 'auto', padding: '0 10px'}}>
        <div className="tab-pane" style={{display: (selectedTab == 'basic' ? 'block' : 'none')}}>
          <h3>Basic</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Emitter</label></td>
                <td>
                  <div className="btn-group mb-2">
                    <button className="btn btn-primary" onClick={() => tab.startEmitter()}>Start</button>
                    <button className="btn btn-primary" onClick={() => tab.stopEmitter()}>Stop</button>
                  </div>
                </td>
              </tr>
              <FormField 
                label="Name" 
                info="The display name of the door/trigger. This is what players will see in-game and can be localized for different languages."
              >
                <CExoLocStringEditor 
                  value={locName}
                  onChange={onUpdateCExoLocStringField(setLocName, 'locName')}
                />
              </FormField>
              <tr>
                <td><label>Tag</label></td>
                <td><input type="text" maxLength={16} value={tag} onChange={onUpdateResRefField(setTag, 'tag')} /></td>
              </tr>
              <tr>
                <td><label>Comments</label></td>
                <td><textarea value={comments} onChange={onUpdateCExoStringField(setComments, 'comment')}></textarea></td>
              </tr>
              <tr>
                <td><label>Active</label></td>
                <td><input type="checkbox" checked={active} onChange={onUpdateBooleanField(setActive, 'active')} /></td>
              </tr>
              <tr>
                <td><label>Priority</label></td>
                <td><label>{KotOR.SWRuleSet.priorityGroups[priority]?.label}</label></td>
              </tr>
              <tr>
                <td>
                  <label>Sounds</label>
                </td>
                <td>
                  <div className="btn-group mb-2">
                    <button className="btn btn-primary" onClick={(e) => setShowSoundSelector(true)}><i className="fa-solid fa-plus"></i> Add Sound</button>
                  </div>
                  {showSoundSelector && (
                    <div className="sound-selector">
                      <SoundSelector onSelect={onBtnAddSound} onClose={() => setShowSoundSelector(false)} />
                    </div>
                  )}
                  <div className="sound-items">
                    {sounds.map((sound, index) => (
                      <div className="sound-item" key={`sound-item-${index}-${sound}`}>
                        <label>{sound}</label>
                        <div className="sound-item-buttons">
                          <button className="btn btn-primary" onClick={(e) => onBtnPlaySound(e, index)} title="Play Sound"><i className="fa-solid fa-play"></i></button>
                          <button className="btn btn-primary" onClick={(e) => onBtnStopSound(e, index)} title="Stop Sound"><i className="fa-solid fa-stop"></i></button>
                          <button className="btn btn-primary" onClick={(e) => onBtnMoveUpSound(e, index)} title="Move Up"><i className="fa-solid fa-up-long"></i></button>
                          <button className="btn btn-primary" onClick={(e) => onBtnMoveDownSound(e, index)} title="Move Down"><i className="fa-solid fa-down-long"></i></button>
                          <button className="btn btn-primary" onClick={(e) => onBtnRemoveSound(e, index)} title="Remove Sound"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <label>Volume</label>
                </td>
                <td>
                  <div className="d-flex">
                    <label className="form-label pr-2" style={{width: '100px'}}>{volume}</label>
                    <input type="range" min="0" max="127" step="1" value={volume} onChange={(e) => { setVolume(Number(e.target.value)); tab.sound.volume = Number(e.target.value); tab.updateFile(); }} title={volume.toString()} />
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <label>Volume Variation</label>
                </td>
                <td>
                  <div className="d-flex">
                    <label className="form-label pr-2" style={{width: '100px'}}>{volumeVariation}</label>
                    <input type="range" min="0" max="127" step="1" value={volumeVariation} onChange={(e) => { setVolumeVariation(Number(e.target.value)); tab.sound.volumeVariation = Number(e.target.value); tab.updateFile(); }} title={volumeVariation.toString()} />
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <label>Pitch Variation</label>
                </td>
                <td>
                  <div className="d-flex">
                    <label className="form-label pr-2" style={{width: '100px'}}>{pitchVariation.toFixed(2)}</label>
                    <input type="range" min="0" max="1" step="0.01" value={pitchVariation} onChange={(e) => { setPitchVariation(Number(e.target.value)); tab.sound.pitchVariation = Number(e.target.value); tab.updateFile(); }} title={pitchVariation.toFixed(2)} />
                  </div>
                </td>
              </tr>
              <tr>
                <td><label>Interval</label></td>
                <td>
                  <div className="d-flex">
                    <label className="form-label pr-2" style={{width: '100px'}}>{interval}</label>
                    <input type="number" min="0" step="0.01" value={interval} onChange={onUpdateNumberField(setInterval, 'interval')} title={interval.toString()} />
                  </div>
                </td>
              </tr>
              <tr>
                <td><label>Interval Variation</label></td>
                <td>
                  <div className="d-flex">
                    <label className="form-label pr-2" style={{width: '100px'}}>{intervalVariation}</label>
                    <input type="number" min="0" step="0.01" value={intervalVariation} onChange={onUpdateNumberField(setIntervalVariation, 'intervalVariation')} title={intervalVariation.toString()} />
                  </div>
                </td>
              </tr>
              <tr>
                <td><label>Play Style</label></td>
                <td>
                  <div className="btn-group mb-2">
                    <button className={`btn ${!looping ? 'btn-primary active' : 'btn-default'}`} onClick={() => { onUpdateLooping(false); }}>Single Shot</button>
                    <button className={`btn ${looping ? 'btn-primary active' : 'btn-default'}`} onClick={() => { onUpdateLooping(true); }}>Looping</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td><label>Play Order</label></td>
                <td>
                  <div className="btn-group mb-2">
                    <button className={`btn ${!random ? 'btn-primary active' : 'btn-default'}`} onClick={() => { tab.sound.random = false; setRandom(tab.sound.random); tab.updateFile(); }}>Sequential</button>
                    <button className={`btn ${random ? 'btn-primary active' : 'btn-default'}`} onClick={() => { tab.sound.random = true; setRandom(tab.sound.random); tab.updateFile(); }}>Random</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'position' ? 'block' : 'none')}}>
          <h3>Position</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td></td>
                <td style={{textAlign: 'center'}}>
                  {/* position typebutton group */}
                  <div className="btn-group align-center mb-2">
                    <button className={`btn ${positional == false ? 'btn-primary active' : 'btn-default'}`} onClick={() => toggleSoundType('global')}>Area-Wide</button>
                    <button className={`btn ${positional == true ? 'btn-primary active' : 'btn-default'}`} onClick={() => toggleSoundType('positional')}>Positional</button>
                    <button className={`btn ${randomPosition == true ? 'btn-primary active' : 'btn-default'}`} onClick={() => toggleSoundType('randomPosition')}>Random Position</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td><label>Min Distance</label></td>
                <td><input type="number" min="0" step="0.01" value={minDistance} onChange={onUpdateNumberField(setMinDistance, 'minDistance')} disabled={!positional} /></td>
              </tr>
              <tr>
                <td><label>Max Distance</label></td>
                <td><input type="number" min="0" step="0.01" value={maxDistance} onChange={onUpdateNumberField(setMaxDistance, 'maxDistance')} disabled={!positional} /></td>
              </tr>
              <tr>
                <td><label>Elevation</label></td>
                <td><input type="number" step="0.01" value={elevation} onChange={onUpdateNumberField(setElevation, 'elevation')} disabled={!positional} /></td>
              </tr>
              <tr>
                <td><label>Random Range X</label></td>
                <td><input type="number" min="0" step="0.01" value={randomRangeX} onChange={onUpdateNumberField(setRandomRangeX, 'randomRangeX')} disabled={!randomPosition} /></td>
              </tr>
              <tr>
                <td><label>Random Range Y</label></td>
                <td><input type="number" min="0" step="0.01" value={randomRangeY} onChange={onUpdateNumberField(setRandomRangeY, 'randomRangeY')} disabled={!randomPosition} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
  </>;
};