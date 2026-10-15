'use client';

import { DeliveryMap } from '@/components/delivery-map';
import { useCartStore } from '@/lib/cart-store';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, MapPin, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { DELIVERY_TIME } from '@/lib/constants';
import CheckoutHeader from '@/components/checkout/CheckoutHeader';

// Inline SVG components for instant loading
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-500">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const DeliveryIcon = () => (
  <svg viewBox="0 0 503.315 503.315" className="w-6 h-6 flex-shrink-0 mt-0.5">
    <path fill="#797979" d="M156.199,429.556c0-23.96-19.43-43.39-43.39-43.39s-43.39,19.43-43.39,43.39s19.43,43.39,43.39,43.39S156.199,453.516,156.199,429.556"/>
    <path fill="#797979" d="M494.64,429.556c0-23.96-19.43-43.39-43.39-43.39c-23.96,0-43.39,19.43-43.39,43.39s19.43,43.39,43.39,43.39C475.21,472.946,494.64,453.516,494.64,429.556"/>
    <path fill="#C0C0C0" d="M112.809,446.912c-9.58,0-17.356-7.775-17.356-17.356s7.775-17.356,17.356-17.356s17.356,7.775,17.356,17.356S122.39,446.912,112.809,446.912"/>
    <path fill="#C0C0C0" d="M451.25,446.912c-9.58,0-17.356-7.775-17.356-17.356s7.775-17.356,17.356-17.356s17.356,7.775,17.356,17.356S460.83,446.912,451.25,446.912"/>
    <polygon fill="#C69666" points="0,308.064 121.492,308.064 121.492,186.573 0,186.573"/>
    <path fill="#337FAA" d="M234.301,73.759c0-23.96-19.43-43.39-43.39-43.39s-43.39,19.43-43.39,43.39s19.43,43.39,43.39,43.39S234.301,97.719,234.301,73.759"/>
    <polygon fill="#F89954" points="416.538,212.607 399.182,212.607 381.826,203.929 381.826,169.217 399.182,160.539 416.538,160.539"/>
    <path fill="#48A0DC" d="M282.811,272.379c-3.046-9.745-12.071-16.384-22.285-16.384h-0.191h-43.39l-0.009-43.39h77.182c8.643,0,16.662-5.91,18.05-14.44c1.762-10.873-6.578-20.272-17.122-20.272h-60.746V147.52c0-16.775-13.598-30.373-30.373-30.373h-17.356c-16.775,0-30.373,13.598-30.373,30.373V277.69c0,16.775,13.598,30.373,30.373,30.373h65.085l26.034,86.78h43.39L282.811,272.379z"/>
    <path fill="#FFD479" d="M490.611,345.722c-11.923-13.564-29.844-20.298-47.902-20.298h-8.817c-5.406-27.075-24.125-49.577-49.759-59.826l-2.308-0.92v-95.458h-86.78v8.678c9.589,0,17.356,7.767,17.356,17.356c0,9.58-7.767,17.356-17.356,17.356v8.678h52.068v104.136v69.424H208.264l11.871-26.928c3.627-10.9,5.484-22.302,5.484-33.783c0.009-14.379-11.655-26.069-26.034-26.069H34.705c-14.379,0-26.034,11.654-26.034,26.034v10.769c0,4.426,2.517,8.261,6.205,10.717c11.134,7.411,14.536,22.233,7.749,33.757l-11.064,18.805c-5.233,6.552-3.107,16.263,4.4,20.011c1.831,0.92,3.844,1.397,5.892,1.397h21.53c0-38.287,31.145-69.424,69.424-69.424s69.424,31.137,69.424,69.424h199.593c0-38.279,31.154-69.424,69.424-69.424c30.92,0,40.812,6.101,52.068,17.356C503.315,365.508,498.464,354.661,490.611,345.722"/>
    <polygon fill="#E8D5B2" points="43.39,221.285 78.102,221.285 78.102,186.573 43.39,186.573"/>
    <path fill="#337FAA" d="M216.945,221.285c-14.345,0-26.025-11.672-26.025-26.025v-26.043c0-4.79,3.879-8.678,8.678-8.678c4.799,0,8.678,3.888,8.678,8.678v26.043c0,4.782,3.888,8.669,8.669,8.669c4.799,0,8.678,3.888,8.678,8.678S221.744,221.285,216.945,221.285"/>
  </svg>
);

export default function ReviewPage() {
  const router = useRouter();
  const { items, getSubtotal, getDeliveryFee, getTotal, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const data = sessionStorage.getItem('checkoutData');
    if (data) setCheckoutData(JSON.parse(data));
    else router.push('/checkout');
  }, [router]);

  useEffect(() => { if (mounted && items.length === 0) router.push('/'); }, [items, mounted, router]);

  const handleClearCart = () => {
    if (confirm('Você está prestes a limpar o seu carrinho, deseja continuar?')) {
      clearCart();
      sessionStorage.removeItem('checkoutData');
      router.push('/');
    }
  };

  if (!mounted || !checkoutData) return null;

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();
  const subtotalOriginal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalDiscount = subtotalOriginal - subtotal;
  const fullAddress = `${checkoutData.street}, ${checkoutData.number}, ${checkoutData.neighborhood}, ${checkoutData.city} - ${checkoutData.state}, CEP ${checkoutData.cep}`;
  const displayAddress = `${checkoutData.street}, ${checkoutData.number}${checkoutData.complement ? ', ' + checkoutData.complement : ''}, ${checkoutData.neighborhood}, ${checkoutData.city} - ${checkoutData.state}, CEP ${checkoutData.cep}`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <CheckoutHeader 
        title="REVISÃO" 
        backRoute="/checkout"
        rightElement={
          <button type="button" onClick={handleClearCart} className="text-amber-400 font-bold text-sm hover:text-amber-300">
            Limpar
          </button>
        }
      />

      <main className="flex-1 pt-20 mb-[60px] overflow-y-auto container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <DeliveryMap address={fullAddress} />
            <div className="bg-gray-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3"><User className="w-5 h-5 text-gray-400 mt-1" /><div><p className="font-semibold text-white">Nome</p><p className="text-gray-400">{checkoutData.name}</p></div></div>
              <div className="flex items-start gap-3"><Phone className="w-5 h-5 text-amber-400 mt-1" /><div><p className="font-semibold text-white">Telefone <span className="text-xs font-normal text-gray-500">(O entregador poderá entrar em contato)</span></p><p className="text-gray-400">{checkoutData.phone}</p></div></div>
              <div className="flex items-start gap-3"><MapPin className="w-5 h-5 text-green-400 mt-1" /><div><p className="font-semibold text-white">Endereço de Entrega</p><p className="text-gray-400">{displayAddress}</p></div></div>
              <div className="pt-4 border-t border-gray-700"><p className="flex items-center gap-2 text-amber-400 font-semibold"><ClockIcon />Entrega em até {DELIVERY_TIME}</p></div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 text-white">Itens do Pedido</h2>
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-700 flex-shrink-0"><Image src={item.imageUrl} alt={item.name} fill className="object-contain" /></div>
                    <div className="flex-1"><p className="font-semibold text-sm text-white">{item.quantity}x {item.name}</p><p className="text-xs text-gray-400">{item.categoryName}</p><p className="text-sm text-amber-400 mt-1">R$ {item.finalPrice.toFixed(2).replace('.', ',')} cada</p></div>
                    <div className="text-right"><p className="font-bold text-white">R$ {(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}</p></div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-4 border-t border-gray-700">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="text-white">R$ {subtotalOriginal.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Taxa de entrega</span>{deliveryFee === 0 ? <span className="text-green-400 font-semibold">GRÁTIS</span> : <span className="text-white">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>}</div>
                {totalDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Itens em promoção</span><span className="text-green-400 font-bold">- R$ {totalDiscount.toFixed(2).replace('.', ',')}</span></div>}
                <div className="flex justify-between pt-2 border-t border-gray-700"><span className="font-bold text-lg text-white">Total</span><span className="font-bold text-amber-400 text-2xl">R$ {total.toFixed(2).replace('.', ',')}</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 z-50">
        <div className="flex items-center justify-center px-4 py-3">
          <button onClick={() => setShowReviewModal(true)} className="w-[96%] bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-3 px-6 rounded-xl transition-colors text-base">Continuar para a Revisão</button>
        </div>
      </div>

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
          <div className="bg-gray-900 rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Revise o seu pedido</h2>
              <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3"><DeliveryIcon /><div><p className="font-bold text-base text-white">Entrega hoje</p><p className="text-sm text-gray-400">Receba em até {DELIVERY_TIME}</p></div></div>
              <div className="flex items-start gap-3"><MapPin className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5 stroke-[2.5]" /><div><p className="font-bold text-base text-white">{checkoutData.street}, {checkoutData.number}, {checkoutData.neighborhood}</p>{checkoutData.complement && <p className="text-sm text-gray-400">{checkoutData.complement}</p>}</div></div>
              <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-base mb-3 text-white">Resumo de valores</h3>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="font-semibold text-white">R$ {subtotalOriginal.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Taxa de entrega</span>{deliveryFee === 0 ? <span className="text-green-400 font-bold">Grátis</span> : <span className="font-semibold text-white">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>}</div>
                {totalDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Itens em promoção</span><span className="text-green-400 font-bold">- R$ {totalDiscount.toFixed(2).replace('.', ',')}</span></div>}
                <div className="flex justify-between pt-3 border-t border-gray-700"><span className="font-bold text-lg text-white">Total</span><span className="font-bold text-amber-400 text-xl">R$ {total.toFixed(2).replace('.', ',')}</span></div>
              </div>
              <div className="space-y-3 pt-4">
                <Link href="/checkout/pagamento" className="block w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-4 px-6 rounded-xl transition-colors text-center">Escolher forma de Pagamento</Link>
                <button onClick={() => setShowReviewModal(false)} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-4 px-6 rounded-xl transition-colors">Alterar pedido</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
