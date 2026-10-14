const fs = require("fs").promises;
const path = require("path");

class Cleaner {
  constructor() {
    this.auxFiles = [
      "*.aux",
      "*.log",
      "*.out",
      "*.fdb_latexmk",
      "*.fls",
      "*.synctex.gz",
      "*.toc",
      "*.lof",
      "*.lot",
      "*.bbl",
      "*.blg",
      "*.idx",
      "*.ilg",
      "*.ind",
      "*.nav",
      "*.snm",
      "*.vrb",
    ];
  }

  async clean() {
    console.log("🧹 Starting cleanup process...");

    try {
      const files = await fs.readdir(".");
      const filesToDelete = [];

      // Find files matching patterns
      for (const pattern of this.auxFiles) {
        const regex = new RegExp(pattern.replace("*", ".*") + "$");
        const matchingFiles = files.filter((file) => regex.test(file));
        filesToDelete.push(...matchingFiles);
      }

      // Remove duplicates
      const uniqueFiles = [...new Set(filesToDelete)];

      if (uniqueFiles.length === 0) {
        console.log("✨ No auxiliary files found to clean");
        return;
      }

      console.log(`🗑️  Found ${uniqueFiles.length} files to clean:`);
      uniqueFiles.forEach((file) => console.log(`   - ${file}`));

      // Delete files
      for (const file of uniqueFiles) {
        try {
          await fs.unlink(file);
          console.log(`✅ Deleted: ${file}`);
        } catch (error) {
          console.warn(`⚠️  Could not delete ${file}: ${error.message}`);
        }
      }

      console.log("🎉 Cleanup completed successfully!");
    } catch (error) {
      console.error("❌ Cleanup error:", error.message);
      process.exit(1);
    }
  }

  async cleanAll() {
    console.log("🧹 Deep cleaning (including PDF)...");
    await this.clean();

    try {
      await fs.unlink("cv.pdf");
      console.log("🗑️  Deleted: cv.pdf");
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`⚠️  Could not delete cv.pdf: ${error.message}`);
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  const cleaner = new Cleaner();
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    cleaner.cleanAll();
  } else {
    cleaner.clean();
  }
}

module.exports = Cleaner;
