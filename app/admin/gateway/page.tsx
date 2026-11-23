'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Shield,
  ExternalLink,
  CheckCircle,
  Key,
  Eye,
  EyeOff,
  Check,
  Lock,
  Play,
  Loader2,
  Copy,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import GatewayModal from '@/components/admin/GatewayModal';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface Gateway {
  id: string;
  name: string;
  apiUrl: string;
  productName: string;
  endpoint: string;
  authHeaderName: string;
  authHeaderPrefix: string;
  publicKey: string;
  privateKey: string;
  valueFormat: string;
  responseQrCodePath: string;
  responsePixCodePath: string;
  responseTransactionId: string;
  payloadTemplate: string;
  isActive: boolean;
  hasPublicKey: boolean;
  hasPrivateKey: boolean;
  createdAt: string;
}

interface TestModalState {
  isOpen: boolean;
  gatewayName: string;
  isLoading: boolean;
  result: {
    success: boolean;
    httpStatus?: number;
    qrCode?: string | null;
    qrCodeImage?: string | null;
    transactionId?: string | null;
    error?: string;
    details?: any;
    rawResponse?: any;
  } | null;
}

export default function GatewayPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Key Management Box state
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [newPublicKeys, setNewPublicKeys] = useState<Record<string, string>>({});
  const [showKeyInput, setShowKeyInput] = useState<Record<string, boolean>>({});
  const [isSavingKey, setIsSavingKey] = useState<Record<string, boolean>>({});

  // Testing state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testModal, setTestModal] = useState<TestModalState>({
    isOpen: false,
    gatewayName: '',
    isLoading: false,
    result: null,
  });

  // Modal states
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);

  // Confirm modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'activate' | 'delete' | 'deactivate';
    gateway: Gateway | null;
  }>({ isOpen: false, type: 'activate', gateway: null });

  const fetchGateways = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gateway');
      const data = await res.json();
      setGateways(data.gateways || []);
    } catch (error) {
      console.error('Erro ao carregar gateways:', error);
      toast.error('Erro ao carregar gateways');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const handleOpenCreate = () => {
    setEditingGateway(null);
    setShowGatewayModal(true);
  };

  const handleOpenEdit = async (gateway: Gateway) => {
    try {
      const res = await fetch(`/api/admin/gateway/${gateway.id}`);
      const data = await res.json();
      setEditingGateway(data.gateway);
      setShowGatewayModal(true);
    } catch (error) {
      console.error('Erro ao carregar gateway:', error);
      toast.error('Erro ao carregar gateway');
    }
  };

  // Run live test on gateway
  const handleTestGateway = async (gateway: Gateway) => {
    setTestingId(gateway.id);
    setTestModal({
      isOpen: true,
      gatewayName: gateway.name,
      isLoading: true,
      result: null,
    });

    try {
      const res = await fetch(`/api/admin/gateway/${gateway.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 25.0 }), // R$ 25,00 avoids minimum limit issues
      });

      const data = await res.json();

      setTestModal({
        isOpen: true,
        gatewayName: gateway.name,
        isLoading: false,
        result: data,
      });

      if (data.success && data.qrCode) {
        toast.success(`PIX de teste gerado com sucesso via ${gateway.name}!`);
      } else {
        toast.error(`Falha no teste: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      setTestModal({
        isOpen: true,
        gatewayName: gateway.name,
        isLoading: false,
        result: {
          success: false,
          error: error.message || 'Erro de conexão com o servidor de teste',
        },
      });
      toast.error('Erro de conexão ao testar gateway');
    } finally {
      setTestingId(null);
    }
  };

  const handleKeyInputChange = (gatewayId: string, value: string) => {
    setNewKeys((prev) => ({ ...prev, [gatewayId]: value }));
  };

  const handlePublicKeyInputChange = (gatewayId: string, value: string) => {
    setNewPublicKeys((prev) => ({ ...prev, [gatewayId]: value }));
  };

  const toggleShowKey = (gatewayId: string) => {
    setShowKeyInput((prev) => ({ ...prev, [gatewayId]: !prev[gatewayId] }));
  };

  const handleUpdateKey = async (gatewayId: string, gatewayName: string) => {
    const keyToSave = newKeys[gatewayId]?.trim();
    const pubKeyToSave = newPublicKeys[gatewayId]?.trim();

    if (!keyToSave && pubKeyToSave === undefined) {
      toast.error('Digite a nova chave privada ou Client ID');
      return;
    }

    setIsSavingKey((prev) => ({ ...prev, [gatewayId]: true }));
    try {
      const body: Record<string, string> = {};
      if (keyToSave) body.privateKey = keyToSave;
      if (pubKeyToSave !== undefined) body.publicKey = pubKeyToSave;

      const res = await fetch(`/api/admin/gateway/${gatewayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao atualizar credenciais');
      }

      toast.success(`Credenciais de "${gatewayName}" atualizadas com sucesso!`);
      setNewKeys((prev) => ({ ...prev, [gatewayId]: '' }));
      setNewPublicKeys((prev) => ({ ...prev, [gatewayId]: '' }));
      fetchGateways();
    } catch (error) {
      console.error('Erro ao atualizar credenciais:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar credenciais');
    } finally {
      setIsSavingKey((prev) => ({ ...prev, [gatewayId]: false }));
    }
  };

  const handleRemoveKey = async (gateway: Gateway) => {
    if (!confirm(`Tem certeza que deseja remover a chave privada do gateway "${gateway.name}"?`)) {
      return;
    }

    setIsSavingKey((prev) => ({ ...prev, [gateway.id]: true }));
    try {
      const res = await fetch(`/api/admin/gateway/${gateway.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: '' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao remover chave');
      }

      toast.success(`Chave privada de "${gateway.name}" removida com sucesso!`);
      setNewKeys((prev) => ({ ...prev, [gateway.id]: '' }));
      fetchGateways();
    } catch (error) {
      console.error('Erro ao remover chave:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao remover chave');
    } finally {
      setIsSavingKey((prev) => ({ ...prev, [gateway.id]: false }));
    }
  };

  const handleSaveGateway = async (data: Omit<Gateway, 'id' | 'isActive' | 'hasPublicKey' | 'hasPrivateKey' | 'createdAt'>) => {
    setIsSaving(true);
    try {
      if (editingGateway?.id) {
        const updateData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          if (value !== '' && value !== undefined && value !== '__REMOVE__') {
            updateData[key] = value;
          }
        });

        if ((data as any).privateKey === '__REMOVE__') {
          updateData.privateKey = '';
        }

        const res = await fetch(`/api/admin/gateway/${editingGateway.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Erro ao atualizar gateway');
        }

        toast.success('Gateway atualizado com sucesso!');
      } else {
        const res = await fetch('/api/admin/gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Erro ao criar gateway');
        }

        toast.success('Gateway criado com sucesso!');
      }

      setShowGatewayModal(false);
      setEditingGateway(null);
      fetchGateways();
    } catch (error) {
      console.error('Erro ao salvar gateway:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar gateway');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!confirmModal.gateway) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/gateway/${confirmModal.gateway.id}/activate`, {
        method: 'PUT',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao ativar gateway');
      }

      toast.success(`Gateway "${confirmModal.gateway.name}" ativado como PADRÃO de pagamentos!`);
      setConfirmModal({ isOpen: false, type: 'activate', gateway: null });
      fetchGateways();
    } catch (error) {
      console.error('Erro ao ativar gateway:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao ativar gateway');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmModal.gateway) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/gateway/${confirmModal.gateway.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao desativar gateway');
      }

      toast.success(`Gateway "${confirmModal.gateway.name}" desativado!`);
      setConfirmModal({ isOpen: false, type: 'deactivate', gateway: null });
      fetchGateways();
    } catch (error) {
      console.error('Erro ao desativar gateway:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao desativar gateway');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmModal.gateway) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/gateway/${confirmModal.gateway.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao excluir gateway');
      }

      toast.success(`Gateway "${confirmModal.gateway.name}" excluído!`);
      setConfirmModal({ isOpen: false, type: 'delete', gateway: null });
      fetchGateways();
    } catch (error) {
      console.error('Erro ao excluir gateway:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir gateway');
    } finally {
      setIsSaving(false);
    }
  };

  const getConfirmModalProps = () => {
    switch (confirmModal.type) {
      case 'activate':
        return {
          title: 'Ativar este Gateway como Padrão?',
          message: `Tem certeza que deseja ativar o gateway "${confirmModal.gateway?.name}"? Todas as novas cobranças PIX na loja serão geradas automaticamente através dele.`,
          confirmText: 'Sim, Ativar como Padrão',
          type: 'activate' as const,
          onConfirm: handleActivate,
        };
      case 'deactivate':
        return {
          title: 'Desativar Gateway?',
          message: `Tem certeza que deseja desativar o gateway "${confirmModal.gateway?.name}"? Cobranças PIX cairão no modo de simulação até que outro gateway seja ativado.`,
          confirmText: 'Sim, Desativar',
          type: 'warning' as const,
          onConfirm: handleDeactivate,
        };
      case 'delete':
        return {
          title: 'Excluir Gateway?',
          message: `Tem certeza que deseja excluir o gateway "${confirmModal.gateway?.name}"? Esta ação não pode ser desfeita.`,
          confirmText: 'Sim, Excluir',
          type: 'delete' as const,
          onConfirm: handleDelete,
        };
    }
  };

  const formatUrl = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname;
    } catch {
      return url;
    }
  };

  const activeGateway = gateways.find((g) => g.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Active Gateway Highlight */}
      {activeGateway ? (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
                Gateway Ativo em Produção
              </span>
              <span className="text-xs text-emerald-100 font-mono">
                {formatUrl(activeGateway.apiUrl)}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">{activeGateway.name}</h2>
            <p className="text-xs text-emerald-100 max-w-xl">
              Todos os pedidos da loja estão gerando PIX automaticamente através desta adquirente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTestGateway(activeGateway)}
              disabled={testingId === activeGateway.id}
              className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              {testingId === activeGateway.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-700" />
                  Testar PIX Agora
                </>
              )}
            </button>
            <button
              onClick={() => handleOpenEdit(activeGateway)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500 text-white rounded-2xl p-4 shadow flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-white" />
            <div>
              <p className="font-bold text-sm">Nenhum Gateway Ativo</p>
              <p className="text-xs text-amber-100">
                Ative um dos gateways abaixo para que os pagamentos PIX funcionem normalmente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gateways de Pagamento</h1>
          <p className="text-sm text-gray-500">
            Cadastre novas credenciais ou adquirentes (SkalaPay, Pix Black, DropPay, SuitPay, etc.) e teste tudo direto pelo painel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchGateways}
            className="p-2 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-semibold text-sm rounded-xl hover:bg-orange-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Gateway / Preset
          </button>
        </div>
      </div>

      {/* Empty State */}
      {gateways.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <Shield className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum gateway configurado</h3>
          <p className="text-gray-500 text-center max-w-sm mb-6 text-sm">
            Configure seu primeiro gateway para processar pagamentos PIX com segurança.
          </p>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-semibold text-sm rounded-xl hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Configurar Gateway
          </button>
        </div>
      ) : (
        /* Gateway Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gateways.map((gateway) => {
            const isSkala = gateway.name?.toLowerCase().includes('skala') || gateway.name?.toLowerCase().includes('skale');
            const isPixBlack = gateway.name?.toLowerCase().includes('pix black') || gateway.apiUrl?.includes('pixxblack');

            return (
              <div
                key={gateway.id}
                className={`relative bg-white rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
                  gateway.isActive
                    ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                <div>
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-lg font-bold text-gray-900">{gateway.name}</h3>
                      {isSkala && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          SkalaPay
                        </span>
                      )}
                      {isPixBlack && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          Pix Black
                        </span>
                      )}
                    </div>

                    {gateway.isActive ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500 text-white text-[11px] font-bold rounded-full shadow-sm">
                        <CheckCircle className="w-3 h-3" />
                        ATIVO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>

                  {/* API URL and Endpoint */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-4 font-mono truncate">
                    <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-400" />
                    <span>{formatUrl(gateway.apiUrl)}</span>
                    <span className="text-gray-400">{gateway.endpoint || '/cash-in'}</span>
                  </div>

                  {/* Caixa de Credenciais Rápidas */}
                  <div className="mb-4 p-3 bg-gray-50/80 border border-gray-200 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-orange-500" />
                        Credenciais da API
                      </span>
                      {gateway.hasPrivateKey ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Chave no Servidor
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          Sem chave
                        </span>
                      )}
                    </div>

                    {/* Client ID / Public Key input if needed */}
                    {(isSkala || gateway.hasPublicKey || gateway.name?.toLowerCase().includes('drop')) && (
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={newPublicKeys[gateway.id] ?? (gateway.hasPublicKey ? '••••••••••••••••••••' : '')}
                          onChange={(e) => handlePublicKeyInputChange(gateway.id, e.target.value)}
                          placeholder="Atualizar Client ID..."
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-500 font-mono"
                        />
                      </div>
                    )}

                    {/* Private Key input */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[10px] font-semibold text-gray-500">
                          {isSkala ? 'Client Secret' : 'Chave Privada / Token'}
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type={showKeyInput[gateway.id] ? 'text' : 'password'}
                          value={newKeys[gateway.id] || ''}
                          onChange={(e) => handleKeyInputChange(gateway.id, e.target.value)}
                          placeholder={gateway.hasPrivateKey ? 'Colar nova chave para trocar...' : 'Colar chave secreta...'}
                          className="w-full px-2.5 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(gateway.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showKeyInput[gateway.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Ação rápida de salvar chave */}
                    {(newKeys[gateway.id]?.trim() || newPublicKeys[gateway.id]?.trim()) && (
                      <button
                        onClick={() => handleUpdateKey(gateway.id, gateway.name)}
                        disabled={isSavingKey[gateway.id]}
                        className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isSavingKey[gateway.id] ? 'Salvando...' : 'Salvar Novas Credenciais'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  {/* Test Button */}
                  <button
                    onClick={() => handleTestGateway(gateway)}
                    disabled={testingId === gateway.id}
                    className="w-full py-2 bg-gray-50 hover:bg-orange-50 hover:text-orange-700 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    {testingId === gateway.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                        Testando Gateway...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-orange-500" />
                        Testar Conexão / PIX
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(gateway)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar
                    </button>

                    {gateway.isActive ? (
                      <button
                        onClick={() => setConfirmModal({ isOpen: true, type: 'deactivate', gateway })}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-orange-600 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                        Desativar
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmModal({ isOpen: true, type: 'activate', gateway })}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <Power className="w-3.5 h-3.5" />
                        Ativar
                      </button>
                    )}

                    <button
                      onClick={() => setConfirmModal({ isOpen: true, type: 'delete', gateway })}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Test Modal Result */}
      {testModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Resultado do Teste: {testModal.gatewayName}
                </h3>
              </div>
              <button
                onClick={() => setTestModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {testModal.isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  <p className="text-xs text-gray-600 font-medium">
                    Enviando cobrança de teste e comunicando com a adquirente...
                  </p>
                </div>
              ) : testModal.result?.success ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      PIX Gerado com Sucesso! (HTTP {testModal.result.httpStatus || 200})
                    </div>
                    <p className="text-xs text-emerald-700">
                      As credenciais e endpoints estão 100% corretos e operacionais.
                    </p>
                  </div>

                  {testModal.result.transactionId && (
                    <div className="text-xs">
                      <span className="text-gray-500 font-medium">ID da Transação: </span>
                      <span className="font-mono text-gray-800">{testModal.result.transactionId}</span>
                    </div>
                  )}

                  {testModal.result.qrCode && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">Código PIX Copia e Cola:</label>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-xs break-all flex items-center justify-between gap-2">
                        <span className="text-gray-800 line-clamp-2">{testModal.result.qrCode}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(testModal.result!.qrCode!);
                            toast.success('Código PIX copiado com sucesso!');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 flex-shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Falha ao gerar PIX (HTTP {testModal.result?.httpStatus || 'Erro'})
                    </div>
                    <p className="text-xs text-red-700 font-medium leading-relaxed">
                      {testModal.result?.error || 'A adquirente recusou a requisição.'}
                    </p>
                  </div>

                  {testModal.result?.details && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700">Detalhes da Resposta:</label>
                      <pre className="p-3 bg-gray-900 text-gray-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(testModal.result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setTestModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Modal */}
      <GatewayModal
        isOpen={showGatewayModal}
        onClose={() => {
          setShowGatewayModal(false);
          setEditingGateway(null);
        }}
        onSave={handleSaveGateway}
        gateway={editingGateway}
        isLoading={isSaving}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: 'activate', gateway: null })}
        isLoading={isSaving}
        {...getConfirmModalProps()}
      />
    </div>
  );
}
