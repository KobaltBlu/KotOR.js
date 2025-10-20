import React from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTCEditorState } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import { SubTabHost, SubTab } from "../../SubTabHost";

export const TabUTCEditor = function(props: BaseTabProps){

  const tab: TabUTCEditorState = props.tab as TabUTCEditorState;

  const tabs: SubTab[] = [
    {
      id: 'basic',
      label: 'Basic',
      content: (
        <>
          <h3 style={{marginTop: '0'}}><i className="fa-solid fa-user"></i> Basic</h3>
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


        </>
      )
    },
    {
      id: 'stats',
      label: 'Stats',
      content: (
        <>
          <h3><i className="fa-solid fa-chart-bar"></i> Stats</h3>
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
        </>
      )
    },
    {
      id: 'skills',
      label: 'Skills',
      content: (
        <>
          <h3><i className="fa-solid fa-wrench"></i> Skills</h3>
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
        </>
      )
    },
    {
      id: 'advanced',
      label: 'Advanced',
      content: (
        <>
          <h3><i className="fa-solid fa-gear"></i> Advanced</h3>
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
        </>
      )
    },
    {
      id: 'feats',
      label: 'Feats',
      content: (
        <>
          <h3><i className="fa-solid fa-trophy"></i> Feats</h3>
            <hr />
            <div></div>
        </>
      )
    },
    {
      id: 'spells',
      label: 'Force Powers',
      content: (
        <>
          <h3><i className="fa-solid fa-hand-sparkles"></i> Force Powers</h3>
            <hr />
        </>
      )
    },
    {
      id: 'class',
      label: 'Class',
      content: (
        <>
          <h3><i className="fa-solid fa-graduation-cap"></i> Class</h3>
            <hr />
        </>
      )
    },
    {
      id: 'abilities',
      label: 'Special Abilities',
      content: (
        <>
          <h3><i className="fa-solid fa-star"></i> Special Abilities</h3>
            <hr />
        </>
      )
    },
    {
      id: 'scripts',
      label: 'Scripts',
      content: (
        <>
          <h3><i className="fa-solid fa-file-code"></i> Scripts</h3>
            <hr />
        </>
      )
    },
    {
      id: 'inventory',
      label: 'Inventory',
      content: (
        <>
          <h3><i className="fa-solid fa-suitcase"></i> Inventory</h3>
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
        </>
      )
    },
    {
      id: 'comments',
      label: 'Comments',
      content: (
        <>
          <h3><i className="fa-solid fa-comment"></i> Comments</h3>
          <hr />
        </>
      )
    }
  ];

  return (
    <SubTabHost
      tabs={tabs}
      defaultTab="basic"
      leftPanel={<UI3DRendererView context={tab.ui3DRenderer} />}
    />
  );

};