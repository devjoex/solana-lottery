import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// Check for lottery rounds that need drawing every 30 seconds for faster response
export const checkLotteryDrawings = internalAction({
  args: {},
  handler: async (ctx) => {
    const roundsToProcess = await ctx.runQuery(internal.lottery.getRoundsReadyForDrawing, {});
    
    for (const round of roundsToProcess) {
      await ctx.runMutation(internal.lottery.conductDrawing, {
        roundId: round._id,
      });
    }
  },
});

const crons = cronJobs();

// Run lottery drawing check every 30 seconds for faster response
crons.interval("lottery-drawings", { seconds: 30 }, internal.crons.checkLotteryDrawings, {});

export default crons;
