'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GeolocationData {
  city: string | null;
  state: string | null;
  isMobile: boolean | null;
}

type GeolocationMode = 'DISABLED' | 'PASSIVE' | 'HYBRID' | 'GEOIP_MODAL';

interface GeolocationContextType {
  mode: GeolocationMode;
  geoData: GeolocationData;
  isLoading: boolean;
  showModal: boolean;
  isWaitingGPS: boolean;
  locationConfirmed: boolean;
  showAddressModalGlobal: boolean;
  setShowModal: (show: boolean) => void;
  confirmLocation: () => void;
  rejectLocation: () => void;
  requestGPSLocation: () => void;
  openAddressModal: () => void;
  closeAddressModal: () => void;
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined);

export function GeolocationProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<GeolocationMode>('DISABLED');
  const [geoData, setGeoData] = useState<GeolocationData>({
    city: null,
    state: null,
    isMobile: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isWaitingGPS, setIsWaitingGPS] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [showAddressModalGlobal, setShowAddressModalGlobal] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  // Verificar se modal já foi mostrado/dispensado anteriormente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('geoModalDismissed');
      const confirmed = sessionStorage.getItem('geoLocationConfirmed');
      if (dismissed === 'true') {
        setModalDismissed(true);
      }
      if (confirmed === 'true') {
        setLocationConfirmed(true);
      }
    }
  }, []);

  const openAddressModal = () => {
    setShowModal(false);
    // Marcar como dispensado quando abre o modal de endereço
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('geoModalDismissed', 'true');
    }
    setModalDismissed(true);
    setShowAddressModalGlobal(true);
  };

  const closeAddressModal = () => {
    setShowAddressModalGlobal(false);
  };

  useEffect(() => {
    initGeolocation();
  }, []);

  const initGeolocation = async () => {
    try {
      // Verificar se já foi dispensado ou confirmado antes de fazer as requisições
      const wasDismissed = typeof window !== 'undefined' && sessionStorage.getItem('geoModalDismissed') === 'true';
      const wasConfirmed = typeof window !== 'undefined' && sessionStorage.getItem('geoLocationConfirmed') === 'true';
      
      const settingsResponse = await fetch('/api/settings/public');
      if (!settingsResponse.ok) {
        setIsLoading(false);
        return;
      }

      const settings = await settingsResponse.json();
      const currentMode = settings.geolocationMode || 'DISABLED';
      setMode(currentMode);

      if (currentMode === 'DISABLED') {
        setIsLoading(false);
        return;
      }

      const geoResponse = await fetch('/api/geoip');
      if (!geoResponse.ok) {
        console.error('Erro ao buscar GeoIP');
        setIsLoading(false);
        return;
      }

      const geoInfo = await geoResponse.json();
      setGeoData(geoInfo);

      if (currentMode === 'PASSIVE') {
        // Passivo: só obtém GeoIP, não abre modal
        setIsLoading(false);
      } else if (currentMode === 'HYBRID') {
        // Híbrido: Só abre modal se estiver em rede MÓVEL (4G/5G), NÃO no Wi-Fi
        // isMobile vem da API de GeoIP e indica se o IP é de operadora móvel
        if (geoInfo.isMobile === true && geoInfo.city && geoInfo.state && !wasDismissed && !wasConfirmed) {
          setShowModal(true);
        }
        setIsLoading(false);
      } else if (currentMode === 'GEOIP_MODAL') {
        // GeoIP-Modal: SEMPRE abre modal para confirmar localização (Wi-Fi ou 4G)
        if (geoInfo.city && geoInfo.state && !wasDismissed && !wasConfirmed) {
          setShowModal(true);
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Erro na inicialização de geolocalização:', error);
      setIsLoading(false);
    }
  };

  const confirmLocation = () => {
    setLocationConfirmed(true);
    setShowModal(false);
    // Persistir confirmação
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('geoLocationConfirmed', 'true');
      sessionStorage.setItem('geoModalDismissed', 'true');
    }
  };

  const rejectLocation = () => {
    setGeoData({ city: null, state: null, isMobile: null });
    setShowModal(false);
    // Marcar como dispensado
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('geoModalDismissed', 'true');
    }
    setModalDismissed(true);
  };

  const requestGPSLocation = () => {
    setShowModal(false);
    setIsWaitingGPS(true);
    
    if (!navigator.geolocation) {
      alert('Geolocalização não disponível neste navegador');
      setIsWaitingGPS(false);
      rejectLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'ZeExpressApp/1.0',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            
            setGeoData({
              city: address.city || address.town || address.village || geoData.city,
              state: address.state || geoData.state,
              isMobile: geoData.isMobile,
            });
            setLocationConfirmed(true);
            setIsWaitingGPS(false);
          } else {
            setLocationConfirmed(true);
            setIsWaitingGPS(false);
          }
        } catch (error) {
          console.error('Erro na geocodificação reversa:', error);
          setLocationConfirmed(true);
          setIsWaitingGPS(false);
        }
      },
      (error) => {
        console.error('Erro ao obter localização GPS:', error);
        setIsWaitingGPS(false);
        rejectLocation();
      }
    );
  };

  return (
    <GeolocationContext.Provider
      value={{
        mode,
        geoData,
        isLoading,
        showModal,
        isWaitingGPS,
        locationConfirmed,
        showAddressModalGlobal,
        setShowModal,
        confirmLocation,
        rejectLocation,
        requestGPSLocation,
        openAddressModal,
        closeAddressModal,
      }}
    >
      {children}
    </GeolocationContext.Provider>
  );
}

export function useGeolocation() {
  const context = useContext(GeolocationContext);
  if (!context) {
    return {
      mode: 'DISABLED' as GeolocationMode,
      geoData: { city: null, state: null, isMobile: null },
      isLoading: false,
      showModal: false,
      isWaitingGPS: false,
      locationConfirmed: false,
      showAddressModalGlobal: false,
      setShowModal: () => {},
      confirmLocation: () => {},
      rejectLocation: () => {},
      requestGPSLocation: () => {},
      openAddressModal: () => {},
      closeAddressModal: () => {},
    };
  }
  return context;
}
