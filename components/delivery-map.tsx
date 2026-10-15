'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

// Inline SVG component for instant loading
const LocationPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0 text-gray-600">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

interface DeliveryMapProps {
  address: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const DEFAULT_COORDINATES = { lat: -23.5505, lon: -46.6333 };

function parseAddress(fullAddress: string) {
  const cepMatch = fullAddress.match(/CEP\s*(\d{5}-?\d{3})/i);
  const cityStateMatch = fullAddress.match(/,\s*([^,]+)\s*-\s*([A-Z]{2})/);
  const parts = fullAddress.split(',').map(p => p.trim());
  const street = parts[0] || '';
  const number = parts[1] || '';
  const neighborhood = parts[2] || '';
  
  return {
    street,
    number,
    neighborhood,
    cep: cepMatch ? cepMatch[1].replace('-', '') : null,
    city: cityStateMatch ? cityStateMatch[1].trim() : null,
    state: cityStateMatch ? cityStateMatch[2].trim() : null,
    full: fullAddress,
  };
}

export function DeliveryMap({ address }: DeliveryMapProps) {
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number }>(DEFAULT_COORDINATES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usesFallback, setUsesFallback] = useState(false);
  const [locationFound, setLocationFound] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const tryGeocode = async (query: string, description: string): Promise<NominatimResult | null> => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`, {
          headers: { 'User-Agent': 'ZeExpress/1.0 (delivery app)' },
        });
        if (!response.ok) throw new Error('Falha na geocodificação');
        const data: NominatimResult[] = await response.json();
        if (data && data.length > 0) return data[0];
        return null;
      } catch (err) {
        console.error(`Erro ao geocodificar ${description}:`, err);
        return null;
      }
    };

    const geocodeAddress = async () => {
      try {
        setIsLoading(true);
        setError(false);
        setUsesFallback(false);
        setLocationFound('');

        if (!address) throw new Error('Endereço vazio');

        const parsed = parseAddress(address);
        await new Promise(resolve => setTimeout(resolve, 500));

        let result: NominatimResult | null = null;
        let cityResult: NominatimResult | null = null;

        if (parsed.city && parsed.state) {
          const cityStateQuery = `${parsed.city}, ${parsed.state}, Brasil`;
          cityResult = await tryGeocode(cityStateQuery, 'CIDADE - UF');
          if (cityResult && mounted) result = cityResult;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (parsed.street && parsed.number && parsed.city && parsed.state) {
          const streetQuery = `${parsed.street}, ${parsed.number}, ${parsed.neighborhood}, ${parsed.city}, ${parsed.state}, Brasil`;
          const streetResult = await tryGeocode(streetQuery, 'RUA + NÚMERO');
          
          if (streetResult && mounted) {
            result = streetResult;
            setLocationFound(`${parsed.street}, ${parsed.number} - ${parsed.city} - ${parsed.state}`);
          } else if (cityResult && mounted) {
            setLocationFound(`${parsed.city} - ${parsed.state} (localização aproximada)`);
            setUsesFallback(true);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else if (cityResult && mounted) {
          setLocationFound(`${parsed.city} - ${parsed.state}`);
        }

        if (!result && parsed.cep) {
          result = await tryGeocode(parsed.cep, 'CEP');
          if (result && mounted) setLocationFound(`Localização via CEP: ${parsed.cep}`);
        }

        if (!mounted) return;

        if (result) {
          const { lat, lon } = result;
          setCoordinates({ lat: parseFloat(lat), lon: parseFloat(lon) });
        } else {
          setCoordinates(DEFAULT_COORDINATES);
          setUsesFallback(true);
          setLocationFound('Localização aproximada: São Paulo');
        }
      } catch (err) {
        console.error('Erro geral ao geocodificar:', err);
        if (mounted) {
          setCoordinates(DEFAULT_COORDINATES);
          setUsesFallback(true);
          setError(true);
          setLocationFound('Localização aproximada: São Paulo');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    geocodeAddress();
    return () => { mounted = false; };
  }, [address]);

  const shouldShowMap = !isLoading && locationFound && !usesFallback;
  if (!shouldShowMap) return null;

  const delta = 0.002;
  const bbox = `${coordinates.lon - delta},${coordinates.lat - delta},${coordinates.lon + delta},${coordinates.lat + delta}`;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-200">
      {locationFound && (
        <div className="border-b px-4 py-3 bg-gray-50 border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <LocationPinIcon />
            <span className="text-xs font-medium text-gray-700">{locationFound}</span>
          </div>
        </div>
      )}
      
      <div className="relative h-64 w-full">
        <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight={0} marginWidth={0} src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`} style={{ border: 0 }} title="Mapa de localização da entrega" className="w-full h-full" loading="lazy" />
      </div>
      
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-xs line-clamp-2">{address || 'Endereço não especificado'}</span>
        </div>
      </div>
    </div>
  );
}
