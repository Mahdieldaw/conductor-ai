// src/content/primitives/helpers.js
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      }
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Element with selector "${selector}" not found after ${timeout}ms`));
    }, timeout);
  });
}