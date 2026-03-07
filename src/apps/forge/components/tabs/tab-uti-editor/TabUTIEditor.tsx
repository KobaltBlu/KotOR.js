import React, { useState, useCallback, useEffect } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabUTIEditorState, ItemPropertyEntry } from "../../../states/tabs";
import * as KotOR from "../../../KotOR";
import { FormField } from "../../form-field/FormField";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";
import { SubTab, SubTabHost } from "../../SubTabHost";
import { UI3DRendererView } from "../../UI3DRendererView";
import { ForgeItem } from "../../../module-editor/ForgeItem";
import { clampByte } from "../../../helpers/UTxEditorHelpers";

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

  const onItemChange = useCallback(() => {
    if (!tab.item || !tab.blueprint) return;
    setLocName(tab.item.locName);
    setDescription(tab.item.description);
    setDescIdentified(tab.item.descIdentified);
    setTag(tab.item.tag);
    setTemplateResRef(tab.item.templateResRef);
    setComment(tab.item.comment);
    setPaletteID(tab.item.paletteID);
    setBaseItem(tab.item.baseItem);
    setAddCost(tab.item.addCost);
    setCost(tab.item.cost);
    setCharges(tab.item.charges);
    setStackSize(tab.item.stackSize);
    setPlot(tab.item.plot);
    setStolen(tab.item.stolen);
    setProperties(tab.item.properties.map((prop) => ({...prop})));
    setIdentified(tab.item.identified);
    setModelVariation(tab.item.modelVariation);
    setUpgradeLevel(tab.item.upgradeLevel);
  }, [tab]);

  useEffect(() => {
    if(!tab) return;
    onItemChange();
    tab.addEventListener('onEditorFileLoad', onItemChange);
    tab.addEventListener('onEditorFileChange', onItemChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onItemChange);
      tab.removeEventListener('onEditorFileChange', onItemChange);
    };
  }, [tab, onItemChange]);

  // Helper functions using ForgeItem methods
  const onUpdateNumberField = (setter: (value: number) => void, property: keyof ForgeItem, parser: (value: number) => number = (v) => v) => 
    tab.item.createNumberFieldHandler(setter, property, tab.item, tab, parser);
  
  const onUpdateByteField = (setter: (value: number) => void, property: keyof ForgeItem) => 
    tab.item.createByteFieldHandler(setter, property, tab.item, tab);
  
  const onUpdateWordField = (setter: (value: number) => void, property: keyof ForgeItem) => 
    tab.item.createWordFieldHandler(setter, property, tab.item, tab);
  
  const onUpdateBooleanField = (setter: (value: boolean) => void, property: keyof ForgeItem) => 
    tab.item.createBooleanFieldHandler(setter, property, tab.item, tab);
  
  const onUpdateResRefField = (setter: (value: string) => void, property: keyof ForgeItem) => 
    tab.item.createResRefFieldHandler(setter, property, tab.item, tab);
  
  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof ForgeItem) => 
    tab.item.createCExoStringFieldHandler(setter, property, tab.item, tab);
  
  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof ForgeItem) => 
    tab.item.createCExoLocStringFieldHandler(setter, property, tab.item, tab);

  const onUpdateForgeCheckboxField = (setter: (value: boolean) => void, property: keyof ForgeItem) => 
    tab.item.createForgeCheckboxFieldHandler(setter, property, tab.item, tab);

  const updateProperties = (next: ItemPropertyEntry[]) => {
    setProperties(next);
    tab.item.properties = next.map((prop) => ({...prop}));
    tab.updateFile();
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

  const tabs: SubTab[] = [
    {
      id: 'basic',
      label: 'Basic',
      headerIcon: 'fa-info-circle',
      headerTitle: 'Basic',
      content: (
        <>
          <table style={{ width: '100%' }}>
            <tbody>
              <FormField label="Name" info="Display name shown in-game once identified.">
                <CExoLocStringEditor value={locName} onChange={onUpdateCExoLocStringField(setLocName, 'locName')} />
              </FormField>
              <FormField label="Template ResRef" info="Internal resource reference (max 16 chars, lowercase).">
                <input type="text" value={templateResRef} disabled={true} maxLength={16} />
              </FormField>
              <FormField label="Tag" info="Unique identifier (max 32 chars).">
                <input type="text" value={tag} onChange={onUpdateResRefField(setTag, 'tag')} maxLength={32} />
              </FormField>
              <FormField label="Comment" info="Designer-only notes.">
                <textarea value={comment} onChange={onUpdateCExoStringField(setComment, 'comment')} rows={2} />
              </FormField>
              <FormField label="Base Item" info="Index into baseitems.2da determining model type and behaviour.">
                <input type="number" min={0} value={baseItem} onChange={onUpdateByteField(setBaseItem, 'baseItem')} />
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
                <input type="number" min={1} max={255} value={modelVariation} onChange={onUpdateByteField(setModelVariation, 'modelVariation')} />
              </FormField>
              <FormField label="Upgrade Level" info="Upgrade level for the item blueprint.">
                <input type="number" min={0} max={255} value={upgradeLevel} onChange={onUpdateByteField(setUpgradeLevel, 'upgradeLevel')} />
              </FormField>
              <FormField label="Flags" info="Gameplay restrictions for this item.">
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                  <ForgeCheckbox label="Plot" value={plot} onChange={onUpdateForgeCheckboxField(setPlot, 'plot')} />
                  <ForgeCheckbox label="Stolen" value={stolen} onChange={onUpdateForgeCheckboxField(setStolen, 'stolen')} />
                  <ForgeCheckbox label="Identified" value={identified} onChange={onUpdateForgeCheckboxField(setIdentified, 'identified')} />
                </div>
              </FormField>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'description',
      label: 'Descriptions',
      headerIcon: 'fa-file-alt',
      headerTitle: 'Descriptions',
      content: (
        <>
          <table style={{ width: '100%' }}>
            <tbody>
              <FormField label="Unidentified Description" info="Description shown before the item is identified.">
                <CExoLocStringEditor value={description} onChange={onUpdateCExoLocStringField(setDescription, 'description')} />
              </FormField>
              <FormField label="Identified Description" info="Description shown once the item has been identified.">
                <CExoLocStringEditor value={descIdentified} onChange={onUpdateCExoLocStringField(setDescIdentified, 'descIdentified')} />
              </FormField>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'properties',
      label: 'Properties',
      headerIcon: 'fa-cogs',
      headerTitle: 'Properties',
      content: (
        <>
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
}

