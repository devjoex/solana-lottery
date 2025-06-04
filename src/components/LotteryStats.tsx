import { useEffect, useState } from "react";

interface LotteryStatsProps {
  stats: {
    currentJackpot: number;
    currentTicketsSold: number;
    timeToNextDraw: number;
    totalRounds: number;
    totalTicketsSold: number;
    totalPrizesPaid: number;
    ticketPrice: number;
  };
}

export function LotteryStats({ stats }: LotteryStatsProps) {
  const [timeLeft, setTimeLeft] = useState(stats.timeToNextDraw);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTimeLeft(stats.timeToNextDraw);
  }, [stats.timeToNextDraw]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Current Lottery Round</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Jackpot */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-4">
            <div className="text-black font-bold text-sm mb-1">JACKPOT</div>
            <div className="text-black font-bold text-2xl">
              {stats.currentJackpot.toFixed(3)} SOL
            </div>
          </div>
        </div>

        {/* Tickets Sold */}
        <div className="text-center">
          <div className="bg-blue-600/30 border border-blue-400/30 rounded-xl p-4">
            <div className="text-blue-300 font-bold text-sm mb-1">TICKETS SOLD</div>
            <div className="text-white font-bold text-2xl">{stats.currentTicketsSold}</div>
            <div className="text-blue-300/70 text-xs">
              {stats.ticketPrice} SOL each
            </div>
          </div>
        </div>

        {/* Time to Draw */}
        <div className="text-center">
          <div className="bg-purple-600/30 border border-purple-400/30 rounded-xl p-4">
            <div className="text-purple-300 font-bold text-sm mb-1">NEXT DRAW</div>
            <div className="text-white font-bold text-2xl font-mono">
              {formatTime(timeLeft)}
            </div>
            <div className="text-purple-300/70 text-xs">
              {timeLeft <= 0 ? "Drawing soon..." : "minutes:seconds"}
            </div>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <div className="text-gray-400 text-sm">Total Rounds</div>
          <div className="text-white font-bold">{stats.totalRounds}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400 text-sm">Total Tickets</div>
          <div className="text-white font-bold">{stats.totalTicketsSold}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400 text-sm">Prizes Paid</div>
          <div className="text-white font-bold">{stats.totalPrizesPaid.toFixed(2)} SOL</div>
        </div>
      </div>
    </div>
  );
}
