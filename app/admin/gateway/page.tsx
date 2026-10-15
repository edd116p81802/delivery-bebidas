'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Power, PowerOff, Shield, ExternalLink, CheckCircle } from 'lucide-react';
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

  const handleSaveGateway = async (data: Omit<Gateway, 'id' | 'isActive' | 'hasPublicKey' | 'hasPrivateKey' | 'createdAt'>) => {
    setIsSaving(true);
    try {
      if (editingGateway?.id) {
        // Editar gateway existente
        const updateData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          // Só enviar campos que foram preenchidos
          if (value !== '' && value !== undefined) {
            updateData[key] = value;
          }
        });

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
                <h3 className="text-lg font-semibold text-gray-900">{gateway.name}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <ExternalLink className="w-3 h-3" />
                  {formatUrl(gateway.apiUrl)}
                </div>
              </div>

              {/* Card Info */}
              <div className="space-y-1 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${gateway.hasPrivateKey ? 'bg-green-500' : 'bg-red-500'}`} />
                  Chave Privada {gateway.hasPrivateKey ? 'configurada' : 'não configurada'}
                </div>
                {gateway.endpoint && (
                  <div className="text-gray-400 text-xs truncate">
                    Endpoint: {gateway.endpoint}
                  </div>
                )}
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
