'use client';

import { useCartStore } from '@/lib/cart-store';
import { useAddressStore } from '@/lib/address-store';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Search, Edit2 } from 'lucide-react';
import Image from 'next/image';
import CheckoutHeader from '@/components/checkout/CheckoutHeader';

// Inline SVG components for instant loading
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-500">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-500">
    <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const GpsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-500 flex-shrink-0">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
  </svg>
);

const KeyboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-400">
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/>
  </svg>
);

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getSubtotal, getDeliveryFee, getTotal } = useCartStore();
  const { address: savedAddress } = useAddressStore();
  const [mounted, setMounted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAddressFields, setShowAddressFields] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(true);
  const [personalInfoCompleted, setPersonalInfoCompleted] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(true);
  const [addressCompleted, setAddressCompleted] = useState(false);
  const addressCardRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });

  useEffect(() => {
    setMounted(true);
    
    // Verificar sessionStorage para dados pessoais
    const savedCheckoutData = sessionStorage.getItem('checkoutData');
    let parsedData: any = {};
    if (savedCheckoutData) {
      try {
        parsedData = JSON.parse(savedCheckoutData);
      } catch (error) { console.error('Erro ao restaurar dados do checkout:', error); }
    }
    
    // Priorizar endereço do address store (salvo no header), se existir
    const hasAddressFromStore = savedAddress?.street && savedAddress?.number;
    
    setFormData({
      name: parsedData.name || '',
      phone: parsedData.phone || '',
      street: hasAddressFromStore ? savedAddress.street : (parsedData.street || ''),
      number: hasAddressFromStore ? savedAddress.number : (parsedData.number || ''),
      complement: hasAddressFromStore ? (savedAddress.complement || '') : (parsedData.complement || ''),
      neighborhood: hasAddressFromStore ? savedAddress.neighborhood : (parsedData.neighborhood || ''),
      city: hasAddressFromStore ? savedAddress.city : (parsedData.city || ''),
      state: hasAddressFromStore ? savedAddress.state : (parsedData.state || ''),
      cep: hasAddressFromStore ? (savedAddress.cep || '') : (parsedData.cep || '')
    });
    
    // Configurar estados de UI
    if (parsedData.name && parsedData.phone) { 
      setPersonalInfoCompleted(true); 
      setIsEditingPersonalInfo(false); 
    }
    
    if (hasAddressFromStore) {
      setShowAddressFields(true);
      setAddressCompleted(true);
      setIsEditingAddress(false);
    } else if (parsedData.street && parsedData.number && parsedData.neighborhood && parsedData.city && parsedData.state) { 
      setShowAddressFields(true); 
      setAddressCompleted(true); 
      setIsEditingAddress(false); 
    } else if (parsedData.cep && parsedData.cep.length >= 8) { 
      setShowAddressFields(true); 
    }
  }, [savedAddress]);

  useEffect(() => { if (mounted && items.length === 0) router.push('/'); }, [items, mounted, router]);

  const scrollToAddressCard = () => { setTimeout(() => { addressCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); };
  
  const scrollToAddressBottom = () => { 
    setTimeout(() => { 
      if (addressCardRef.current) {
        const rect = addressCardRef.current.getBoundingClientRect();
        const scrollTop = window.scrollY + rect.bottom - window.innerHeight + 100;
        window.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }
    }, 150); 
  };

  const handleCepChange = async (cep: string) => {
    const numericCep = cep.replace(/\D/g, '');
    const limitedCep = numericCep.slice(0, 8);
    setFormData({ ...formData, cep: limitedCep });
    if (limitedCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${limitedCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({ ...prev, cep: limitedCep, street: data.logradouro || '', neighborhood: data.bairro || '', city: data.localidade || '', state: data.uf || '' }));
          setShowAddressFields(true);
          toast.success('Endereço encontrado!');
          scrollToAddressCard();
        } else { toast.error('CEP não encontrado'); }
      } catch (error) { console.error('Erro ao buscar CEP:', error); toast.error('Erro ao buscar CEP'); }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocalização não suportada pelo navegador'); return; }
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await response.json();
          if (data && data.address) {
            const address = data.address;
            setFormData(prev => ({ ...prev, street: address.road || '', neighborhood: address.suburb || address.neighbourhood || '', city: address.city || address.town || address.village || '', state: address.state || '', cep: address.postcode?.replace('-', '') || '' }));
            setShowAddressFields(true);
            toast.success('Localização obtida com sucesso!');
            scrollToAddressCard();
          }
        } catch (error) { console.error('Erro ao obter endereço:', error); toast.error('Erro ao obter endereço da localização'); }
        finally { setIsLoadingLocation(false); }
      },
      (error) => { console.error('Erro de geolocalização:', error); toast.error('Não foi possível obter sua localização'); setIsLoadingLocation(false); }
    );
  };

  const handleManualAddress = () => { setShowAddressFields(true); toast.info('Preencha os campos do endereço manualmente'); scrollToAddressCard(); };

  const handleCompletePersonalInfo = () => {
    if (!formData.name || !formData.phone) { toast.error('Preencha nome e telefone'); return; }
    setPersonalInfoCompleted(true);
    setIsEditingPersonalInfo(false);
    sessionStorage.setItem('checkoutData', JSON.stringify(formData));
    toast.success('Informações salvas!');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) { toast.error('Preencha nome e telefone'); return; }
    if (!showAddressFields) { toast.error('Informe o CEP ou use a localização atual'); return; }
    if (!formData.street || !formData.number || !formData.neighborhood || !formData.city || !formData.state) { toast.error('Preencha todos os campos de endereço'); return; }
    
    // Salvar em background - não bloqueia navegação
    try { sessionStorage.setItem('checkoutData', JSON.stringify(formData)); } 
    catch (err) { console.error('Erro ao salvar dados:', err); }
    
    // Navegar imediatamente
    router.push('/checkout/revisao');
  };

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const total = getTotal();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <CheckoutHeader 
        title="IDENTIFICAÇÃO" 
        backRoute="/"
        rightElement={
          <button type="button" onClick={() => setShowSummary(!showSummary)} className="flex items-center gap-2">
            <span className="text-base font-bold text-amber-400">R$ {total.toFixed(2).replace('.', ',')}</span>
            {showSummary ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
          </button>
        }
      />
      {showSummary && (
        <div className="fixed top-16 left-0 right-0 bg-gray-800 z-40 max-h-[300px] overflow-y-auto">
          <div className="p-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 bg-gray-700 p-3 rounded-lg">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-600 flex-shrink-0"><Image src={item.imageUrl} alt={item.name} fill className="object-contain" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-white">{item.quantity}x {item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.categoryName}</p>
                  <p className="text-sm text-amber-400 mt-1">R$ {(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}</p>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-700 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="font-semibold text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 pt-20 mb-[60px] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-gray-800 rounded-2xl p-6">
            {!personalInfoCompleted || isEditingPersonalInfo ? (
              <div className="space-y-4">
                <div><label className="flex items-center gap-2 text-base font-bold mb-2 text-white" htmlFor="name"><UserIcon />Nome Completo</label><input type="text" id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Digite seu nome completo" className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" required /></div>
                <div><label className="flex items-center gap-2 text-base font-bold mb-2 text-white" htmlFor="phone"><WhatsAppIcon />Telefone/WhatsApp</label><input type="tel" id="phone" value={formData.phone} onChange={(e) => { let value = e.target.value.replace(/\D/g, ''); if (value.length > 11) value = value.slice(0, 11); if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`; if (value.length > 10) value = value.slice(0, 10) + '-' + value.slice(10); setFormData({ ...formData, phone: value }); }} onBlur={handleCompletePersonalInfo} placeholder="(00) 00000-0000" className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" required /></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><div><p className="text-sm text-gray-400">Nome</p><p className="text-base font-semibold text-white">{formData.name}</p></div><button type="button" onClick={() => setIsEditingPersonalInfo(true)} className="flex items-center gap-2 text-amber-400 font-bold text-sm hover:text-amber-300"><Edit2 className="w-4 h-4" />Editar</button></div>
                <div><p className="text-sm text-gray-400">Telefone</p><p className="text-base font-semibold text-white">{formData.phone}</p></div>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 space-y-4">
            {(!addressCompleted || isEditingAddress) && (
              <>
                <h2 className="font-bold text-base text-white">Escolha como deseja confirmar seu endereço</h2>
                <div className="relative"><Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-amber-400" /><input type="text" value={formData.cep} onChange={(e) => handleCepChange(e.target.value)} placeholder="Digite seu CEP" className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" maxLength={8} /></div>
                <button type="button" onClick={handleUseCurrentLocation} disabled={isLoadingLocation} className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border-2 border-amber-400 hover:bg-gray-700 transition-colors disabled:opacity-50">
                  <GpsIcon />
                  <div className="text-left flex-1"><p className="font-semibold text-sm text-white">{isLoadingLocation ? 'Obtendo localização...' : 'Usar Localização Atual'}</p><p className="text-xs text-gray-400">{isLoadingLocation ? 'Aguarde...' : 'Ativar permissão (recomendado)'}</p></div>
                </button>
                <button type="button" onClick={handleManualAddress} className="w-full flex items-center gap-3 py-2 px-4 hover:bg-gray-700 transition-colors rounded-xl"><KeyboardIcon /><p className="text-sm text-gray-300 text-left flex-1">Confirmar endereço manualmente</p></button>
              </>
            )}
          </div>

          {showAddressFields && (
            <div ref={addressCardRef} className="bg-gray-800 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
              {!addressCompleted || isEditingAddress ? (
                <>
                  <div><label className="block text-base font-bold mb-2 text-white" htmlFor="street">Rua</label><input type="text" id="street" value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} placeholder="Nome da rua" className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-base font-bold mb-2 text-white" htmlFor="number">Número</label><input type="text" id="number" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} placeholder="123" className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" required /></div>
                    <div><label className="block text-base font-bold mb-2 text-white" htmlFor="neighborhood">Bairro</label><input type="text" id="neighborhood" value={formData.neighborhood} onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })} placeholder="Bairro" className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" required /></div>
                  </div>
                  <div><label className="block text-base font-bold mb-2 text-white" htmlFor="complement">Complemento (opcional)</label><input type="text" id="complement" value={formData.complement} onChange={(e) => setFormData({ ...formData, complement: e.target.value })} placeholder="Apartamento, bloco, etc." className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-base font-bold mb-2 text-white" htmlFor="city">Cidade</label><input type="text" id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Cidade" className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" required /></div>
                    <div><label className="block text-base font-bold mb-2 text-white" htmlFor="state">Estado</label><input type="text" id="state" value={formData.state} onChange={(e) => { let value = e.target.value.toUpperCase(); if (value.length > 2) value = value.slice(0, 2); setFormData({ ...formData, state: value }); }} placeholder="SP" maxLength={2} className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400" required /></div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><div><p className="text-sm text-gray-400">Endereço Completo</p><p className="text-base font-semibold text-white">{formData.street}, {formData.number}{formData.complement && `, ${formData.complement}`}</p><p className="text-sm text-gray-400">{formData.neighborhood}, {formData.city} - {formData.state}</p><p className="text-sm text-gray-400">CEP: {formData.cep}</p></div><button type="button" onClick={() => { setIsEditingAddress(true); scrollToAddressBottom(); }} className="flex items-center gap-2 text-amber-400 font-bold text-sm hover:text-amber-300"><Edit2 className="w-4 h-4" />Editar</button></div>
                </div>
              )}
            </div>
          )}
        </form>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 z-50">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex flex-col"><p className="text-xs font-medium text-gray-400">Total do Pedido</p><p className="text-base font-bold text-amber-400">R$ {total.toFixed(2).replace('.', ',')} <span className="text-sm font-medium text-gray-300">/ {itemCount} {itemCount === 1 ? 'item' : 'itens'}</span></p></div>
          <button type="button" onClick={(e) => { const form = document.querySelector('form') as HTMLFormElement; if (form) form.requestSubmit(); }} className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-3.5 px-10 rounded-xl transition-colors text-base">Continuar</button>
        </div>
      </div>
    </div>
  );
}
