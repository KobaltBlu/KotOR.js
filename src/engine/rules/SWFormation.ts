import { TwoDAObject } from "@core/resource/TwoDAObject";

/** formations.2da row. Positions are indexed 1..10. */
export class SWFormation {
  id: number = -1;
  angles: number[] = new Array(11);
  distances: number[] = new Array(11);

  static From2DA(row: any = {}): SWFormation {
    const formation = new SWFormation();
    formation.id = TwoDAObject.normalizeValue(row.__index ?? row.__rowIndex, 'number', -1) as number;
    for(let position = 1; position <= 10; position++){
      formation.angles[position] = TwoDAObject.normalizeValue(
        row[`angle_${position}`] ?? row[`ANGLE_${position}`],
        'number',
        0
      ) as number;
      formation.distances[position] = TwoDAObject.normalizeValue(
        row[`distance_${position}`] ?? row[`DISTANCE_${position}`],
        'number',
        0
      ) as number;
    }
    return formation;
  }
}
