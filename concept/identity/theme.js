// Set the saved preference before the page paints. System uses CSS color-scheme.
(function () {
  const key = "cn-site-theme";
  const root = document.documentElement;
  let preference = "system";
  try {
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") preference = saved;
  } catch {
    // Private browsing or file previews can block storage.
  }

  function apply() {
    if (preference === "system") delete root.dataset.theme;
    else root.dataset.theme = preference;
  }

  apply();
  document.addEventListener("DOMContentLoaded", () => {
    const picker = document.querySelector("[data-theme-select]");
    if (!picker) return;
    picker.value = preference;
    picker.closest("label").hidden = false;
    picker.addEventListener("change", () => {
      preference = picker.value;
      apply();
      try {
        localStorage.setItem(key, preference);
      } catch {
        // The selected theme still applies on this page.
      }
    });
  });
})();
