/* 小红书旧 WebView 的局部兼容层，先于应用经典脚本执行。 */
(function () {
  if (typeof globalThis === "undefined") window.globalThis = window;
  if (!Array.prototype.flatMap) Object.defineProperty(Array.prototype, "flatMap", {
    value: function (callback, receiver) {
      return this.reduce(function (result, item, index, array) {
        return result.concat(callback.call(receiver, item, index, array));
      }, []);
    }, configurable: true, writable: true
  });
  if (!Object.fromEntries) Object.fromEntries = function (entries) {
    var result = {};
    Array.from(entries).forEach(function (entry) {
      Object.defineProperty(result, entry[0], { value: entry[1], enumerable: true, writable: true, configurable: true });
    });
    return result;
  };
  var root = document.documentElement;
  function supports(property, value) { return !!(window.CSS && CSS.supports(property, value)); }
  var container = supports("container-type", "size") && supports("width", "1cqw");
  var ratio = supports("aspect-ratio", "1");
  if (!supports("display", "contents")) root.classList.add("no-contents");
  var probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px";
  probe.appendChild(document.createElement("div")); probe.appendChild(document.createElement("div"));
  document.body.appendChild(probe);
  var gap = probe.scrollHeight === 1;
  probe.parentNode.removeChild(probe);
  if (!gap) root.classList.add("no-flex-gap");
  var pending = false;
  function sized(element, property, value) {
    var text = Math.max(0, value) + "px";
    if (element.style[property] !== text) element.style[property] = text;
  }
  function layout() {
    pending = false;
    root.style.setProperty("--app-height", window.innerHeight + "px");
    var compact = window.innerWidth <= 650;
    if (!container) {
      document.querySelectorAll(".story-spread").forEach(function (spread) {
        var style = getComputedStyle(spread);
        var art = spread.querySelector(".scene-art");
        if (!art) return;
        if (!compact) { art.style.height = ""; return; }
        var budget = spread.clientHeight - parseFloat(style.getPropertyValue("--reading-reserve")) - parseFloat(style.getPropertyValue("--actions-height")) - parseFloat(style.getPropertyValue("--stage-extras"));
        sized(art, "height", Math.min(spread.clientWidth * 2 / 3, Math.max(0, budget)));
      });
      document.querySelectorAll(".narrative-world,.board-world").forEach(function (world) {
        if (!compact) { world.style.width = ""; world.style.height = ""; return; }
        var scene = world.closest(".scene-art");
        if (!scene) return;
        var width = Math.min(scene.clientWidth, scene.clientHeight * 1.5);
        sized(world, "width", width); sized(world, "height", width * 2 / 3);
      });
    }
    if (!ratio) {
      document.querySelectorAll(".find-object,.stone-slot,.fixed-stone,.plate").forEach(function (element) {
        sized(element, "height", element.getBoundingClientRect().width);
      });
      if (!compact) document.querySelectorAll(".story-page .scene-art").forEach(function (element) {
        sized(element, "height", element.clientWidth * 2 / 3);
      });
    }
    if (!gap) document.querySelectorAll("#root *").forEach(function (element) {
      if (element.children.length < 2) return;
      var style = getComputedStyle(element);
      if (style.display !== "flex" && style.display !== "inline-flex") return;
      var column = style.flexDirection.indexOf("column") === 0;
      var spacing = column ? style.rowGap : style.columnGap;
      element.setAttribute("data-xhs-flex", column ? "column" : "row");
      element.style.setProperty("--xhs-gap", spacing && spacing !== "normal" ? spacing : "6px");
    });
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(layout); } }
  new MutationObserver(schedule).observe(document.getElementById("root"), { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", schedule);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", schedule);
  layout();
})();
