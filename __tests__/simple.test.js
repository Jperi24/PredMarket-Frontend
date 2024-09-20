// simple.test.js
import { setupServer } from "msw/node";
import { rest } from "msw";

const server = setupServer(
  rest.get("http://localhost:3001/api/test", (req, res, ctx) => {
    return res(ctx.status(200));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("simple test", async () => {
  expect(true).toBe(true);
});
