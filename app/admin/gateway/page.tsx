'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Power, PowerOff, Shield, ExternalLink, CheckCircle, Key, Eye, EyeOff, Check, Lock } from 'lucide-react';
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

export default function GatewayPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Key Management Box state
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [showKeyInput, setShowKeyInput] = useState<Record<string, boolean>>({});
  const [isSavingKey, setIsSavingKey] = useState<Record<string, boolean>>({});

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
    // Buscar dados completos do gateway para edição
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

  const handleKeyInputChange = (gatewayId: string, value: string) => {
    setNewKeys((prev) => ({ ...prev, [gatewayId]: value }));
  };

  const toggleShowKey = (gatewayId: string) => {
    setShowKeyInput((prev) => ({ ...prev, [gatewayId]: !prev[gatewayId] }));
  };

  const handleUpdateKey = async (gatewayId: string, gatewayName: string) => {
    const keyToSave = newKeys[gatewayId]?.trim();
    if (!keyToSave) {
      toast.error('Digite ou cole a nova chave privada');
      return;
    }

    setIsSavingKey((prev) => ({ ...prev, [gatewayId]: true }));
    try {
      const res = await fetch(`/api/admin/gateway/${gatewayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: keyToSave }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao atualizar chave');
      }

      toast.success(`Chave privada de "${gatewayName}" atualizada com sucesso!`);
      setNewKeys((prev) => ({ ...prev, [gatewayId]: '' }));
      fetchGateways();
    } catch (error) {
      console.error('Erro ao atualizar chave:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar chave');
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
        // Editar gateway existente
        const updateData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          // Só enviar campos que foram preenchidos
          if (value !== '' && value !== undefined && value !== '__REMOVE__') {
            updateData[key] = value;
          }
        });

        // Se o usuário solicitou remover a chave privada
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
        // Criar novo gateway
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

      toast.success(`Gateway "${confirmModal.gateway.name}" ativado com sucesso!`);
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
          title: 'Ativar Gateway?',
          message: `Tem certeza que deseja ativar o gateway "${confirmModal.gateway?.name}"? O gateway atual será desativado automaticamente.`,
          confirmText: 'Sim, Ativar',
          type: 'activate' as const,
          onConfirm: handleActivate,
        };
      case 'deactivate':
        return {
          title: 'Desativar Gateway?',
          message: `Tem certeza que deseja desativar o gateway "${confirmModal.gateway?.name}"? Pagamentos PIX não funcionarão até que outro gateway seja ativado.`,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gateway de Pagamento</h1>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Adicionar Gateway
        </button>
      </div>

      {/* Empty State */}
      {gateways.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <Shield className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum gateway configurado</h3>
          <p className="text-gray-500 text-center max-w-sm mb-6">
            Configure um gateway de pagamento para processar pagamentos via PIX.
          </p>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Configurar Gateway
          </button>
        </div>
      ) : (
        /* Gateway Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gateways.map((gateway) => (
            <div
              key={gateway.id}
              className={`relative bg-white rounded-lg border-2 p-4 transition-all ${
                gateway.isActive
                  ? 'border-orange-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Status Badge */}
              {gateway.isActive && (
                <div className="absolute -top-2 -right-2">
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    ATIVO
                  </span>
                </div>
              )}

              {/* Card Header */}
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{gateway.name}</h3>
                  {gateway.name?.toLowerCase().includes('drop') && (
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                      DropPay
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <ExternalLink className="w-3 h-3" />
                  {formatUrl(gateway.apiUrl)}
                </div>
              </div>

              {/* Caixa para trocar ou remover a chave privada */}
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-orange-500" />
                    Chave Privada / Token
                  </span>
                  {gateway.hasPrivateKey ? (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-emerald-600" /> Ativa no Servidor
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      Sem chave
                    </span>
                  )}
                </div>

                {/* Status protegido (Nunca exibe a chave no frontend) */}
                <div className="px-2.5 py-1.5 bg-white rounded border border-gray-200 text-gray-500 font-mono text-[11px] flex items-center justify-between">
                  <span>
                    {gateway.hasPrivateKey ? '••••••••••••••••••••••••••••••••' : 'Nenhuma chave cadastrada'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-sans">Protegida no backend</span>
                </div>

                {/* Input para trocar a chave */}
                <div>
                  <div className="relative">
                    <input
                      type={showKeyInput[gateway.id] ? 'text' : 'password'}
                      value={newKeys[gateway.id] || ''}
                      onChange={(e) => handleKeyInputChange(gateway.id, e.target.value)}
                      placeholder="Colar nova chave privada..."
                      className="w-full px-2.5 py-1.5 pr-8 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(gateway.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title={showKeyInput[gateway.id] ? 'Ocultar' : 'Exibir'}
                    >
                      {showKeyInput[gateway.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Ações: Salvar / Trocar e Remover */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => handleUpdateKey(gateway.id, gateway.name)}
                    disabled={isSavingKey[gateway.id] || !newKeys[gateway.id]?.trim()}
                    className="flex-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded font-medium text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSavingKey[gateway.id] ? 'Salvando...' : 'Trocar Chave'}
                  </button>

                  {gateway.hasPrivateKey && (
                    <button
                      onClick={() => handleRemoveKey(gateway)}
                      disabled={isSavingKey[gateway.id]}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded font-medium text-xs transition-colors flex items-center justify-center gap-1"
                      title="Remover chave privada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(gateway)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>

                {gateway.isActive ? (
                  <button
                    onClick={() => setConfirmModal({ isOpen: true, type: 'deactivate', gateway })}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <PowerOff className="w-4 h-4" />
                    Desativar
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmModal({ isOpen: true, type: 'activate', gateway })}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Power className="w-4 h-4" />
                    Usar
                  </button>
                )}

                <button
                  onClick={() => setConfirmModal({ isOpen: true, type: 'delete', gateway })}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
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
