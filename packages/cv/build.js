const { exec, spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const chokidar = require("chokidar");

class CVBuilder {
  constructor() {
    this.config = {
      source: "src/cv.tex",
      output: "cv.pdf",
      compiler: "lualatex",
      watchFiles: ["src/*.tex", "src/*.cls", "src/*.sty"],
      auxFiles: [
        "*.aux",
        "*.log",
        "*.out",
        "*.fdb_latexmk",
        "*.fls",
        "*.synctex.gz",
        "*.toc",
        "*.lof",
        "*.lot",
      ],
    };
    this.isBuilding = false;
    this.buildQueue = [];
  }

  async checkLuaTeX() {
    return new Promise((resolve) => {
      exec("lualatex --version", (error, stdout, stderr) => {
        if (error) {
          console.error(
            "❌ LuaTeX not found. Please install MacTeX or BasicTeX:"
          );
          console.log("   brew install --cask mactex");
          console.log("   or visit: https://www.tug.org/mactex/");
          resolve(false);
        } else {
          console.log("✅ LuaTeX found:", stdout.split("\n")[0]);
          resolve(true);
        }
      });
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

  async build() {
    if (this.isBuilding) {
      console.log("⏳ Build already in progress, queuing...");
      return new Promise((resolve) => {
        this.buildQueue.push(resolve);
      });
    }

    this.isBuilding = true;
    console.log("🔨 Building CV...");

    try {
      // Check if source file exists
      if (!(await this.fileExists(this.config.source))) {
        throw new Error(`Source file ${this.config.source} not found`);
      }

      // Check if LuaTeX is available
      const hasLuaTeX = await this.checkLuaTeX();
      if (!hasLuaTeX) {
        throw new Error("LuaTeX not available");
      }

      // Run LuaTeX compilation
      const result = await this.runCompilation();

      if (result.success) {
        console.log("✅ CV built successfully!");
        console.log(`📄 Output: ${this.config.output}`);

        // Check if PDF was actually created
        if (await this.fileExists(this.config.output)) {
          const stats = await fs.stat(this.config.output);
          console.log(`📊 PDF size: ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
          console.warn("⚠️  PDF file not found after compilation");
        }
      } else {
        console.error("❌ Build failed");
        console.error(result.error);
      }

      return result;
    } catch (error) {
      console.error("❌ Build error:", error.message);
      return { success: false, error: error.message };
    } finally {
      this.isBuilding = false;

      // Process queued builds
      if (this.buildQueue.length > 0) {
        const queuedResolvers = [...this.buildQueue];
        this.buildQueue = [];
        setTimeout(() => {
          this.build().then((result) => {
            queuedResolvers.forEach((resolve) => resolve(result));
          });
        }, 100);
      }
    }
  }

  runCompilation() {
    return new Promise((resolve) => {
      const compilationProcess = spawn(
        this.config.compiler,
        [
          "-interaction=nonstopmode",
          "-halt-on-error",
          "-output-directory=.",
          this.config.source,
        ],
        {
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            TEXINPUTS: "./src/:./src/fonts/:",
          },
        }
      );

      let stdout = "";
      let stderr = "";

      compilationProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      compilationProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      compilationProcess.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          resolve({
            success: false,
            error: `Compilation failed with exit code ${code}`,
            stdout,
            stderr,
          });
        }
      });

      compilationProcess.on("error", (error) => {
        resolve({
          success: false,
          error: `Process error: ${error.message}`,
          stdout,
          stderr,
        });
      });
    });
  }

  async clean() {
    console.log("🧹 Cleaning auxiliary files...");
    try {
      const files = await fs.readdir(".");
      const filesToDelete = [];

      for (const pattern of this.config.auxFiles) {
        const regex = new RegExp(pattern.replace("*", ".*"));
        const matchingFiles = files.filter((file) => regex.test(file));
        filesToDelete.push(...matchingFiles);
      }

      for (const file of filesToDelete) {
        try {
          await fs.unlink(file);
          console.log(`🗑️  Deleted: ${file}`);
        } catch (error) {
          console.warn(`⚠️  Could not delete ${file}: ${error.message}`);
        }
      }

      console.log("✅ Cleanup completed");
    } catch (error) {
      console.error("❌ Cleanup error:", error.message);
    }
  }

  startWatcher(callback) {
    console.log("👀 Starting file watcher...");

    const watcher = chokidar.watch(this.config.watchFiles, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on("change", async (filePath) => {
      console.log(`📝 File changed: ${filePath}`);
      const result = await this.build();
      if (callback) callback(result, filePath);
    });

    watcher.on("add", async (filePath) => {
      console.log(`📄 File added: ${filePath}`);
      const result = await this.build();
      if (callback) callback(result, filePath);
    });

    watcher.on("error", (error) => {
      console.error("👀 Watcher error:", error);
    });

    console.log(`👀 Watching: ${this.config.watchFiles.join(", ")}`);
    return watcher;
  }

  async openPDF() {
    if (await this.fileExists(this.config.output)) {
      const open = require("open");
      await open(this.config.output);
      console.log("📖 Opened PDF in default viewer");
    } else {
      console.warn("⚠️  PDF file not found");
    }
  }
}

// CLI usage
if (require.main === module) {
  const builder = new CVBuilder();
  const args = process.argv.slice(2);

  if (args.includes("--watch")) {
    console.log("🚀 Starting CV builder in watch mode...");
    builder.build().then(() => {
      builder.startWatcher();
    });
  } else if (args.includes("--clean")) {
    builder.clean();
  } else if (args.includes("--open")) {
    builder.openPDF();
  } else {
    console.log("🚀 Building CV...");
    builder.build();
  }
}

module.exports = CVBuilder;
