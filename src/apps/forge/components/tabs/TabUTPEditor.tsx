import React, { useState } from "react"
import { BaseTabProps } from "../../interfaces/BaseTabProps"
import { useEffectOnce } from "../../helpers/UseEffectOnce";

import { TabUTPEditorState } from "../../states/tabs";
import { UI3DRendererView } from "../UI3DRendererView";

export const TabUTPEditor = function(props: BaseTabProps){

  const tab: TabUTPEditorState = props.tab as TabUTPEditorState;
  const [selectedTab, setSelectedTab] = useState<string>('basic');

  return <>
<div style={{height: '100%'}}>
  <div className="vertical-tabs" style={{height: '100%'}}>
    <div className="vertical-tabs-nav navbar navbar-sidebar-wizard-horizontal" role="navigation">
      <ul className="tabs-menu" style={{textAlign: 'center'}}>
        <li className={`btn btn-tab ${selectedTab == 'basic' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('basic') }>Basic</a></li>
        <li className={`btn btn-tab ${selectedTab == 'lock' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('lock') }>Lock</a></li>
        <li className={`btn btn-tab ${selectedTab == 'advanced' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('advanced') }>Advanced</a></li>
        <li className={`btn btn-tab ${selectedTab == 'scripts' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('scripts') }>Scripts</a></li>
        <li className={`btn btn-tab ${selectedTab == 'description' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('description') }>Description</a></li>
        <li className={`btn btn-tab ${selectedTab == 'comments' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('comments') }>Comments</a></li>
        <li className={`btn btn-tab ${selectedTab == 'trap' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('trap') }>Trap</a></li>
      </ul>
    </div>
    <div className="vertical-tabs-container">
      <div className="editor-3d-preview" style={{position: 'absolute', top:0, bottom: 0, left: 0, right: '50%'}}>
        <UI3DRendererView context={tab.ui3DRenderer} />
      </div>
      <div className="tabs" style={{position: 'absolute', top:0, bottom: 0, left: '50%', right: 0, overflowY: 'auto', padding: '0 10px'}}>
        <div className="tab-pane" style={{display: (selectedTab == 'basic' ? 'block' : 'none')}}>
          <h3>Basic</h3>
          <hr />

          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Name</label></td>
                <td><input type="cexolocstring" /></td>
              </tr>
              <tr>
                <td><label>Tag</label></td>
                <td><input type="text" maxLength={16} /></td>
              </tr>
              <tr>
                <td><label>Appearance</label></td>
                <td><select className="form-select"></select></td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td>
                  <input type="checkbox" className="ui" /><label>Plot Item</label>
                </td>
                <td>
                  <input type="checkbox" className="ui" /><label>Static</label>
                </td>
                <td>
                  <input type="checkbox" className="ui" /><label>Min 1HP</label>
                </td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Hardness</label></td>
                <td><input type="number" min="0" /></td>
              </tr>
              <tr>
                <td><label>Hitpoints</label></td>
                <td><input type="number" min="0" /></td>
              </tr>
              <tr>
                <td><label>Forititude Save</label></td>
                <td><input type="number" min="0" /></td>
              </tr>
              <tr>
                <td><label>Reflex Save</label></td>
                <td><input type="number" min="0" /></td>
              </tr>
              <tr>
                <td><label>Will Save</label></td>
                <td><input type="number" min="0" /></td>
              </tr>
            </tbody>
          </table>

        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'lock' ? 'block' : 'none')}}>
          <h3>Lock</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td>
                  <input type="checkbox" className="ui" /><label className="checkbox-label">Locked</label>
                </td>
              </tr>
              <tr>
                <td>
                  <input type="checkbox" className="ui" /><label className="checkbox-label">Can be relocked</label>
                </td>
              <tr>
              </tr>
                <td>
                  <input type="checkbox" className="ui" /><label className="checkbox-label">Auto remove key after use</label>
                </td>
              </tr>
              <tr>
                <td>
                  <input type="checkbox" className="ui" /><label className="checkbox-label">Key required to unlock or lock</label>
                </td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Open Lock DC</label></td>
                <td><input type="number" /></td>
              </tr>
              <tr>
                <td><label>Close Lock DC</label></td>
                <td><input type="number" /></td>
              </tr>
              <tr>
                <td><label>Key Name</label></td>
                <td><input type="text" maxLength={16} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'advanced' ? 'block' : 'none')}}>
          <h3>Advanced</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Blueprint ResRef</label></td>
                <td><input type="text" disabled /></td>
              </tr>
              <tr>
                <td><label>Faction</label></td>
                <td><select className="form-select"></select></td>
              </tr>
              <tr>
                <td><label>Conversation</label></td>
                <td>
                  <input type="text" maxLength={16} style={{width: 'auto' }} />
                  <div className="ui-checkbox" style={{display: 'inline-block'}}>
                    <input type="checkbox" className="ui" />
                    <label>No Interrupt</label>
                  </div>
                </td>
              </tr>
              <tr>
                <td><label>Animation State</label></td>
                <td><input type="number" /></td>
              </tr>
              <tr>
                <td><label>Type</label></td>
                <td><input type="number" /></td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width:'100%'}}>
            <tbody>
              <tr>
                <td>
                  <input type="checkbox" className="ui" /><label>Has Inventory</label>
                </td>
                <td>
                  <input type="checkbox" className="ui" /><label>Party Interact</label>
                </td>
                <td>
                  <input type="checkbox" className="ui" /><label>Usable</label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'scripts' ? 'block' : 'none')}}>
          <h3>Scripts</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
                <tr>
                  <td><label>OnClosed</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnDamaged</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnDeath</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnDisarm</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnEndDialogue</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnHeartbeat</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnInvDisturbed</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnLock</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnMeleeAttacked</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnOpen</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnSpellCastAt</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnTrapTriggered</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnUnlock</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnUsed</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
                <tr>
                  <td><label>OnUserDefined</label></td>
                  <td><input type="text" maxLength={16} /></td>
                </tr>
            </tbody>
          </table>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'comments' ? 'block' : 'none')}}>
          <h3>Comments</h3>
          <hr />
          <label>Comments</label>
          <textarea ></textarea>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'description' ? 'block' : 'none')}}>
          <h3>Description</h3>
          <hr />
          <label>Description</label>
          <textarea data-type="cexolocstring" ></textarea>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'trap' ? 'block' : 'none')}}>
          <h3>Trap</h3>
          <hr />
        </div>
      </div>
    </div>
  </div>
</div>
  </>;

};