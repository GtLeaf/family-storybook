import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: ["story.spec.ts", "audio.spec.ts", "mobile-layout.spec.ts", "xhs-platform.spec.ts"],
  fullyParallel: true, workers: 3, timeout: 45000, expect: { timeout: 8000 },
  outputDir: "test-results/xhs", reporter: "list",
  use: { baseURL: "http://127.0.0.1:4181", screenshot: "only-on-failure" },
  projects: [
    { name: "xhs-chromium-smoke", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
    { name: "xhs-webkit-smoke", use: { ...devices["iPhone 13"], defaultBrowserType: "webkit" } },
  ],
  webServer: { command: "npx vite preview --host 127.0.0.1 --port 4181 --strictPort --outDir dist-xhs", url: "http://127.0.0.1:4181", reuseExistingServer: true },
});
