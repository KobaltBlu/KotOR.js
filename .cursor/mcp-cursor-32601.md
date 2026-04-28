# Cursor `MCP error -32601: Method not found` (binary-analysis MCPs)

If a Cursor **command** points at a resource that exists under `mcps/.../prompts/` in this workspace, it is an MCP **prompt**, not a **tool**. Invoking it through `tools/call` (or a shortcut that maps to a tool name) returns **-32601** because there is no such tool.

**What to use instead**

- Use the MCP `prompts/list` and `prompts/get` flow, or
- Use the `list-prompts` *tool* exposed by the same server (see `mcps/.../tools/list-prompts.json`), which lists the available prompt names.

**Summary:** prompts live in `.../prompts/*.json`, tools in `.../tools/*.json`; names do not cross namespaces.
