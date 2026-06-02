// Catch wallet extension errors during hydration
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    if (
      e.message?.includes("ethereum") ||
      e.message?.includes("Cannot set property") ||
      e.message?.includes("getter")
    ) {
      e.preventDefault();
    }
  });
}
