import { describe, expect, jest, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/** Load the real menu implementation without constructing the renderer/engine. */
function loadMenu(name: string, imports: Record<string, any>): any {
  const filename = path.resolve(__dirname, '../../game/kotor/menu', name + '.ts');
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  expect(errors).toEqual([]);
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', result.outputText)((id: string) => {
    if (!(id in imports)) throw new Error(`Unexpected menu dependency: ${id}`);
    return imports[id];
  }, module, module.exports);
  return module.exports[name];
}

class FakeGameMenu {}
class FakeItem {
  infinite = 0;
  template: any;
  constructor(public cost = 100, public count = 1) {}
  getStackSize() { return this.count; }
  setStackSize(count: number) { this.count = count; }
  isInfinite() { return this.infinite === 1; }
  getDescription() { return 'Synthetic item'; }
  clone() {
    const item = new FakeItem(this.cost, this.count);
    item.infinite = this.infinite;
    item.template = { RootNode: { hasField: () => true, getFieldByLabel: () => ({ setValue: jest.fn() }) } };
    return item;
  }
}
class FakeCreature {
  addItem = jest.fn<(item: FakeItem) => void>();
  removeItem = jest.fn<(item: FakeItem, count: number) => FakeItem | undefined>();
}

function makeStore() {
  const trader = new FakeCreature();
  const party = { Gold: 1000, AddGold: (amount: number) => { party.Gold += amount; } };
  const inventory = { addItem: jest.fn(), getSellableInventory: jest.fn((): FakeItem[] => []), inventory: [] as FakeItem[] };
  const MenuStore = loadMenu('MenuStore', {
    '@/GameState': { GameState: { PartyManager: party, InventoryManager: inventory, getCurrentPlayer: () => trader } },
    '@/enums/module/ModuleObjectType': { ModuleObjectType: { ModuleStore: 1 } },
    '@/gui': { GameMenu: FakeGameMenu },
    '@/loaders': { TextureLoader: { LoadQueue: jest.fn() } },
    '@/module': { ModuleItem: FakeItem, ModuleCreature: FakeCreature, ModuleStore: class {} },
    '@/utility/BitWise': { BitWise: { InstanceOfObject: () => true } },
  });
  const menu = new MenuStore();
  const stock: FakeItem[] = [];
  const store = { markUp: 150, markDown: 50, buySellFlag: 3, getInventory: () => stock, addItem: jest.fn() };
  menu.storeObject = store;
  menu.creature = trader;
  menu.LB_SHOPITEMS = {};
  menu.LB_INVITEMS = {};
  menu.refreshView = jest.fn();
  return { menu, stock, store, party, trader, inventory };
}

describe('ported K1 store transactions', () => {
  test('buys one finite-stock item at merchant price and debits credits once', () => {
    const { menu, stock, party, trader } = makeStore();
    const item = new FakeItem(100, 2);
    stock.push(item);
    menu.LB_SHOPITEMS.selectedItem = { node: item };
    expect(menu.buySelectedItem()).toBe(true);
    expect(party.Gold).toBe(850);
    expect(item.count).toBe(1);
    expect(trader.addItem).toHaveBeenCalledTimes(1);
    const purchased = trader.addItem.mock.calls[0][0];
    expect(purchased).not.toBe(item);
    expect(purchased.count).toBe(1);
    expect(purchased.infinite).toBe(0);
  });

  test('removes exhausted finite stock', () => {
    const { menu, stock } = makeStore();
    const item = new FakeItem(10, 1);
    stock.push(item);
    menu.LB_SHOPITEMS.selectedItem = { node: item };
    expect(menu.buySelectedItem()).toBe(true);
    expect(stock).toEqual([]);
  });

  test('keeps infinite merchant stock but gives a finite purchased copy', () => {
    const { menu, stock, trader } = makeStore();
    const item = new FakeItem(20, 5);
    item.infinite = 1;
    stock.push(item);
    menu.LB_SHOPITEMS.selectedItem = { node: item };
    expect(menu.buySelectedItem()).toBe(true);
    expect(stock).toEqual([item]);
    expect(item.count).toBe(5);
    expect(item.infinite).toBe(1);
    expect(trader.addItem.mock.calls[0][0].infinite).toBe(0);
  });

  test('rejects insufficient credits without mutating stock or inventory', () => {
    const { menu, stock, party, trader } = makeStore();
    const item = new FakeItem(100, 2);
    stock.push(item);
    party.Gold = 149;
    menu.LB_SHOPITEMS.selectedItem = { node: item };
    expect(menu.buySelectedItem()).toBe(false);
    expect(party.Gold).toBe(149);
    expect(item.count).toBe(2);
    expect(trader.addItem).not.toHaveBeenCalled();
  });

  test('honors one-way merchant trading flags', () => {
    const { menu, store, trader } = makeStore();
    menu.LB_SHOPITEMS.selectedItem = { node: new FakeItem() };
    store.buySellFlag = 2;
    expect(menu.buySelectedItem()).toBe(false);
    store.buySellFlag = 1;
    menu.sellMode = true;
    menu.LB_INVITEMS.selectedItem = { node: new FakeItem() };
    expect(menu.sellSelectedItem()).toBe(false);
    expect(trader.removeItem).not.toHaveBeenCalled();
  });

  test('credits a sale only after exactly one item has been removed', () => {
    const { menu, store, party, trader } = makeStore();
    const item = new FakeItem(100, 3);
    const sold = new FakeItem(100, 1);
    menu.sellMode = true;
    menu.LB_INVITEMS.selectedItem = { node: item };
    trader.removeItem.mockReturnValue(sold);
    expect(menu.sellSelectedItem()).toBe(true);
    expect(trader.removeItem).toHaveBeenCalledWith(item, 1);
    expect(party.Gold).toBe(1050);
    expect(store.addItem).toHaveBeenCalledWith(sold);
  });

  test('failed removal does not mint credits or merchant stock', () => {
    const { menu, store, party } = makeStore();
    menu.sellMode = true;
    menu.LB_INVITEMS.selectedItem = { node: new FakeItem() };
    expect(menu.sellSelectedItem()).toBe(false);
    expect(party.Gold).toBe(1000);
    expect(store.addItem).not.toHaveBeenCalled();
  });

  test('applies price bonuses and rejects non-finite bonus inputs', () => {
    const { menu } = makeStore();
    menu.setBonusMarkUp(20);
    menu.setBonusMarkDown(10);
    expect(menu.getItemBuyPrice(new FakeItem())).toBe(170);
    expect(menu.getItemSellPrice(new FakeItem())).toBe(60);
    menu.setBonusMarkUp(Infinity);
    expect(menu.getItemBuyPrice(new FakeItem())).toBe(150);
  });
});

function journalEntry(plot: string, name: string, received: number, completed = false) {
  return {
    plot_id: plot,
    getName: () => name,
    getReceivedSortValue: () => received,
    getPriority: () => received,
    getPlanetId: () => received,
    isCompleted: () => completed,
    getEntryText: () => `${name} description`,
  };
}

function makeJournal(entries: ReturnType<typeof journalEntry>[]) {
  const manager = { Entries: entries, SortOrder: 0 };
  const MenuJournal = loadMenu('MenuJournal', {
    '@/GameState': { GameState: { JournalManager: manager } },
    '@/gui': { GameMenu: FakeGameMenu },
    '@/engine/JournalEntry': { JournalEntry: class {} },
  });
  const menu = new MenuJournal();
  menu.LB_ITEMS = { selectedItem: {}, setItems: jest.fn(), selectItem: jest.fn() };
  menu.LBL_ITEM_DESCRIPTION = { setItem: jest.fn() };
  return { menu, manager };
}

describe('ported K1 journal lists', () => {
  test('separates active and completed entries without mutating manager order', () => {
    const entries = [journalEntry('b', 'Beta', 2), journalEntry('a', 'Alpha', 1), journalEntry('c', 'Complete', 3, true)];
    const { menu, manager } = makeJournal(entries);
    expect(menu.getFilteredEntries().map((e: any) => e.plot_id)).toEqual(['a', 'b']);
    expect(manager.Entries).toEqual(entries);
    expect(manager.Entries[0].plot_id).toBe('b');
    menu.mode = 1;
    expect(menu.getFilteredEntries().map((e: any) => e.plot_id)).toEqual(['c']);
  });

  test('preserves selection by case-insensitive plot identity using setItems', () => {
    const entries = [journalEntry('a', 'Alpha', 1), journalEntry('b', 'Beta', 2)];
    const { menu } = makeJournal(entries);
    menu.selected = journalEntry('B', 'Old entry', 0);
    menu.updateList();
    expect(menu.LB_ITEMS.setItems).toHaveBeenCalledWith(entries);
    expect(menu.LB_ITEMS.selectItem).toHaveBeenCalledWith(entries[1]);
    expect(menu.selected).toBe(entries[1]);
  });

  test('clears selection and stale descriptions when filtering produces no rows', () => {
    const { menu } = makeJournal([]);
    menu.selected = journalEntry('old', 'Old', 0);
    menu.updateList();
    expect(menu.selected).toBeUndefined();
    expect(menu.LB_ITEMS.selectedItem).toBeUndefined();
    expect(menu.LBL_ITEM_DESCRIPTION.setItem).toHaveBeenLastCalledWith(null);
  });
});
