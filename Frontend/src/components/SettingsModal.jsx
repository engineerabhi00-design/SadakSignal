import React, { useEffect, useState } from 'react';
import { X, Database, Cloud, ShieldCheck } from 'lucide-react';
import { getConfigStatus } from '../services/api';

export default function SettingsModal({ onClose }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setConfig(await getConfigStatus());
      } catch (err) {
        console.error('Failed to load configuration status:', err);
        setError('Configuration status is unavailable. Check that the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">System Configuration</h3>
              <p className="text-xs text-slate-400">Current backend database and media storage status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Close configuration"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {loading && <p className="text-slate-400">Loading configuration status...</p>}
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300">
              {error}
            </div>
          )}

          {config && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/60">
                <span className="text-[11px] text-sky-400 font-bold block mb-2">DATABASE</span>
                <span className="font-mono text-slate-200">{config.database_type}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-sky-400 font-bold block mb-2">MEDIA STORAGE</span>
                <span className="font-mono text-slate-200">
                  {config.aws_s3_configured ? 'AWS S3 configured' : 'Local uploads'}
                </span>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>Configure server-side settings</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Database, AWS, and SMTP credentials belong in <code>Backend/.env</code> on the server.
              This page only reports status and never collects or stores secrets. Restart the backend
              after changing environment variables.
            </p>
            <p className="text-slate-400 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Use a durable object-storage service for uploaded evidence when hosting outside your computer.</span>
            </p>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
