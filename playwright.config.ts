import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

// Never 1420: that port belongs to `tauri dev`.
const port = Number(process.env.E2E_PORT ?? "1493");
if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 1420) {
  throw new Error("E2E_PORT must be an integer from 1 to 65535 other than 1420");
}
const DEV_SERVER_URL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: DEV_SERVER_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-1440x900",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `bun run dev --port ${port} --strictPort`,
    url: DEV_SERVER_URL,
    reuseExistingServer: false,
    stdout: "pipe",
  },
});
