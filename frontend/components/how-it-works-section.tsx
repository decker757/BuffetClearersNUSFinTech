import { FileText, Coins, TrendingUp, Lock } from 'lucide-react';

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Transform your invoices into liquid assets in four simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="relative group">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-blue-600/50 transition-all h-full">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Debtor Acknowledges</h3>
              <p className="text-gray-400">
                Debtor acknowledges their payment obligation to creditor, setting the maturity date
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-purple-600/50 transition-all h-full">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                <Coins className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Creditor Mints NFT</h3>
              <p className="text-gray-400">
                Creditor mints the receivable as an NFT on XRPL, representing the right to future payment from debtor
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-pink-600/50 transition-all h-full">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-600 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Auction NFT</h3>
              <p className="text-gray-400">
                Investors bid in RLUSD. Highest bidder owns the NFT and right to collect payment from debtor at maturity
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-orange-600/50 transition-all h-full">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Automatic Payout</h3>
              <p className="text-gray-400">
                At maturity, debtor pays the full invoice amount in RLUSD to the NFT holder (investor)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}