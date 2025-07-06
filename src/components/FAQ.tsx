import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How often are lottery drawings held?",
    answer: "Lottery drawings are held every 30 minutes automatically. Once a round ends, a winner is selected and a new round begins immediately."
  },
  {
    question: "How much does a lottery ticket cost?",
    answer: "Each lottery ticket costs 0.1 SOL. You can purchase multiple tickets to increase your chances of winning."
  },
  {
    question: "How is the winner selected?",
    answer: "Winners are selected randomly using a weighted system. The more tickets you purchase, the higher your chances of winning. Each ticket gives you an equal chance in the drawing."
  },
  {
    question: "What percentage of the jackpot does the winner receive?",
    answer: "The winner receives 95% of the total jackpot. The remaining 5% is kept as a house edge to maintain the lottery system."
  },
  {
    question: "Do I need a Phantom wallet to participate?",
    answer: "Yes, you need a Phantom wallet extension installed in your browser to connect and participate in the lottery. All transactions are processed on the Solana blockchain."
  },
  {
    question: "What happens if no tickets are sold in a round?",
    answer: "If no tickets are sold during a 30-minute round, the round is marked as completed with no winner, and a new round begins automatically."
  },
  {
    question: "Can I buy tickets after the round has ended?",
    answer: "No, you cannot purchase tickets for a round that has already ended. You can only buy tickets for the current active round."
  },
  {
    question: "How can I verify my ticket purchases?",
    answer: "All ticket purchases are recorded on the Solana blockchain. You can verify your transactions using the transaction signature provided after each purchase."
  },
  {
    question: "Is this running on Solana mainnet?",
    answer: "YES! This lottery is running on Solana MAINNET. All transactions use real SOL with real value. Please be careful and only spend what you can afford to lose."
  },
  {
    question: "Are my funds safe?",
    answer: "All transactions are processed directly on the Solana blockchain. The lottery wallet address is publicly visible and all transactions are transparent. However, gambling involves risk - only participate with funds you can afford to lose."
  },
  {
    question: "How do I get SOL for the lottery?",
    answer: "You can purchase SOL on cryptocurrency exchanges like Coinbase, Binance, or FTX, then transfer it to your Phantom wallet. Make sure you have enough SOL to cover both ticket costs and transaction fees."
  }
];

export function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
      
      <div className="space-y-4">
        {faqData.map((item, index) => (
          <div key={index} className="border border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-4 py-3 text-left bg-gray-800/50 hover:bg-gray-700/50 transition-colors flex justify-between items-center"
            >
              <span className="text-white font-medium">{item.question}</span>
              <span className="text-yellow-400 text-xl">
                {openItems.includes(index) ? '−' : '+'}
              </span>
            </button>
            {openItems.includes(index) && (
              <div className="px-4 py-3 bg-gray-900/30 border-t border-gray-600">
                <p className="text-gray-300 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
