/**
 * Initialisation du viewport - Full viewport
 * 
 * @deprecated since version 0.1
 */
(() => {
  h = window.innerHeight + "px";
  document.styleSheets[1].cssRules[1].style.height = h;
})();