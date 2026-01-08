import { Hero } from './components/hero';
import { HowItWorks } from './components/how-it-works';
import { HowItWorksSection } from './components/how-it-works-section';
import { Features } from './components/features';
import { CallToAction } from './components/call-to-action';
import { Header } from './components/header';
import { Footer } from './components/footer';
import { Marketplace } from './components/marketplace';
import { About } from './components/about';
import { SignIn } from './components/auth/sign-in';
import { Onboarding, UserRole } from './components/auth/onboarding';
import { CustomerDashboard } from './components/dashboard/customer-dashboard';
import { EstablishmentDashboard } from './components/dashboard/establishment-dashboard';
import { DemoDataGenerator } from './components/demo-data-generator';
import { useState, useEffect } from 'react';
import { getUserByPublicKey, createUser } from './lib/database';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { isSupabaseConfigured } from './lib/supabase';
import { AlertCircle } from 'lucide-react';

type Page = 'home' | 'marketplace' | 'how-it-works' | 'about' | 'dashboard' | 'sign-in' | 'onboarding' | 'demo-generator';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [publicKey, setPublicKey] = useState('');

  // Scroll to top whenever the page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // Handle sign in with public key (derived from private key)
  const handleSignIn = async (pubKey: string) => {
    setPublicKey(pubKey);
    
    try {
      const existingUser = await getUserByPublicKey(pubKey);
      
      if (existingUser) {
        // Existing user - go to dashboard
        setUsername(existingUser.username);
        setUserRole(existingUser.role);
        setIsAuthenticated(true);
        setCurrentPage('dashboard');
      } else {
        // New user - go to onboarding
        setCurrentPage('onboarding');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in. Please check your database connection.');
    }
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async (role: UserRole, name: string) => {
    try {
      await createUser(publicKey, name, role);
      
      setUsername(name);
      setUserRole(role);
      setIsAuthenticated(true);
      setCurrentPage('dashboard');
      toast.success('Account created successfully!');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to create account. Please try again.');
    }
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setUsername('');
    setUserRole(null);
    setPublicKey('');
    setCurrentPage('home');
  };

  const navigateToSignIn = () => {
    setCurrentPage('sign-in');
  };

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Background gradient elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10">
        {currentPage !== 'sign-in' && currentPage !== 'onboarding' && currentPage !== 'demo-generator' && (
          <Header 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage}
            isAuthenticated={isAuthenticated}
            username={username}
            userRole={userRole || undefined}
            onSignIn={navigateToSignIn}
            onSignOut={handleSignOut}
          />
        )}
        
        <main>
          {currentPage === 'sign-in' ? (
            <SignIn 
              onSignIn={handleSignIn}
              onNavigateToDemoGenerator={() => setCurrentPage('demo-generator')}
            />
          ) : currentPage === 'onboarding' ? (
            <Onboarding 
              publicKey={publicKey}
              onComplete={handleOnboardingComplete} 
            />
          ) : currentPage === 'dashboard' && isAuthenticated ? (
            userRole === 'investor' ? (
              <CustomerDashboard 
                username={username}
                publicKey={publicKey}
                onViewMarketplace={() => setCurrentPage('marketplace')}
              />
            ) : (
              <EstablishmentDashboard 
                username={username}
                publicKey={publicKey}
              />
            )
          ) : currentPage === 'home' ? (
            <>
              <Hero setCurrentPage={setCurrentPage} />
              <HowItWorksSection />
              <Features />
              <CallToAction setCurrentPage={setCurrentPage} />
            </>
          ) : currentPage === 'how-it-works' ? (
            <HowItWorks setCurrentPage={setCurrentPage} />
          ) : currentPage === 'about' ? (
            <About setCurrentPage={setCurrentPage} />
          ) : currentPage === 'demo-generator' ? (
            <DemoDataGenerator onBackToSignIn={navigateToSignIn} />
          ) : (
            <Marketplace 
              userPublicKey={isAuthenticated ? publicKey : null}
              userRole={isAuthenticated ? userRole : null}
            />
          )}
        </main>
        
        {currentPage !== 'sign-in' && currentPage !== 'onboarding' && currentPage !== 'demo-generator' && <Footer />}
      </div>
      <Toaster />
      
      {/* Supabase Configuration Warning */}
      {!isSupabaseConfigured && (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 bg-amber-900/90 backdrop-blur-sm border border-amber-700 text-white p-4 rounded-lg shadow-xl z-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-100 mb-1">Supabase Not Configured</h3>
              <p className="text-sm text-amber-200 mb-2">
                Update <code className="bg-amber-950/50 px-1 rounded">/lib/supabase.ts</code> with your credentials.
              </p>
              <a 
                href="https://app.supabase.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-amber-300 hover:text-amber-100 underline"
              >
                Get credentials from Supabase →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}