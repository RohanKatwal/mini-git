const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const { nanoid } = require("nanoid");
const dayjs = require("dayjs");
const { loadDB, saveDB } = require("./simple-db");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Ensure DB exists
const dbPath = path.join(__dirname, "data.json");
let db = loadDB(dbPath);

// Helpers
function findRepo(id) {
  return db.repos.find(r => r.id === id);
}

function save() {
  saveDB(dbPath, db);
}

// Routes
app.get("/", (req, res) => {
  res.render("home", { repos: db.repos, dayjs });
});

// Create repo
app.post("/repos", (req, res) => {
  const { name, description = "", owner = "guest", visibility = "public" } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).send("Repository name is required");
  }
  const repo = {
    id: nanoid(10),
    name: name.trim(),
    description: description.trim(),
    owner: owner.trim() || "guest",
    visibility,
    createdAt: new Date().toISOString(),
    files: [],        // [{id,name,content,updatedAt}]
    commits: []       // [{id,message,timestamp,filesSnapshot}]
  };
  db.repos.push(repo);
  // Initial commit
  repo.commits.push({
    id: nanoid(8),
    message: "Initial commit",
    timestamp: new Date().toISOString(),
    filesSnapshot: []
  });
  save();
  res.redirect(`/repo/${repo.id}`);
});

// Repo page
app.get("/repo/:id", (req, res) => {
  const repo = findRepo(req.params.id);
  if (!repo) return res.status(404).send("Repo not found");
  res.render("repo", { repo, dayjs });
});

// Create or update a file in repo
app.post("/repo/:id/files", (req, res) => {
  const repo = findRepo(req.params.id);
  if (!repo) return res.status(404).send("Repo not found");
  const { filename, content = "", message = "Update file" } = req.body;
  if (!filename || !filename.trim()) {
    return res.status(400).send("Filename is required");
  }
  const name = filename.trim();
  let file = repo.files.find(f => f.name === name);
  if (!file) {
    file = { id: nanoid(10), name, content, updatedAt: new Date().toISOString() };
    repo.files.push(file);
  } else {
    file.content = content;
    file.updatedAt = new Date().toISOString();
  }
  // Create commit with snapshot of files
  repo.commits.push({
    id: nanoid(8),
    message: message && message.trim() ? message.trim() : "Update",
    timestamp: new Date().toISOString(),
    filesSnapshot: repo.files.map(f => ({ id: f.id, name: f.name, content: f.content, updatedAt: f.updatedAt }))
  });
  save();
  res.redirect(`/repo/${repo.id}/file/${file.id}`);
});

// View a file
app.get("/repo/:id/file/:fileId", (req, res) => {
  const repo = findRepo(req.params.id);
  if (!repo) return res.status(404).send("Repo not found");
  const file = repo.files.find(f => f.id === req.params.fileId);
  if (!file) return res.status(404).send("File not found");
  res.render("file", { repo, file, dayjs });
});

// Delete a file
app.delete("/repo/:id/file/:fileId", (req, res) => {
  const repo = findRepo(req.params.id);
  if (!repo) return res.status(404).send("Repo not found");
  const idx = repo.files.findIndex(f => f.id === req.params.fileId);
  if (idx === -1) return res.status(404).send("File not found");
  const removed = repo.files.splice(idx, 1);
  repo.commits.push({
    id: nanoid(8),
    message: `Delete ${removed[0].name}`,
    timestamp: new Date().toISOString(),
    filesSnapshot: repo.files.map(f => ({ id: f.id, name: f.name, content: f.content, updatedAt: f.updatedAt }))
  });
  save();
  res.redirect(`/repo/${repo.id}`);
});

// Commit history
app.get("/repo/:id/commits", (req, res) => {
  const repo = findRepo(req.params.id);
  if (!repo) return res.status(404).send("Repo not found");
  const commits = [...repo.commits].reverse();
  res.render("commits", { repo, commits, dayjs });
});

// View specific commit snapshot (simple)
app.get("/repo/:id/commit/:commitId", (req, res) => {
  const repo = findRepo(req.params.id);
  if (!repo) return res.status(404).send("Repo not found");
  const commit = repo.commits.find(c => c.id === req.params.commitId);
  if (!commit) return res.status(404).send("Commit not found");
  res.render("commit", { repo, commit, dayjs });
});

app.listen(PORT, () => {
  console.log(`Mini GitHub running at http://localhost:${PORT}`);
});