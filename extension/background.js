/**
 * NexLoad Cookie Exporter — background.js
 * Service worker: handles extension install + badge
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("[NexLoad] Cookie Exporter installed");
});
