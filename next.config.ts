import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// A parent lockfile exists in $HOME, so Turbopack misdetects the workspace root.
// Pin it to this project's directory (derived from the config file location, not
// the cwd, which varies depending on how the dev server is launched).
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
