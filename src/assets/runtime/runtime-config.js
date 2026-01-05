// Runtime configuration.
// This file is intentionally plain JS and can be replaced by hosting/container tooling.
// Consumers should read it via `window.RUNTIME_CONFIG`.

window.RUNTIME_CONFIG = Object.assign(
  {
    // Serve under a path prefix, e.g. "/kotor". Use "" for domain root.
    basePath: "",
  },
  window.RUNTIME_CONFIG || {}
);


