import { ArrowRight } from 'lucide-react';

type Page = 'home' | 'marketplace' | 'how-it-works' | 'about' | 'dashboard' | 'sign-in';

export function CallToAction({ setCurrentPage }: { setCurrentPage: (page: Page) => void }) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-950 via-purple-950 to-indigo-950 text-white border-y border-gray-800 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500/20 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-4xl lg:text-5xl mb-6">
          Ready to Unlock Your Cash Flow?
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Join hundreds of businesses and investors leveraging blockchain technology for better invoice financing.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={() => setCurrentPage('sign-in')}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            Start Your First Auction
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentPage('marketplace')}
            className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
          >
            Browse Active Listings
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 pt-8 border-t border-white/20">
          <div>
            <div className="text-2xl mb-2">For Businesses</div>
            <div className="text-sm opacity-80">Convert receivables to cash instantly</div>
          </div>
          <div>
            <div className="text-2xl mb-2">For Investors</div>
            <div className="text-sm opacity-80">Earn returns on invoice-backed NFTs</div>
          </div>
          <div>
            <div className="text-2xl mb-2">For Everyone</div>
            <div className="text-sm opacity-80">Transparent, secure, trustless</div>
          </div>
        </div>
      </div>
    </section>
  );
}