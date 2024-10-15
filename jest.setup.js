// jest.setup.js

// Import custom matchers from '@testing-library/jest-dom'
// This allows you to use custom Jest matchers for assertions in your tests
import "@testing-library/jest-dom/extend-expect";

// Optionally, configure or set up a testing framework before each test (if needed)
// For example, mock browser APIs like window or document, configure global mocks, etc.

// Mock Next.js router if needed
import { useRouter } from "next/router";
jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

// Any other global setup you need can go here...
