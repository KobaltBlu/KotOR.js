/**
 * Personal-slot selection follows the entry id across list rebuilds.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { ActionMenuPanel } from '@engine/menu/ActionMenuPanel';

const entry = (id: number) => ({ id, name: 'e' + id });

function build(panel: ActionMenuPanel, ids: number[]){
  panel.clearActions();
  ids.forEach((id) => panel.addAction(entry(id) as any));
}

describe('ActionMenuPanel id selection', () => {
  it('shows the first entry until something is chosen', () => {
    const panel = new ActionMenuPanel();
    build(panel, [10, 20, 30]);
    expect(panel.getSelectedAction()?.id).toBe(10);
  });

  it('next from an unchosen slot goes to the second entry and wraps', () => {
    const panel = new ActionMenuPanel();
    build(panel, [10, 20, 30]);
    panel.nextAction();
    expect(panel.getSelectedAction()?.id).toBe(20);
    panel.nextAction();
    panel.nextAction();
    expect(panel.getSelectedAction()?.id).toBe(10);
  });

  it('previous from an unchosen or first entry goes to the last', () => {
    const panel = new ActionMenuPanel();
    build(panel, [10, 20, 30]);
    panel.previousAction();
    expect(panel.getSelectedAction()?.id).toBe(30);
    panel.selectId(10);
    panel.previousAction();
    expect(panel.getSelectedAction()?.id).toBe(30);
  });

  it('keeps the chosen entry when earlier entries disappear', () => {
    const panel = new ActionMenuPanel();
    build(panel, [10, 20, 30]);
    panel.selectId(30);
    build(panel, [20, 30]);
    expect(panel.getSelectedAction()?.id).toBe(30);
  });

  it('falls back to the first entry while the chosen one is missing, then returns to it', () => {
    const panel = new ActionMenuPanel();
    build(panel, [10, 20, 30]);
    panel.selectId(20);
    build(panel, [10, 30]);
    expect(panel.getSelectedAction()?.id).toBe(10);
    build(panel, [10, 20, 30]);
    expect(panel.getSelectedAction()?.id).toBe(20);
  });

  it('does not move on a single entry', () => {
    const panel = new ActionMenuPanel();
    build(panel, [10]);
    expect(panel.nextAction()).toBe(false);
    expect(panel.previousAction()).toBe(false);
    expect(panel.getSelectedAction()?.id).toBe(10);
  });

  it('entries without ids keep index selection', () => {
    const panel = new ActionMenuPanel();
    panel.addAction({ name: 'a' } as any);
    panel.addAction({ name: 'b' } as any);
    panel.nextAction();
    expect(panel.getSelectedAction()?.name).toBe('b');
  });
});
