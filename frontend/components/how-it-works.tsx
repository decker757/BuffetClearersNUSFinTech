import { FileText, Coins, Lock, TrendingUp, ArrowRight, Shield, Users, Zap } from 'lucide-react';

export function HowItWorks() {
  return (
    <div className="min-h-screen bg-gray-950 pt-16">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl lg:text-6xl text-white mb-6">
            How It Works
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Understand the complete process of tokenizing invoices and participating in our XRPL-powered auction marketplace
          </p>
        </div>
      </section>

      {/* For Businesses Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-blue-600/10 text-blue-400 rounded-full text-sm border border-blue-600/20 mb-4">
              For Businesses (Creditors)
            </span>
            <h2 className="text-4xl text-white mb-4">
              Turn Your Receivables Into Immediate Cash
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Convert outstanding receivables into immediate liquidity through blockchain-secured on-chain auctions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-600/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-white mb-3">Receive Invoice</h3>
                <p className="text-gray-400 text-sm">
                  A debtor acknowledges their obligation to you, with payment due at maturity
                </p>
              </div>
              {/* Arrow */}
              <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-600/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-white mb-3">Mint NFT</h3>
                <p className="text-gray-400 text-sm">
                  You mint the invoice as an NFT on XRPL. This NFT represents your claim to future payment from the debtor
                </p>
              </div>
              <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-600/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-white mb-3">List on Auction</h3>
                <p className="text-gray-400 text-sm">
                  Investors bid on your NFT in RLUSD. Highest bidder gets the NFT and future payout rights
                </p>
              </div>
              <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-6 h-6 text-pink-600" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-blue-600/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-white mb-3">Get Paid Now</h3>
                <p className="text-gray-400 text-sm">
                  Receive RLUSD instantly from the winning investor (at a discount). They'll collect full amount at maturity
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Investors Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-purple-600/10 text-purple-400 rounded-full text-sm border border-purple-600/20 mb-4">
              For Investors
            </span>
            <h2 className="text-4xl text-white mb-4">
              Invest in Invoice NFTs
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Access short-term, asset-backed investment opportunities with transparent returns
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-white mb-3">Browse Auctions</h3>
                <p className="text-gray-400 text-sm">
                  Explore verified invoice NFTs with detailed information and risk assessments
                </p>
              </div>
              <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-6 h-6 text-cyan-600" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-white mb-3">Place Bids</h3>
                <p className="text-gray-400 text-sm">
                  Submit competitive bids in RLUSD stablecoin for invoices that match your criteria
                </p>
              </div>
              <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-white mb-3">Win Auction</h3>
                <p className="text-gray-400 text-sm">
                  Win the auction and own the NFT. You now have the right to collect from debtor at maturity
                </p>
              </div>
              <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                <ArrowRight className="w-6 h-6 text-indigo-600" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-600/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl text-white mb-3">Collect Payout</h3>
                <p className="text-gray-400 text-sm">
                  At maturity, debtor pays you the full invoice amount in RLUSD. You earn the discount as profit
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-12">
                <h2 className="text-4xl text-white mb-4">Powered by XRPL</h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  Built on the XRP Ledger for fast, secure, and cost-effective transactions
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl text-white mb-2">3-5 Seconds</h3>
                  <p className="text-gray-400 text-sm">Transaction settlement time on XRPL</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl text-white mb-2">$0.0002</h3>
                  <p className="text-gray-400 text-sm">Average transaction cost</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl text-white mb-2">100% Secure</h3>
                  <p className="text-gray-400 text-sm">Cryptographic verification on blockchain</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join our platform today and experience the future of invoice financing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all text-lg">
              List Your Invoice
            </button>
            <button className="px-8 py-4 bg-gray-900 text-white rounded-xl border border-gray-800 hover:border-gray-700 transition-all text-lg">
              Start Investing
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}