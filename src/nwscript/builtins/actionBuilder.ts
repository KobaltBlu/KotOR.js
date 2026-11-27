import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";

export type EngineVariant = "kotor" | "tsl";
export type Availability = "all" | "kotor" | "tsl";

export type ParamDef<
  Name extends string,
  RuntimeType,
  ScriptType extends NWScriptDataType
> = {
  name: Name;
  type: ScriptType;
  availability?: Availability;
  optional?: boolean;
  default?: RuntimeType;
  description?: string;
};

export type ParamRuntimeType<P> =
  P extends ParamDef<string, infer T, NWScriptDataType> ? T : never;

export type ParamTuple<TParams extends readonly ParamDef<string, any, NWScriptDataType>[]> = {
  [K in keyof TParams]: ParamRuntimeType<TParams[K]>;
};

export type ActionImpl<
  TParams extends readonly ParamDef<string, any, NWScriptDataType>[],
  TResult
> = (this: NWScriptInstance, ...args: ParamTuple<TParams>) => TResult;

export type SharedActionDefinition<
  TParams extends readonly ParamDef<string, any, NWScriptDataType>[],
  TResult
> = {
  kind?: "shared";
  availability?: Availability;
  id: number;
  name: string;
  comment: string;
  returnType: NWScriptDataType;
  params: TParams;
  kotor?: ActionImpl<TParams, TResult>;
  tsl?: ActionImpl<TParams, TResult>;
};

export type ActionVariant = {
  name: string;
  comment: string;
  returnType: NWScriptDataType;
  params: readonly ParamDef<string, any, NWScriptDataType>[];
  implementation?: (this: NWScriptInstance, ...args: any[]) => any;
};

export type VariantActionDefinition = {
  kind: "variant";
  id: number;
  kotor?: ActionVariant;
  tsl?: ActionVariant;
};

export type AnyActionDefinition =
  | SharedActionDefinition<readonly ParamDef<string, any, NWScriptDataType>[], any>
  | VariantActionDefinition;

export function defineAction<
  TParams extends readonly ParamDef<string, any, NWScriptDataType>[],
  TResult
>(definition: SharedActionDefinition<TParams, TResult>) {
  return definition;
}

export function defineVariantAction(definition: VariantActionDefinition) {
  return definition;
}

function normalizeAvailability(availability: Availability | undefined): Availability {
  return availability ?? "all";
}

function isAvailableInEngine(availability: Availability | undefined, engine: EngineVariant): boolean {
  const normalized = normalizeAvailability(availability);
  if (normalized === "all") return true;
  return normalized === engine;
}

function isParamVisibleInEngine(
  param: ParamDef<string, any, NWScriptDataType>,
  engine: EngineVariant,
): boolean {
  return isAvailableInEngine(param.availability, engine);
}

function inflateArgs(
  params: readonly ParamDef<string, any, NWScriptDataType>[],
  engine: EngineVariant,
  rawArgs: any[],
): any[] {
  const inflated: any[] = [];
  let rawIndex = 0;

  for (const param of params) {
    if (isParamVisibleInEngine(param, engine)) {
      const value = rawIndex < rawArgs.length ? rawArgs[rawIndex] : undefined;
      rawIndex += 1;
      inflated.push(value === undefined ? param.default : value);
    } else {
      inflated.push(param.default);
    }
  }

  return inflated;
}

function selectVariantAction(
  action: VariantActionDefinition,
  engine: EngineVariant,
): ActionVariant | undefined {
  if (engine === "tsl") {
    return action.tsl ?? action.kotor;
  }

  return action.kotor;
}

export function buildRuntimeAction(
  action: AnyActionDefinition,
  engine: EngineVariant,
): INWScriptDefAction | undefined {
  if (action.kind === "variant") {
    const variant = selectVariantAction(action, engine);
    if (!variant) {
      return undefined;
    }

    return {
      comment: variant.comment,
      name: variant.name,
      type: variant.returnType,
      args: variant.params
        .filter((param) => isParamVisibleInEngine(param, engine))
        .map((param) => param.type),
      action: variant.implementation
        ? function(this: NWScriptInstance, rawArgs: any[]) {
            const inflated = inflateArgs(variant.params, engine, rawArgs);
            return variant.implementation!.apply(this, inflated);
          }
        : undefined,
    };
  }

  if (!isAvailableInEngine(action.availability, engine)) {
    return undefined;
  }

  const impl = engine === "tsl" ? (action.tsl ?? action.kotor) : action.kotor;

  return {
    comment: action.comment,
    name: action.name,
    type: action.returnType,
    args: action.params
      .filter((param) => isParamVisibleInEngine(param, engine))
      .map((param) => param.type),
    action: impl
      ? function(this: NWScriptInstance, rawArgs: any[]) {
          const inflated = inflateArgs(action.params, engine, rawArgs);
          return impl.apply(this, inflated);
        }
      : undefined,
  };
}

/** Build an explicit engine table without silently replacing a registered routine. */
export function buildRuntimeActionMap(
  actions: readonly AnyActionDefinition[],
  engine: EngineVariant,
): { [key: number]: INWScriptDefAction } {
  const result: { [key: number]: INWScriptDefAction } = {};
  for (const definition of actions) {
    const action = buildRuntimeAction(definition, engine);
    if (!action) continue;
    // Mutually exclusive K1/TSL definitions may intentionally share an ID.
    // Two definitions active in the same engine, even with identical names,
    // are an ambiguous registration and must not depend on import order.
    if (Object.prototype.hasOwnProperty.call(result, definition.id)) {
      throw new Error(
        `Duplicate NWScript action ID ${definition.id} for ${engine}: ` +
        `${result[definition.id].name} and ${action.name}`,
      );
    }
    result[definition.id] = action;
  }
  return result;
}

export function intParam<Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, number, NWScriptDataType.INTEGER>>, "name" | "type"> = {},
): ParamDef<Name, number, NWScriptDataType.INTEGER> {
  return { name, type: NWScriptDataType.INTEGER, ...options };
}

export function floatParam<Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, number, NWScriptDataType.FLOAT>>, "name" | "type"> = {},
): ParamDef<Name, number, NWScriptDataType.FLOAT> {
  return { name, type: NWScriptDataType.FLOAT, ...options };
}

export function stringParam<Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, string, NWScriptDataType.STRING>>, "name" | "type"> = {},
): ParamDef<Name, string, NWScriptDataType.STRING> {
  return { name, type: NWScriptDataType.STRING, ...options };
}

export function objectParam<TObject, Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, TObject, NWScriptDataType.OBJECT>>, "name" | "type"> = {},
): ParamDef<Name, TObject, NWScriptDataType.OBJECT> {
  return { name, type: NWScriptDataType.OBJECT, ...options };
}

export function locationParam<TLocation, Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, TLocation, NWScriptDataType.LOCATION>>, "name" | "type"> = {},
): ParamDef<Name, TLocation, NWScriptDataType.LOCATION> {
  return { name, type: NWScriptDataType.LOCATION, ...options };
}

export function vectorParam<TVector, Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, TVector, NWScriptDataType.VECTOR>>, "name" | "type"> = {},
): ParamDef<Name, TVector, NWScriptDataType.VECTOR> {
  return { name, type: NWScriptDataType.VECTOR, ...options };
}

export function effectParam<TEffect, Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, TEffect, NWScriptDataType.EFFECT>>, "name" | "type"> = {},
): ParamDef<Name, TEffect, NWScriptDataType.EFFECT> {
  return { name, type: NWScriptDataType.EFFECT, ...options };
}

export function eventParam<TEvent, Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, TEvent, NWScriptDataType.EVENT>>, "name" | "type"> = {},
): ParamDef<Name, TEvent, NWScriptDataType.EVENT> {
  return { name, type: NWScriptDataType.EVENT, ...options };
}

export function actionParam<TAction, Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, TAction, NWScriptDataType.ACTION>>, "name" | "type"> = {},
): ParamDef<Name, TAction, NWScriptDataType.ACTION> {
  return { name, type: NWScriptDataType.ACTION, ...options };
}

export function talentParam<TTalent, Name extends string = string>(
  name: Name,
  options: Omit<Partial<ParamDef<Name, TTalent, NWScriptDataType.TALENT>>, "name" | "type"> = {},
): ParamDef<Name, TTalent, NWScriptDataType.TALENT> {
  return { name, type: NWScriptDataType.TALENT, ...options };
}
