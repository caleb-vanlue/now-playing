try {
  var t = localStorage.getItem("now-playing-theme");
  if (t === "plex") document.documentElement.setAttribute("data-theme", "plex");
} catch (e) {}
