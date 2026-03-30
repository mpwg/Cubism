import { setConsoleFunction } from "three";

const clockDeprecationMessage = "THREE.THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";

setConsoleFunction((level, message, ...params) => {
  if (level === "warn" && message === clockDeprecationMessage) {
    return;
  }

  const target = globalThis.console[level];
  if (typeof target === "function") {
    target.call(globalThis.console, message, ...params);
  }
});
