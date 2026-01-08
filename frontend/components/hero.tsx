import { ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react';
import GradientText from './figma/GradientText';

type Page = 'home' | 'marketplace' | 'how-it-works' | 'about' | 'dashboard' | 'sign-in';

export function Hero({ setCurrentPage }: { setCurrentPage: (page: Page) => void }) {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative">
      {/* Section-specific gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-purple-600/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-950/50 text-blue-400 rounded-full text-sm mb-6 border border-blue-900/50">
              <Zap className="w-4 h-4" />
              Powered by XRPL & RLUSD
            </div>
            
            <h1 className="text-5xl lg:text-6xl mb-6 text-white leading-tight">
              Turn Future Payments Into{' '}
              <GradientText
                animationSpeed={3}
                colors={['#60A5FA', '#A78BFA', '#C084FC', '#60A5FA']}
              >
                Liquid Assets
              </GradientText>
            </h1>
            
            <p className="text-xl text-gray-400 mb-8 leading-relaxed">
              Invoice financing on the blockchain. Businesses get instant liquidity. Investors earn predictable returns.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Start Auction
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentPage('marketplace')}
                className="px-8 py-4 border-2 border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-colors"
              >
                View Marketplace
              </button>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl mb-1 text-white">$2.4M</div>
                <div className="text-gray-500 text-sm">Trading Volume</div>
              </div>
              <div>
                <div className="text-3xl mb-1 text-white">150+</div>
                <div className="text-gray-500 text-sm">Active Auctions</div>
              </div>
              <div>
                <div className="text-3xl mb-1 text-white">98%</div>
                <div className="text-gray-500 text-sm">Settlement Rate</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-900 p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                  <span className="text-sm text-gray-400">Featured Auction</span>
                  <span className="px-3 py-1 bg-green-950/50 text-green-400 rounded-full text-xs border border-green-900/50">
                    Live
                  </span>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-2">Invoice #INV-2024-001</div>
                  <div className="text-3xl mb-4 text-white">10,000 RLUSD</div>
                  <div className="flex items-center gap-2 text-green-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">15% discount opportunity</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="text-sm text-gray-400 mb-1">Current Bid</div>
                    <div className="text-xl text-white">8,500 RLUSD</div>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="text-sm text-gray-400 mb-1">Maturity</div>
                    <div className="text-xl text-white">30 Days</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Verified on XRPL
                  </div>
                  <div className="text-xs text-gray-600">
                    Token ID: nft1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0
                  </div>
                </div>

                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity">
                  Place Bid
                </button>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl opacity-20"></div>
          </div>
        </div>
      </div>
    </section>
  );
}