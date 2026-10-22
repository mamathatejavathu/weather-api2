const test = require("node:test");
const assert = require("node:assert/strict");
const { moodFor } = require("../mood.js");

test("extreme heat and cold have highest priority", () => {
  assert.equal(moodFor({ temp_c: 38, humidity: 90, wind_kph: 40 }).name, "Scorching");
  assert.equal(moodFor({ temp_c: 5, humidity: 50, wind_kph: 35 }).name, "Freezing");
});
test("humid hot weather is muggy before wind is considered", () => {
  assert.equal(moodFor({ temp_c: 29, humidity: 80, wind_kph: 35 }).name, "Muggy");
});
test("windy conditions take priority over comfort", () => {
  assert.equal(moodFor({ temp_c: 24, humidity: 40, wind_kph: 30 }).name, "Windy");
});
test("pleasant and comfortable bands work", () => {
  assert.equal(moodFor({ temp_c: 24, humidity: 50, wind_kph: 10 }).name, "Pleasant");
  assert.equal(moodFor({ temp_c: 18, humidity: 70, wind_kph: 15 }).name, "Comfortable");
});
test("remaining conditions are mixed", () => {
  assert.equal(moodFor({ temp_c: 34, humidity: 50, wind_kph: 10 }).name, "Mixed");
});
