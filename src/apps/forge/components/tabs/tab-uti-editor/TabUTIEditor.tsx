import React, { useState, useCallback } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabUTIEditorState, ItemPropertyEntry } from "../../../states/tabs";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import * as KotOR from "../../../KotOR";
import { FormField } from "../../form-field/FormField";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";

export const TabUTIEditor = function(props: BaseTabProps){

  const tab: TabUTIEditorState = props.tab as TabUTIEditorState;
  const [selectedTab, setSelectedTab] = useState<string>('basic');

  const [locName, setLocName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [description, setDescription] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [descIdentified, setDescIdentified] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [tag, setTag] = useState<string>('');
  const [templateResRef, setTemplateResRef] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [paletteID, setPaletteID] = useState<number>(0);
  const [baseItem, setBaseItem] = useState<number>(0);
  const [addCost, setAddCost] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [charges, setCharges] = useState<number>(0);
  const [stackSize, setStackSize] = useState<number>(1);
  const [plot, setPlot] = useState<boolean>(false);
  const [stolen, setStolen] = useState<boolean>(false);
  const [properties, setProperties] = useState<ItemPropertyEntry[]>([]);
  const [identified, setIdentified] = useState<boolean>(true);
  const [modelVariation, setModelVariation] = useState<number>(0);
  const [upgradeLevel, setUpgradeLevel] = useState<number>(0);

  const sanitizeResRef = (value: string) => value.substring(0, 16).toLowerCase().replace(/[^a-z0-9_]/g, '');
  const clampByte = (value: number) => Math.max(0, Math.min(255, value));
  const clampWord = (value: number) => Math.max(1, Math.min(0xFFFF, value || 1));

  const updateTab = (updater: () => void) => {
    if(!tab) return;
    updater();
    tab.updateFile();
  };

  const onItemChange = useCallback(() => {
    setLocName(tab.locName);
    setDescription(tab.description);
    setDescIdentified(tab.descIdentified);
    setTag(tab.tag);
    setTemplateResRef(tab.templateResRef);
    setComment(tab.comment);
    setPaletteID(tab.paletteID);
    setBaseItem(tab.baseItem);
    setAddCost(tab.addCost);
    setCost(tab.cost);
    setCharges(tab.charges);
    setStackSize(tab.stackSize);
    setPlot(tab.plot);
    setStolen(tab.stolen);
    setProperties(tab.properties.map((prop) => ({...prop})));
    setIdentified(tab.identified);
    setModelVariation(tab.modelVariation);
    setUpgradeLevel(tab.upgradeLevel);
  }, [tab]);

  useEffectOnce(() => {
    onItemChange();
    tab.addEventListener('onEditorFileChange', onItemChange);
    return () => {
      tab.removeEventListener('onEditorFileChange', onItemChange);
    };
  });

  const onUpdateLocName = (value: KotOR.CExoLocString) => {
    setLocName(value);
    updateTab(() => { tab.locName = value; });
  }

  const onUpdateDescription = (value: KotOR.CExoLocString) => {
    setDescription(value);
    updateTab(() => { tab.description = value; });
  }

  const onUpdateDescIdentified = (value: KotOR.CExoLocString) => {
    setDescIdentified(value);
    updateTab(() => { tab.descIdentified = value; });
  }

  const onUpdateTag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.substring(0, 32);
    setTag(value);
    updateTab(() => { tab.tag = value; });
  }

  const onUpdateComment = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    updateTab(() => { tab.comment = value; });
  }

  const onUpdateIdentified = (value: boolean) => {
    setIdentified(value);
    updateTab(() => { tab.identified = value; });
  }

  const onUpdateModelVariation = (value: number) => {
    setModelVariation(value);
    updateTab(() => { tab.modelVariation = value; });
  }

  const onUpdateUpgradeLevel = (value: number) => {
    setUpgradeLevel(value);
    updateTab(() => { tab.upgradeLevel = value; });
  }

  const onUpdateNumberField = (setter: (value: number) => void, property: keyof TabUTIEditorState, parser: (value: number) => number = (v) => v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value) || 0;
    const value = parser(raw);
    setter(value);
    updateTab(() => { (tab as any)[property] = value; });
  }

  const onUpdateByteField = (setter: (value: number) => void, property: keyof TabUTIEditorState) => onUpdateNumberField(setter, property, clampByte);
  const onUpdateWordField = (setter: (value: number) => void, property: keyof TabUTIEditorState) => onUpdateNumberField(setter, property, clampWord);

  const updateBooleanField = (setter: (value: boolean) => void, property: keyof TabUTIEditorState) => (value: boolean) => {
    setter(value);
    updateTab(() => { (tab as any)[property] = value; });
  }

  const updateProperties = (next: ItemPropertyEntry[]) => {
    setProperties(next);
    updateTab(() => { tab.properties = next.map((prop) => ({...prop})); });
  }

  const addProperty = () => {
    const newProp: ItemPropertyEntry = {
      chanceAppear: 100,
      costTable: 0,
      costValue: 0,
      param1: 255,
      param1Value: 0,
      propertyName: 0,
      subtype: 0
    };
    updateProperties([...properties, newProp]);
  }

  const removeProperty = (index: number) => {
    updateProperties(properties.filter((_, idx) => idx !== index));
  }

  const onPropertyFieldChange = (index: number, field: keyof ItemPropertyEntry, value: number) => {
    const next = properties.map((prop, idx) => idx === index ? {...prop, [field]: value} : prop);
    updateProperties(next);
  }

  const renderPropertyRow = (property: ItemPropertyEntry, index: number) => (
    <tr key={`item-property-${index}`}>
      <td>
        <input type="number" min={0} max={255} value={property.propertyName} onChange={(e) => onPropertyFieldChange(index, 'propertyName', parseInt(e.target.value) || 0)} />
      </td>
      <td>
        <input type="number" min={0} max={65535} value={property.subtype} onChange={(e) => onPropertyFieldChange(index, 'subtype', parseInt(e.target.value) || 0)} />
      </td>
      <td>
        <input type="number" min={0} max={255} value={property.costTable} onChange={(e) => onPropertyFieldChange(index, 'costTable', parseInt(e.target.value) || 0)} />
      </td>
      <td>
        <input type="number" min={0} max={65535} value={property.costValue} onChange={(e) => onPropertyFieldChange(index, 'costValue', parseInt(e.target.value) || 0)} />
      </td>
      <td>
        <input type="number" min={0} max={255} value={property.param1} onChange={(e) => onPropertyFieldChange(index, 'param1', clampByte(parseInt(e.target.value) || 0))} />
      </td>
      <td>
        <input type="number" min={0} max={255} value={property.param1Value} onChange={(e) => onPropertyFieldChange(index, 'param1Value', clampByte(parseInt(e.target.value) || 0))} />
      </td>
      <td>
        <button className="btn btn-sm btn-danger" onClick={() => removeProperty(index)}>
          <i className="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  );

  return (
    <div className="tab-uti-editor" style={{height: '100%'}}>
      <div className="vertical-tabs" style={{height: '100%'}}>
        <div className="vertical-tabs-nav navbar navbar-sidebar-wizard-horizontal" role="navigation">
          <ul className="tabs-menu" style={{textAlign: 'center'}}>
            <li className={`btn btn-tab ${selectedTab == 'basic' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('basic') }>Basic</a></li>
            <li className={`btn btn-tab ${selectedTab == 'description' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('description') }>Descriptions</a></li>
            <li className={`btn btn-tab ${selectedTab == 'properties' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('properties') }>Properties</a></li>
          </ul>
        </div>
        <div className="vertical-tabs-container">
          <div className="tabs" style={{position: 'absolute', top:0, bottom: 0, left: 0, right: 0, overflowY: 'auto', padding: '0 10px'}}>
            <div className="tab-pane" style={{display: (selectedTab == 'basic' ? 'block' : 'none')}}>
              <h3>Basic</h3>
              <hr />
              <table style={{ width: '100%' }}>
                <tbody>
                  <FormField label="Name" info="Display name shown in-game once identified.">
                    <CExoLocStringEditor value={locName} onChange={onUpdateLocName} />
                  </FormField>
                  <FormField label="Template ResRef" info="Internal resource reference (max 16 chars, lowercase).">
                    <input type="text" value={templateResRef} disabled={true} maxLength={16} />
                  </FormField>
                  <FormField label="Tag" info="Unique identifier (max 32 chars).">
                    <input type="text" value={tag} onChange={onUpdateTag} maxLength={32} />
                  </FormField>
                  <FormField label="Comment" info="Designer-only notes.">
                    <textarea value={comment} onChange={onUpdateComment} rows={2} />
                  </FormField>
                  <FormField label="Base Item" info="Index into baseitems.2da determining model type and behaviour.">
                    <input type="number" min={0} value={baseItem} onChange={onUpdateNumberField(setBaseItem, 'baseItem')} />
                  </FormField>
                  <FormField label="Palette ID" info="Palette grouping for the item blueprint.">
                    <input type="number" min={0} max={255} value={paletteID} onChange={onUpdateByteField(setPaletteID, 'paletteID')} />
                  </FormField>
                  <FormField label="Cost" info="Final item cost shown in toolset.">
                    <input type="number" min={0} value={cost} onChange={onUpdateNumberField(setCost, 'cost')} />
                  </FormField>
                  <FormField label="Additional Cost" info="AddCost modifier added after calculations.">
                    <input type="number" min={0} value={addCost} onChange={onUpdateNumberField(setAddCost, 'addCost')} />
                  </FormField>
                  <FormField label="Charges" info="Remaining charges for consumables (0-255).">
                    <input type="number" min={0} max={255} value={charges} onChange={onUpdateByteField(setCharges, 'charges')} />
                  </FormField>
                  <FormField label="Stack Size" info="Number of items per stack for stackable base types.">
                    <input type="number" min={1} max={65535} value={stackSize} onChange={onUpdateWordField(setStackSize, 'stackSize')} />
                  </FormField>
                  <FormField label="Model Variation" info="Model variation for the item blueprint.">
                    <input type="number" min={0} max={255} value={modelVariation} onChange={onUpdateByteField(setModelVariation, 'modelVariation')} />
                  </FormField>
                  <FormField label="Upgrade Level" info="Upgrade level for the item blueprint.">
                    <input type="number" min={0} max={255} value={upgradeLevel} onChange={onUpdateByteField(setUpgradeLevel, 'upgradeLevel')} />
                  </FormField>
                  <FormField label="Flags" info="Gameplay restrictions for this item.">
                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                      <ForgeCheckbox label="Plot" value={plot} onChange={updateBooleanField(setPlot, 'plot')} />
                      <ForgeCheckbox label="Stolen" value={stolen} onChange={updateBooleanField(setStolen, 'stolen')} />
                      <ForgeCheckbox label="Identified" value={identified} onChange={updateBooleanField(setIdentified, 'identified')} />
                    </div>
                  </FormField>
                </tbody>
              </table>
            </div>

            <div className="tab-pane" style={{display: (selectedTab == 'description' ? 'block' : 'none')}}>
              <h3>Descriptions</h3>
              <hr />
              <table style={{ width: '100%' }}>
                <tbody>
                  <FormField label="Unidentified Description" info="Description shown before the item is identified.">
                    <CExoLocStringEditor value={description} onChange={onUpdateDescription} />
                  </FormField>
                  <FormField label="Identified Description" info="Description shown once the item has been identified.">
                    <CExoLocStringEditor value={descIdentified} onChange={onUpdateDescIdentified} />
                  </FormField>
                </tbody>
              </table>
            </div>

            <div className="tab-pane" style={{display: (selectedTab == 'properties' ? 'block' : 'none')}}>
              <h3>Item Properties</h3>
              <hr />
              <div style={{marginBottom: '10px'}}>
                <button className="btn btn-sm btn-primary" onClick={addProperty}>
                  <i className="fa-solid fa-plus"></i> Add Property
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Subtype</th>
                      <th>Cost Table</th>
                      <th>Cost Value</th>
                      <th>Param Table</th>
                      <th>Param Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{textAlign: 'center', fontStyle: 'italic'}}>No properties defined.</td>
                      </tr>
                    )}
                    {properties.map((property, index) => renderPropertyRow(property, index))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

