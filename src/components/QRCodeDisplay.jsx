import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Check } from 'lucide-react';

export default function QRCodeDisplay({ url, restaurantName }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (url) {
      QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [url]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `${restaurantName.toLowerCase().replace(/\s+/g, '-')}-booking-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col items-center text-center max-w-sm mx-auto">
      <h4 className="text-base font-bold text-slate-900">Table Booking QR Code</h4>
      <p className="text-xs text-slate-500 mt-1">
        Display this on your host stand, table tent cards, or print on menus for instant guest reservations.
      </p>

      <div className="my-5 p-3 bg-slate-50 rounded-xl border border-slate-200 inline-block">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`Booking QR Code for ${restaurantName}`} className="w-48 h-48 rounded-lg" />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
            Generating QR...
          </div>
        )}
      </div>

      <div className="w-full space-y-2">
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 truncate">
          <span className="truncate flex-1 text-left">{url}</span>
          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
            title="Copy URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Printable QR PNG</span>
        </button>
      </div>
    </div>
  );
}
