import { Target, Eye, Lightbulb, Shield, Zap, Globe, Users, Award, TrendingUp } from 'lucide-react';

type Page = 'home' | 'marketplace' | 'how-it-works' | 'about' | 'dashboard' | 'sign-in';

export function About({ setCurrentPage }: { setCurrentPage: (page: Page) => void }) {
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
            About RLFactor
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            A demo platform showcasing XRPL-based invoice financing through NFT tokenization and on-chain auctions
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-blue-600/10 text-blue-400 rounded-full text-sm border border-blue-600/20 mb-6">
                Our Vision
              </span>
              <h2 className="text-4xl text-white mb-6">
                Demonstrating Blockchain-Based Invoice Financing
              </h2>
              <p className="text-gray-400 text-lg mb-6">
                This platform demonstrates how XRPL can revolutionize invoice financing by allowing creditors to mint receivables as NFTs and auction them to investors for immediate liquidity.
              </p>
              <p className="text-gray-400 text-lg mb-6">
                Invoice NFTs represent claims on future RLUSD payments from debtors. NFT ownership = right to receive payment at maturity.
              </p>
              <div className="p-4 bg-yellow-950/30 border border-yellow-900/50 rounded-lg">
                <p className="text-sm text-yellow-400">
                  <strong>Demo Mode:</strong> This is a demonstration platform using simulated authentication. Private keys derive public addresses for user identification. Not intended for real financial transactions or PII collection.
                </p>
              </div>
              
              {/* Reset Button */}
              <button
                onClick={() => {
                  localStorage.removeItem('invoicenft_users');
                  alert('Demo data cleared! You can now sign in as a new user.');
                  window.location.reload();
                }}
                className="mt-4 px-4 py-2 bg-red-600/20 border border-red-600/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all text-sm"
              >
                Reset Demo Data
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-center">
                <div className="text-4xl font-bold text-white mb-2">$50M+</div>
                <div className="text-blue-100 text-sm">Total Volume</div>
              </div>
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 text-center">
                <div className="text-4xl font-bold text-white mb-2">500+</div>
                <div className="text-purple-100 text-sm">Businesses</div>
              </div>
              <div className="bg-gradient-to-br from-pink-600 to-orange-600 rounded-2xl p-8 text-center">
                <div className="text-4xl font-bold text-white mb-2">1,200+</div>
                <div className="text-pink-100 text-sm">Investors</div>
              </div>
              <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl p-8 text-center">
                <div className="text-4xl font-bold text-white mb-2">98%</div>
                <div className="text-orange-100 text-sm">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-white mb-4">Our Values</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-blue-600/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Security First</h3>
              <p className="text-gray-400">
                Built on XRPL's proven blockchain infrastructure with cryptographic security for all transactions.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-purple-600/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Eye className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Transparency</h3>
              <p className="text-gray-400">
                Blockchain technology provides complete visibility into every transaction and auction.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-pink-600/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-600 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Speed</h3>
              <p className="text-gray-400">
                Instant settlements and real-time auctions mean businesses get cash when they need it.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-orange-600/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center mb-4">
                <Lightbulb className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Innovation</h3>
              <p className="text-gray-400">
                We're pioneering the intersection of DeFi, NFTs, and traditional finance.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-cyan-600/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Accessibility</h3>
              <p className="text-gray-400">
                Making invoice financing available to businesses of all sizes, globally.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-indigo-600/50 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl text-white mb-3">Community</h3>
              <p className="text-gray-400">
                Building a thriving ecosystem of businesses and investors helping each other succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why XRPL Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="text-center mb-12">
                <h2 className="text-4xl text-white mb-4">Why We Chose XRPL</h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  The XRP Ledger provides the perfect foundation for our invoice financing platform
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl text-white mb-3">Lightning Fast</h3>
                  <p className="text-gray-400 text-sm">
                    3-5 second settlement times ensure businesses receive funds immediately after auction close.
                  </p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-400 rounded-xl flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl text-white mb-3">Low Costs</h3>
                  <p className="text-gray-400 text-sm">
                    Minimal transaction fees make the platform economically viable for invoices of all sizes.
                  </p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-pink-400 rounded-xl flex items-center justify-center mb-4">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl text-white mb-3">Native NFTs</h3>
                  <p className="text-gray-400 text-sm">
                    Built-in NFT functionality allows invoices to be tokenized and traded as blockchain assets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-white mb-4">Our Team</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Experienced professionals from blockchain, finance, and technology sectors
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'Sarah Chen',
                role: 'CEO & Co-Founder',
                bg: 'from-blue-600 to-purple-600',
              },
              {
                name: 'Michael Torres',
                role: 'CTO & Co-Founder',
                bg: 'from-purple-600 to-pink-600',
              },
              {
                name: 'Emily Watson',
                role: 'Head of Finance',
                bg: 'from-pink-600 to-orange-600',
              },
              {
                name: 'David Kim',
                role: 'Lead Blockchain Engineer',
                bg: 'from-orange-600 to-red-600',
              },
            ].map((member, index) => (
              <div key={index} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all group">
                <div className={`h-48 bg-gradient-to-br ${member.bg} relative`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-4 border-white/20"></div>
                  </div>
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-lg text-white mb-1">{member.name}</h3>
                  <p className="text-sm text-gray-400">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recognition Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-white mb-4">Recognition & Awards</h2>
            <p className="text-gray-400 text-lg">
              Acknowledged by industry leaders
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg text-white mb-2">Best DeFi Innovation 2024</h3>
              <p className="text-sm text-gray-400">Blockchain Finance Summit</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg text-white mb-2">Top 10 FinTech Startups</h3>
              <p className="text-sm text-gray-400">Asian FinTech Awards</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg text-white mb-2">XRPL Grant Recipient</h3>
              <p className="text-sm text-gray-400">Ripple XRPL Grants Program</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl text-white mb-6">
            Join Our Journey
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Be part of the revolution transforming invoice financing through blockchain technology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setCurrentPage('sign-in')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all text-lg"
            >
              Get Started
            </button>
            <button
              onClick={() => window.open('https://share.google/zEuc7Teue0D8iNZq7', '_blank')}
              className="px-8 py-4 bg-gray-900 text-white rounded-xl border border-gray-800 hover:border-gray-700 transition-all text-lg"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}