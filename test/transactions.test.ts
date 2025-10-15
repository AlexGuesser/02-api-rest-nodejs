import {
  expect,
  test,
  beforeAll,
  afterAll,
  describe,
  it,
  beforeEach,
} from "vitest";
import { app } from "../src/app";
import request from "supertest";
import { execSync } from "node:child_process";

describe("Transactions routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    execSync("npm run knex migrate:rollback --all");
    execSync("npm run knex migrate:latest");
  });

  test("User can create a new transaction", async () => {
    const response = await request(app.server).post("/transactions").send({
      title: "New transaction",
      amount: 5000,
      type: "credit",
    });

    expect(response.statusCode).toEqual(201);
  });

  it("should be able to list all transactions", async () => {
    const createTransactioResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "New transaction",
        amount: 5000,
        type: "credit",
      })
      .expect(201);

    const cookies = createTransactioResponse.get("Set-Cookie");
    expect(cookies).toBeDefined();

    const listTransactionResponse = await request(app.server)
      .get("/transactions")
      .set("Cookie", cookies!)
      .expect(200);

    expect(listTransactionResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: "New transaction",
        amount: 5000,
      }),
    ]);
  });

  it("should be able to get a specific transaction", async () => {
    const createTransactioResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "New transaction",
        amount: 5000,
        type: "credit",
      })
      .expect(201);

    const cookies = createTransactioResponse.get("Set-Cookie");

    const listTransactionResponse = await request(app.server)
      .get("/transactions")
      .set("Cookie", cookies!);

    const transactionId = listTransactionResponse.body.transactions[0].id;

    const getByIdResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set("Cookie", cookies!);

    expect(getByIdResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: "New transaction",
        amount: 5000,
      }),
    );
  });

  it("should be able to get the summary", async () => {
    const createTransactioResponse1 = await request(app.server)
      .post("/transactions")
      .send({
        title: "New transaction",
        amount: 5000,
        type: "credit",
      })
      .expect(201);

    const cookies = createTransactioResponse1.get("Set-Cookie");

    await request(app.server)
      .post("/transactions")
      .set("Cookie", cookies!)
      .send({
        title: "Debit transaction",
        amount: 2000,
        type: "debit",
      })
      .expect(201);

    const summaryResponse = await request(app.server)
      .get("/transactions/summary")
      .set("Cookie", cookies!)
      .expect(200);

    expect(summaryResponse.body.summary).toEqual(
      expect.objectContaining({
        amount: 3000,
      }),
    );
  });
});
