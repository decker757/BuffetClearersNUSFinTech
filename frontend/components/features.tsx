import { Shield, Zap, TrendingUp, Globe, Lock, Award } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'XRPL Security',
    description: 'Built on XRP Ledger with native NFT support and cryptographic verification for all transactions.',
  },
  {
    icon: Zap,
    title: 'Instant Liquidity',
    description: 'Convert future receivables into immediate cash flow through competitive auctions.',
  },
  {
    icon: TrendingUp,
    title: 'Earn Returns',
    description: 'Investors earn returns by purchasing invoices at a discount to face value.',
  },
  {
    icon: Globe,
    title: 'RLUSD Stablecoin',
    description: 'Trade in USD stablecoin for price stability and regulatory compliance.',
  },
  {
    icon: Lock,
    title: 'Transparent & Secure',
    description: 'All transactions recorded on-chain with immutable audit trails.',
  },
  {
    icon: Award,
    title: 'NFT Ownership',
    description: 'Clear ownership rights with transferable NFTs representing invoice claims.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      {/* Radial gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-indigo-600/10 via-transparent to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-blue-600/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-purple-600/10 to-transparent rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl mb-4 text-white">Why Choose InvoiceNFT</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            The most secure and efficient platform for invoice financing
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 bg-gray-900 rounded-xl border border-gray-800 hover:border-blue-800 hover:shadow-lg hover:shadow-blue-900/20 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center mb-4 border border-blue-800/50">
                <feature.icon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl mb-3 text-white">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="p-8 bg-gray-900 rounded-xl border border-gray-800 text-center">
            <div className="text-4xl mb-2 text-white">3-5%</div>
            <div className="text-gray-400">Average Discount Rate</div>
          </div>
          <div className="p-8 bg-gray-900 rounded-xl border border-gray-800 text-center">
            <div className="text-4xl mb-2 text-white">&lt;24h</div>
            <div className="text-gray-400">Average Time to Fund</div>
          </div>
          <div className="p-8 bg-gray-900 rounded-xl border border-gray-800 text-center">
            <div className="text-4xl mb-2 text-white">$0.001</div>
            <div className="text-gray-400">Transaction Cost</div>
          </div>
        </div>
      </div>
    </section>
  );
}