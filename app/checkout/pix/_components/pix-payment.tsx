"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Check, Clock, CheckCircle, Home, Loader2, QrCode, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/lib/cart-store";

interface CheckoutData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf?: string;
  address: string;
  complement?: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export function PixPayment() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams?.get("email");
  const { clearCart } = useCartStore();
  
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [pixCode, setPixCode] = useState<string>("");
  const [orderCreated, setOrderCreated] = useState(false);

  // Gerar código PIX fictício
  const generatePixCode = (total: number) => {
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `00020126580014BR.GOV.BCB.PIX0136${randomStr}520400005303986540${total.toFixed(2)}5802BR`;
  };

  useEffect(() => {
    // Recuperar dados do localStorage
    const storedData = localStorage.getItem("pixCheckoutData");
    if (storedData) {
      const data = JSON.parse(storedData);
      setCheckoutData(data);
      setPixCode(generatePixCode(data.total));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleCopyCode = async () => {
    if (!pixCode || !checkoutData) return;
    
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast.success("Código PIX copiado!");

      // Marcar como PIX copiado na API
      await fetch("/api/checkout-session/pix-copied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkoutData.customerEmail }),
      });

      // Criar o pedido se ainda não foi criado
      if (!orderCreated) {
        const orderResponse = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
            paymentMethod: "pix",
          }),
        });

        if (orderResponse.ok) {
          setOrderCreated(true);
          clearCart();
          localStorage.removeItem("pixCheckoutData");
          toast.success("Pedido criado! Aguardando confirmação do pagamento.");
        }
      }

      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error("Erro ao copiar código");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Carregando pagamento...</p>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-700 mb-4">Sessão expirada</h1>
        <p className="text-gray-500 mb-6">Volte ao checkout para gerar um novo PIX</p>
        <Link
          href="/checkout"
          className="inline-flex items-center px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-xl hover:bg-amber-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Voltar ao Checkout
        </Link>
      </div>
    );
  }

  if (orderCreated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-green-600" />
        </motion.div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Pedido Realizado!</h1>
        <p className="text-gray-600 mb-2">Código PIX copiado com sucesso.</p>
        <p className="text-gray-500 mb-8">Realize o pagamento e aguarde a confirmação.</p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
        >
          <Home className="w-5 h-5 mr-2" />
          Voltar ao Início
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 shadow-sm text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
          <QrCode className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento via PIX</h1>
        <p className="text-gray-600 mb-6">Copie o código abaixo para pagar</p>

        {/* Timer */}
        <div className="flex items-center justify-center space-x-2 text-amber-600 mb-6">
          <Clock className="w-5 h-5" />
          <span className="font-medium">
            Expira em: {formatTime(timeLeft)}
          </span>
        </div>

        {/* PIX Code Display */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Código PIX Copia e Cola:</p>
          <p className="font-mono text-sm break-all text-gray-700">{pixCode}</p>
        </div>

        {/* Total */}
        <div className="mb-6">
          <p className="text-gray-600">Valor a pagar:</p>
          <p className="text-3xl font-bold text-green-600">
            R$ {checkoutData.total.toFixed(2).replace(".", ",")}
          </p>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopyCode}
          className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Código Copiado!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 mr-2" />
              Copiar Código PIX
            </>
          )}
        </button>

        <p className="text-sm text-gray-500 mt-6">
          Após copiar, abra o app do seu banco e cole o código para pagar.
        </p>

        <Link
          href="/checkout"
          className="inline-flex items-center text-gray-600 hover:text-amber-600 mt-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar ao checkout
        </Link>
      </motion.div>
    </div>
  );
}
