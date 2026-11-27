/**
 * EventQueue LIST serialization boundary.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import type { GameEvent } from '@engine/events/GameEvent';
import { EventQueueSerializer } from '@engine/module/serialization/EventQueueSerializer';

describe('EventQueueSerializer', () => {
  it('writes exported events and skips empty exports', () => {
    const root = new GFFStruct();
    const exported = new GFFStruct(0xABCD);
    const events = [
      { export: jest.fn(() => exported) },
      { export: jest.fn(() => undefined) },
    ] as unknown as GameEvent[];

    const field = EventQueueSerializer.writeField(root, events);

    expect(field.getType()).toBe(GFFDataType.LIST);
    expect(field.getChildStructs()).toEqual([exported]);
  });

  it('hydrates an empty queue through the injected factory', () => {
    const root = new GFFStruct();
    const list = root.addField(new GFFField(GFFDataType.LIST, 'EventQueue'));
    const eventStruct = new GFFStruct(0xABCD);
    list.addChildStruct(eventStruct);
    const event = { export: jest.fn() } as unknown as GameEvent;
    const eventFromStruct = jest.fn<(struct: GFFStruct) => GameEvent | undefined>(() => event);
    const target = { eventQueue: [] as GameEvent[] };

    EventQueueSerializer.deserialize(target, root, eventFromStruct);

    expect(eventFromStruct).toHaveBeenCalledWith(eventStruct);
    expect(target.eventQueue).toEqual([event]);
  });
});
