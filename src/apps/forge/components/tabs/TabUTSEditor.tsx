import React, { useRef, useState } from "react"
import { BaseTabProps } from "../../interfaces/BaseTabProps"
import { TabUTSEditorState } from "../../states/tabs";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import * as KotOR from "../../KotOR";
import "../../styles/tabs/tab-uts-editor.scss";
import { Button, Modal } from "react-bootstrap";
import { FileBrowserNode } from "../../FileBrowserNode";
import { ForgeState } from "../../states/ForgeState";

const SoundSelector = function(props: {onSelect: (resRef: string) => void, onClose: () => void}){
  const [soundResRef, setSoundResRef] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sounds, setSounds] = useState<FileBrowserNode[]>([]);
  const [soundMap, setSoundMap] = useState<Map<string, FileBrowserNode>>(new Map());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioBufferRef = useRef<AudioBufferSourceNode | null>(null);

  useEffectOnce( () => {
    const nodes = [...ForgeState.resourceExplorerTab.getStreamSounds(), ...ForgeState.resourceExplorerTab.getBifSounds()].sort((a, b) => a.name.localeCompare(b.name));
    setSounds(nodes);
    setSoundMap(new Map(nodes.map( (node: FileBrowserNode) => [node.name, node] )));
  });

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

  const [name, setName] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [sounds, setSounds] = useState<string[]>([]);

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

  const onUpdateName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    tab.moduleSound.name = e.target.value;
  }
  const onUpdateTag = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTag(e.target.value);
    tab.moduleSound.tag = e.target.value;
  }
  const onUpdateComments = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComments(e.target.value);
    // tab.moduleSound.comments = e.target.value;
  }

  const onSoundChange = () => {
    console.log('onSoundChange', tab);
    if(!tab.moduleSound) return;
    setName(tab.moduleSound.name);
    setTag(tab.moduleSound.tag);
    setComments('');
    setSounds([...tab.moduleSound.soundResRefs]);
  }

  useEffectOnce( () => {
    tab.addEventListener('onEditorFileLoad', onSoundChange);
    tab.addEventListener('onSoundChange', onSoundChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onSoundChange);
      tab.removeEventListener('onSoundChange', onSoundChange);
    }
  });

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
                <td><label>Name</label></td>
                <td><input type="cexolocstring" value={name} onChange={onUpdateName} /></td>
              </tr>
              <tr>
                <td><label>Tag</label></td>
                <td><input type="text" maxLength={16} value={tag} onChange={onUpdateTag} /></td>
              </tr>
              <tr>
                <td><label>Comments</label></td>
                <td><textarea value={comments} onChange={onUpdateComments}></textarea></td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td style={{width: '33.33%'}}>
                  <label>Sounds</label>
                </td>
                <td style={{width: '66.66%'}}>
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
            </tbody>
          </table>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'position' ? 'block' : 'none')}}>
          <h3>Position</h3>
          <hr />
          {/* position typebutton group */}
          <div className="btn-group">
            <button className="btn btn-primary">Global</button>
            <button className="btn btn-primary">Positional</button>
            <button className="btn btn-primary">Random Position</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  </>;
};