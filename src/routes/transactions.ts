import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { database } from "../database";
import crypto from "node:crypto";
import { error } from "node:console";
import { checkSessionIdExists } from "../middlewares/checkSessionIdExists";

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    console.log(`[${request.method}] ${request.url}`);
  });

  app.get(
    "",
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies;

      const transactions = await database("transactions")
        .select()
        .where("session_id", sessionId);

      return {
        transactions,
      };
    },
  );

  app.get(
    "/:id",
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies;
      const getTransactionParamsSchema = z.object({
        id: z.uuid(),
      });
      const { id } = getTransactionParamsSchema.parse(request.params);
      const transaction = await database("transactions")
        .where("id", id)
        .andWhere("session_id", sessionId)
        .first();

      return { transaction };
    },
  );

  app.post("/", async (request, reply) => {
    const createTransactionSchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(["credit", "debit"]),
    });

    const { title, amount, type } = createTransactionSchema.parse(request.body);

    let sessionId = request.cookies.sessionId;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      reply.setCookie("sessionId", sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    await database("transactions").insert({
      id: crypto.randomUUID(),
      title,
      amount: type === "credit" ? amount : amount * -1,
      session_id: sessionId,
    });

    return reply.status(201).send();
  });

  app.get("/summary", async (request, reply) => {
    const { sessionId } = request.cookies;
    const summary = await database("transactions")
      .where("session_id", sessionId)
      .sum("amount", {
        as: "amount",
      })
      .first();
    return { summary };
  });
}
