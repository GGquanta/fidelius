import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: true,
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            ENVIRONMENT: "test",
            MASTER_KEY: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=",
            BOOTSTRAP_ADMIN_EMAIL: "admin@example.com",
            TEAM_DOMAIN: "https://example.cloudflareaccess.com",
            ACCESS_AUD: "dev-aud-not-real",
          },
        },
      },
    },
  },
});
