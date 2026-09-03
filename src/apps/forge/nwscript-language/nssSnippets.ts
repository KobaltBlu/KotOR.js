/**
 * Built-in NWScript editor snippets.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssSnippets.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface NssSnippet {
  label: string;
  insertText: string;
  documentation: string;
  filterText?: string;
  sortText?: string;
}

export const NSS_CONTROL_SNIPPETS: readonly NssSnippet[] = [
  {
    label: "void main()",
    insertText: "void main()\n{\n\t$0\n}",
    documentation: "NWScript main entry point",
    filterText: "main",
    sortText: "0main",
  },
  {
    label: "int StartingConditional()",
    insertText: "int StartingConditional()\n{\n\t$0\n\treturn TRUE;\n}",
    documentation: "Starting conditional that returns TRUE or FALSE",
    filterText: "StartingConditional",
    sortText: "0StartingConditional",
  },
  {
    label: "include",
    insertText: '#include "${1:k_inc_}"',
    documentation: "Include an NSS resource",
    filterText: "include",
    sortText: "0include",
  },
  {
    label: "if",
    insertText: "if (${1:condition}) {\n\t$0\n}",
    documentation: "if statement",
    filterText: "if",
    sortText: "0if",
  },
  {
    label: "ifelse",
    insertText: "if (${1:condition}) {\n\t$0\n} else {\n\t\n}",
    documentation: "If-Else Statement",
    filterText: "ifelse",
    sortText: "0ifelse",
  },
  {
    label: "for",
    insertText: "for (${1:int i = 0}; ${2:i < ${3:10}}; ${4:i++}) {\n\t$0\n}",
    documentation: "for loop",
    filterText: "for",
    sortText: "0for",
  },
  {
    label: "while",
    insertText: "while (${1:condition}) {\n\t$0\n}",
    documentation: "while loop",
    filterText: "while",
    sortText: "0while",
  },
  {
    label: "switch",
    insertText: "switch (${1:expression}) {\n\tcase ${2:value}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}",
    documentation: "switch statement",
    filterText: "switch",
    sortText: "0switch",
  },
  {
    label: "struct",
    insertText: "struct ${1:StructName} {\n\t${2:int} ${3:member};\n\t$0\n};",
    documentation: "struct declaration",
    filterText: "struct",
    sortText: "0struct",
  },
  {
    label: "DelayCommand",
    insertText: 'DelayCommand(${1:0.5}, ${2:ActionDoCommand(ActionSpeakString("${3:text}"))});',
    documentation: "Schedule an action after a delay",
    filterText: "DelayCommand",
    sortText: "0DelayCommand",
  },
  {
    label: "AssignCommand",
    insertText: 'AssignCommand(${1:oTarget}, ${2:ActionSpeakString("${3:text}")});',
    documentation: "Queue an action on another object",
    filterText: "AssignCommand",
    sortText: "0AssignCommand",
  },
  {
    label: "ActionDoCommand",
    insertText: 'ActionDoCommand(${1:ActionSpeakString("${2:text}")});',
    documentation: "Queue an action on the caller",
    filterText: "ActionDoCommand",
    sortText: "0ActionDoCommand",
  },
  {
    label: "convmain",
    insertText: "void main()\n{\n\tobject oSpeaker = GetLastSpeaker();\n\t$0\n}",
    documentation: "Conversation node script using GetLastSpeaker",
    filterText: "convmain",
    sortText: "0convmain",
  },
  {
    label: "effect",
    insertText: "effect e${1:Effect} = Effect${1:VisualEffect}(${2:VFX_IMP_HEALING_S});\nApplyEffectToObject(DURATION_TYPE_${3:INSTANT}, e${1:Effect}, ${4:OBJECT_SELF}${5:, 0.0});",
    documentation: "Create and apply an effect",
    filterText: "effect",
    sortText: "0effect",
  },
  {
    label: "itemprop",
    insertText: "itemproperty ip${1:Prop} = ItemProperty${2:DamageBonus}(${3:IP_CONST_DAMAGETYPE_FIRE}, ${4:IP_CONST_DAMAGEBONUS_1d4});\nAddItemProperty(DURATION_TYPE_${5:PERMANENT}, ip${1:Prop}, ${6:oItem}${7:, 0.0});",
    documentation: "Create and add an item property",
    filterText: "itemprop",
    sortText: "0itemprop",
  },
  {
    label: "GetScriptParameter",
    insertText: "GetScriptParameter(${1:1})",
    documentation: "K2/TSL script parameter from a conversation node",
    filterText: "GetScriptParameter",
    sortText: "0GetScriptParameter",
  },
];

export const NSS_KEYWORDS = ["void", "int", "float", "string", "object", "vector", "struct", "action"] as const;
