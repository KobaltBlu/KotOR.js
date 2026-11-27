import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import type { GFFStruct } from '@core/resource/GFFStruct';
import type { GameEvent } from '@engine/events/GameEvent';
import type { GffRoot } from '@engine/module/serialization/types';

export interface EventQueueHost {
  eventQueue: GameEvent[];
}

export type EventFromStruct = (struct: GFFStruct) => GameEvent | undefined;

/** Module EventQueue LIST field. Concrete event construction is injected. */
export class EventQueueSerializer {
  static writeField(
    parent: { addField: (field: GFFField) => GFFField },
    events: readonly GameEvent[],
  ): GFFField {
    const field = parent.addField(new GFFField(GFFDataType.LIST, 'EventQueue'));
    for (const event of events) {
      const exported = event?.export();
      if (exported) {
        field.addChildStruct(exported);
      }
    }
    return field;
  }

  static deserialize(
    target: EventQueueHost | GameEvent[],
    root: GffRoot,
    eventFromStruct: EventFromStruct,
  ): void {
    const eventQueue = Array.isArray(target) ? target : target.eventQueue;
    if (eventQueue.length || !root.hasField('EventQueue')) return;
    const structs = root.getFieldByLabel('EventQueue').getChildStructs?.() || [];
    for (const struct of structs) {
      const event = eventFromStruct(struct);
      if (event) {
        eventQueue.push(event);
      }
    }
  }
}
