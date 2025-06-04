import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface TicketPurchaseProps {
  walletAddress: string;
  lotteryWallet: string;
  ticketPrice: number;
}

export function TicketPurchase({ walletAddress, lotteryWallet, ticketPrice }: TicketPurchaseProps) {
  const [ticketCount, setTicketCount] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const purchaseTicket = useMutation(api.lottery.purchaseTicket);

  const totalCost = ticketCount * ticketPrice;

  const getProvider = () => {
    if ('phantom' in window) {
      const provider = (window as any).phantom?.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    }
    return null;
  };

  const handlePurchase = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const provider = getProvider();
      
      if (!provider) {
        toast.error("Phantom wallet not found. Please install Phantom wallet extension.");
        return;
      }

      // Real Phantom wallet transaction on MAINNET
      const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      
      // Use mainnet-beta for production
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(lotteryWallet);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: Math.floor(totalCost * LAMPORTS_PER_SOL),
        })
      );
      
      // Check wallet balance first
      const balance = await connection.getBalance(fromPubkey);
      const requiredLamports = Math.floor(totalCost * LAMPORTS_PER_SOL) + 5000; // Add fee buffer
      
      if (balance < requiredLamports) {
        throw new Error(`Insufficient funds. You need ${(requiredLamports / LAMPORTS_PER_SOL).toFixed(3)} SOL but only have ${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
      }

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;
      
      const signedTransaction = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      // Record the ticket purchase
      const result = await purchaseTicket({
        walletAddress,
        transactionSignature: signature,
        amount: totalCost,
      });

      toast.success(`Successfully purchased ${result.ticketsPurchased} ticket(s)!`);
      setTicketCount(1);
    } catch (error: any) {
      console.error("Purchase failed:", error);
      
      // More specific error messages
      if (error.message?.includes('insufficient funds')) {
        toast.error("Insufficient SOL balance. Please add SOL to your wallet.");
      } else if (error.message?.includes('User rejected')) {
        toast.error("Transaction was cancelled.");
      } else if (error.message?.includes('Network')) {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error(`Transaction failed: ${error.message || 'Please try again'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4">Purchase Lottery Tickets</h3>
      
      <div className="space-y-4">
        {/* Ticket Count Selector */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Number of Tickets
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
              className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-lg font-bold transition-colors"
              disabled={isProcessing}
            >
              -
            </button>
            <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white text-center min-w-[80px]">
              {ticketCount}
            </div>
            <button
              onClick={() => setTicketCount(ticketCount + 1)}
              className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-lg font-bold transition-colors"
              disabled={isProcessing}
            >
              +
            </button>
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="flex gap-2 flex-wrap">
          {[1, 5, 10, 25].map(count => (
            <button
              key={count}
              onClick={() => setTicketCount(count)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                ticketCount === count
                  ? "bg-yellow-500 text-black"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              disabled={isProcessing}
            >
              {count} ticket{count > 1 ? 's' : ''}
            </button>
          ))}
        </div>

        {/* Cost Summary */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Tickets:</span>
            <span className="text-white">{ticketCount}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Price per ticket:</span>
            <span className="text-white">{ticketPrice} SOL</span>
          </div>
          <div className="border-t border-gray-600 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Total Cost:</span>
              <span className="text-yellow-400 font-bold">{totalCost.toFixed(3)} SOL</span>
            </div>

          </div>
        </div>

        {/* Lottery Wallet Info */}
        <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-3">
          <div className="text-blue-300 text-sm font-medium mb-1">Lottery Wallet:</div>
          <div className="text-blue-100 font-mono text-xs break-all">
            {lotteryWallet}
          </div>
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-4 rounded-xl hover:from-yellow-300 hover:to-orange-400 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
              Processing Transaction...
            </div>
          ) : (
            `Purchase ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''} for ${totalCost.toFixed(3)} SOL`
          )}
        </button>

        <div className="text-center text-gray-400 text-xs space-y-1">
          <div>⚠️ <strong>MAINNET TRANSACTIONS</strong> - Real SOL will be used!</div>
          <div className="text-red-400">
            Make sure you have sufficient SOL balance before purchasing tickets
          </div>
        </div>
      </div>
    </div>
  );
}
