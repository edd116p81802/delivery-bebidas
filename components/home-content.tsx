'use client';

import { useGeolocation } from '@/lib/geolocation-context';
import { useAddressStore } from '@/lib/address-store';
import { GeolocationModal } from '@/components/geolocation-modal';
import Image from 'next/image';

export function HomeHeroBanner() {
  const { mode, geoData, isLoading, showModal, isWaitingGPS, locationConfirmed } = useGeolocation();
  const { address, geoCity } = useAddressStore();

  let bannerText = 'SUA BEBIDA GELADA EM MINUTOS';
  
  // Prioridade 1: Se tem cidade do endereço salvo (via modal ou header)
  if (address?.city) {
    bannerText = `${address.city.toUpperCase()}, CHEGAMOS`;
  }
  // Prioridade 2: Se tem geoCity definido (confirmado via qualquer método)
  else if (geoCity) {
    bannerText = `${geoCity.toUpperCase()}, CHEGAMOS`;
  }
  // Prioridade 3: Lógica de geolocalização automática
  else if (mode === 'PASSIVE' && geoData.city) {
    // Modo passivo: mostrar cidade diretamente
    bannerText = `${geoData.city.toUpperCase()}, CHEGAMOS`;
  } else if (mode === 'HYBRID' && geoData.city) {
    // Modo híbrido: só mostrar cidade se foi confirmada
    if (geoData.isMobile && !locationConfirmed) {
      // Dados móveis e não confirmado: mostrar texto genérico
      bannerText = 'SUA BEBIDA GELADA EM MINUTOS';
    } else {
      // Confirmado ou não é dados móveis: mostrar cidade
      bannerText = `${geoData.city.toUpperCase()}, CHEGAMOS`;
    }
  }

  const shouldHideText = isLoading || showModal || isWaitingGPS;

  return (
    <>
      <GeolocationModal />
      <section className="relative w-full aspect-video md:aspect-auto md:h-[380px] overflow-hidden">
        <Image src="/hero-banner.jpg" alt="Zé Delivery - Bebida Gelada em até 15 Minutos" fill className="object-cover object-top" priority />
      </section>
    </>
  );
}
