import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LotteryStats } from "./LotteryStats";
import { TicketPurchase } from "./TicketPurchase";
import { LotteryHistory } from "./LotteryHistory";
import { UserTickets } from "./UserTickets";
import { FAQ } from "./FAQ";

export function LotteryApp() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  
  const stats = useQuery(api.lottery.getLotteryStats);
  const userTickets = useQuery(
    api.lottery.getUserTickets,
    walletAddress ? { walletAddress } : "skip"
  );
  const createNewRound = useMutation(api.lottery.createNewRound);
  const checkExpiredRounds = useMutation(api.lottery.checkExpiredRounds);


  // Check if we need to create initial round or process expired rounds
  useEffect(() => {
    if (stats) {
      if (stats.currentJackpot === 0 && stats.totalRounds === 0) {
        createNewRound();
      } else if (stats.timeToNextDraw <= 0) {
        // Round has expired, trigger processing
        checkExpiredRounds();
      }
    }
  }, [stats, createNewRound, checkExpiredRounds]);

  // Auto-check for expired rounds every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (stats && stats.timeToNextDraw <= 0) {
        checkExpiredRounds();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [stats, checkExpiredRounds]);

  // Check for Phantom wallet
  const getProvider = () => {
    if ('phantom' in window) {
      const provider = (window as any).phantom?.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    }
    return null;
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const provider = getProvider();
      
      if (!provider) {
        toast.error("Phantom wallet not found. Please install Phantom wallet extension.");
        return;
      }

      const response = await provider.connect();
      setWalletAddress(response.publicKey.toString());
      toast.success("Phantom wallet connected successfully!");
    } catch (error) {
      console.error("Wallet connection failed:", error);
      toast.error("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const provider = getProvider();
      if (provider) {
        await provider.disconnect();
      }
      setWalletAddress("");
      toast.info("Wallet disconnected");
    } catch (error) {
      console.error("Disconnect failed:", error);
      setWalletAddress("");
      toast.info("Wallet disconnected");
    }
  };



  // Auto-connect if wallet was previously connected
  useEffect(() => {
    const provider = getProvider();
    if (provider) {
      provider.connect({ onlyIfTrusted: true })
        .then((response: any) => {
          setWalletAddress(response.publicKey.toString());
        })
        .catch(() => {
          // User hasn't connected before or rejected auto-connect
        });
    }
  }, []);

  if (!stats) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          🎰 Solana Lottery
        </h1>
        <p className="text-gray-300 text-lg mb-6">
          Decentralized lottery on Solana blockchain
        </p>
        


        {/* Wallet Connection */}
        {!walletAddress ? (
          <div className="space-y-4">
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-3 px-8 rounded-xl hover:from-yellow-300 hover:to-orange-400 transition-all duration-200 shadow-lg disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Phantom Wallet"}
            </button>
            <div className="text-gray-400 text-sm space-y-1">
              <div>📱 Requires Phantom wallet extension</div>
              <div>💡 Connect your wallet to purchase lottery tickets</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <div className="bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
              <span className="text-gray-300 text-sm">Connected: </span>
              <span className="text-white font-mono text-sm">
                {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
              </span>
            </div>
            <button
              onClick={disconnectWallet}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Main Lottery Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Stats and Purchase */}
        <div className="lg:col-span-2 space-y-6">
          <LotteryStats stats={stats} />
          
          {walletAddress ? (
            <TicketPurchase 
              walletAddress={walletAddress}
              lotteryWallet={stats.lotteryWallet}
              ticketPrice={stats.ticketPrice}
            />
          ) : (
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
              <p className="text-gray-300">
                Connect your Phantom wallet above to purchase lottery tickets and participate in the draw.
              </p>
            </div>
          )}
          
          {walletAddress && userTickets && userTickets.length > 0 && (
            <UserTickets tickets={userTickets} ticketPrice={stats.ticketPrice} />
          )}
        </div>

        {/* Right Column - History */}
        <div>
          <LotteryHistory />
        </div>
      </div>

      {/* FAQ Section */}
      <FAQ />
    </div>
  );
}
