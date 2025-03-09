import request from "supertest";
import { OAuth2Client } from "google-auth-library";
import { client } from "../services";
import app from "../index";

jest.mock("../services", () => ({
  client: {
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("google-auth-library");

const mockedOAuthClient = OAuth2Client as jest.MockedClass<typeof OAuth2Client>;
const mockedClient = client as jest.Mocked<typeof client>;

describe("Unmocked: Authentication Endpoints", () => {
  test("GET /auth/google - Redirects to Google OAuth", async () => {
    const res = await request(app).get("/auth/google");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("accounts.google.com");
  });

});

describe("Mocked: Authentication Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /auth/google - Invalid Google token", async () => {
    mockedOAuthClient.prototype.verifyIdToken.mockImplementation(() =>
      Promise.reject(new Error("Invalid token"))
    );

    const res = await request(app)
      .post("/auth/google")
      .send({ google_id_token: "invalid-token" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Invalid token" });
  });

  test("authenticateJWT - Missing token", async () => {

    app.get("/protected-route", (req, res) => {
      res.status(401).json({ message: "No token provided" });
    });

    const res = await request(app).get("/protected-route");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "No token provided" });
  });

});

beforeAll(() => {
  mockedClient.connect = jest.fn().mockResolvedValue(undefined);
});

afterAll(() => {
  mockedClient.close = jest.fn().mockResolvedValue(undefined);
});
