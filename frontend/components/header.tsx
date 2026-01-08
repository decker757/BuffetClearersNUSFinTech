import { Layers, LogOut, LayoutDashboard, Database } from 'lucide-react';
import { UserRole } from './auth/onboarding';

type Page = 'home' | 'marketplace' | 'how-it-works' | 'about' | 'dashboard' | 'demo-generator';

export function Header({ 
  currentPage, 
  setCurrentPage,
  isAuthenticated,
  username,
  userRole,
  onSignIn,
  onSignOut
}: { 
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isAuthenticated: boolean;
  username?: string;
  userRole?: UserRole;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">RLFactor</span>
          </button>
          
          <nav className="hidden md:flex items-center gap-8">
            {isAuthenticated && (
              <button 
                onClick={() => setCurrentPage('dashboard')}
                className={`transition-colors ${
                  currentPage === 'dashboard' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
            )}
            <button 
              onClick={() => setCurrentPage('marketplace')}
              className={`transition-colors ${
                currentPage === 'marketplace' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Marketplace
            </button>
            <button 
              onClick={() => setCurrentPage('how-it-works')}
              className={`transition-colors ${
                currentPage === 'how-it-works' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              How It Works
            </button>
            <button 
              onClick={() => setCurrentPage('about')}
              className={`transition-colors ${
                currentPage === 'about' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              About
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <button 
                  onClick={() => setCurrentPage('dashboard')}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    userRole === 'investor' ? 'bg-blue-400' : 'bg-purple-400'
                  }`}></div>
                  <span className="text-sm text-gray-300">{username}</span>
                </button>
                <button 
                  onClick={onSignOut}
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={onSignIn}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Sign In
                </button>
                
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}