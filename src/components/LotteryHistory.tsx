import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function LotteryHistory() {
  const history = useQuery(api.lottery.getLotteryHistory, { limit: 10 });

  if (!history) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">Recent Winners</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4">Recent Winners</h3>
      
      {history.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">🎰</div>
          <div>No completed rounds yet</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.map((round) => (
            <div key={round._id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-white font-bold">Round #{round.roundNumber}</div>
                  <div className="text-gray-400 text-sm">
                    {new Date(round.endTime).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold">
                    {round.winningAmount?.toFixed(3) || '0.000'} SOL
                  </div>
                  <div className="text-gray-400 text-sm">
                    {round.ticketsSold} tickets
                  </div>
                </div>
              </div>
              
              {round.winner ? (
                <div className="bg-green-900/30 border border-green-400/30 rounded p-2">
                  <div className="text-green-300 text-xs mb-1">Winner:</div>
                  <div className="text-green-100 font-mono text-xs break-all">
                    {round.winner.slice(0, 8)}...{round.winner.slice(-8)}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-700/30 border border-gray-500/30 rounded p-2">
                  <div className="text-gray-400 text-xs text-center">
                    No tickets sold
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
