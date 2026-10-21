import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mediHomeApiPlugin } from './server/vitePlugin.mjs'

/** Drop a second Upload Rx row if an older server copy still renders it. */
function stripDuplicateSectionUploads() {
  return {
    name: "strip-duplicate-section-uploads",
    enforce: "pre",
    transform(code, id) {
      if (!/[/\\](LabTests|StepDownCare)\.jsx$/.test(id)) return null;
      const names = [];
      const next = code
        .replace(
          /import\s+(\w+)\s+from\s+["'][^"']*SectionOrderTools(?:\.jsx)?["'];?\s*/g,
          (_, name) => {
            names.push(name);
            return "";
          }
        )
        .replace(/<SectionOrderTools\b[\s\S]*?\/>\s*/g, "");
      let stripped = next;
      for (const name of names) {
        stripped = stripped.replace(
          new RegExp(`<${name}\\b[\\s\\S]*?\\/>\\s*`, "g"),
          ""
        );
      }
      if (stripped === code) return null;
      return { code: stripped, map: null };
    },
  };
}

export default defineConfig({
  plugins: [stripDuplicateSectionUploads(), react(), mediHomeApiPlugin()],
  // Keep Node-only AI packages out of the browser bundle.
  optimizeDeps: {
    exclude: ["@cursor/sdk", "tesseract.js"],
  },
  ssr: {
    external: ["@cursor/sdk", "tesseract.js"],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    // Allow Cursor port-forward and temporary preview tunnels.
    allowedHosts: true,
  },
})
