import React from "react";
import { createRoot } from "react-dom/client";
import FaceitToLeetifyButton from "./FaceitToLeetifyButton";
import { FaceitToLeetifyLoadEventPayload, global } from "./global";
import { injectPlayerBadges, resetPlayerCache } from "./PlayerBadgeInjector";

console.log("Loaded LeetLens extension for FACEIT");

if (new URLSearchParams(location.search).get("faceit-to-leetify") === "auto") {
  global.automatic = true;
}

document.addEventListener("faceitToLeetify__load", (event) => {
  if (!("detail" in event)) {
    return;
  }
  const payload = event.detail as FaceitToLeetifyLoadEventPayload;
  global.autoUpload = payload.autoUpload;
});

let lastUrl = location.href;
let debounceTimer: number | null = null;
let isProcessing = false;

function onDomChange() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    resetPlayerCache();
  }

  if (!document.getElementById("__faceit-to-leetify")) {
    const parent = document.querySelector<HTMLDivElement>("div[name=info]");
    if (parent && parent.querySelector("#cf-turnstile")) {
      parent.style.marginLeft = "-8px";
      parent.style.marginRight = "-8px";
      parent.style.padding = "16px 8px";

      let button = parent.querySelector(
        "div:first-child > div:first-child > button > span"
      )?.parentElement;

      if (button) {
        const div = document.createElement("div");
        div.id = "__faceit-to-leetify";
        div.style.marginTop = "16px";
        div.style.marginBottom = "16px";
        button.after(div);

        const root = createRoot(div);
        root.render(<FaceitToLeetifyButton />);
      }
    }
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  if (!isProcessing) {
    debounceTimer = window.setTimeout(() => {
      isProcessing = true;
      injectPlayerBadges().finally(() => {
        isProcessing = false;
      });
    }, 500);
  }
}

onDomChange();

const observer = new MutationObserver((mutations) => {
  const dominated = mutations.some(m => 
    (m.target as Element).closest?.(".__leetlens-badge") ||
    (m.target as Element).classList?.contains("__leetlens-badge")
  );
  if (!dominated) {
    onDomChange();
  }
});
observer.observe(document.documentElement, { subtree: true, childList: true });
