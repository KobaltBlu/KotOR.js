export interface IPazaakCard {
  name: string;
  type: number;
  modifier: number[];
  modifierLabel: string;
  reversible: boolean;
  negateModifier: boolean;
  textures: string[];
}