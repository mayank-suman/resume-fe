const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const http = require("http");
const WebSocket = require("ws");
const CVBuilder = require("./build");

class CVServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.builder = new CVBuilder();
    this.clients = new Set();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    // Serve static files
    this.app.use(express.static("."));
    this.app.use(express.json());

    // CORS for development
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      next();
    });
  }

  setupRoutes() {
    // Main dashboard
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "dashboard.html"));
    });

    // API endpoints
    this.app.post("/api/build", async (req, res) => {
      try {
        const result = await this.builder.build();
        this.broadcastToClients({
          type: "build_complete",
          success: result.success,
          message: result.success
            ? "Build completed successfully"
            : "Build failed",
          error: result.error,
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post("/api/clean", async (req, res) => {
      try {
        await this.builder.clean();
        res.json({ success: true, message: "Cleanup completed" });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get("/api/status", async (req, res) => {
      try {
        const pdfExists = await this.fileExists("cv.pdf");
        const pdfStats = pdfExists ? await fs.stat("cv.pdf") : null;

        res.json({
          pdfExists,
          pdfSize: pdfStats ? pdfStats.size : 0,
          lastModified: pdfStats ? pdfStats.mtime : null,
          isBuilding: this.builder.isBuilding,
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Serve PDF
    this.app.get("/cv.pdf", (req, res) => {
      res.sendFile(path.join(__dirname, "cv.pdf"), (err) => {
        if (err) {
          res.status(404).send("PDF not found. Please build first.");
        }
      });
    });

    // File editor (simple)
    this.app.get("/api/file/:filename", async (req, res) => {
      try {
        const filename = req.params.filename;
        // Check if file is a LaTeX file and look in src directory
        const filePath =
          filename.endsWith(".tex") ||
          filename.endsWith(".cls") ||
          filename.endsWith(".sty")
            ? path.join("src", filename)
            : filename;
        const content = await fs.readFile(filePath, "utf8");
        res.json({ content });
      } catch (error) {
        res.status(404).json({ error: "File not found" });
      }
    });

    this.app.post("/api/file/:filename", async (req, res) => {
      try {
        const filename = req.params.filename;
        // Check if file is a LaTeX file and save in src directory
        const filePath =
          filename.endsWith(".tex") ||
          filename.endsWith(".cls") ||
          filename.endsWith(".sty")
            ? path.join("src", filename)
            : filename;
        await fs.writeFile(filePath, req.body.content, "utf8");
        res.json({ success: true, message: "File saved" });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  setupWebSocket() {
    this.wss.on("connection", (ws) => {
      console.log("🔌 Client connected to WebSocket");
      this.clients.add(ws);

      ws.on("close", () => {
        console.log("🔌 Client disconnected from WebSocket");
        this.clients.delete(ws);
      });

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });
    });
  }

  broadcastToClients(message) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async start() {
    // Initial build check
    const hasLuaTeX = await this.builder.checkLuaTeX();
    if (!hasLuaTeX) {
      console.error("❌ LuaTeX not found. Please install it first.");
      process.exit(1);
    }

    // Start file watcher
    this.builder.startWatcher((result, filePath) => {
      this.broadcastToClients({
        type: "file_changed",
        file: filePath,
        buildResult: result,
      });
    });

    // Start server
    this.server.listen(this.port, () => {
      const url = `http://localhost:${this.port}`;
      console.log("🚀 CV Builder Server started!");
      console.log(`📱 Dashboard: ${url}`);
      console.log(`📄 PDF: ${url}/cv.pdf`);
      console.log("👀 File watching enabled");

      // Auto-open browser
      setTimeout(async () => {
        try {
          const open = (await import("open")).default;
          await open(url);
        } catch (error) {
          console.log("⚠️  Could not auto-open browser:", error.message);
        }
      }, 1000);
    });
  }

  async stop() {
    this.server.close();
    console.log("🛑 Server stopped");
  }
}

// CLI usage
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const server = new CVServer(port);

  server.start().catch((error) => {
    console.error("❌ Server start error:", error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down...");
    await server.stop();
    process.exit(0);
  });
}

module.exports = CVServer;
