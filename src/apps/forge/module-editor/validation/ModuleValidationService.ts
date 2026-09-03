/**
 * Incremental module validation service.
 *
 * @file ModuleValidationService.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import type { ForgeModule } from "@/apps/forge/module-editor/ForgeModule";
import type { ForgeArea } from "@/apps/forge/module-editor/ForgeArea";
import type { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import { PerformanceBaseline } from "@/apps/forge/module-editor/kernel/PerformanceBaseline";
import {
  emptyValidationReport,
  summarizeIssues,
  ValidationIssue,
  ValidationReport,
} from "@/apps/forge/module-editor/validation/ModuleValidationTypes";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";

let issueSeq = 1;

function issue(
  severity: ValidationIssue["severity"],
  category: ValidationIssue["category"],
  message: string,
  extra: Partial<ValidationIssue> = {},
): ValidationIssue {
  return {
    id: `val-${issueSeq++}`,
    severity,
    category,
    message,
    ...extra,
  };
}

function objectKey(object: ForgeGameObject): string {
  return String((object as any).uuid || (object as any).tag || object.templateResRef || "");
}

export class ModuleValidationService extends EventListenerModel {
  private lastReport: ValidationReport = emptyValidationReport();
  private running = false;

  getReport(): ValidationReport {
    return this.lastReport;
  }

  async validateModule(module: ForgeModule | undefined): Promise<ValidationReport> {
    if (this.running) {
      return this.lastReport;
    }
    this.running = true;
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const issues: ValidationIssue[] = [];
      if (!module?.area) {
        issues.push(issue("error", "export", "Module has no area loaded."));
      } else {
        this.validateArea(module.area, issues);
        await this.validateScripts(issues);
      }
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      this.lastReport = summarizeIssues(issues, end - start);
      PerformanceBaseline.mark("validation.run", this.lastReport.durationMs, `${issues.length} issues`);
      this.processEventListener("onValidationCompleted", [this.lastReport]);
      return this.lastReport;
    } finally {
      this.running = false;
    }
  }

  private validateArea(area: ForgeArea, issues: ValidationIssue[]): void {
    const tagCounts = new Map<string, ForgeGameObject[]>();
    const all = this.collectObjects(area);
    for (const object of all) {
      const tag = String((object as any).tag || "").trim();
      if (tag) {
        const list = tagCounts.get(tag.toLowerCase()) || [];
        list.push(object);
        tagCounts.set(tag.toLowerCase(), list);
      }
      const template = String(object.templateResRef || "").trim();
      if (!template && this.requiresTemplate(object)) {
        issues.push(issue("error", "template", `Object is missing a template ResRef.`, {
          objectUuid: objectKey(object),
          objectTag: tag || undefined,
          field: "TemplateResRef",
          fixHint: "Assign a blueprint ResRef in the inspector.",
        }));
      }
      if (typeof (object as any).geometry !== "undefined") {
        const geometry = (object as any).geometry;
        if (Array.isArray(geometry) && geometry.length > 0 && geometry.length < 3) {
          issues.push(issue("warning", "geometry", `Geometry has fewer than 3 vertices.`, {
            objectUuid: objectKey(object),
            objectTag: tag || undefined,
            category: "geometry",
          }));
        }
      }
    }
    for (const [tag, list] of tagCounts) {
      if (list.length > 1) {
        issues.push(issue("warning", "tag", `Duplicate tag "${tag}" used by ${list.length} objects.`, {
          objectTag: tag,
          fixHint: "Tags should be unique within a module.",
        }));
      }
    }

    if (!area.layout) {
      issues.push(issue("warning", "lyt", "Area has no LYT layout loaded."));
    } else if (!area.layout.rooms?.length) {
      issues.push(issue("warning", "lyt", "LYT layout contains no rooms."));
    }

    if (!area.visObject) {
      issues.push(issue("info", "vis", "Area has no VIS visibility graph loaded."));
    }
  }

  private collectObjects(area: ForgeArea): ForgeGameObject[] {
    const buckets = [
      area.creatures,
      area.doors,
      area.placeables,
      area.triggers,
      area.encounters,
      area.waypoints,
      area.sounds,
      area.stores,
      area.items,
    ];
    const out: ForgeGameObject[] = [];
    for (const bucket of buckets) {
      if (Array.isArray(bucket)) {
        out.push(...bucket);
      }
    }
    return out;
  }

  private requiresTemplate(object: ForgeGameObject): boolean {
    const name = object.constructor?.name || "";
    return /Creature|Door|Placeable|Trigger|Encounter|Waypoint|Sound|Store|Item/i.test(name);
  }

  private async validateScripts(issues: ValidationIssue[]): Promise<void> {
    if (!ProjectFileSystem.hasRoot()) {
      return;
    }
    try {
      const entries = await ProjectFileSystem.readdir(".");
      const lower = entries.map((e) => e.toLowerCase());
      const nss = lower.filter((e) => e.endsWith(".nss"));
      for (const script of nss) {
        const base = script.replace(/\.nss$/i, "");
        const hasNcs = lower.includes(`${base}.ncs`);
        if (!hasNcs) {
          issues.push(issue("warning", "script", `Script "${base}.nss" has no compiled .ncs.`, {
            resource: script,
            fixHint: "Compile scripts before preview/export.",
            severity: "warning",
          }));
        }
      }
    } catch (error) {
      issues.push(issue("info", "script", "Could not scan project scripts for missing NCS files."));
    }
  }
}
