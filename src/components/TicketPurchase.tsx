import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

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

  const testConnection = async () => {
    const endpoints = [
      'https://mainnet.helius-rpc.com/?api-key=demo',
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing: ${endpoint}`);
        const conn = new Connection(endpoint);
        const slot = await conn.getSlot();
        console.log(`✅ ${endpoint} - slot: ${slot}`);
        toast.success(`Připojení OK: ${endpoint.split('//')[1].split('/')[0]}`);
        return;
      } catch (error) {
        console.log(`❌ ${endpoint} - error:`, error);
      }
    }
    toast.error("Žádný RPC endpoint nefunguje");
  };

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
    
    console.log("Purchase button clicked!");
    
    setIsProcessing(true);
    try {
      const provider = getProvider();
      
      if (!provider) {
        toast.error("Phantom wallet not found. Please install Phantom wallet extension.");
        return;
      }

      // Real Phantom wallet transaction on MAINNET
      console.log("Starting purchase process...");
      
      // Use multiple RPC endpoints for better reliability
      const rpcEndpoints = [
        'https://mainnet.helius-rpc.com/?api-key=demo',
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com',
        'https://rpc.ankr.com/solana'
      ];
      
      let connection: Connection | null = null;
      let lastError: Error | null = null;
      
      // Try different RPC endpoints until one works
      for (const endpoint of rpcEndpoints) {
        try {
          console.log(`Testing endpoint: ${endpoint}`);
          const testConnection = new Connection(endpoint, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000,
          });
          
          // Test with timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          );
          
          await Promise.race([testConnection.getSlot(), timeoutPromise]);
          connection = testConnection;
          console.log(`Connected to: ${endpoint}`);
          break;
        } catch (error) {
          console.warn(`RPC endpoint ${endpoint} failed:`, error);
          lastError = error as Error;
          continue;
        }
      }
      
      if (!connection) {
        throw new Error(`Všechny RPC endpointy selhaly. Zkus to za chvilku znovu. Chyba: ${lastError?.message || 'Neznámá chyba'}`);
      }
      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(lotteryWallet);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: Math.floor(totalCost * LAMPORTS_PER_SOL),
        })
      );
      
      console.log("Checking wallet balance...");
      
      // Check wallet balance first with retry logic
      let balance: number;
      try {
        balance = await connection.getBalance(fromPubkey);
      } catch (error) {
        console.warn("Failed to get balance, retrying...", error);
        const accountInfo = await connection.getAccountInfo(fromPubkey);
        balance = accountInfo?.lamports || 0;
      }
      const requiredLamports = Math.floor(totalCost * LAMPORTS_PER_SOL) + 10000; // Add fee buffer
      
      console.log(`Balance: ${balance}, Required: ${requiredLamports}`);
      
      if (balance < requiredLamports) {
        throw new Error(`Insufficient funds. You need ${(requiredLamports / LAMPORTS_PER_SOL).toFixed(3)} SOL but only have ${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
      }

      console.log("Creating transaction...");
      
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;
      
      console.log("Requesting signature from wallet...");
      
      const signedTransaction = await provider.signTransaction(transaction);
      
      console.log("Sending transaction...");
      
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      console.log("Transaction sent, signature:", signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature);
      
      console.log("Transaction confirmed, recording purchase...");
      
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
      if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient funds')) {
        toast.error("Insufficient SOL balance. Please add SOL to your wallet.");
      } else if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        toast.error("Transaction was cancelled.");
      } else if (error.message?.includes('Network') || error.message?.includes('network')) {
        toast.error("Network error. Please check your connection and try again.");
      } else if (error.message?.includes('Transaction already processed')) {
        toast.error("This transaction was already processed.");
      } else if (error.message?.includes('403') || error.message?.includes('Access forbidden')) {
        toast.error("RPC přístup blokován. Zkus to za chvilku znovu.");
      } else if (error.message?.includes('RPC') || error.message?.includes('endpoints failed') || error.message?.includes('selhaly')) {
        toast.error("Problém s připojením k Solana síti. Zkus to později.");
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

        {/* Test Connection Button */}
        <button
          onClick={testConnection}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors mb-2"
        >
          🔧 Test RPC Connection
        </button>

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
          <div className="text-yellow-400 text-xs mt-2">
            Pokud se objeví RPC chyby, počkej chvilku a zkus to znovu
          </div>
        </div>
      </div>
    </div>
  );
}
