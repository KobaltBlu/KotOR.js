import React, { useState } from "react"
import { BaseTabProps } from "../../interfaces/BaseTabProps"

import { useEffectOnce } from "../../helpers/UseEffectOnce";

import * as KotOR from "../../KotOR";
import { TabUTCEditorState } from "../../states/tabs";
import { UI3DRendererView } from "../UI3DRendererView";

export const TabUTCEditor = function(props: BaseTabProps){

  const tab: TabUTCEditorState = props.tab as TabUTCEditorState;
  const [selectedTab, setSelectedTab] = useState<string>('basic');

  return <>
  <div style={{height: '100%'}}>
    <div className="vertical-tabs" style={{height: '100%'}}>
      <div className="vertical-tabs-nav navbar navbar-sidebar-wizard-horizontal" role="navigation">
        <ul className="tabs-menu" style={{textAlign: 'center'}}>
          <li className={`btn btn-tab ${selectedTab == 'basic' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('basic') }>Basic</a></li>
          <li className={`btn btn-tab ${selectedTab == 'stats' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('stats') }>Stats</a></li>
          <li className={`btn btn-tab ${selectedTab == 'skills' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('skills') }>Skills</a></li>
          <li className={`btn btn-tab ${selectedTab == 'advanced' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('advanced') }>Advanced</a></li>
          <li className={`btn btn-tab ${selectedTab == 'feats' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('feats') }>Feats</a></li>
          <li className={`btn btn-tab ${selectedTab == 'spells' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('spells') }>Force Powers</a></li>
          <li className={`btn btn-tab ${selectedTab == 'class' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('class') }>Class</a></li>
          <li className={`btn btn-tab ${selectedTab == 'abilities' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('abilities') }>Special Abilities</a></li>
          <li className={`btn btn-tab ${selectedTab == 'scripts' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('scripts') }>Scripts</a></li>
          <li className={`btn btn-tab ${selectedTab == 'inventory' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('inventory') }>Inventory</a></li>
          <li className={`btn btn-tab ${selectedTab == 'comments' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('comments') }>Comments</a></li>
        </ul>
      </div>
      <div className="vertical-tabs-container">
        <div className="editor-3d-preview" style={{position: 'absolute', top:0, bottom: 0, left: '0', right: '50%'}}>
          <UI3DRendererView context={tab.ui3DRenderer} />
        </div>
        <div id="editor-content" className="tabs" style={{position: 'absolute', top:0, bottom: 0, left: '50%', right: 0, overflowY: 'auto', padding: '0 10px'}}>
          <div className="tab-pane" style={{display: (selectedTab == 'basic' ? 'block' : 'none'), padding: '10px'}}>
            <h3 style={{marginTop: '0'}}>Basic</h3>
            <hr />
            <fieldset>
              <legend>Profile</legend>
              <table>
                <tbody>
                    <tr>
                      <td><label>First Name</label></td>
                      <td><input type="text" disabled /></td>
                    </tr>
                    <tr>
                      <td><label>Last Name</label></td>
                      <td><input type="text" disabled /></td>
                    </tr>
                    <tr>
                      <td><label>Tag</label></td>
                      <td><input type="text" maxLength={16} /></td>
                    </tr>
                    <tr>
                      <td><label>Race</label></td>
                      <td><select className="form-select"></select></td>
                    </tr>
                    <tr>
                      <td><label>Appearance</label></td>
                      <td><select className="form-select"></select></td>
                    </tr>
                    <tr>
                      <td><label>Phenotype</label></td>
                      <td><select className="form-select"></select></td>
                    </tr>
                    <tr>
                      <td><label>Gender</label></td>
                      <td><select className="form-select"></select></td>
                    </tr>
                    <tr>
                      <td><label>Description</label></td>
                      <td><input type="text" /></td>
                    </tr>
                    <tr>
                      <td><label>BodyBag</label></td>
                      <td><select className="form-select"></select></td>
                    </tr>
                </tbody>
              </table>
            </fieldset>

            <fieldset>
              <legend>Portrait</legend>
              <select className="form-select"></select>
            </fieldset>

            <fieldset>
              <legend>Conversation</legend>
              <table style={{width: '100%'}}>
                <tbody>
                  <tr>
                    <td><input type="text" /></td>
                    <td><input type="checkbox" /><label>No Interrupt</label></td>
                  </tr>
                </tbody>
              </table>
          </fieldset>

            
          </div>
          <div className="tab-pane" style={{display: (selectedTab == 'stats' ? 'block' : 'none')}}>
            <h3>Stats</h3>
            <hr />
            <fieldset>
              <legend>Ability Scores</legend>
              <table style={{width: '100%'}}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><label>Strength</label></td>
                    <td><input type="number" min="0" /></td>
                  </tr>

                  <tr>
                    <td><label>Dexterity</label></td>
                    <td><input type="number" min="0" /></td>
                  </tr>

                  <tr>
                    <td><label>Constitution</label></td>
                    <td><input type="number" min="0" /></td>
                  </tr>

                  <tr>
                    <td><label>Intelligence</label></td>
                    <td><input type="number" min="0" /></td>
                  </tr>

                  <tr>
                    <td><label>Wisdom</label></td>
                    <td><input type="number" min="0" /></td>
                  </tr>

                  <tr>
                    <td><label>Charisma</label></td>
                    <td><input type="number" min="0" /></td>
                  </tr>
                </tbody>
              </table>
            </fieldset>

            <fieldset>
              <legend>Saves</legend>
              <table style={{width: '100%'}}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><label>Fortitude</label></td>
                    <td><input type="number" min="0" /></td>
                  </tr>
                  <tr>
                    <td><label>Reflex</label></td>
                    <td><input type="number" min="0" /></td>
                  </tr>
                  <tr>
                    <td><label>Will</label></td>
                    <td><input type="number" min="0" /></td>
                  </tr>
                </tbody>
              </table>
            </fieldset>
            
            <table>
              <tr>
                <td style={{width: '50%'}}>
                  <fieldset>
                    <legend>Armor Class</legend>
                    <label>Natural AC</label>
                    <input type="number" min="0" />
                  </fieldset>
                  <fieldset>
                    <legend>Speed</legend>
                    <label>Movement Rate</label>
                    <select className="form-select"></select>
                  </fieldset>
                </td>
                <td style={{width: '50%'}}>
                  <fieldset>
                    <legend>Hit Points</legend>
                    <label>Base Hit Points</label>
                    <input type="number" min="0" />
        
                    <label>Current Hit Points</label>
                    <input type="number" min="0" />
        
                    <label>Max Hit Points</label>
                    <input type="number" min="0" />
                  </fieldset>
                </td>
              </tr>
            </table>
          </div>

          <div className="tab-pane" style={{display: (selectedTab == 'skills' ? 'block' : 'none')}}>
            <h3>Skills</h3>
            <hr />

            <label>Computer Use</label>
            <input type="number" min="0" />

            <label>Demolitions</label>
            <input type="number" min="0" />

            <label>Stealth</label>
            <input type="number" min="0" />

            <label>Awareness</label>
            <input type="number" min="0" />

            <label>Persuade</label>
            <input type="number" min="0" />

            <label>Repair</label>
            <input type="number" min="0" />

            <label>Security</label>
            <input type="number" min="0" />

            <label>Treat Injury</label>
            <input type="number" min="0" />

          </div>
          <div className="tab-pane" style={{display: (selectedTab == 'advanced' ? 'block' : 'none')}}>
            <h3>Advanced</h3>
            <hr />

            <table style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td><label>Blueprint ResRef</label></td>
                  <td><input type="text" /></td>
                </tr>
              </tbody>
            </table>

            <fieldset>
              <legend>Interface</legend>
              <table style={{width: '100%'}}>
                <tbody>
                  <tr>
                    <td><label>Disarmable</label></td>
                    <td><input type="checkbox" /></td>
                  </tr>
                  <tr>
                    <td><label>Plot</label></td>
                    <td><input type="checkbox" /></td>
                  </tr>
                  <tr>
                    <td><label>No Permanent Death</label></td>
                    <td><input type="checkbox" /></td>
                  </tr>
                  <tr>
                    <td><label>Is PC</label></td>
                    <td><input type="checkbox" /></td>
                  </tr>
                  <tr>
                    <td><label>Minimum 1 HP</label></td>
                    <td><input type="checkbox" /></td>
                  </tr>
                  <tr>
                    <td><label>Subrace</label></td>
                    <td><select className="form-select"></select></td>
                  </tr>
                </tbody>
              </table>
            </fieldset>

            <table style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td>
                    <fieldset>
                      <legend>Challenge Rating</legend>
                      <input type="number" />
                    </fieldset>
                  </td>
                  <td>
                    <fieldset>
                      <legend>Sound Set</legend>
                      <select className="form-select"></select>
                    </fieldset>
                  </td>
                </tr>
                <tr>
                  <td>
                    <fieldset>
                      <legend>Faction</legend>
                      <select className="form-select"></select>
                    </fieldset>
                  </td>
                  <td>
                    <fieldset>
                      <legend>Perception Range</legend>
                      <select className="form-select"></select>
                    </fieldset>
                  </td>
                </tr>
              </tbody>
            </table>

          </div>
          <div className="tab-pane" style={{display: (selectedTab == 'feats' ? 'block' : 'none')}}>
            <h3>Feats</h3>
            <hr />
            <div></div>
          </div>
          <div className="tab-pane" style={{display: (selectedTab == 'spells' ? 'block' : 'none')}}>
            <h3>Force</h3>
            <hr />
          </div>
          <div className="tab-pane" style={{display: (selectedTab == 'class' ? 'block' : 'none')}}>
            <h3>Class</h3>
            <hr />
          </div>
          <div className="tab-pane" style={{display: (selectedTab == 'abilities' ? 'block' : 'none')}}>
            <h3>Special</h3>
            <hr />
          </div>
          <div className="tab-pane" style={{display: (selectedTab == 'scripts' ? 'block' : 'none')}}>
            <h3>Scripts</h3>
            <hr />
          </div>
          <div className="tab-pane" style={{display: (selectedTab == 'inventory' ? 'block' : 'none')}}>
            <h3>Inventory</h3>
            <hr />
            <div className="iSlots">
              <div className="iSlot texture-canvas" data-type="512"  data-texture="iimplant"></div>
              <div className="iSlot texture-canvas" data-type="1"    data-texture="ihead"></div>
              <div className="iSlot texture-canvas" data-type="8"    data-texture="ihands"></div>
              <div className="iSlot texture-canvas" data-type="128"  data-texture="iforearm_l"></div>
              <div className="iSlot texture-canvas" data-type="2"    data-texture="iarmor"></div>
              <div className="iSlot texture-canvas" data-type="256"  data-texture="iforearm_r"></div>
              <div className="iSlot texture-canvas" data-type="32"   data-texture="ihand_l"></div>
              <div className="iSlot texture-canvas" data-type="1024" data-texture="ibelt"></div>
              <div className="iSlot texture-canvas" data-type="16"   data-texture="ihand_r"></div>
            </div>
          </div>
          <div className="tab-pane" style={{display: (selectedTab == 'comments' ? 'block' : 'none')}}>
            <h3>Comments</h3>
            <hr />
          </div>
        </div>
      </div>
    </div>
  </div>
  </>;

};