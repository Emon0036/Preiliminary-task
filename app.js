require("dotenv").config({ quiet: true });

const path = require("path");
const express = require("express");
const { analyzeTicket, validateTicketRequest } = require("./lib/analyzeTicket");

const app = express();
const port = Number(process.env.PORT) || 8000;

app.disable("x-powered-by");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", {
    title: "QueueStorm Investigator",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/analyze-ticket", (req, res, next) => {
  try {
    const validation = validateTicketRequest(req.body);

    if (!validation.ok) {
      return res.status(validation.status).json({
        error: validation.message,
      });
    }

    return res.status(200).json(analyzeTicket(validation.ticket));
  } catch (error) {
    return next(error);
  }
});

app.use((req, res) => {
  if (req.accepts("html")) {
    return res.status(404).render("error", {
      title: "Not Found",
      message: "The requested endpoint was not found.",
    });
  }

  return res.status(404).json({ error: "Endpoint not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body." });
  }

  if (error.type === "entity.too.large") {
    return res.status(400).json({ error: "Request body is too large." });
  }

  console.error("Internal error:", error.message);
  return res.status(500).json({ error: "Internal error while analyzing ticket." });
});

let server;
let shuttingDown = false;

function startServer() {
  server = app.listen(port, "0.0.0.0", () => {
    console.log(`QueueStorm Investigator listening on port ${port}`);
  });
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received. Closing HTTP server.`);

  if (!server) {
    process.exit(0);
  }

  server.close((error) => {
    if (error) {
      console.error("HTTP shutdown failed:", error.message);
      process.exit(1);
    }

    process.exit(0);
  });
}

if (require.main === module) {
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  startServer();
}

module.exports = app;
