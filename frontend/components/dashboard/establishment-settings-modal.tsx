import { useState } from 'react';
import { X, Building2 } from 'lucide-react';

interface EstablishmentInfo {
  name: string;
  registrationNumber: string;
  address: string;
  contact: string;
}

export function EstablishmentSettingsModal({
  establishmentInfo,
  onClose,
  onSave
}: {
  establishmentInfo: EstablishmentInfo;
  onClose: () => void;
  onSave: (info: EstablishmentInfo) => void;
}) {
  const [formData, setFormData] = useState(establishmentInfo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-2xl text-white">Establishment Settings</h2>
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
            <div>
              <label htmlFor="name" className="block text-sm text-gray-400 mb-2">
                Establishment Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., TechCorp Ltd"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="registrationNumber" className="block text-sm text-gray-400 mb-2">
                Registration Number *
              </label>
              <input
                id="registrationNumber"
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                placeholder="e.g., REG-123456789"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm text-gray-400 mb-2">
                Business Address
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter your business address"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 transition-colors resize-none"
              />
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm text-gray-400 mb-2">
                Contact Email
              </label>
              <input
                id="contact"
                type="email"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="e.g., contact@company.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
