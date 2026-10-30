const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");
const { randomBytes, createHash, scrypt, scryptSync, timingSafeEqual } = require("crypto");
const { promisify } = require("util");
const scryptAsync = promisify(scrypt);

const app = express();
const PORT = process.env.PORT || 3001;

// Store the database file in the server folder.
const db = new Database(path.join(__dirname, "helpdesk.sqlite"));

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());

// Local demo accounts and database-backed cookie sessions.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('employee', 'it_agent', 'admin')),
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
`);

const demoPassword = "TopTrustDemo!2026";
const demoUsers = [
  { id: "user-employee-ama", full_name: "Ama Mensah", email: "ama.mensah@toptrust.demo", role: "employee" },
  { id: "user-agent-kwame", full_name: "Kwame Asante", email: "kwame.asante@toptrust.demo", role: "it_agent" },
  { id: "user-admin-kofi", full_name: "Kofi Mensah", email: "kofi.mensah@toptrust.demo", role: "admin" },
];
const findUserByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const addDemoUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, full_name, email, role, password_salt, password_hash)
  VALUES (@id, @full_name, @email, @role, @password_salt, @password_hash)
`);
for (const user of demoUsers) {
  const salt = randomBytes(16).toString("hex");
  addDemoUser.run({ ...user, password_salt: salt, password_hash: scryptSync(demoPassword, salt, 64).toString("hex") });
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readSessionToken(req) {
  const cookies = req.headers.cookie || "";
  const sessionCookie = cookies.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith("toptrust_session="));
  return sessionCookie ? decodeURIComponent(sessionCookie.slice("toptrust_session=".length)) : null;
}

function requireAuth(req, res, next) {
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  const session = db.prepare(`
    SELECT users.id, users.full_name, users.email, users.role, sessions.token_hash
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashSessionToken(token), Date.now());
  if (!session) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  req.user = { id: session.id, full_name: session.full_name, email: session.email, role: session.role };
  req.sessionTokenHash = session.token_hash;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Your account does not have permission to do that." });
    }
    next();
  };
}

// Create the tickets table the first time the server runs.
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    requester TEXT NOT NULL DEFAULT 'Fictional Employee',
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    assignee TEXT,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

// Add requester to databases created by the earlier version of this stage.
const ticketColumns = db.prepare("PRAGMA table_info(tickets)").all();
if (!ticketColumns.some((column) => column.name === "requester")) {
  db.exec("ALTER TABLE tickets ADD COLUMN requester TEXT NOT NULL DEFAULT 'Fictional Employee'");
}
if (!ticketColumns.some((column) => column.name === "updated_at")) {
  db.exec("ALTER TABLE tickets ADD COLUMN updated_at TEXT");
}

// Add fictional examples only when the table is empty.
const ticketCount = db.prepare("SELECT COUNT(*) AS count FROM tickets").get();

if (ticketCount.count === 0) {
  const addTicket = db.prepare(`
    INSERT INTO tickets
      (id, title, requester, category, priority, status, assignee, description, created_at)
    VALUES
      (@id, @title, @requester, @category, @priority, @status, @assignee, @description, @created_at)
  `);

  const examples = [
    {
      id: "HD-1001",
      title: "Branch workstation cannot reach internal network",
      requester: "Ama Mensah",
      category: "Network",
      priority: "High",
      status: "Open",
      assignee: "Kwame Asante",
      description: "Fictional TopTrust Bank demo: a branch workstation cannot connect to the internal staff network.",
      created_at: new Date().toISOString(),
    },
    {
      id: "HD-1002",
      title: "Request access to sandbox transaction system",
      requester: "Kojo Owusu",
      category: "Software",
      priority: "Medium",
      status: "In progress",
      assignee: "Abena Osei",
      description: "Fictional TopTrust Bank demo: a staff member needs approved access to the training sandbox.",
      created_at: new Date().toISOString(),
    },
  ];

  for (const ticket of examples) addTicket.run(ticket);
}

// Rename only the two original built-in demo rows. User-created tickets are untouched.
db.exec("CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY)");
const nameMigration = "toptrust-ghana-demo-names-v1";
const migrationApplied = db.prepare("SELECT name FROM app_migrations WHERE name = ?").get(nameMigration);
if (!migrationApplied) {
  const updateDemoTicket = db.prepare(`
    UPDATE tickets
    SET title = @title, requester = @requester, assignee = @assignee,
        description = @description
    WHERE id = @id
  `);
  updateDemoTicket.run({
    id: "HD-1001",
    title: "Branch workstation cannot reach internal network",
    requester: "Ama Mensah",
    assignee: "Kwame Asante",
    description: "Fictional TopTrust Bank demo: a branch workstation cannot connect to the internal staff network.",
  });
  updateDemoTicket.run({
    id: "HD-1002",
    title: "Request access to sandbox transaction system",
    requester: "Kojo Owusu",
    assignee: "Abena Osei",
    description: "Fictional TopTrust Bank demo: a staff member needs approved access to the training sandbox.",
  });
  db.prepare("INSERT INTO app_migrations (name) VALUES (?)").run(nameMigration);
}

// Store the fictional queue examples in SQLite so dashboard charts use real records.
const ticketExamplesMigration = "toptrust-bank-ticket-examples-v1";
const examplesApplied = db.prepare("SELECT name FROM app_migrations WHERE name = ?").get(ticketExamplesMigration);
if (!examplesApplied) {
  const exampleNow = Date.now();
  const addExample = db.prepare(`
    INSERT OR IGNORE INTO tickets
      (id, title, requester, category, priority, status, assignee, description, created_at)
    VALUES
      (@id, @title, @requester, @category, @priority, @status, @assignee, @description, @created_at)
  `);
  const queueExamples = [
    { id: "HD-2048", title: "Branch workstation cannot reach internal network", requester: "Ama Mensah", category: "Network", priority: "High", status: "In progress", assignee: "Kwame Asante", description: "Fictional demo: a branch workstation cannot connect to the internal staff network.", ageMinutes: 12 },
    { id: "HD-2047", title: "Request access to sandbox transaction system", requester: "Kojo Owusu", category: "Access", priority: "Medium", status: "Open", assignee: null, description: "Fictional demo: a staff member needs approved access to the training sandbox.", ageMinutes: 28 },
    { id: "HD-2046", title: "Branch workstation monitor flickering", requester: "Abena Boateng", category: "Hardware", priority: "Low", status: "Open", assignee: "Esi Mensah", description: "Fictional demo: the monitor at a staff workstation flickers after restart.", ageMinutes: 60 },
    { id: "HD-2045", title: "Staff portal password reset blocked by MFA", requester: "Yaw Osei", category: "Access", priority: "Urgent", status: "Escalated", assignee: "Kojo Boateng", description: "Fictional demo: a staff member cannot complete a password reset because their test MFA device is unavailable.", ageMinutes: 120 },
    { id: "HD-2044", title: "Install approved document software", requester: "Akosua Asante", category: "Software", priority: "Medium", status: "Resolved", assignee: "Abena Osei", description: "Fictional demo: install an approved document tool on a training workstation.", ageMinutes: 24 * 60 },
  ];
  for (const ticket of queueExamples) {
    const { ageMinutes, ...record } = ticket;
    addExample.run({ ...record, created_at: new Date(exampleNow - ageMinutes * 60 * 1000).toISOString() });
  }
  db.prepare("INSERT INTO app_migrations (name) VALUES (?)").run(ticketExamplesMigration);
}

app.post("/api/auth/login", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!email || !password || password.length > 200) {
    return res.status(400).json({ error: "Enter your email and password." });
  }

  const user = findUserByEmail.get(email);
  const salt = user?.password_salt || "toptrust-invalid-user-salt";
  const expectedHash = user?.password_hash || scryptSync("invalid-password", salt, 64).toString("hex");
  const passwordHash = await scryptAsync(password, salt, 64);
  const matches = timingSafeEqual(passwordHash, Buffer.from(expectedHash, "hex"));
  if (!user || !matches) return res.status(401).json({ error: "Email or password is incorrect." });

  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashSessionToken(token), user.id, expiresAt);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  const isProduction = process.env.NODE_ENV === "production";
  const cookiePolicy = isProduction ? "; SameSite=None; Secure" : "; SameSite=Strict";
  res.setHeader("Set-Cookie", `toptrust_session=${token}; HttpOnly${cookiePolicy}; Path=/api; Max-Age=604800`);
  res.json({ user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(req.sessionTokenHash);
  const cookiePolicy = process.env.NODE_ENV === "production" ? "; SameSite=None; Secure" : "; SameSite=Strict";
  res.setHeader("Set-Cookie", `toptrust_session=; HttpOnly${cookiePolicy}; Path=/api; Max-Age=0`);
  res.json({ status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "TopTrust Bank Help Desk API is running" });
});

// Return all tickets from SQLite, newest first.
app.get("/api/tickets", requireAuth, (req, res) => {
  const tickets = req.user.role === "employee"
    ? db.prepare("SELECT * FROM tickets WHERE requester = ? ORDER BY created_at DESC").all(req.user.full_name)
    : db.prepare("SELECT * FROM tickets ORDER BY created_at DESC").all();

  res.json(tickets);
});
app.post("/api/tickets", requireAuth, (req, res) => {
  const { title, category, priority, description } = req.body;

  if (!title || !category || !priority || !description) {
    return res.status(400).json({
      error: "Title, category, priority, and description are required.",
    });
  }

  const ticket = {
    id: `HD-${Date.now()}`,
    title,
    requester: req.user.full_name,
    category,
    priority,
    status: "Open",
    assignee: null,
    description,
    created_at: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO tickets
      (id, title, requester, category, priority, status, assignee, description, created_at)
    VALUES
      (@id, @title, @requester, @category, @priority, @status, @assignee, @description, @created_at)
  `).run(ticket);

  res.status(201).json(ticket);
});

// Create or update a full ticket record when IT staff save the edit form.
app.patch("/api/tickets/:id", requireAuth, requireRole("it_agent", "admin"), (req, res) => {
  const { title, requester, category, priority, status, assignee, description } = req.body;
  const allowedCategories = ["Hardware", "Software", "Access", "Network"];
  const allowedPriorities = ["Urgent", "High", "Medium", "Low"];
  const allowedStatuses = ["Open", "In progress", "Escalated", "Resolved"];

  if (!title || !requester || !description || !allowedCategories.includes(category)
      || !allowedPriorities.includes(priority) || !allowedStatuses.includes(status)
      || typeof assignee !== "string") {
    return res.status(400).json({ error: "Ticket details are incomplete or invalid." });
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO tickets
      (id, title, requester, category, priority, status, assignee, description, created_at, updated_at)
    VALUES
      (@id, @title, @requester, @category, @priority, @status, @assignee, @description, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      requester = excluded.requester,
      category = excluded.category,
      priority = excluded.priority,
      status = excluded.status,
      assignee = excluded.assignee,
      description = excluded.description,
      updated_at = excluded.updated_at
  `).run({
    id: req.params.id,
    title,
    requester,
    category,
    priority,
    status,
    assignee: assignee === "Unassigned" ? null : assignee,
    description,
    created_at: now,
    updated_at: now,
  });

  const savedTicket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(req.params.id);
  res.json(savedTicket);
});

app.listen(PORT, () => {
  console.log(`TopTrust Bank Help Desk API running at http://localhost:${PORT}`);
});
