import React from "react";
import { ModalState } from "./ModalState";
import { ModalInsertInstance } from "../../components/modal/ModalInsertInstance";

export type InsertInstanceResourceType = "utc" | "utd" | "utp" | "ute" | "uts" | "utm" | "utt" | "utw";

export interface ModalInsertInstanceStateOptions {
  title?: string;
  onSelect?: (resref: string, ext: InsertInstanceResourceType, data: Uint8Array | null) => void;
}

const INSTANCE_TYPES: { value: InsertInstanceResourceType; label: string }[] = [
  { value: "utc", label: ".UTC – Creature" },
  { value: "utd", label: ".UTD – Door" },
  { value: "utp", label: ".UTP – Placeable" },
  { value: "ute", label: ".UTE – Encounter" },
  { value: "uts", label: ".UTS – Sound" },
  { value: "utm", label: ".UTM – Store" },
  { value: "utt", label: ".UTT – Trigger" },
  { value: "utw", label: ".UTW – Waypoint" },
];

export class ModalInsertInstanceState extends ModalState {
  title: string = "Insert Instance";
  selectedType: InsertInstanceResourceType = "utc";
  mode: "create" | "load" = "create";
  resref: string = "";
  onSelect?: (resref: string, ext: InsertInstanceResourceType, data: Uint8Array | null) => void;

  static INSTANCE_TYPES = INSTANCE_TYPES;

  constructor(options: ModalInsertInstanceStateOptions = {}) {
    super();
    if (options.title) this.title = options.title;
    if (options.onSelect) this.onSelect = options.onSelect;
    this.setView(<ModalInsertInstance modal={this} />);
  }

  setType(value: InsertInstanceResourceType): void {
    this.selectedType = value;
    this.processEventListener("onStateChange", [this]);
  }

  setMode(value: "create" | "load"): void {
    this.mode = value;
    this.processEventListener("onStateChange", [this]);
  }

  setResref(value: string): void {
    this.resref = value;
    this.processEventListener("onStateChange", [this]);
  }
}
