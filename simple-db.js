const fs = require("fs");

function loadDB(path) {
  if (!fs.existsSync(path)) {
    const initial = { repos: [] };
    fs.writeFileSync(path, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(path, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("DB load error, reinitializing:", e);
    const initial = { repos: [] };
    fs.writeFileSync(path, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function saveDB(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

module.exports = { loadDB, saveDB };