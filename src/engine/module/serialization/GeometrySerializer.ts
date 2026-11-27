import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import * as THREE from 'three';
import type { GffRoot } from '@engine/module/serialization/types';

export type GeometryVertexLabels = 'PointXYZ' | 'XYZ';

export interface GeometryHost {
  geometry?: GFFStruct[];
  vertices: THREE.Vector3[];
}

/**
 * Polygon vertex lists — Trigger uses PointX/Y/Z; Encounter uses X/Y/Z.
 */
export class GeometrySerializer {
  static deserialize(target: GeometryHost, root: GffRoot, labels: GeometryVertexLabels): void {
    if (!root.hasField('Geometry')) return;
    const structs = root.getFieldByLabel('Geometry').getChildStructs?.() || [];
    target.geometry = structs as GFFStruct[];
    target.vertices = [];
    const xLabel = labels === 'PointXYZ' ? 'PointX' : 'X';
    const yLabel = labels === 'PointXYZ' ? 'PointY' : 'Y';
    const zLabel = labels === 'PointXYZ' ? 'PointZ' : 'Z';
    for (let i = 0; i < structs.length; i++) {
      const tgv = structs[i];
      target.vertices[i] = new THREE.Vector3(
        tgv.hasField(xLabel) ? tgv.getFieldByLabel(xLabel).getValue() : 0,
        tgv.hasField(yLabel) ? tgv.getFieldByLabel(yLabel).getValue() : 0,
        tgv.hasField(zLabel) ? tgv.getFieldByLabel(zLabel).getValue() : 0,
      );
    }
  }

  static writeField(
    parent: { addField: (f: GFFField) => GFFField },
    source: GeometryHost,
    labels: GeometryVertexLabels,
    structType = 3,
  ): void {
    const geometry = parent.addField(new GFFField(GFFDataType.LIST, 'Geometry'));
    const xLabel = labels === 'PointXYZ' ? 'PointX' : 'X';
    const yLabel = labels === 'PointXYZ' ? 'PointY' : 'Y';
    const zLabel = labels === 'PointXYZ' ? 'PointZ' : 'Z';
    for (let i = 0; i < source.vertices.length; i++) {
      const vertStruct = new GFFStruct(structType);
      vertStruct.addField(new GFFField(GFFDataType.FLOAT, xLabel)).setValue(source.vertices[i].x);
      vertStruct.addField(new GFFField(GFFDataType.FLOAT, yLabel)).setValue(source.vertices[i].y);
      vertStruct.addField(new GFFField(GFFDataType.FLOAT, zLabel)).setValue(source.vertices[i].z);
      geometry.addChildStruct(vertStruct);
    }
  }
}
