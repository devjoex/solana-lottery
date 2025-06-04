import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const LOTTERY_WALLET = "Dw8j4PH2ubfUYTszGfXJp8v7GKX6rLM4ksdZ2GdGCyNL"; // Mainnet wallet for lottery funds
const ROUND_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const TICKET_PRICE = 0.1; // 0.1 SOL per ticket

// Get current active lottery round
export const getCurrentRound = query({
  args: {},
  handler: async (ctx) => {
    const activeRound = await ctx.db
      .query("lotteryRounds")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();

    if (!activeRound) {
      // Return null if no active round, creation will be handled by mutation
      return null;
    }

    return activeRound;
  },
});

// Check and process expired rounds
export const checkExpiredRounds = mutation({
  args: {},
  handler: async (ctx) => {
    const activeRound = await ctx.db
      .query("lotteryRounds")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();
    
    if (activeRound && Date.now() >= activeRound.endTime) {
      // Schedule immediate drawing for expired round
      await ctx.scheduler.runAfter(0, internal.lottery.conductDrawing, {
        roundId: activeRound._id,
      });
      return { processed: true, roundId: activeRound._id };
    }
    
    return { processed: false };
  },
});

// Create new lottery round
export const createNewRound = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if there's already an active round
    const existingRound = await ctx.db
      .query("lotteryRounds")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();
    
    if (existingRound) {
      // Check if the existing round has expired
      if (Date.now() >= existingRound.endTime) {
        // Schedule immediate drawing for expired round
        await ctx.scheduler.runAfter(0, internal.lottery.conductDrawing, {
          roundId: existingRound._id,
        });
        // Return the existing round for now, new one will be created after drawing
        return existingRound;
      }
      return existingRound;
    }

    const now = Date.now();
    const roundNumber = await getNextRoundNumber(ctx);
    
    const newRoundId = await ctx.db.insert("lotteryRounds", {
      roundNumber,
      startTime: now,
      endTime: now + ROUND_DURATION,
      totalAmount: 0,
      ticketsSold: 0,
      status: "active",
    });

    return await ctx.db.get(newRoundId);
  },
});

// Get lottery statistics
export const getLotteryStats = query({
  args: {},
  handler: async (ctx) => {
    let currentRound = await ctx.db
      .query("lotteryRounds")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();

    // Note: Queries can't schedule actions, this is handled by the cron job

    const totalRounds = await ctx.db.query("lotteryRounds").collect();
    const totalTicketsSold = totalRounds.reduce((sum, round) => sum + round.ticketsSold, 0);
    const totalPrizesPaid = totalRounds
      .filter(round => round.status === "completed" && round.winningAmount)
      .reduce((sum, round) => sum + (round.winningAmount || 0), 0);

    return {
      currentJackpot: currentRound?.totalAmount || 0,
      currentTicketsSold: currentRound?.ticketsSold || 0,
      timeToNextDraw: currentRound ? Math.max(0, currentRound.endTime - Date.now()) : 0,
      totalRounds: totalRounds.length,
      totalTicketsSold,
      totalPrizesPaid,
      ticketPrice: TICKET_PRICE,
      lotteryWallet: LOTTERY_WALLET,
    };
  },
});

// Get recent lottery history
export const getLotteryHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    return await ctx.db
      .query("lotteryRounds")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .take(limit);
  },
});

// Get user's tickets for current round
export const getUserTickets = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const currentRound = await ctx.db
      .query("lotteryRounds")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();
    if (!currentRound) return [];

    return await ctx.db
      .query("tickets")
      .withIndex("by_round", (q) => q.eq("roundId", currentRound._id))
      .filter((q) => q.eq(q.field("walletAddress"), args.walletAddress))
      .collect();
  },
});

// Purchase ticket (called after Solana transaction)
export const purchaseTicket = mutation({
  args: {
    walletAddress: v.string(),
    transactionSignature: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if transaction already exists
    const existingTicket = await ctx.db
      .query("tickets")
      .withIndex("by_transaction", (q) => q.eq("transactionSignature", args.transactionSignature))
      .first();

    if (existingTicket) {
      throw new Error("Transaction already processed");
    }

    // Get current round or create one if none exists
    let currentRound = await ctx.db
      .query("lotteryRounds")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();
    
    // If no active round or current round expired, create new one
    if (!currentRound || Date.now() >= currentRound.endTime) {
      if (currentRound && Date.now() >= currentRound.endTime) {
        // Schedule immediate drawing for expired round
        await ctx.scheduler.runAfter(0, internal.lottery.conductDrawing, {
          roundId: currentRound._id,
        });
      }
      
      const now = Date.now();
      const roundNumber = await getNextRoundNumber(ctx);
      
      const newRoundId = await ctx.db.insert("lotteryRounds", {
        roundNumber,
        startTime: now,
        endTime: now + ROUND_DURATION,
        totalAmount: 0,
        ticketsSold: 0,
        status: "active",
      });
      
      currentRound = await ctx.db.get(newRoundId);
      if (!currentRound) {
        throw new Error("Failed to create lottery round");
      }
    }

    // Validate ticket amount
    if (args.amount < TICKET_PRICE) {
      throw new Error(`Minimum ticket price is ${TICKET_PRICE} SOL`);
    }

    // Calculate number of tickets
    const numTickets = Math.floor(args.amount / TICKET_PRICE);

    // Create ticket record
    await ctx.db.insert("tickets", {
      roundId: currentRound._id,
      walletAddress: args.walletAddress,
      transactionSignature: args.transactionSignature,
      amount: args.amount,
      purchaseTime: Date.now(),
      verified: true, // In production, verify on Solana blockchain
    });

    // Update round totals
    await ctx.db.patch(currentRound._id, {
      totalAmount: currentRound.totalAmount + args.amount,
      ticketsSold: currentRound.ticketsSold + numTickets,
    });

    return { success: true, ticketsPurchased: numTickets };
  },
});

// Internal function to get next round number
async function getNextRoundNumber(ctx: any): Promise<number> {
  const lastRound = await ctx.db
    .query("lotteryRounds")
    .withIndex("by_round_number")
    .order("desc")
    .first();

  return lastRound ? lastRound.roundNumber + 1 : 1;
}

// Internal function to conduct lottery drawing
export const conductDrawing = internalMutation({
  args: { roundId: v.id("lotteryRounds") },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round || round.status !== "active") {
      return;
    }

    // Mark round as drawing
    await ctx.db.patch(args.roundId, { status: "drawing" });

    // Get all tickets for this round
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .filter((q) => q.eq(q.field("verified"), true))
      .collect();

    if (tickets.length === 0) {
      // No tickets sold, mark as completed
      await ctx.db.patch(args.roundId, { status: "completed" });
    } else {
      // Create weighted array based on ticket amounts
      const weightedTickets: string[] = [];
      tickets.forEach(ticket => {
        const numTickets = Math.floor(ticket.amount / TICKET_PRICE);
        for (let i = 0; i < numTickets; i++) {
          weightedTickets.push(ticket.walletAddress);
        }
      });

      // Select random winner
      const randomIndex = Math.floor(Math.random() * weightedTickets.length);
      const winner = weightedTickets[randomIndex];
      const winningAmount = round.totalAmount * 0.95; // 5% house edge

      // Update round with winner
      await ctx.db.patch(args.roundId, {
        status: "completed",
        winner,
        winningAmount,
      });
    }

    // Immediately create new active round
    const now = Date.now();
    const nextRoundNumber = await getNextRoundNumber(ctx);
    
    await ctx.db.insert("lotteryRounds", {
      roundNumber: nextRoundNumber,
      startTime: now,
      endTime: now + ROUND_DURATION,
      totalAmount: 0,
      ticketsSold: 0,
      status: "active",
    });
  },
});

// Internal query to get rounds ready for drawing
export const getRoundsReadyForDrawing = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("lotteryRounds")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.lt(q.field("endTime"), now))
      .collect();
  },
});

// Reset database - delete all lottery rounds and tickets
export const resetDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all tickets
    const allTickets = await ctx.db.query("tickets").collect();
    for (const ticket of allTickets) {
      await ctx.db.delete(ticket._id);
    }

    // Delete all lottery rounds
    const allRounds = await ctx.db.query("lotteryRounds").collect();
    for (const round of allRounds) {
      await ctx.db.delete(round._id);
    }

    return { success: true, message: "Database reset successfully" };
  },
});
