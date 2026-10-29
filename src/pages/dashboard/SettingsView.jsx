import React, { useState } from 'react';
import { repository } from '../../services/reservationRepository';
import { settingsSchema } from '../../domain/validation';
import { useToast } from '../../context/ToastContext';
import { Save, Building, Clock, Users, Phone, MessageSquare } from 'lucide-react';

export default function SettingsView() {
  const [formData, setFormData] = useState(() => repository.getSettings());
  const [errors, setErrors] = useState({});
  const { showToast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // clear error for modified field
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    const result = settingsSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] || 'general';
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      showToast('Please fix the highlighted settings errors', 'error');
      return;
    }

    try {
      repository.updateSettings(result.data);
      showToast('Restaurant settings saved! Applied immediately to /book', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Restaurant Settings</h2>
        <p className="text-sm text-slate-600 mt-1">
          Configure venue profile, operational hours, and booking constraints. Changes take effect on /book immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building className="w-4 h-4 text-indigo-600" />
            <span>Profile & Branding</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Restaurant Name *
              </label>
              <input
                type="text"
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {errors.restaurantName && (
                <p className="text-xs text-rose-600 mt-1">{errors.restaurantName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline / Cuisine
              </label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address / Location *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {errors.address && (
                <p className="text-xs text-rose-600 mt-1">{errors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Public Contact Phone *
              </label>
              <input
                type="text"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {errors.contactPhone && (
                <p className="text-xs text-rose-600 mt-1">{errors.contactPhone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Operating Hours & Capacity */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Hours & Capacity Constraints</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Opening Time (HH:mm) *
              </label>
              <input
                type="time"
                name="openTime"
                value={formData.openTime}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {errors.openTime && (
                <p className="text-xs text-rose-600 mt-1">{errors.openTime}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Closing Time (HH:mm) *
              </label>
              <input
                type="time"
                name="closeTime"
                value={formData.closeTime}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {errors.closeTime && (
                <p className="text-xs text-rose-600 mt-1">{errors.closeTime}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Online Party Size *
              </label>
              <input
                type="number"
                name="maxPartySize"
                min="2"
                max="20"
                value={formData.maxPartySize}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {errors.maxPartySize && (
                <p className="text-xs text-rose-600 mt-1">{errors.maxPartySize}</p>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <strong>Availability Rule:</strong> Dining window is fixed at 90 minutes. The latest possible booking slot is automatically set to 90 minutes before your closing time ({formData.closeTime}).
          </div>
        </div>

        {/* Chatbot & Auto-reply messaging */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span>Chat Simulation Greeting</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Welcome Message (Simulated Chat)
            </label>
            <input
              type="text"
              name="welcomeMessage"
              value={formData.welcomeMessage || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
