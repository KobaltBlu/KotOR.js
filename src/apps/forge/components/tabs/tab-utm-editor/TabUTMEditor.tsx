import React, { useState, useEffect, useCallback } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTMEditorState } from "../../../states/tabs/TabUTMEditorState";
import * as KotOR from "../../../KotOR";
import { FormField } from "../../form-field/FormField";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";
import { SubTab, SubTabHost } from "../../SubTabHost";
import { ForgeStore, StoreItemEntry } from "../../../module-editor/ForgeStore";
import { ModalItemBrowserState } from "../../../states/modal/ModalItemBrowserState";
import { ForgeState } from "../../../states/ForgeState";

export const TabUTMEditor = function(props: BaseTabProps){

  const tab: TabUTMEditorState = props.tab as TabUTMEditorState;

  const [locName, setLocName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [tag, setTag] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [buySellFlag, setBuySellFlag] = useState<number>(0);
  const [markDown, setMarkDown] = useState<number>(0);
  const [markUp, setMarkUp] = useState<number>(0);
  const [onOpenStore, setOnOpenStore] = useState<string>('');
  const [templateResRef, setTemplateResRef] = useState<string>('');
  const [itemList, setItemList] = useState<StoreItemEntry[]>([]);

  const onStoreChange = useCallback(() => {
    if (!tab.store || !tab.blueprint) return;
    setLocName(tab.store.locName);
    setTag(tab.store.tag);
    setComment(tab.store.comment);
    setBuySellFlag(tab.store.buySellFlag);
    setMarkDown(tab.store.markDown);
    setMarkUp(tab.store.markUp);
    setOnOpenStore(tab.store.onOpenStore);
    setTemplateResRef(tab.store.templateResRef);
    setItemList([...tab.store.itemList]);
  }, [tab]);

  // Helper functions using ForgeStore methods
  const onUpdateNumberField = (setter: (value: number) => void, property: keyof ForgeStore, parser: (value: number) => number = (v) => v) => 
    tab.store.createNumberFieldHandler(setter, property, tab.store, tab, parser);
  
  const onUpdateByteField = (setter: (value: number) => void, property: keyof ForgeStore) => 
    tab.store.createByteFieldHandler(setter, property, tab.store, tab);
  
  const onUpdateResRefField = (setter: (value: string) => void, property: keyof ForgeStore) => 
    tab.store.createResRefFieldHandler(setter, property, tab.store, tab);
  
  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof ForgeStore) => 
    tab.store.createCExoStringFieldHandler(setter, property, tab.store, tab);
  
  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof ForgeStore) => 
    tab.store.createCExoLocStringFieldHandler(setter, property, tab.store, tab);

  useEffect(() => {
    if(!tab) return;
    onStoreChange();
    tab.addEventListener('onEditorFileLoad', onStoreChange);
    tab.addEventListener('onEditorFileChange', onStoreChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onStoreChange);
      tab.removeEventListener('onEditorFileChange', onStoreChange);
    };
  }, [tab, onStoreChange]);

  const onAddItem = () => {
    const newItem: StoreItemEntry = {
      inventoryRes: '',
      reposPosX: 0,
      reposPosY: 0
    };
    const updated = [...itemList, newItem];
    setItemList(updated);
    tab.store.itemList = updated;
    tab.updateFile();
  };

  const onRemoveItem = (index: number) => {
    const updated = itemList.filter((_, i) => i !== index);
    setItemList(updated);
    tab.store.itemList = updated;
    tab.updateFile();
  };

  const onItemFieldChange = (index: number, field: keyof StoreItemEntry, value: string | number) => {
    const updated = [...itemList];
    updated[index] = { ...updated[index], [field]: value };
    setItemList(updated);
    tab.store.itemList = updated;
    tab.updateFile();
  };

  const onOpenItemBrowser = (index: number) => {
    const modal = new ModalItemBrowserState((item) => {
      onItemFieldChange(index, 'inventoryRes', item.resref);
    });
    modal.attachToModalManager(ForgeState.modalManager);
    modal.loadItems();
    modal.open();
  };

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
              <FormField 
                label="Name" 
                info="The display name of the store. This is what players will see in-game and can be localized for different languages."
              >
                <CExoLocStringEditor 
                  value={locName}
                  onChange={onUpdateCExoLocStringField(setLocName, 'locName')}
                />
              </FormField>
              <FormField 
                label="Tag" 
                info="A unique identifier for this store. Used by scripts to reference this specific object. Must be unique within the module."
              >
                <input type="text" placeholder="Enter tag" maxLength={32} value={tag} onChange={onUpdateCExoStringField(setTag, 'tag')} />
              </FormField>
              <FormField 
                label="ResRef" 
                info="The resource reference of this store's blueprint template. This should match the filename of the UTM file."
              >
                <input type="text" placeholder="Enter resref" maxLength={16} value={templateResRef} onChange={onUpdateResRefField(setTemplateResRef, 'templateResRef')} />
              </FormField>
              <FormField 
                label="Comment" 
                info="Designer-only notes stored in blueprint."
              >
                <textarea value={comment} onChange={onUpdateCExoStringField(setComment, 'comment')} rows={2} />
              </FormField>
              <FormField 
                label="Buy/Sell Flag" 
                info="Controls what the store can do: 0 = Buy only, 1 = Sell only, 2 = Buy and Sell, 3 = Neither."
              >
                <select value={buySellFlag} onChange={(e) => { setBuySellFlag(Number(e.target.value)); tab.store.buySellFlag = Number(e.target.value); tab.updateFile(); }}>
                  <option value={0}>Buy Only</option>
                  <option value={1}>Sell Only</option>
                  <option value={2}>Buy and Sell</option>
                  <option value={3}>Neither</option>
                </select>
              </FormField>
              <FormField 
                label="Mark Down" 
                info="Percentage discount when selling items to the store (0-100)."
              >
                <input type="number" min="0" max="100" value={markDown} onChange={onUpdateNumberField(setMarkDown, 'markDown')} />
              </FormField>
              <FormField 
                label="Mark Up" 
                info="Percentage markup when buying items from the store (0-100)."
              >
                <input type="number" min="0" max="100" value={markUp} onChange={onUpdateNumberField(setMarkUp, 'markUp')} />
              </FormField>
              <FormField 
                label="On Open Store" 
                info="Script that runs when the store is opened by a player."
              >
                <input type="text" placeholder="Enter script name" maxLength={16} value={onOpenStore} onChange={onUpdateResRefField(setOnOpenStore, 'onOpenStore')} />
              </FormField>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'items',
      label: 'Items',
      headerIcon: 'fa-box',
      headerTitle: 'Items',
      content: (
        <>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td colSpan={2}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong>Item List</strong>
                    <button 
                      onClick={onAddItem} 
                      className="btn btn-sm btn-primary"
                    >
                      <i className="fa-solid fa-plus"></i> Add Item
                    </button>
                  </div>
                  {itemList.length === 0 ? (
                    <div style={{ textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>
                      No items in store. Click "Add Item" to add one.
                    </div>
                  ) : (
                    <table className="table table-sm" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Item ResRef</th>
                          <th>Position X (Order)</th>
                          <th>Position Y (Tab)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemList.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <input 
                                  type="text" 
                                  maxLength={16} 
                                  value={item.inventoryRes} 
                                  onChange={(e) => onItemFieldChange(index, 'inventoryRes', e.target.value)}
                                  className="form-control"
                                  placeholder="Enter item resref"
                                />
                                <button 
                                  onClick={() => onOpenItemBrowser(index)}
                                  className="btn btn-sm btn-secondary"
                                  title="Browse Items"
                                >
                                  <i className="fa-solid fa-folder-open"></i>
                                </button>
                              </div>
                            </td>
                            <td>
                              <input 
                                type="number" 
                                min="0" 
                                value={item.reposPosX} 
                                onChange={(e) => onItemFieldChange(index, 'reposPosX', parseInt(e.target.value) || 0)}
                                className="form-control"
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                min="0" 
                                value={item.reposPosY} 
                                onChange={(e) => onItemFieldChange(index, 'reposPosY', parseInt(e.target.value) || 0)}
                                className="form-control"
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <button 
                                onClick={() => onRemoveItem(index)}
                                className="btn btn-sm btn-danger"
                                title="Remove Item"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )
    }
  ];

  return (
    <SubTabHost
      tabs={tabs}
      defaultTab="basic"
    />
  );

};

