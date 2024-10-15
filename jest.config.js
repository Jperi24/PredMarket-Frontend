// jest.config.js

module.exports = {
  // Remove any global testEnvironment setting to avoid overriding
  // Global settings can be specified here if needed
  projects: [
    // Frontend tests configuration
    {
      displayName: "frontend",
      testMatch: ["<rootDir>/src/**/*.test.{js,jsx,ts,tsx}"],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
      testEnvironment: "jsdom", // Frontend tests use jsdom
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
    },
    // Backend tests configuration
    {
      displayName: "backend",
      testMatch: ["<rootDir>/tests/**/*.test.{js,ts}"],
      testEnvironment: "node", // Backend tests use node
      // No setupFilesAfterEnv for backend tests
    },
  ],
};
