import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  lotteryRounds: defineTable({
    roundNumber: v.number(),
    startTime: v.number(),
    endTime: v.number(),
    totalAmount: v.number(), // in SOL
    ticketsSold: v.number(),
    winner: v.optional(v.string()), // wallet address
    winningAmount: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("drawing")),
    transactionSignature: v.optional(v.string()),
  }).index("by_status", ["status"])
    .index("by_round_number", ["roundNumber"]),

  tickets: defineTable({
    roundId: v.id("lotteryRounds"),
    walletAddress: v.string(),
    transactionSignature: v.string(),
    amount: v.number(), // in SOL
    purchaseTime: v.number(),
    verified: v.boolean(),
  }).index("by_round", ["roundId"])
    .index("by_wallet", ["walletAddress"])
    .index("by_transaction", ["transactionSignature"]),

  lotterySettings: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
  }).index("by_key", ["key"]),
};

export default defineSchema({
  ...applicationTables,
});
