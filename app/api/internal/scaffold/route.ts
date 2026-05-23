import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ── Types ────────────────────────────────────────────────────────────────────

type ScaffoldAction = "list" | "copy";

interface ScaffoldRequestBody {
  action: ScaffoldAction;
  /** Scaffold name (e.g. "nextjs", "reactjs") — required for "copy" */
  scaffold?: string;
  /** Target piece directory relative to pieces/ root — required for "copy" */
  directory?: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

const INTERNAL_HEADER_NAME = "x-internal-secret";

function isAuthorized(request: NextRequest): boolean {
  const headerValue = request.headers.get(INTERNAL_HEADER_NAME) ?? "";
  const expected = process.env.INTERNAL_API_KEY ?? "";
  return Boolean(expected) && headerValue === expected;
}

// ── Path helpers ─────────────────────────────────────────────────────────────

const SCAFFOLDS_DIR = path.resolve("./pieces/.opencode/scafolds");
const PIECES_ROOT = path.resolve("./pieces");

/** Files / dirs excluded when copying a scaffold into a piece directory. */
const EXCLUDED_NAMES = new Set([
  ".gitignore",
  ".git",
  "node_modules",
  ".next",
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
]);

function isSafeDirectory(dir: string): boolean {
  if (path.isAbsolute(dir)) return false;
  if (dir.includes("\0")) return false;
  const normalized = path.normalize(dir);
  return !normalized.startsWith("..") && normalized !== "..";
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ScaffoldRequestBody;
  try {
    body = (await request.json()) as ScaffoldRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  switch (body.action) {
    case "list":
      return handleList();
    case "copy":
      return handleCopy(body);
    default:
      return NextResponse.json(
        { error: `Unknown action: ${body.action}. Valid: list, copy` },
        { status: 400 },
      );
  }
}

// ── List ─────────────────────────────────────────────────────────────────────

function handleList(): NextResponse {
  try {
    const entries = fs.readdirSync(SCAFFOLDS_DIR, { withFileTypes: true });
    const scaffolds = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    return NextResponse.json({ scaffolds });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to list scaffolds: ${message}` },
      { status: 500 },
    );
  }
}

// ── Copy ─────────────────────────────────────────────────────────────────────

function handleCopy(body: ScaffoldRequestBody): NextResponse {
  const { scaffold, directory } = body;

  if (!scaffold || !directory) {
    return NextResponse.json(
      { error: "Missing required fields: scaffold, directory" },
      { status: 400 },
    );
  }

  // Validate scaffold name
  const scaffoldDir = path.resolve(SCAFFOLDS_DIR, scaffold);
  if (
    !scaffoldDir.startsWith(SCAFFOLDS_DIR) ||
    !fs.existsSync(scaffoldDir) ||
    !fs.statSync(scaffoldDir).isDirectory()
  ) {
    return NextResponse.json(
      { error: `Scaffold not found: ${scaffold}` },
      { status: 404 },
    );
  }

  // Validate target directory
  if (!isSafeDirectory(directory)) {
    return NextResponse.json(
      {
        error:
          "Invalid directory path. Must be a relative path from pieces/ root (e.g. 'userId/workspaceId/slug'). No leading slash, no '..' traversal.",
      },
      { status: 400 },
    );
  }

  const targetDir = path.resolve(PIECES_ROOT, directory);
  if (!targetDir.startsWith(PIECES_ROOT)) {
    return NextResponse.json(
      { error: "Directory escapes pieces root" },
      { status: 400 },
    );
  }

  // Create target if it doesn't exist
  fs.mkdirSync(targetDir, { recursive: true });

  const copied: string[] = [];
  const errors: string[] = [];

  try {
    copyDir(scaffoldDir, targetDir, copied, errors);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Copy failed: ${message}`, copied, errors },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    scaffold,
    target: directory,
    copied,
    errors: errors.length > 0 ? errors : undefined,
    message: `Copied ${copied.length} file(s) from scaffold "${scaffold}" to pieces/${directory}`,
  });
}

// ── Recursive copy ───────────────────────────────────────────────────────────

function copyDir(
  src: string,
  dest: string,
  copied: string[],
  errors: string[],
): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDED_NAMES.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath, copied, errors);
    } else if (entry.isFile()) {
      try {
        fs.copyFileSync(srcPath, destPath);
        // Calculate path relative to pieces/ for the response
        const relPath = path.relative(PIECES_ROOT, destPath);
        copied.push(relPath);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${entry.name}: ${message}`);
      }
    }
  }
}
