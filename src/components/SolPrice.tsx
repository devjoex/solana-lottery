import { useState, useEffect } from "react";

export function SolPrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        setPrice(data.solana.usd);
      } catch (error) {
        console.error('Failed to fetch SOL price:', error);
        // Fallback price if API fails
        setPrice(100);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    // Update price every 60 seconds
    const interval = setInterval(fetchPrice, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
        <div className="text-gray-400 text-xs">SOL Price</div>
        <div className="text-white font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
      <div className="text-gray-400 text-xs">SOL Price</div>
      <div className="text-white font-bold">
        ${price?.toFixed(2) || 'N/A'}
      </div>
    </div>
  );
}
