import { useState } from 'react';
import { Database, Loader2, CheckCircle, AlertCircle, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { derivePublicKey } from '../utils/xrpl-utils';

interface DemoDataGeneratorProps {
  onBackToSignIn?: () => void;
}

export function DemoDataGenerator({ onBackToSignIn }: DemoDataGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [generatedAccounts, setGeneratedAccounts] = useState<Array<{ role: string; username: string; privateKey: string; publicKey: string }>>([]);
  const [showRLSFix, setShowRLSFix] = useState(false);

  // Demo private keys
  const DEMO_KEYS = {
    investor1: 'sTestKey123456789INVESTOR',
    investor2: 'sTestKey987654321INVESTOR2',
    establishment1: 'sTestKey123456789ESTABLISHMENT',
    establishment2: 'sTestKey987654321ESTABLISHMENT2'
  };

  const generateDemoData = async () => {
    setIsGenerating(true);
    setStatus({ type: 'info', message: 'Generating demo data...' });
    const accounts: Array<{ role: string; username: string; privateKey: string; publicKey: string }> = [];

    try {
      // 1. Create demo users
      const users = [
        { privateKey: DEMO_KEYS.investor1, username: 'Alice Investor', role: 'investor' as const },
        { privateKey: DEMO_KEYS.investor2, username: 'Bob Investor', role: 'investor' as const },
        { privateKey: DEMO_KEYS.establishment1, username: 'Acme Corp', role: 'establishment' as const },
        { privateKey: DEMO_KEYS.establishment2, username: 'TechStart Inc', role: 'establishment' as const }
      ];

      for (const user of users) {
        const publicKey = derivePublicKey(user.privateKey);
        
        const { error: userError } = await supabase
          .from('USER')
          .upsert({
            publicKey: publicKey,
            username: user.username,
            role: user.role
          }, { onConflict: 'publicKey' });

        if (userError) throw userError;
        
        accounts.push({
          role: user.role,
          username: user.username,
          privateKey: user.privateKey,
          publicKey: publicKey
        });
      }

      // 2. Create demo NFTokens for establishments
      const establishment1PubKey = derivePublicKey(DEMO_KEYS.establishment1);
      const establishment2PubKey = derivePublicKey(DEMO_KEYS.establishment2);

      const nftokens = [
        {
          nftoken_id: 'NFT00001ACME2024INV001',
          created_by: establishment1PubKey,
          invoice_number: 'INV-2024-001',
          face_value: 50000,
          image_link: 'https://images.unsplash.com/photo-1554224311-beee910c1b8a?w=800&q=80',
          maturity_date: '2025-03-15 00:00:00',
          current_owner: establishment1PubKey,
          current_state: 'listed'
        },
        {
          nftoken_id: 'NFT00002ACME2024INV002',
          created_by: establishment1PubKey,
          invoice_number: 'INV-2024-002',
          face_value: 75000,
          image_link: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
          maturity_date: '2025-04-20 00:00:00',
          current_owner: establishment1PubKey,
          current_state: 'listed'
        },
        {
          nftoken_id: 'NFT00003TECH2024INV003',
          created_by: establishment2PubKey,
          invoice_number: 'INV-2024-003',
          face_value: 120000,
          image_link: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
          maturity_date: '2025-05-10 00:00:00',
          current_owner: establishment2PubKey,
          current_state: 'listed'
        },
        {
          nftoken_id: 'NFT00004TECH2024INV004',
          created_by: establishment2PubKey,
          invoice_number: 'INV-2024-004',
          face_value: 95000,
          image_link: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&q=80',
          maturity_date: '2025-06-01 00:00:00',
          current_owner: establishment2PubKey,
          current_state: 'draft'
        }
      ];

      for (const nft of nftokens) {
        const { error: nftError } = await supabase
          .from('NFTOKEN')
          .upsert(nft, { onConflict: 'nftoken_id' });

        if (nftError) throw nftError;
      }

      // 3. Create auction listings for listed NFTs
      const now = new Date();
      const listings = [
        {
          nftoken_id: 'NFT00001ACME2024INV001',
          face_value: 50000,
          expiry: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          min_bid: 45000,
          current_bid: 47000
        },
        {
          nftoken_id: 'NFT00002ACME2024INV002',
          face_value: 75000,
          expiry: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
          min_bid: 68000,
          current_bid: 70000
        },
        {
          nftoken_id: 'NFT00003TECH2024INV003',
          face_value: 120000,
          expiry: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days
          min_bid: 110000,
          current_bid: 115000
        }
      ];

      for (const listing of listings) {
        const { data: insertedListing, error: listingError } = await supabase
          .from('AUCTIONLISTING')
          .insert(listing)
          .select()
          .single();

        if (listingError) throw listingError;

        // 4. Add some bids to the auctions
        if (insertedListing) {
          const investor1PubKey = derivePublicKey(DEMO_KEYS.investor1);
          const investor2PubKey = derivePublicKey(DEMO_KEYS.investor2);

          const bids = [
            { aid: insertedListing.aid, bid_amount: listing.min_bid, bid_by: investor1PubKey },
            { aid: insertedListing.aid, bid_amount: listing.current_bid, bid_by: investor2PubKey }
          ];

          for (const bid of bids) {
            const { error: bidError } = await supabase
              .from('AUCTIONBIDS')
              .insert(bid);

            if (bidError && !bidError.message.includes('duplicate')) throw bidError;
          }
        }
      }

      setStatus({ type: 'success', message: '✅ Demo data generated successfully!' });
      setGeneratedAccounts(accounts);

    } catch (error: any) {
      console.error('Error generating demo data:', error);
      
      // Check if it's an RLS policy error
      if (error.message && error.message.toLowerCase().includes('row-level security')) {
        setStatus({ type: 'error', message: `Error: ${error.message}` });
        setShowRLSFix(true);
      } else {
        setStatus({ type: 'error', message: `Error: ${error.message}` });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const clearDemoData = async () => {
    if (!confirm('Are you sure you want to clear all demo data? This will delete all users, NFTs, auctions, and bids.')) {
      return;
    }

    setIsClearing(true);
    setStatus({ type: 'info', message: 'Clearing demo data...' });

    try {
      // Delete in reverse order of dependencies
      await supabase.from('AUCTIONBIDS').delete().neq('bid_id', 0);
      await supabase.from('AUCTIONLISTING').delete().neq('aid', 0);
      await supabase.from('NFTOKEN').delete().neq('nftoken_id', '');
      await supabase.from('USER').delete().neq('publicKey', '');

      setStatus({ type: 'success', message: '✅ All demo data cleared!' });
      setGeneratedAccounts([]);

    } catch (error: any) {
      console.error('Error clearing demo data:', error);
      setStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Back button */}
        {onBackToSignIn && (
          <button
            onClick={onBackToSignIn}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </button>
        )}

        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Database className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl mb-4 text-white">
            Demo Data <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Generator</span>
          </h1>
          <p className="text-xl text-gray-400">Populate your database with sample accounts and NFTs</p>
        </div>

        {/* Action buttons */}
        <div className="p-8 bg-gray-900 border border-gray-800 rounded-2xl mb-6">
          <div className="flex gap-4">
            <button
              onClick={generateDemoData}
              disabled={isGenerating || isClearing}
              className="flex-1 py-3 px-6 rounded-lg text-white font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  Generate Demo Data
                </>
              )}
            </button>

            <button
              onClick={clearDemoData}
              disabled={isGenerating || isClearing}
              className="py-3 px-6 rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isClearing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Clear All
                </>
              )}
            </button>
          </div>

          {status && (
            <div className={`mt-4 p-4 rounded-lg border ${
              status.type === 'success' ? 'bg-green-950/30 border-green-900/50 text-green-400' :
              status.type === 'error' ? 'bg-red-950/30 border-red-900/50 text-red-400' :
              'bg-blue-950/30 border-blue-900/50 text-blue-400'
            } flex items-start gap-2`}>
              {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> :
               status.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> :
               <Loader2 className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" />}
              <span>{status.message}</span>
            </div>
          )}
        </div>

        {/* RLS Fix Instructions */}
        {showRLSFix && (
          <div className="p-8 bg-amber-950/30 border border-amber-900/50 rounded-2xl mb-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Row-Level Security (RLS) Configuration Needed
            </h2>
            <p className="text-amber-200 mb-4">
              Your Supabase tables have Row-Level Security enabled but no policies are configured. 
              To fix this, run the following SQL in your Supabase SQL Editor:
            </p>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-amber-300">SQL Fix Script:</h3>
                  <button
                    onClick={() => {
                      const sql = `-- Disable RLS on all tables for development
ALTER TABLE "USER" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "NFTOKEN" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AUCTIONLISTING" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AUCTIONBIDS" DISABLE ROW LEVEL SECURITY;`;
                      navigator.clipboard.writeText(sql);
                      alert('SQL copied to clipboard!');
                    }}
                    className="px-3 py-1 bg-amber-800 hover:bg-amber-700 text-amber-100 rounded text-xs transition-colors"
                  >
                    Copy SQL
                  </button>
                </div>
                <pre className="p-4 bg-gray-950 rounded-lg text-xs text-gray-300 overflow-x-auto">
{`-- Disable RLS on all tables for development
ALTER TABLE "USER" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "NFTOKEN" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AUCTIONLISTING" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AUCTIONBIDS" DISABLE ROW LEVEL SECURITY;`}
                </pre>
              </div>

              <div className="p-4 bg-amber-900/30 border border-amber-800/50 rounded-lg">
                <h3 className="text-sm font-medium text-amber-300 mb-2">How to run this:</h3>
                <ol className="text-sm text-amber-200 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-100">Supabase Dashboard</a></li>
                  <li>Select your project: <code className="bg-amber-950/50 px-1 rounded">lnjpmgbntynqfmamzlzk</code></li>
                  <li>Click <strong>SQL Editor</strong> in the left sidebar</li>
                  <li>Paste the SQL above and click <strong>Run</strong></li>
                  <li>Return here and try generating demo data again</li>
                </ol>
              </div>

              <div className="p-4 bg-blue-950/30 border border-blue-800/50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-300 mb-2">💡 Note:</h3>
                <p className="text-sm text-blue-200">
                  This disables RLS for development/demo purposes. For production, you'll want to enable RLS 
                  and create proper policies to secure your data based on user authentication.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* What gets created */}
        <div className="p-8 bg-gray-900 border border-gray-800 rounded-2xl mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">What Gets Created:</h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm text-blue-400">1</span>
              </div>
              <div>
                <strong className="text-white">4 Demo Users</strong>
                <p className="text-sm text-gray-400">2 investors (Alice, Bob) and 2 establishments (Acme Corp, TechStart Inc)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm text-blue-400">2</span>
              </div>
              <div>
                <strong className="text-white">4 Invoice NFTs</strong>
                <p className="text-sm text-gray-400">With varying face values ($50k-$120k) and maturity dates</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm text-blue-400">3</span>
              </div>
              <div>
                <strong className="text-white">3 Active Auctions</strong>
                <p className="text-sm text-gray-400">With different expiry dates (5-10 days from now)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm text-blue-400">4</span>
              </div>
              <div>
                <strong className="text-white">Sample Bids</strong>
                <p className="text-sm text-gray-400">Multiple bids on each auction from different investors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Generated accounts */}
        {generatedAccounts.length > 0 && (
          <div className="p-8 bg-gray-900 border border-gray-800 rounded-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">🔑 Demo Accounts (Use these to sign in):</h2>
            <div className="space-y-4">
              {generatedAccounts.map((account, index) => (
                <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{account.username}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      account.role === 'investor' 
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' 
                        : 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                    }`}>
                      {account.role}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500">Private Key (use this to sign in):</label>
                      <code className="block mt-1 p-2 bg-gray-900 rounded text-xs text-green-400 font-mono overflow-x-auto">
                        {account.privateKey}
                      </code>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Public Key (stored in database):</label>
                      <code className="block mt-1 p-2 bg-gray-900 rounded text-xs text-gray-400 font-mono overflow-x-auto">
                        {account.publicKey}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}