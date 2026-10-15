'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AddressData {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  reference?: string;
}

interface AddressStore {
  address: AddressData | null;
  geoCity: string | null;
  setAddress: (address: AddressData) => void;
  setGeoCity: (city: string) => void;
  clearAddress: () => void;
  getDisplayLocation: () => string;
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set, get) => ({
      address: null,
      geoCity: null,

      setAddress: (address) => {
        set({ address });
        // Também salva no sessionStorage para o checkout
        if (typeof window !== 'undefined') {
          const checkoutData = sessionStorage.getItem('checkoutData');
          const parsed = checkoutData ? JSON.parse(checkoutData) : {};
          sessionStorage.setItem('checkoutData', JSON.stringify({
            ...parsed,
            ...address
          }));
        }
      },

      setGeoCity: (city) => set({ geoCity: city }),

      clearAddress: () => set({ address: null }),

      getDisplayLocation: () => {
        const { address, geoCity } = get();
        if (address?.street && address?.number) {
          return `${address.street}, ${address.number}`;
        }
        if (address?.neighborhood) {
          return address.neighborhood;
        }
        if (address?.city) {
          return address.city;
        }
        if (geoCity) {
          return geoCity;
        }
        return '';
      },
    }),
    {
      name: 'address-storage',
    }
  )
);
