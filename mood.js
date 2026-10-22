(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WeatherMood = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Deterministic priority order: extreme heat, extreme cold, muggy, windy, pleasant, comfortable, mixed.
  function moodFor(current) {
    const temp = Number(current.temp_c);
    const humidity = Number(current.humidity);
    const wind = Number(current.wind_kph);
    if (temp >= 38) return { name: "Scorching", face: "☀", color: "#ff9a5c", description: "Take it slow, seek shade, and keep water close." };
    if (temp <= 5) return { name: "Freezing", face: "❄", color: "#8ac8ff", description: "Bundle up and give yourself a little extra warmth." };
    if (humidity >= 80 && temp >= 28) return { name: "Muggy", face: "〰", color: "#d6a2ff", description: "Warm, moisture-heavy air may feel more tiring than usual." };
    if (wind >= 30) return { name: "Windy", face: "≋", color: "#65d9d0", description: "A breezy day — secure loose items and plan for gusts." };
    if (temp >= 20 && temp <= 30 && humidity <= 60 && wind <= 20) return { name: "Pleasant", face: "☻", color: "#75e7a4", description: "Comfortable conditions for getting outside and about." };
    if (temp >= 15 && temp <= 30 && humidity <= 75 && wind <= 30) return { name: "Comfortable", face: "◡", color: "#a8dfb8", description: "A fairly balanced day. Dress comfortably and enjoy it." };
    return { name: "Mixed", face: "◌", color: "#f3ca7a", description: "Conditions are a mix — check the details before heading out." };
  }
  return { moodFor };
});
