'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface Gateway {
  id?: string;
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
  hasPrivateKey?: boolean;
}

interface GatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Gateway) => Promise<void>;
  gateway?: Gateway | null;
  isLoading?: boolean;
}

const defaultGateway: Gateway = {
  name: '',
  apiUrl: '',
  productName: 'Bebida',
  endpoint: '/sales/create-sale',
  authHeaderName: 'X-API-Key',
  authHeaderPrefix: '',
  publicKey: '',
  privateKey: '',
  valueFormat: 'centavos',
  responseQrCodePath: 'data.paymentData.qrCodeBase64',
  responsePixCodePath: 'data.paymentData.copyPaste',
  responseTransactionId: 'data.transactionId',
  payloadTemplate: '',
};

export default function GatewayModal({
  isOpen,
  onClose,
  onSave,
  gateway,
  isLoading = false,
}: GatewayModalProps) {
  const [form, setForm] = useState<Gateway>(defaultGateway);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [removePrivateKey, setRemovePrivateKey] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    auth: true,
    response: false,
    payload: false,
  });
  const [jsonError, setJsonError] = useState<string | null>(null);

  const isEditing = !!gateway?.id;

  useEffect(() => {
    if (gateway) {
      setForm({
        ...defaultGateway,
        ...gateway,
        privateKey: '', // Não preencher a chave privada na edição
        publicKey: '', // Não preencher a chave pública na edição
      });
    } else {
      setForm(defaultGateway);
    }
    setShowPrivateKey(false);
    setRemovePrivateKey(false);
    setJsonError(null);
  }, [gateway, isOpen]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChange = (field: keyof Gateway, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === 'payloadTemplate' && value.trim()) {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch {
        setJsonError('JSON inválido');
      }
    } else if (field === 'payloadTemplate') {
      setJsonError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError) return;
    await onSave({
      ...form,
      privateKey: removePrivateKey ? '__REMOVE__' : form.privateKey,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar Gateway' : 'Novo Gateway'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Seção 1: Informações Básicas */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('basic')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-700">Informações Básicas</span>
              {expandedSections.basic ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.basic && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Gateway <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ex: Asaas, Mercado Pago, Pagar.me"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL da API <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.apiUrl}
                    onChange={(e) => handleChange('apiUrl', e.target.value)}
                    placeholder="Ex: https://api.asaas.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endpoint
                    </label>
                    <input
                      type="text"
                      value={form.endpoint}
                      onChange={(e) => handleChange('endpoint', e.target.value)}
                      placeholder="/sales/create-sale"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Produto
                    </label>
                    <input
                      type="text"
                      value={form.productName}
                      onChange={(e) => handleChange('productName', e.target.value)}
                      placeholder="Bebida"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seção 2: Autenticação */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('auth')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-700">Autenticação</span>
              {expandedSections.auth ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.auth && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Header
                    </label>
                    <input
                      type="text"
                      value={form.authHeaderName}
                      onChange={(e) => handleChange('authHeaderName', e.target.value)}
                      placeholder="X-API-Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prefixo do Header
                    </label>
                    <input
                      type="text"
                      value={form.authHeaderPrefix}
                      onChange={(e) => handleChange('authHeaderPrefix', e.target.value)}
                      placeholder="Bearer "
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chave Pública
                  </label>
                  <input
                    type="text"
                    value={form.publicKey}
                    onChange={(e) => handleChange('publicKey', e.target.value)}
                    placeholder={isEditing ? '(deixe em branco para manter)' : 'pk_...'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Chave Privada {!isEditing && <span className="text-red-500">*</span>}
                    </label>
                    {isEditing && gateway?.hasPrivateKey && (
                      <span className="text-xs text-green-600 font-medium">
                        ✓ Configurada no servidor
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPrivateKey ? 'text' : 'password'}
                      value={form.privateKey}
                      onChange={(e) => {
                        setRemovePrivateKey(false);
                        handleChange('privateKey', e.target.value);
                      }}
                      placeholder={isEditing ? (removePrivateKey ? 'Chave será removida ao salvar' : '(deixe em branco para manter)') : 'sk_...'}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${removePrivateKey ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-300'}`}
                      required={!isEditing && !removePrivateKey}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {isEditing && gateway?.hasPrivateKey && (
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      {removePrivateKey ? (
                        <span className="text-red-600 font-medium">Chave atual será removida ao salvar</span>
                      ) : (
                        <span className="text-gray-500">Chave protegida no servidor</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setRemovePrivateKey(!removePrivateKey);
                          if (!removePrivateKey) {
                            handleChange('privateKey', '');
                          }
                        }}
                        className={`font-medium ${removePrivateKey ? 'text-gray-600 hover:underline' : 'text-red-600 hover:text-red-700'}`}
                      >
                        {removePrivateKey ? 'Cancelar remoção' : 'Remover chave privada'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Seção 3: Configuração de Resposta */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('response')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-700">Configuração de Resposta</span>
              {expandedSections.response ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.response && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formato do Valor
                  </label>
                  <select
                    value={form.valueFormat}
                    onChange={(e) => handleChange('valueFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="centavos">Centavos (1000 = R$ 10,00)</option>
                    <option value="reais">Reais (10.00 = R$ 10,00)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caminho do QR Code
                  </label>
                  <input
                    type="text"
                    value={form.responseQrCodePath}
                    onChange={(e) => handleChange('responseQrCodePath', e.target.value)}
                    placeholder="data.paymentData.qrCodeBase64"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caminho do Código PIX
                  </label>
                  <input
                    type="text"
                    value={form.responsePixCodePath}
                    onChange={(e) => handleChange('responsePixCodePath', e.target.value)}
                    placeholder="data.paymentData.copyPaste"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caminho do ID da Transação
                  </label>
                  <input
                    type="text"
                    value={form.responseTransactionId}
                    onChange={(e) => handleChange('responseTransactionId', e.target.value)}
                    placeholder="data.transactionId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Seção 4: Template de Payload */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('payload')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-700">Template de Payload (Avançado)</span>
              {expandedSections.payload ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.payload && (
              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-500">
                  Use placeholders: {`{{total_cents}}`}, {`{{total_reais}}`}, {`{{customer_name}}`}, {`{{customer_cpf}}`}, {`{{customer_email}}`}, {`{{customer_phone}}`}, {`{{order_id}}`}, {`{{product_name}}`}
                </p>
                <textarea
                  value={form.payloadTemplate}
                  onChange={(e) => handleChange('payloadTemplate', e.target.value)}
                  placeholder='{\n  "amount": {{total_cents}},\n  "customer": {\n    "name": {{customer_name}}\n  }\n}'
                  rows={8}
                  className={`w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    jsonError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {jsonError && <p className="text-xs text-red-500">{jsonError}</p>}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !!jsonError}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
