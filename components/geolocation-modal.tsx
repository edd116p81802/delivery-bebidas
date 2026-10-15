'use client';

import { useGeolocation } from '@/lib/geolocation-context';

export function GeolocationModal() {
  const { showModal, geoData, confirmLocation, openAddressModal } = useGeolocation();

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center pt-20 md:pt-0 p-4 bg-black/80 animate-in fade-in">
      <div className="relative max-w-sm w-full bg-gray-900 rounded-xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 border border-gray-700">
        <p className="text-[11px] text-gray-400 text-center uppercase tracking-widest font-medium">
          Identificamos que você está em ou próximo de:
        </p>
        <div className="text-center py-2">
          <p className="text-2xl font-bold text-amber-400">{geoData.city}, {geoData.state}</p>
        </div>
        <div className="space-y-2">
          <button 
            onClick={confirmLocation} 
            className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-2.5 rounded-lg shadow transition-colors text-sm"
          >
            Confirmar
          </button>
          <button 
            onClick={openAddressModal} 
            className="w-full bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            Alterar endereço
          </button>
        </div>
      </div>
    </div>
  );
}
