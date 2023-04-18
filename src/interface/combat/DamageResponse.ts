import { DamageType } from "../../enums/combat/DamageType";

export interface DamageResponse {
  type: DamageType;
  amount: number;
}