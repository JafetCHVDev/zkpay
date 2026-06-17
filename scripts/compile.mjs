import { createRequire } from "module";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

// Patch path.join and path.resolve to always use forward slashes
// Required for noir_wasm on Windows (Rust WASM expects / separators)
const origJoin = path.join;
path.join = (...args) => {
  const result = origJoin(...args);
  const normalized = result.replace(/\\/g, "/");
  return normalized;
};

const origResolve = path.resolve;
path.resolve = (...args) => origResolve(...args).replace(/\\/g, "/");

const require = createRequire(import.meta.url);
const { createFileManager, compile, inflateDebugSymbols } = require("@noir-lang/noir_wasm");

const projectDir = path.resolve("circuits");
const outDir = path.resolve("circuits/target");
const outPath = path.resolve("circuits/target/zkpay.json");

// Also patch fs/promises operations to normalize paths
import { readFile, readdir, mkdir, rename, stat } from "fs/promises";

async function main() {
  console.log("Project dir:", projectDir);
  
  const fm = createFileManager(projectDir);

  console.log("Compiling Noir circuit...");
  const result = await compile(fm);

  console.log("Compilation successful!");
  console.log("Output keys:", Object.keys(result));

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log("Written to:", outPath);

  if (result.debug_symbols) {
    const debug = inflateDebugSymbols(result.debug_symbols);
    const debugPath = outPath.replace(".json", ".debug.json");
    writeFileSync(debugPath, JSON.stringify(debug, null, 2));
    console.log("Debug symbols written to:", debugPath);
  }
}

main().catch((err) => {
  console.error("Compilation failed:", err.message);
  process.exit(1);
});
