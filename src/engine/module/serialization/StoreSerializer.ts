import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { CExoLocString } from '@core/resource/CExoLocString';
import type { Store } from '@engine/module/Store';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addByte,
  addDword,
  addFloat,
  addInt,
  addLocString,
  addResRef,
  addString,
  readByte,
  readFloat,
  readInt,
  readLocString,
  readObjectId,
  readResRef,
  readString,
} from '@engine/module/serialization/gffHelpers';
import { SwVarTableSerializer } from '@engine/module/serialization/SwVarTableSerializer';
import { ActionListSerializer } from '@engine/module/serialization/ActionListSerializer';
import { itemSerializer } from '@engine/module/serialization/ItemSerializer';

/**
 * Store GIT/UTM serializer.
 * Uses ResRef (not TemplateResRef). Orientations map to rotation.x/y/z.
 * ItemList nests Item save structs with Infinite BYTE.
 * Inventory Item construction stays in the Store facade (needs Item ctor).
 */
export class StoreSerializer implements GameObjectSerializer<Store, GFFObject, GFFObject> {
  deserialize(target: Store, source: GFFObject, _context?: DeserializeContext): void {
    const root = gffRootOf(source);
    const needsRegister = !target.initialized;

    if (needsRegister) {
      const objectId = readObjectId(root);
      if (objectId !== undefined) target.id = objectId;
    }

    if (root.hasField('BuySellFlag')) target.buySellFlag = readByte(root, 'BuySellFlag');
    if (root.hasField('LocName')) target.locName = readLocString(root, 'LocName') as any;
    if (root.hasField('MarkDown')) target.markDown = readInt(root, 'MarkDown');
    if (root.hasField('MarkUp')) target.markUp = readInt(root, 'MarkUp');
    if (root.hasField('OnOpenStore')) target.onOpenStore = readResRef(root, 'OnOpenStore') as any;
    if (root.hasField('Tag')) target.tag = readString(root, 'Tag');
    if (root.hasField('ResRef')) target.resRef = readResRef(root, 'ResRef');
    if (root.hasField('TemplateResRef')) target.templateResRef = readResRef(root, 'TemplateResRef');

    if (root.hasField('XPosition')) target.position.x = readFloat(root, 'XPosition');
    if (root.hasField('YPosition')) target.position.y = readFloat(root, 'YPosition');
    if (root.hasField('ZPosition')) target.position.z = readFloat(root, 'ZPosition');

    // Store orientations live on rotation, not xOrientation/yOrientation/zOrientation.
    if (root.hasField('XOrientation')) target.rotation.x = readFloat(root, 'XOrientation');
    if (root.hasField('YOrientation')) target.rotation.y = readFloat(root, 'YOrientation');
    if (root.hasField('ZOrientation')) target.rotation.z = readFloat(root, 'ZOrientation');

    SwVarTableSerializer.deserialize(target, root);

    target.initialized = true;
  }

  serialize(source: Store, _context?: SerializeContext): GFFObject {
    const gff = new GFFObject();
    gff.FileType = 'UTM ';
    gff.RootNode.type = 6;

    addDword(gff.RootNode, 'ObjectId', source.id);
    addString(gff.RootNode, 'Tag', source.tag);
    addLocString(
      gff.RootNode,
      'LocName',
      source.locName instanceof CExoLocString ? source.locName : new CExoLocString(),
    );
    addInt(gff.RootNode, 'MarkDown', source.markDown);
    addInt(gff.RootNode, 'MarkUp', source.markUp);

    const onOpen =
      source.onOpenStore && typeof (source.onOpenStore as any).name === 'string'
        ? (source.onOpenStore as any).name
        : (typeof source.onOpenStore === 'string' ? source.onOpenStore : '');
    addResRef(gff.RootNode, 'OnOpenStore', onOpen);
    addByte(gff.RootNode, 'BuySellFlag', source.buySellFlag);

    const itemList = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ItemList'));
    for (let i = 0; i < source.inventory.length; i++) {
      // SaveStore writes Infinite before SaveItem — keep Infinite on the nested struct.
      const itemStruct = itemSerializer.serialize(source.inventory[i]);
      itemStruct.addField(new GFFField(GFFDataType.BYTE, 'Infinite')).setValue(
        source.inventory[i].isInfinite() ? 1 : 0,
      );
      itemList.addChildStruct(itemStruct);
    }

    addFloat(gff.RootNode, 'XPosition', source.position.x);
    addFloat(gff.RootNode, 'YPosition', source.position.y);
    addFloat(gff.RootNode, 'ZPosition', source.position.z);
    addFloat(gff.RootNode, 'XOrientation', source.rotation.x);
    addFloat(gff.RootNode, 'YOrientation', source.rotation.y);
    addFloat(gff.RootNode, 'ZOrientation', source.rotation.z);

    SwVarTableSerializer.writeField(gff.RootNode, source);
    ActionListSerializer.writeField(gff.RootNode, source as any);
    addByte(gff.RootNode, 'Commandable', 1);

    return gff;
  }
}

export const storeSerializer = new StoreSerializer();
