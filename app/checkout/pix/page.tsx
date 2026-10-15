'use client';

import { useCartStore } from '@/lib/cart-store';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Check, Clock, ChevronDown, CheckCircle2, Package, Bike, X, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import CheckoutHeader from '@/components/checkout/CheckoutHeader';
import { fireGoogleAdsConversion } from '@/components/google-ads-script';

// PIX Loading Animation - SVG animado verde
const PixLoadingAnimation = () => (
  <div className="relative w-20 h-20 mx-auto">
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite"/>
      </path>
      <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
      </path>
      <g>
        <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z">
          <animate attributeName="opacity" values="1;0.7;1" dur="1s" repeatCount="indefinite"/>
        </path>
        <animateTransform attributeName="transform" type="scale" values="1;1.05;1" dur="1.5s" repeatCount="indefinite" additive="sum"/>
      </g>
    </svg>
  </div>
);

// Componente de Loading do PIX com Header e Footer brancos
const PixLoadingScreen = ({ 
  items, 
  totalDiscount, 
  progress 
}: { 
  items: Array<{ name: string; quantity: number }>; 
  totalDiscount: number;
  progress: number;
}) => {
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [showDiscount, setShowDiscount] = useState(false);

  useEffect(() => {
    // Alterna entre produtos a cada 1.2 segundos
    if (items.length > 1) {
      const interval = setInterval(() => {
        setCurrentProductIndex(prev => (prev + 1) % items.length);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [items.length]);

  useEffect(() => {
    // Mostra desconto após 2 segundos
    const timer = setTimeout(() => setShowDiscount(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const currentProduct = items[currentProductIndex];
  const productText = currentProduct 
    ? `${currentProduct.quantity}x ${currentProduct.name.length > 30 ? currentProduct.name.substring(0, 30) + '...' : currentProduct.name}`
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header Escuro */}
      <header className="fixed top-0 left-0 right-0 bg-gray-900 z-50">
        <div className="flex items-center justify-center h-14 px-4">
          <h1 className="text-base font-bold text-white tracking-wide">PAGAMENTO PIX</h1>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 flex flex-col px-6 pt-14 pb-40">
        {/* Área superior com animação e texto */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center space-y-4">
            <PixLoadingAnimation />
            
            <div className="space-y-1">
              <p className="text-lg font-semibold text-gray-800">Gerando código PIX...</p>
              <p className="text-sm text-gray-500">Aguarde um momento</p>
            </div>
          </div>
        </div>

        {/* Mensagens dinâmicas - próximas do footer, sem fundo, texto branco */}
        <div className="space-y-2 text-center mb-4">
          <p className="text-sm text-gray-600 animate-pulse">
            Reservando {productText}
          </p>

          {showDiscount && totalDiscount > 0 && (
            <p className="text-sm text-gray-600 animate-fade-in">
              Aplicando R$ {totalDiscount.toFixed(2).replace('.', ',')} de desconto
            </p>
          )}
        </div>
      </main>

      {/* Footer Escuro com Barra de Progresso */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 z-50">
        <div className="px-6 py-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-300">
              <span>Processando...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function PixPaymentPage() {
  const router = useRouter();
  const { items, getSubtotal, getDeliveryFee, getTotal, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'confirmed' | 'expired'>('waiting');
  const [showHelp, setShowHelp] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [showOrderStatus, setShowOrderStatus] = useState(false);
  const [showOrderItems, setShowOrderItems] = useState(false);
  const [selectedHelpTopic, setSelectedHelpTopic] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeImage: string; transactionId: string; expiresAt: string; orderId: string; } | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversionFiredRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && items.length === 0) router.push('/'); }, [items, mounted, router]);

  useEffect(() => {
    if (!mounted) return;
    
    // Verificar se temos os dados do checkout
    const pixCheckoutDataStr = sessionStorage.getItem('pixCheckoutData');
    if (!pixCheckoutDataStr) { 
      toast.error('Dados do pedido não encontrados'); 
      router.push('/checkout/pagamento'); 
      return; 
    }
    const checkoutData = JSON.parse(pixCheckoutDataStr);
    
    // Barra de progresso animada (vai até 90% enquanto espera a API)
    const INTERVAL = 100;
    let currentProgress = 0;
    
    progressIntervalRef.current = setInterval(() => {
      setLoadingProgress(prev => {
        // Aumenta rápido até 60%, depois desacelera até 90%
        if (prev < 60) {
          currentProgress = prev + 2;
        } else if (prev < 90) {
          currentProgress = prev + 0.3;
        }
        return Math.min(currentProgress, 90);
      });
    }, INTERVAL);
    
    const createOrderAndPix = async () => {
      try {
        // 1. Criar o pedido
        const orderData = {
          customerName: checkoutData.customerName,
          customerEmail: checkoutData.customerEmail,
          customerPhone: checkoutData.customerPhone,
          customerCpf: checkoutData.customerCpf,
          address: checkoutData.address,
          complement: checkoutData.complement,
          items: checkoutData.items,
          subtotal: checkoutData.subtotal,
          deliveryFee: checkoutData.deliveryFee,
          total: checkoutData.total,
          paymentMethod: 'PIX',
          paymentData: { cpf: checkoutData.customerCpf }
        };
        
        const orderResponse = await fetch('/api/orders', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(orderData) 
        });
        if (!orderResponse.ok) throw new Error('Erro ao criar pedido');
        const order = await orderResponse.json();
        
        // 2. Criar sessão de checkout
        await fetch('/api/checkout-session', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            customerName: checkoutData.customerName, 
            customerEmail: checkoutData.customerEmail, 
            customerPhone: checkoutData.customerPhone, 
            address: checkoutData.address, 
            complement: checkoutData.complement, 
            items: checkoutData.items, 
            subtotal: checkoutData.subtotal, 
            deliveryFee: checkoutData.deliveryFee, 
            total: checkoutData.total, 
            completedToPix: true 
          }) 
        });
        
        // 3. Gerar código PIX
        const pixOrderData = {
          orderId: order.id,
          customerName: checkoutData.customerName,
          customerCpf: checkoutData.customerCpf,
          amount: checkoutData.total
        };
        
        const pixResponse = await fetch('/api/payments/create-pix', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(pixOrderData) 
        });
        if (!pixResponse.ok) throw new Error('Erro ao gerar PIX');
        const pixResult = await pixResponse.json();
        
        if (!pixResult.qrCode) {
          console.error('[PIX] QR Code não encontrado na resposta:', pixResult);
          throw new Error('QR Code PIX não foi retornado pelo gateway');
        }
        const qrCodeImage = await QRCode.toDataURL(pixResult.qrCode, { width: 200, margin: 1 });
        const newPixData = { 
          qrCode: pixResult.qrCode, 
          qrCodeImage, 
          transactionId: pixResult.transactionId, 
          expiresAt: pixResult.expiresAt, 
          orderId: order.id 
        };
        
        setPixData(newPixData);
        sessionStorage.setItem('pixPaymentData', JSON.stringify({ 
          ...newPixData, 
          cpf: checkoutData.customerCpf, 
          amount: checkoutData.total 
        }));
        
        // IMPORTANTE: Salvar pixOrderData com customerEmail para marcar como PIX copiado depois
        sessionStorage.setItem('pixOrderData', JSON.stringify({
          orderId: order.id,
          customerName: checkoutData.customerName,
          customerEmail: checkoutData.customerEmail,
          customerPhone: checkoutData.customerPhone,
          customerCpf: checkoutData.customerCpf,
          amount: checkoutData.total
        }));
        
        // Limpar dados temporários
        sessionStorage.removeItem('pixCheckoutData');
        
        // Disparar evento de conversão do Google Ads
        if (!conversionFiredRef.current) {
          conversionFiredRef.current = true;
          fireGoogleAdsConversion({
            transactionId: order.id,
            value: checkoutData.total,
            currency: 'BRL',
          });
        }

        // Completa a barra e mostra o PIX
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setLoadingProgress(100);
        setTimeout(() => setLoading(false), 300);
        
      } catch (error: any) { 
        console.error('PIX creation error:', error); 
        toast.error(error.message || 'Erro ao gerar PIX'); 
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        router.push('/checkout/pagamento'); 
      }
    };
    
    createOrderAndPix();
    
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [mounted, router]);

  // Referência do momento em que o PIX foi gerado (para limitar timer a 10 min)
  const pixCreatedAtRef = useRef<number>(0);

  useEffect(() => {
    if (!pixData || paymentStatus !== 'waiting') return;
    // Marca o momento que o PIX foi exibido
    if (!pixCreatedAtRef.current) pixCreatedAtRef.current = Date.now();
    // Timer sempre de 10 minutos a partir da criação, independente do gateway
    const maxExpiry = pixCreatedAtRef.current + 10 * 60 * 1000;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((maxExpiry - now) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) { setPaymentStatus('expired'); clearInterval(interval); sessionStorage.removeItem('pixPaymentData'); sessionStorage.removeItem('pixOrderData'); }
    }, 1000);
    return () => clearInterval(interval);
  }, [pixData, paymentStatus]);

  useEffect(() => {
    if (!pixData || paymentStatus !== 'waiting') return;
    const checkPayment = async () => {
      try {
        const response = await fetch(`/api/payments/check-status?orderId=${pixData.orderId}`);
        const data = await response.json();
        if (data.paymentStatus === 'PAID') {
          setPaymentStatus('confirmed');
          toast.success('Pagamento confirmado! ✅');
          setTimeout(() => { clearCart(); sessionStorage.removeItem('checkoutData'); sessionStorage.removeItem('pixOrderData'); sessionStorage.removeItem('pixPaymentData'); router.push('/?success=true'); }, 2000);
        } else if (data.paymentStatus === 'EXPIRED') { setPaymentStatus('expired'); sessionStorage.removeItem('pixPaymentData'); sessionStorage.removeItem('pixOrderData'); }
      } catch (error) { console.error('Erro ao verificar pagamento:', error); }
    };
    const interval = setInterval(checkPayment, 3000);
    return () => clearInterval(interval);
  }, [pixData, paymentStatus, clearCart, router]);

  const handleCopy = async () => {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast.success('Código PIX copiado!', { style: { background: '#16a34a', color: 'white', fontSize: '16px', fontWeight: 'bold', padding: '16px 24px', minWidth: '300px' } });
      
      try {
        const pixOrderDataStr = sessionStorage.getItem('pixOrderData');
        if (pixOrderDataStr) {
          const pixOrderData = JSON.parse(pixOrderDataStr);
          const customerEmail = pixOrderData.customerEmail;
          if (customerEmail) await fetch('/api/checkout-session/pix-copied', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: customerEmail }) });
        }
      } catch (error) { console.error('Erro ao marcar código copiado:', error); }
      setTimeout(() => setCopied(false), 2000);
    } catch (error) { toast.error('Erro ao copiar código'); }
  };

  const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
  const getProgressPercentage = () => (timeLeft / 600) * 100;

  if (!mounted) return null;
  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();
  const subtotalOriginal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalDiscount = subtotalOriginal - subtotal;

  // Calcular desconto total para a tela de loading
  const subtotalOriginalLoading = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const subtotalLoading = getSubtotal();
  const totalDiscountLoading = subtotalOriginalLoading - subtotalLoading;

  if (loading || !pixData) {
    return (
      <PixLoadingScreen 
        items={items.map(item => ({ name: item.name, quantity: item.quantity }))}
        totalDiscount={totalDiscountLoading}
        progress={loadingProgress}
      />
    );
  }

  const helpTopics = [
    { id: 'cant-pay', title: 'Não consigo pagar meu pedido', content: 'Para usar esta forma de pagamento, você precisa ter uma chave Pix cadastrada na sua instituição bancária. Também é necessário que tenha dinheiro em conta, já que não é possível pagar na função crédito.' },
    { id: 'dont-want-pix', title: 'Não quero mais pagar via Pix', content: 'Se você não deseja mais pagar via PIX, basta aguardar a expiração do código (10 minutos) ou fazer um novo pedido escolhendo outra forma de pagamento.' },
    { id: 'order-waiting', title: 'Pedido aguardando o pagamento', content: 'Seu pedido está aguardando a confirmação do pagamento via PIX. Assim que o pagamento for identificado, seu pedido entrará em preparação automaticamente.' },
    { id: 'payment-not-identified', title: 'Meu pagamento via Pix não foi identificado', content: 'Se você já realizou o pagamento e ele ainda não foi identificado, aguarde alguns instantes. O processamento pode levar até 3 minutos.' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <CheckoutHeader 
        title="PAGAMENTO PIX" 
        backRoute="/checkout/pagamento"
        rightElement={
          <button type="button" onClick={() => setShowHelp(true)} className="text-amber-500 font-semibold text-sm hover:text-amber-600">
            Ajuda
          </button>
        }
      />

      <main className="flex-1 pt-16 pb-32 px-4 max-w-lg mx-auto w-full">
        <div className="text-center space-y-6 py-6">
          {paymentStatus === 'waiting' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">O tempo para você pagar acaba em:</p>
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl font-mono font-bold text-gray-800">{formatTime(timeLeft)}</span>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-amber-400 transition-all duration-1000 ease-linear" style={{ width: `${getProgressPercentage()}%` }} /></div>
              </div>
            </div>
          )}

          <div className="flex justify-center"><div className="bg-white p-4 rounded-2xl border-2 border-gray-200">{pixData.qrCodeImage && <Image src={pixData.qrCodeImage} alt="QR Code PIX" width={200} height={200} className="rounded-lg" />}</div></div>

          <div><h2 className="text-xl font-bold text-gray-800">Pedido aguardando pagamento</h2><p className="text-sm text-gray-600 mt-2">Copie o código abaixo e utilize o Pix Copia e Cola no aplicativo que você vai fazer o pagamento:</p></div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Código PIX Copia e Cola</label>
            <div className="flex items-center gap-2">
              <input type="text" value={pixData.qrCode} readOnly className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 overflow-hidden text-ellipsis" />
              <button onClick={handleCopy} className="p-2 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors flex-shrink-0">{copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />}</button>
            </div>
          </div>

          <button onClick={() => setShowHowItWorks(true)} className="text-amber-500 hover:text-amber-600 font-semibold text-sm text-center">Como funciona</button>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-gray-700">Valor Total</span>
              <span className="text-2xl font-bold text-green-600">R$ {total.toFixed(2).replace('.', ',')}</span>
              <button onClick={() => setShowOrderItems(true)} className="text-sm text-amber-500 hover:text-amber-600 font-semibold flex items-center gap-1 self-start mt-1">Ver itens do pedido<ChevronDown className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 z-50">
        <div className="flex flex-col gap-2 px-4 py-3">
          <button onClick={handleCopy} className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2">{copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}Copiar código</button>
          <button onClick={() => setShowOrderStatus(true)} className="w-full bg-gray-800 border-2 border-amber-400 text-amber-400 hover:bg-gray-700 font-bold py-3.5 px-6 rounded-xl transition-colors">Status do Pedido</button>
        </div>
      </div>

      {showOrderStatus && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">Status do Pedido</h2><p className="text-sm text-gray-500">Pedido #{pixData.orderId}</p></div><button onClick={() => setShowOrderStatus(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-6">
              <div className="flex gap-4"><div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></div></div><div className="flex-1"><h3 className="font-bold text-gray-800">Pedido realizado</h3><p className="text-sm text-gray-600">Seu pedido foi criado com sucesso</p></div></div>
              <div className="flex gap-4"><div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center"><Clock className="w-6 h-6 text-white" /></div></div><div className="flex-1"><h3 className="font-bold text-gray-800">Aguardando pagamento</h3><p className="text-sm text-gray-600">Confirme o pagamento via PIX para prosseguir</p></div></div>
              <div className="flex gap-4"><div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center"><Package className="w-6 h-6 text-gray-600" /></div></div><div className="flex-1"><h3 className="font-bold text-gray-500">Em preparação</h3><p className="text-sm text-gray-500">Seu pedido está sendo preparado</p></div></div>
              <div className="flex gap-4"><div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center"><Bike className="w-6 h-6 text-gray-600" /></div></div><div className="flex-1"><h3 className="font-bold text-gray-500">Em entrega</h3><p className="text-sm text-gray-500">Seu pedido está a caminho</p></div></div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center"><p className="text-sm text-yellow-800 font-semibold">Complete o pagamento para que seu pedido possa ser preparado e entregue!</p></div>
            </div>
          </div>
        </div>
      )}

      {showHelp && !selectedHelpTopic && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between"><h2 className="text-lg font-bold">Ajuda</h2><button onClick={() => setShowHelp(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button></div>
            <div className="p-4 space-y-2">{helpTopics.map((topic) => (<button key={topic.id} onClick={() => setSelectedHelpTopic(topic.id)} className="w-full text-left px-4 py-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"><span className="text-sm font-medium text-gray-800">{topic.title}</span></button>))}</div>
          </div>
        </div>
      )}

      {showHelp && selectedHelpTopic && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3"><button onClick={() => setSelectedHelpTopic(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-lg font-bold">{helpTopics.find(t => t.id === selectedHelpTopic)?.title}</h2></div>
            <div className="p-6 space-y-4"><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{helpTopics.find(t => t.id === selectedHelpTopic)?.content}</p></div>
          </div>
        </div>
      )}

      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between"><h2 className="text-lg font-bold">Como funciona o PIX</h2><button onClick={() => setShowHowItWorks(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-6">
              <div className="flex gap-4"><div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center"><span className="text-white font-bold">1</span></div></div><div className="flex-1"><h3 className="font-bold text-gray-800 mb-1">Escaneie o QR Code</h3><p className="text-sm text-gray-600">Abra o aplicativo do seu banco e escaneie o QR Code exibido na tela, ou...</p></div></div>
              <div className="flex gap-4"><div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center"><span className="text-white font-bold">2</span></div></div><div className="flex-1"><h3 className="font-bold text-gray-800 mb-1">Copie o código PIX</h3><p className="text-sm text-gray-600">Clique no botão "Copiar código" e cole no seu app de banco usando a opção PIX Copia e Cola.</p></div></div>
              <div className="flex gap-4"><div className="flex-shrink-0"><div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center"><span className="text-white font-bold">3</span></div></div><div className="flex-1"><h3 className="font-bold text-gray-800 mb-1">Confirme o pagamento</h3><p className="text-sm text-gray-600">Verifique os dados e confirme a transferência. O pagamento é processado instantaneamente!</p></div></div>
              <button onClick={() => setShowHowItWorks(false)} className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-3.5 px-6 rounded-xl transition-colors mt-4">Ok, entendi</button>
            </div>
          </div>
        </div>
      )}

      {showOrderItems && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between"><h2 className="text-lg font-bold">Itens do Pedido</h2><button onClick={() => setShowOrderItems(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button></div>
            <div className="p-4">
              <div className="space-y-3 mb-4">{items.map((item) => (<div key={item.id} className="flex gap-3 bg-gray-50 rounded-lg p-3"><div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white flex-shrink-0"><Image src={item.imageUrl} alt={item.name} fill className="object-contain" /></div><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{item.quantity}x {item.name}</p><p className="text-xs text-gray-500">{item.categoryName}</p><p className="text-sm text-amber-500 mt-0.5 font-bold">R$ {(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}</p></div></div>))}</div>
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-semibold">R$ {subtotalOriginal.toFixed(2).replace('.', ',')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Taxa de entrega</span>{deliveryFee === 0 ? <span className="text-green-600 font-semibold">GRÁTIS</span> : <span className="font-semibold">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>}</div>
                {totalDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-green-600 font-semibold">Itens em promoção</span><span className="text-green-600 font-semibold">-R$ {totalDiscount.toFixed(2).replace('.', ',')}</span></div>}
                <div className="flex justify-between pt-3 border-t border-gray-200"><span className="font-bold text-lg">Total</span><span className="font-bold text-amber-600 text-xl">R$ {total.toFixed(2).replace('.', ',')}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
