'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAddressStore } from '@/lib/address-store';
import { useGeolocation } from '@/lib/geolocation-context';
import { ChevronDown, MapPin, X, Navigation, Loader2, Search, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

interface SearchResult {
  id: string;
  name: string;
  imageUrl: string;
  categoryName: string;
  finalPrice: number;
}

export function Header() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { address, geoCity, setAddress, setGeoCity } = useAddressStore();
  const { mode, geoData, locationConfirmed, showAddressModalGlobal, closeAddressModal } = useGeolocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingGeoIP, setIsLoadingGeoIP] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    reference: '',
    noComplement: false
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Abrir modal de endereço quando solicitado pelo contexto de geolocalização
  useEffect(() => {
    if (showAddressModalGlobal) {
      setShowAddressModal(true);
      closeAddressModal();
    }
  }, [showAddressModalGlobal, closeAddressModal]);

  // Buscar cidade via GeoIP (apenas se não for modo híbrido com dados móveis não confirmados)
  useEffect(() => {
    // Se modo híbrido e dados móveis, não buscar automaticamente - o modal vai lidar com isso
    if (mode === 'HYBRID' && geoData.isMobile && !locationConfirmed) {
      setIsLoadingGeoIP(false);
      return;
    }
    
    if (!geoCity && !address) {
      fetch('/api/geoip')
        .then(r => r.json())
        .then(data => {
          if (data.city) {
            setGeoCity(data.city);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingGeoIP(false));
    } else {
      setIsLoadingGeoIP(false);
    }
  }, [geoCity, address, setGeoCity, mode, geoData.isMobile, locationConfirmed]);

  // Função para calcular display location considerando o modo híbrido
  const getDisplayLocation = () => {
    // Se tem endereço completo, mostrar
    if (address?.street && address?.number) {
      return `${address.street}, ${address.number}`;
    }
    if (address?.neighborhood) {
      return address.neighborhood;
    }
    if (address?.city) {
      return address.city;
    }
    
    // Se modo híbrido + dados móveis + não confirmado, não mostrar cidade
    if (mode === 'HYBRID' && geoData.isMobile && !locationConfirmed) {
      return '';
    }
    
    // Mostrar geoCity se disponível
    if (geoCity) {
      return geoCity;
    }
    
    return '';
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search products
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const searchProducts = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data?.products || []);
          setIsSearchOpen(true);
        }
      } catch (error) {
        console.error('Erro na busca:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  if (!mounted || pathname?.startsWith('/checkout')) {
    return null;
  }

  const displayLocation = getDisplayLocation();
  const hasLocation = displayLocation.length > 0;

  const handleCepChange = async (cep: string) => {
    const numericCep = cep.replace(/\D/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, cep: numericCep }));
    
    if (numericCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${numericCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            cep: numericCep,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }));
          setShowAddressModal(false);
          setShowCompleteModal(true);
        } else {
          toast.error('CEP não encontrado');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        toast.error('Erro ao buscar CEP');
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo navegador');
      return;
    }
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.address) {
            const addr = data.address;
            setFormData({
              street: addr.road || '',
              number: '',
              complement: '',
              neighborhood: addr.suburb || addr.neighbourhood || '',
              city: addr.city || addr.town || addr.village || '',
              state: addr.state || '',
              cep: addr.postcode?.replace('-', '') || '',
              reference: '',
              noComplement: false
            });
            setShowAddressModal(false);
            setShowCompleteModal(true);
          }
        } catch (error) {
          console.error('Erro ao obter endereço:', error);
          toast.error('Erro ao obter endereço da localização');
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error('Erro de geolocalização:', error);
        toast.error('Não foi possível obter sua localização');
        setIsLoadingLocation(false);
      }
    );
  };

  const handleSaveAddress = () => {
    // Apenas precisa de cidade para mostrar produtos
    if (!formData.city) {
      toast.error('Não foi possível identificar a cidade');
      return;
    }
    setAddress({
      street: formData.street,
      number: formData.number,
      complement: formData.noComplement ? '' : formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      cep: formData.cep,
      reference: formData.reference
    });
    // Atualizar geoCity para que o banner-hero mostre a cidade
    setGeoCity(formData.city);
    setShowCompleteModal(false);
    toast.success('Mostrando produtos disponível para região');
  };

  const openAddressModal = () => {
    setShowDropdown(false);
    setFormData({
      street: address?.street || '',
      number: address?.number || '',
      complement: address?.complement || '',
      neighborhood: address?.neighborhood || '',
      city: address?.city || '',
      state: address?.state || '',
      cep: address?.cep || '',
      reference: address?.reference || '',
      noComplement: false
    });
    setShowAddressModal(true);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  const handleProductClick = (productId: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(`/produto/${productId}`);
  };

  return (
    <>
      {/* Header Preto */}
      <header className="w-full bg-[#1a1a1a] sticky top-0 z-50 shadow-lg">
        {/* Linha 1: Endereço */}
        <div className="container mx-auto px-3 md:px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Logo + Endereço */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="text-gray-900" size={18} />
              </div>
              
              {/* Botão de Endereço com Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 text-white hover:text-amber-400 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-xs text-gray-400">Receber em</p>
                    <p className="text-sm font-medium truncate max-w-[150px] sm:max-w-[250px]">
                      {isLoadingGeoIP ? (
                        <span className="text-gray-400">Localizando...</span>
                      ) : hasLocation ? (
                        displayLocation
                      ) : (
                        <span className="text-amber-400">Cadastrar endereço</span>
                      )}
                    </p>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[200px] z-50"
                    >
                      <button
                        onClick={openAddressModal}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <MapPin className="w-4 h-4 text-amber-500" />
                        Alterar meu endereço
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Tempo de Entrega Estimado */}
            <div className="flex items-center gap-1 sm:gap-2 text-white">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
              <span className="text-[10px] sm:text-sm font-medium whitespace-nowrap">
                Entrega em até: <span className="text-amber-400">19 min</span>
              </span>
            </div>
          </div>
        </div>

        {/* Linha 2: Barra de Pesquisa */}
        <div className="container mx-auto px-3 md:px-4 pb-3">
          <div ref={searchRef} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquise sua bebida favorita"
              className="w-full pl-12 pr-12 py-3 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {searchQuery && (
              <button 
                onClick={handleSearchClear} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Resultados da Pesquisa */}
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-50"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">Buscando...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Nenhum produto encontrado</div>
                  ) : (
                    <div className="py-2">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="relative w-12 h-12 rounded bg-gray-100 flex-shrink-0">
                            <Image src={product.imageUrl} alt={product.name} fill className="object-contain p-1" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.categoryName}</p>
                          </div>
                          <p className="font-bold text-amber-600 text-sm">R$ {product.finalPrice.toFixed(2).replace('.', ',')}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Modal: Escolher como informar endereço */}
      <AnimatePresence>
        {showAddressModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100] flex items-start md:items-center justify-center pt-20 md:pt-0 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-xl w-full max-w-sm shadow-2xl border border-gray-700"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-base font-bold text-white">ENDEREÇO E DETALHES</h2>
                <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="Insira o CEP"
                    className="w-full pl-11 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                    maxLength={8}
                  />
                </div>

                <button
                  onClick={handleUseCurrentLocation}
                  disabled={isLoadingLocation}
                  className="flex items-center gap-2 text-amber-400 hover:text-amber-300 py-2 disabled:opacity-50 text-sm"
                >
                  {isLoadingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    {isLoadingLocation ? 'Obtendo localização...' : 'Usar minha localização'}
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Completar dados do endereço */}
      <AnimatePresence>
        {showCompleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100] flex items-start md:items-center justify-center pt-20 md:pt-0 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-xl w-full max-w-sm shadow-2xl max-h-[70vh] md:max-h-[90vh] overflow-y-auto border border-gray-700"
            >
              {/* Header com mensagem verde e X */}
              <div className="p-3 border-b border-gray-700 sticky top-0 bg-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-green-400 font-medium text-center">
                      ✓ Zé Parceiro encontrado para a região
                    </p>
                  </div>
                  <button onClick={() => setShowCompleteModal(false)} className="text-gray-400 hover:text-white ml-2">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="Rua (opcional)"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="Número (opcional)"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  />
                  <input
                    type="text"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Complemento"
                    disabled={formData.noComplement}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm disabled:bg-gray-700 disabled:text-gray-500"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.noComplement}
                    onChange={(e) => setFormData({ ...formData, noComplement: e.target.checked, complement: '' })}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs text-gray-400">Não tenho complemento</span>
                </label>

                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Ponto de referência (opcional)"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />

                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Bairro (opcional)"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />

                <p className="text-center text-amber-400 font-medium text-sm">
                  {formData.city}{formData.state ? `, ${formData.state}` : ''}
                </p>

                <button
                  onClick={handleSaveAddress}
                  className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold rounded-lg transition-colors text-sm"
                >
                  VER PRODUTOS DISPONÍVEIS
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
