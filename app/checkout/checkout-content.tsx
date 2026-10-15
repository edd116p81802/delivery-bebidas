'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { ChevronLeft, CreditCard, Banknote, MapPin } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';

export function CheckoutContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { items, getSubtotal, getDeliveryFee, getTotal, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if ((items?.length ?? 0) === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Carrinho vazio</h1>
        <p className="text-gray-500 mb-6">Adicione produtos antes de finalizar o pedido</p>
        <Link href="/" className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-3 px-6 rounded-xl">
          Voltar à Loja
        </Link>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  const handleCepChange = async (cep: string) => {
    const numericCep = cep?.replace?.(/\D/g, '')?.slice?.(0, 8) ?? '';
    setFormData((prev) => ({ ...prev, cep: numericCep }));

    if ((numericCep?.length ?? 0) === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${numericCep}/json/`);
        const data = await response.json();
        if (!data?.erro) {
          setFormData((prev) => ({
            ...prev,
            street: data?.logradouro ?? '',
            neighborhood: data?.bairro ?? '',
            city: data?.localidade ?? '',
            state: data?.uf ?? '',
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();

    if (!formData?.name || !formData?.email || !formData?.phone || !formData?.street || !formData?.number || !formData?.city) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const address = `${formData?.street}, ${formData?.number} - ${formData?.neighborhood}, ${formData?.city}/${formData?.state}`;

      // Salvar checkout session para tracking do funil
      const sessionData = {
        customerName: formData?.name,
        customerEmail: formData?.email,
        customerPhone: formData?.phone,
        address,
        complement: formData?.complement,
        items: items?.map?.((item) => ({
          id: item?.id,
          name: item?.name,
          quantity: item?.quantity,
          price: item?.finalPrice,
          finalPrice: item?.finalPrice,
          categoryName: item?.categoryName || 'Outros',
        })),
        subtotal,
        deliveryFee,
        total,
        completedToPix: paymentMethod === 'pix', // Marca como PIX gerado se escolheu PIX
      };

      // Salvar session para métricas do funil
      await fetch('/api/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      // Se for PIX, redirecionar para página de pagamento PIX
      if (paymentMethod === 'pix') {
        // Salvar dados no localStorage para a página de PIX recuperar
        localStorage.setItem('pixCheckoutData', JSON.stringify({
          ...sessionData,
          customerCpf: formData?.cpf,
        }));
        router.push(`/checkout/pix?email=${encodeURIComponent(formData?.email)}`);
        return;
      }

      // Se for dinheiro, criar pedido direto
      const orderData = {
        customerName: formData?.name,
        customerEmail: formData?.email,
        customerPhone: formData?.phone,
        customerCpf: formData?.cpf,
        address,
        complement: formData?.complement,
        items: items?.map?.((item) => ({
          id: item?.id,
          name: item?.name,
          quantity: item?.quantity,
          price: item?.finalPrice,
        })),
        subtotal,
        deliveryFee,
        total,
        paymentMethod,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (response?.ok) {
        clearCart();
        toast.success('Pedido realizado com sucesso!');
        router.push('/');
      } else {
        toast.error('Erro ao criar pedido. Tente novamente.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao processar pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Checkout</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                Dados de Entrega
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome completo *"
                  value={formData?.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="email"
                    placeholder="E-mail *"
                    value={formData?.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Telefone *"
                    value={formData?.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="CEP *"
                  value={formData?.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  maxLength={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  required
                />
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Rua *"
                    value={formData?.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="col-span-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Número *"
                    value={formData?.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Complemento"
                    value={formData?.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={formData?.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Cidade *"
                    value={formData?.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Estado"
                    value={formData?.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                Forma de Pagamento
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'pix' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <Banknote className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-medium">PIX</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('money')}
                  className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'money' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <Banknote className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-medium">Dinheiro</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-gray-300 text-gray-900 font-bold py-4 rounded-xl transition-colors"
            >
              {isSubmitting ? 'Processando...' : `Finalizar Pedido - R$ ${total?.toFixed?.(2)?.replace?.('.', ',')}`}
            </button>
          </form>

          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4">Resumo do Pedido</h2>
              <div className="space-y-3 mb-6">
                {items?.map?.((item) => (
                  <div key={item?.id} className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image src={item?.imageUrl ?? ''} alt={item?.name ?? ''} fill className="object-contain p-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item?.name}</p>
                      <p className="text-gray-500 text-sm">Qtd: {item?.quantity}</p>
                    </div>
                    <p className="font-bold text-amber-600">
                      R$ {((item?.finalPrice ?? 0) * (item?.quantity ?? 0))?.toFixed?.(2)?.replace?.('.', ',')}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>R$ {subtotal?.toFixed?.(2)?.replace?.('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Entrega</span>
                  {deliveryFee === 0 ? (
                    <span className="text-green-600 font-medium">GRÁTIS</span>
                  ) : (
                    <span>R$ {deliveryFee?.toFixed?.(2)?.replace?.('.', ',')}</span>
                  )}
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-amber-600">R$ {total?.toFixed?.(2)?.replace?.('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
