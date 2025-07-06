import { Toaster } from "sonner";
import { LotteryApp } from "./components/LotteryApp";
import { SolPrice } from "./components/SolPrice";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <header className="sticky top-0 z-10 bg-black/20 backdrop-blur-sm h-16 flex justify-between items-center border-b border-white/10 shadow-lg px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-lg">🎰</span>
          </div>
          <h2 className="text-xl font-bold text-white">Solana Lottery</h2>
        </div>
        <SolPrice />
      </header>
      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          <LotteryApp />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
