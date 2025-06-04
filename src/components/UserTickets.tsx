interface UserTicketsProps {
  tickets: Array<{
    _id: string;
    transactionSignature: string;
    amount: number;
    purchaseTime: number;
    verified: boolean;
  }>;
  ticketPrice: number;
}

export function UserTickets({ tickets, ticketPrice }: UserTicketsProps) {
  const totalTickets = tickets.reduce((sum, ticket) => 
    sum + Math.floor(ticket.amount / ticketPrice), 0
  );
  
  const totalSpent = tickets.reduce((sum, ticket) => sum + ticket.amount, 0);

  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4">Your Tickets This Round</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-600/20 border border-green-400/30 rounded-lg p-3 text-center">
          <div className="text-green-300 text-sm">Total Tickets</div>
          <div className="text-white font-bold text-xl">{totalTickets}</div>
        </div>
        <div className="bg-blue-600/20 border border-blue-400/30 rounded-lg p-3 text-center">
          <div className="text-blue-300 text-sm">Total Spent</div>
          <div className="text-white font-bold text-xl">{totalSpent.toFixed(3)} SOL</div>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {tickets.map((ticket) => {
          const ticketCount = Math.floor(ticket.amount / ticketPrice);
          return (
            <div key={ticket._id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-medium">
                    {ticketCount} ticket{ticketCount > 1 ? 's' : ''}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {new Date(ticket.purchaseTime).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-medium">
                    {ticket.amount.toFixed(3)} SOL
                  </div>
                  <div className={`text-xs ${ticket.verified ? 'text-green-400' : 'text-yellow-400'}`}>
                    {ticket.verified ? '✓ Verified' : '⏳ Pending'}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 font-mono break-all">
                {ticket.transactionSignature}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
