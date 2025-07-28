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
      res.send(this.generateDashboardHTML());
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
        const content = await fs.readFile(req.params.filename, "utf8");
        res.json({ content });
      } catch (error) {
        res.status(404).json({ error: "File not found" });
      }
    });

    this.app.post("/api/file/:filename", async (req, res) => {
      try {
        await fs.writeFile(req.params.filename, req.body.content, "utf8");
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

  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mayank's CV Builder</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        .main-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            padding: 30px;
        }
        .panel {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            border: 1px solid #e9ecef;
        }
        .panel h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.5em;
        }
        .btn {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
            transition: all 0.3s ease;
            display: inline-block;
            text-decoration: none;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
        }
        .btn.success { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); }
        .btn.danger { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
        .btn.secondary { background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%); }
        .status {
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
            font-weight: 500;
        }
        .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .status.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .pdf-viewer {
            grid-column: 1 / -1;
            height: 600px;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }
        .pdf-viewer iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        .logs {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            max-height: 300px;
            overflow-y: auto;
            white-space: pre-wrap;
        }
        .file-list {
            list-style: none;
        }
        .file-list li {
            padding: 8px 12px;
            border: 1px solid #ddd;
            margin: 5px 0;
            border-radius: 4px;
            background: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
            .main-content { grid-template-columns: 1fr; }
            .header h1 { font-size: 2em; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 CV Builder Dashboard</h1>
            <p>LaTeX to PDF Compilation Server for Mayank Suman's CV</p>
        </div>
        
        <div class="main-content">
            <div class="panel">
                <h2>🔨 Build Controls</h2>
                <div id="status-display"></div>
                <div>
                    <button class="btn" onclick="buildCV()">Build CV</button>
                    <button class="btn secondary" onclick="cleanFiles()">Clean Files</button>
                    <button class="btn success" onclick="openPDF()">Open PDF</button>
                </div>
                <div class="loading" id="loading">
                    <div class="spinner"></div>
                    <p>Building CV...</p>
                </div>
            </div>

            <div class="panel">
                <h2>📊 Status</h2>
                <div id="cv-status">
                    <p>Loading status...</p>
                </div>
            </div>

            <div class="panel">
                <h2>📁 Project Files</h2>
                <ul class="file-list">
                    <li>cv.tex <button class="btn" onclick="editFile('cv.tex')">Edit</button></li>
                    <li>section_experience_short.tex <button class="btn" onclick="editFile('section_experience_short.tex')">Edit</button></li>
                    <li>section_competences.tex <button class="btn" onclick="editFile('section_competences.tex')">Edit</button></li>
                    <li>section_scolarite.tex <button class="btn" onclick="editFile('section_scolarite.tex')">Edit</button></li>
                    <li>section_projets.tex <button class="btn" onclick="editFile('section_projets.tex')">Edit</button></li>
                </ul>
            </div>

            <div class="panel">
                <h2>📋 Build Logs</h2>
                <div class="logs" id="logs">
                    <div>🚀 CV Builder Server Started</div>
                    <div>✅ Ready to build your CV</div>
                </div>
            </div>

            <div class="pdf-viewer" id="pdf-container" style="display: none;">
                <h2 style="padding: 20px; margin: 0;">📖 PDF Preview</h2>
                <iframe id="pdf-frame" src="/cv.pdf"></iframe>
            </div>
        </div>
    </div>

    <script>
        let ws;
        
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                addLog('🔌 Connected to server');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                addLog('🔌 Disconnected from server');
                setTimeout(connectWebSocket, 3000);
            };
        }
        
        function handleWebSocketMessage(data) {
            if (data.type === 'build_complete') {
                hideLoading();
                if (data.success) {
                    showStatus('✅ Build completed successfully!', 'success');
                    updateStatus();
                    showPDF();
                } else {
                    showStatus(\`❌ Build failed: \${data.error}\`, 'error');
                }
                addLog(\`📝 \${data.message}\`);
            }
        }
        
        async function buildCV() {
            showLoading();
            showStatus('🔨 Building CV...', 'info');
            addLog('🔨 Starting CV build...');
            
            try {
                const response = await fetch('/api/build', { method: 'POST' });
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Build failed');
                }
            } catch (error) {
                hideLoading();
                showStatus(\`❌ Error: \${error.message}\`, 'error');
                addLog(\`❌ Build error: \${error.message}\`);
            }
        }
        
        async function cleanFiles() {
            showStatus('🧹 Cleaning files...', 'info');
            try {
                const response = await fetch('/api/clean', { method: 'POST' });
                const result = await response.json();
                showStatus('✅ Files cleaned successfully!', 'success');
                addLog('🧹 Auxiliary files cleaned');
            } catch (error) {
                showStatus(\`❌ Clean error: \${error.message}\`, 'error');
            }
        }
        
        function openPDF() {
            window.open('/cv.pdf', '_blank');
        }
        
        function showPDF() {
            const container = document.getElementById('pdf-container');
            const frame = document.getElementById('pdf-frame');
            frame.src = '/cv.pdf?' + Date.now(); // Cache bust
            container.style.display = 'block';
        }
        
        async function updateStatus() {
            try {
                const response = await fetch('/api/status');
                const status = await response.json();
                
                const statusDiv = document.getElementById('cv-status');
                statusDiv.innerHTML = \`
                    <p><strong>PDF Status:</strong> \${status.pdfExists ? '✅ Available' : '❌ Not built'}</p>
                    \${status.pdfExists ? \`<p><strong>Size:</strong> \${(status.pdfSize / 1024).toFixed(2)} KB</p>\` : ''}
                    \${status.lastModified ? \`<p><strong>Last Built:</strong> \${new Date(status.lastModified).toLocaleString()}</p>\` : ''}
                    <p><strong>Status:</strong> \${status.isBuilding ? '🔨 Building...' : '⭐ Ready'}</p>
                \`;
            } catch (error) {
                console.error('Status update error:', error);
            }
        }
        
        function editFile(filename) {
            // Simple implementation - in production, you might want a proper editor
            const newWindow = window.open('', '_blank');
            newWindow.document.write(\`
                <html>
                    <head><title>Edit \${filename}</title></head>
                    <body style="font-family: monospace; padding: 20px;">
                        <h2>Edit \${filename}</h2>
                        <textarea id="editor" style="width: 100%; height: 70vh; font-family: monospace; font-size: 14px;"></textarea>
                        <br><br>
                        <button onclick="saveFile()" style="padding: 10px 20px; font-size: 16px;">Save</button>
                        <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; margin-left: 10px;">Cancel</button>
                        <script>
                            async function loadFile() {
                                const response = await fetch('/api/file/\${filename}');
                                const data = await response.json();
                                document.getElementById('editor').value = data.content || '';
                            }
                            async function saveFile() {
                                const content = document.getElementById('editor').value;
                                const response = await fetch('/api/file/\${filename}', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ content })
                                });
                                if (response.ok) {
                                    alert('File saved successfully!');
                                    window.close();
                                } else {
                                    alert('Error saving file');
                                }
                            }
                            loadFile();
                        </script>
                    </body>
                </html>
            \`);
        }
        
        function showStatus(message, type) {
            const statusDiv = document.getElementById('status-display');
            statusDiv.innerHTML = \`<div class="status \${type}">\${message}</div>\`;
        }
        
        function showLoading() {
            document.getElementById('loading').style.display = 'block';
        }
        
        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }
        
        function addLog(message) {
            const logsDiv = document.getElementById('logs');
            const timestamp = new Date().toLocaleTimeString();
            logsDiv.innerHTML += \`\n[\${timestamp}] \${message}\`;
            logsDiv.scrollTop = logsDiv.scrollHeight;
        }
        
        // Initialize
        connectWebSocket();
        updateStatus();
        setInterval(updateStatus, 5000); // Update status every 5 seconds
    </script>
</body>
</html>
        `;
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
