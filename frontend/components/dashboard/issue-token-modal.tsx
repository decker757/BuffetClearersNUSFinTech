import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { getAllUsers } from '../../lib/database';
import { User } from '../../lib/supabase';
import { toast } from 'sonner';

interface Token {
  invoiceNumber: string;
  amount: number;
  maturityDate: string;
  buyer: string;
  buyerPublicKey: string;
}

export function IssueTokenModal({
  onClose,
  onIssue,
  currentUserPublicKey
}: {
  onClose: () => void;
  onIssue: (token: Token) => void;
  currentUserPublicKey: string;
}) {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    amount: '',
    maturityDate: '',
    creditorPublicKey: ''
  });

  const [establishments, setEstablishments] = useState<User[]>([]);
  const [loadingEstablishments, setLoadingEstablishments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all establishment users when modal opens
  useEffect(() => {
    const fetchEstablishments = async () => {
      try {
        setLoadingEstablishments(true);
        const users = await getAllUsers();
        // Filter only establishment role users AND exclude current user
        const establishmentUsers = users.filter(
          user => user.role === 'establishment' && user.publicKey !== currentUserPublicKey
        );
        setEstablishments(establishmentUsers);
      } catch (error) {
        console.error('Failed to fetch establishments:', error);
        toast.error('Failed to load establishments');
      } finally {
        setLoadingEstablishments(false);
      }
    };

    fetchEstablishments();
  }, [currentUserPublicKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that user is not creating an invoice to themselves
    if (formData.creditorPublicKey === currentUserPublicKey) {
      toast.error('You cannot create an invoice to yourself. Please select a different creditor.');
      return;
    }

    // Find the selected establishment to get their username
    const selectedEstablishment = establishments.find(
      est => est.publicKey === formData.creditorPublicKey
    );

    if (!selectedEstablishment) {
      toast.error('Please select a creditor establishment');
      return;
    }

    setIsSubmitting(true);
    try {
      await onIssue({
        invoiceNumber: formData.invoiceNumber,
        amount: parseFloat(formData.amount),
        maturityDate: formData.maturityDate,
        buyer: selectedEstablishment.username,
        buyerPublicKey: formData.creditorPublicKey
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-2xl text-white">Acknowledge Invoice Debt</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div className="p-4 bg-blue-950/30 border border-blue-900/50 rounded-lg mb-6">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> You are acknowledging a debt obligation. The creditor will mint an NFT representing their claim to receive payment from you at maturity. You will pay the NFT holder when the invoice matures.
              </p>
            </div>

            <div>
              <label htmlFor="invoiceNumber" className="block text-sm text-gray-400 mb-2">
                Invoice Number *
              </label>
              <input
                id="invoiceNumber"
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="e.g., INV-2024-001"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm text-gray-400 mb-2">
                Face Value (RLUSD) *
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g., 10000"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="maturityDate" className="block text-sm text-gray-400 mb-2">
                Maturity Date *
              </label>
              <input
                id="maturityDate"
                type="date"
                value={formData.maturityDate}
                onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-600 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="creditorPublicKey" className="block text-sm text-gray-400 mb-2">
                Creditor Establishment (Who you owe money to) *
              </label>
              {loadingEstablishments ? (
                <div className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500">
                  Loading establishments...
                </div>
              ) : (
                <select
                  id="creditorPublicKey"
                  value={formData.creditorPublicKey}
                  onChange={(e) => setFormData({ ...formData, creditorPublicKey: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-600 transition-colors"
                  required
                >
                  <option value="" className="text-gray-500">Select a creditor establishment...</option>
                  {establishments.map((establishment) => (
                    <option key={establishment.publicKey} value={establishment.publicKey}>
                      {establishment.username} ({establishment.publicKey.slice(0, 8)}...{establishment.publicKey.slice(-6)})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-2">
                This establishment will receive the NFT and can auction it. Only registered establishments are shown.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.invoiceNumber || !formData.amount || !formData.maturityDate || !formData.creditorPublicKey}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Issuing...' : 'Issue Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}