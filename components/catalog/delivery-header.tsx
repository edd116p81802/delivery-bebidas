'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, MapPin, X, Navigation, Search, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddressStore } from '@/lib/address-store';
import { toast } from 'sonner';

interface DeliveryHeaderProps {
  searchText: string;
  onSearchChange: (value: string) => void;
}

export function DeliveryHeader({ searchText, onSearchChange }: DeliveryHeaderProps) {
  const { address, geoCity, setAddress, setGeoCity, getDisplayLocation } = useAddressStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingGeoIP, setIsLoadingGeoIP] = useState(true);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Form data para o modal de completar endereço
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

  // Buscar cidade via GeoIP ao montar
  useEffect(() => {
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
  }, [geoCity, address, setGeoCity]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLocation = mounted ? getDisplayLocation() : '';
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
          toast.success('Endereço encontrado!');
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
            toast.success('Localização obtida com sucesso!');
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
    if (!formData.street || !formData.number || !formData.neighborhood || !formData.city || !formData.state) {
      toast.error('Preencha todos os campos obrigatórios');
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
    setShowCompleteModal(false);
    toast.success('Endereço salvo!');
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

  if (!mounted) return null;

  return (
    <>
      {/* Header Preto */}
      <header className="sticky top-0 z-40 bg-[#1a1a1a] shadow-lg">
        {/* Primeira linha: Endereço + Tempo de Entrega */}
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
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
                    <p className="text-sm font-medium truncate max-w-[180px] sm:max-w-[250px]">
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

            {/* Tempo de Entrega Estimado (aparece quando há localização) */}
            {hasLocation && (
              <div className="hidden sm:flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium">
                  Entrega estimada em até: <span className="text-amber-400">19 Minutos</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Segunda linha: Barra de pesquisa (SEMPRE visível) */}
        <div className="bg-[#1a1a1a] border-t border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Pesquise sua bebida favorita"
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {searchText && (
                <button 
                  onClick={() => onSearchChange('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
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
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddressModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">ENDEREÇO E DETALHES</h2>
                <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-4">
                {/* Campo CEP */}
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="Insira o endereço e número"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    maxLength={8}
                  />
                </div>

                {/* Botão Usar Localização */}
                <button
                  onClick={handleUseCurrentLocation}
                  disabled={isLoadingLocation}
                  className="flex items-center gap-3 text-amber-600 hover:text-amber-700 py-2 disabled:opacity-50"
                >
                  {isLoadingLocation ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5" />
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
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCompleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-4 border-b sticky top-0 bg-white">
                <p className="text-sm text-gray-600 text-center">
                  Esse é o endereço do local indicado no mapa. Você pode editar, se necessário
                </p>
              </div>

              {/* Formulário */}
              <div className="p-6 space-y-4">
                {/* Rua */}
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="Rua"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />

                {/* Número e Complemento */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="Número"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <input
                    type="text"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Complemento"
                    disabled={formData.noComplement}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-100"
                  />
                </div>

                {/* Checkbox Não tenho complemento */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.noComplement}
                    onChange={(e) => setFormData({ ...formData, noComplement: e.target.checked, complement: '' })}
                    className="w-4 h-4 rounded border-amber-400 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-sm text-gray-600">Não tenho complemento</span>
                </label>

                {/* Ponto de referência */}
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Ponto de referência (opcional)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />

                {/* Bairro */}
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Bairro"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />

                {/* Cidade, Estado */}
                <p className="text-center text-gray-600 font-medium">
                  {formData.city}{formData.state ? `, ${formData.state}` : ''}
                </p>

                {/* Botão VER PRODUTOS DISPONÍVEIS */}
                <button
                  onClick={handleSaveAddress}
                  className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold rounded-xl transition-colors text-base"
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
