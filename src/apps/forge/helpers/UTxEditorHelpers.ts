import React from "react";
import * as KotOR from "../KotOR";
import { TabState } from "../states/tabs/TabState";

/**
 * Sanitizes a string to be a valid ResRef (max 16 chars, lowercase, alphanumeric + underscore only)
 */
export const sanitizeResRef = (value: string): string => {
  return value.substring(0, 16).toLowerCase().replace(/[^a-z0-9_]/g, '');
};

/**
 * Clamps a number to valid BYTE range (0-255)
 */
export const clampByte = (value: number): number => {
  return Math.max(0, Math.min(255, value));
};

/**
 * Clamps a number to valid WORD range (1-65535)
 */
export const clampWord = (value: number): number => {
  return Math.max(1, Math.min(0xFFFF, value || 1));
};

/**
 * Creates a handler for updating number fields on a tab state
 */
export const createNumberFieldHandler = <T extends TabState>(
  setter: (value: number) => void,
  property: keyof T,
  tab: T,
  parser: (value: number) => number = (v) => v
) => {
  return (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const raw = parseInt(e.target.value) || 0;
    const value = parser(raw);
    setter(value);
    tab.setProperty(property as keyof TabState, value);
    tab.updateFile();
  };
};

/**
 * Creates a handler for updating BYTE fields (0-255)
 */
export const createByteFieldHandler = <T extends TabState>(
  setter: (value: number) => void,
  property: keyof T,
  tab: T
) => {
  return createNumberFieldHandler(setter, property, tab, clampByte);
};

/**
 * Creates a handler for updating WORD fields (1-65535)
 */
export const createWordFieldHandler = <T extends TabState>(
  setter: (value: number) => void,
  property: keyof T,
  tab: T
) => {
  return createNumberFieldHandler(setter, property, tab, clampWord);
};

/**
 * Creates a handler for updating boolean/checkbox fields
 */
export const createBooleanFieldHandler = <T extends TabState>(
  setter: (value: boolean) => void,
  property: keyof T,
  tab: T
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setter(value);
    tab.setProperty(property as keyof TabState, value);
    tab.updateFile();
  };
};

/**
 * Creates a handler for updating boolean/checkbox fields
 */
export const createForgeCheckboxFieldHandler = <T extends TabState>(
  setter: (value: boolean) => void,
  property: keyof T,
  tab: T
) => {
  return (value: boolean) => {
    setter(value);
    tab.setProperty(property as keyof TabState, value);
    tab.updateFile();
  };
};

/**
 * Creates a handler for updating ResRef string fields
 */
export const createResRefFieldHandler = <T extends TabState>(
  setter: (value: string) => void,
  property: keyof T,
  tab: T
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeResRef(e.target.value);
    setter(value);
    tab.setProperty(property as keyof TabState, value);
    tab.updateFile();
  };
};

/**
 * Creates a handler for updating CExoString (textarea) fields
 */
export const createCExoStringFieldHandler = <T extends TabState>(
  setter: (value: string) => void,
  property: keyof T,
  tab: T
) => {
  return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setter(e.target.value);
    tab.setProperty(property as keyof TabState, e.target.value);
    tab.updateFile();
  };
};

/**
 * Creates a handler for updating CExoLocString fields
 */
export const createCExoLocStringFieldHandler = <T extends TabState>(
  setter: (value: KotOR.CExoLocString) => void,
  property: keyof T,
  tab: T
) => {
  return (value: KotOR.CExoLocString) => {
    setter(value);
    tab.setProperty(property as keyof TabState, value);
    tab.updateFile();
  };
};

