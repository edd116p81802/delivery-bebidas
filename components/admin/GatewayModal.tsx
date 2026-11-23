'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { GATEWAY_PRESETS, GatewayPreset } from '@/lib/gateway-presets';

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
  productName: 'produto x10',
  endpoint: '/cash-in',
  authHeaderName: 'X-Client-Id',
  authHeaderPrefix: '',
  publicKey: '',
  privateKey: '',
  valueFormat: 'reais',
  responseQrCodePath: 'transaction.qr_code_base64',
  responsePixCodePath: 'transaction.qr_code',
  responseTransactionId: 'transaction.id',
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
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [removePrivateKey, setRemovePrivateKey] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    auth: true,
    response: false,
    payload: false,
  });
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Testing state inside modal
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    pixCode?: string;
    details?: any;
  } | null>(null);

  const isEditing = !!gateway?.id;

  const currentPreset = GATEWAY_PRESETS.find((p) => p.id === selectedPresetId);

  useEffect(() => {
    if (gateway) {
      setForm({
        ...defaultGateway,
        ...gateway,
        privateKey: '', // Do not reveal in edit
        publicKey: gateway.publicKey || '',
      });
      // Try to find matching preset
      const match = GATEWAY_PRESETS.find(
        (p) =>
          gateway.name?.toLowerCase().includes(p.id) ||
          gateway.apiUrl?.toLowerCase().includes(p.id)
      );
      if (match) setSelectedPresetId(match.id);
      else setSelectedPresetId('');
    } else {
      setForm(defaultGateway);
      setSelectedPresetId('skalapay');
      applyPreset('skalapay');
    }
    setShowPrivateKey(false);
    setRemovePrivateKey(false);
    setJsonError(null);
    setTestResult(null);
  }, [gateway, isOpen]);

  const applyPreset = (presetId: string) => {
    const preset = GATEWAY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setForm((prev) => ({
      ...prev,
      name: isEditing && prev.name ? prev.name : preset.name,
      apiUrl: preset.apiUrl,
      endpoint: preset.endpoint,
      productName: preset.productName,
      authHeaderName: preset.authHeaderName,
      authHeaderPrefix: preset.authHeaderPrefix,
      valueFormat: preset.valueFormat,
      responseQrCodePath: preset.responseQrCodePath,
      responsePixCodePath: preset.responsePixCodePath,
      responseTransactionId: preset.responseTransactionId,
      payloadTemplate: preset.payloadTemplate,
    }));
    setTestResult(null);
    toast.success(`Modelo "${preset.name}" aplicado! Preencha as credenciais.`);
  };

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

  const handleTestConnection = async () => {
    if (!form.apiUrl?.trim()) {
      toast.error('Informe a URL da API para testar');
      return;
    }
    if (!isEditing && !form.privateKey?.trim()) {
      toast.error('Informe a Chave Privada / Secret para testar');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      let res: Response;
      if (isEditing && !form.privateKey) {
        // Test existing gateway in DB
        res = await fetch(`/api/admin/gateway/${gateway?.id}/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: currentPreset?.minAmount || 25.0 }),
        });
      } else {
        // Test arbitrary unsaved configuration
        res = await fetch('/api/admin/gateway/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            amount: currentPreset?.minAmount || 25.0,
          }),
        });
      }

      const data = await res.json();

      if (data.success && data.qrCode) {
        setTestResult({
          success: true,
          message: 'Conexão e geração de PIX validadas com sucesso!',
          pixCode: data.qrCode,
        });
        toast.success('Gateway testado com sucesso! PIX gerado.');
      } else {
        const errorMsg = data.error || data.message || 'Falha ao conectar com o gateway';
        setTestResult({
          success: false,
          message: errorMsg,
          details: data.details || data.rawResponse,
        });
        toast.error(`Erro no teste: ${errorMsg}`);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro de comunicação ao testar',
      });
      toast.error('Erro ao testar conexão.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError) {
      toast.error('Corrija o erro no template JSON antes de salvar');
      return;
    }
    await onSave({
      ...form,
      privateKey: removePrivateKey ? '__REMOVE__' : form.privateKey,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEditing ? `Editar Gateway: ${gateway?.name}` : 'Configurar Novo Gateway de Pagamento'}
            </h2>
            <p className="text-xs text-gray-500">
              Adicione e configure qualquer adquirente ou gateway PIX facilmente.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Preset Selector */}
          <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-orange-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-orange-600" />
                Modelos Pré-Configurados (Presets Rápidos)
              </label>
              <span className="text-[11px] text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-full font-medium">
                Preenche tudo automaticamente
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GATEWAY_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`px-3 py-2 text-left rounded-lg text-xs font-semibold border transition-all ${
                    selectedPresetId === preset.id
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                  }`}
                >
                  <div className="truncate">{preset.name}</div>
                  {preset.badge && (
                    <span
                      className={`text-[9px] px-1 rounded ${
                        selectedPresetId === preset.id
                          ? 'bg-orange-700 text-orange-100'
                          : 'bg-green-100 text-green-700 font-bold'
                      }`}
                    >
                      {preset.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {currentPreset?.notes && (
              <div className="flex items-start gap-2 pt-1 text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded border border-amber-200/80">
                <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{currentPreset.notes}</span>
              </div>
            )}
          </div>

          {/* Test Box Result if tested */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  {testResult.success ? 'Teste Aprovado!' : 'Falha no Teste'}
                </span>
                <button
                  type="button"
                  onClick={() => setTestResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] leading-relaxed">{testResult.message}</p>
              {testResult.pixCode && (
                <div className="mt-1 p-2 bg-white rounded border border-emerald-200 font-mono text-[10px] break-all flex items-center justify-between gap-2">
                  <span className="truncate">{testResult.pixCode}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(testResult.pixCode!);
                      toast.success('Código PIX copiado!');
                    }}
                    className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
                    title="Copiar código PIX"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Seção 1: Informações Básicas */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('basic')}
              className="w-full flex items-center justify-between p-3.5 bg-gray-50/80 hover:bg-gray-100 transition-colors"
            >
              <span className="font-semibold text-gray-800 text-sm">1. Informações Básicas da API</span>
              {expandedSections.basic ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.basic && (
              <div className="p-4 space-y-3.5 bg-white">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nome de Identificação <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ex: SkalaPay, Pix Black, Asaas, Mercado Pago"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    URL Base da API <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.apiUrl}
                    onChange={(e) => handleChange('apiUrl', e.target.value)}
                    placeholder="Ex: https://skalapay.net/api"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-xs"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Endpoint de Cobrança PIX
                    </label>
                    <input
                      type="text"
                      value={form.endpoint}
                      onChange={(e) => handleChange('endpoint', e.target.value)}
                      placeholder="/cash-in ou /charges"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nome do Produto / Descrição
                    </label>
                    <input
                      type="text"
                      value={form.productName}
                      onChange={(e) => handleChange('productName', e.target.value)}
                      placeholder="Ex: produto x10 ou Bebidas Delivery"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seção 2: Autenticação & Chaves */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('auth')}
              className="w-full flex items-center justify-between p-3.5 bg-gray-50/80 hover:bg-gray-100 transition-colors"
            >
              <span className="font-semibold text-gray-800 text-sm">2. Autenticação & Credenciais</span>
              {expandedSections.auth ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.auth && (
              <div className="p-4 space-y-3.5 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Header de Autenticação
                    </label>
                    <input
                      type="text"
                      value={form.authHeaderName}
                      onChange={(e) => handleChange('authHeaderName', e.target.value)}
                      placeholder="Ex: Authorization, X-Client-Id, X-API-Key"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Prefixo do Header
                    </label>
                    <input
                      type="text"
                      value={form.authHeaderPrefix}
                      onChange={(e) => handleChange('authHeaderPrefix', e.target.value)}
                      placeholder="Ex: Bearer (ou deixe vazio)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {currentPreset?.publicKeyLabel || 'Client ID / Chave Pública'}
                  </label>
                  <input
                    type="text"
                    value={form.publicKey}
                    onChange={(e) => handleChange('publicKey', e.target.value)}
                    placeholder={currentPreset?.publicKeyPlaceholder || 'Cole o Client ID aqui se o gateway exigir'}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-xs"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Usado em gateways que exigem Client ID + Secret (como SkalaPay, SuitPay, DropPay).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      {currentPreset?.privateKeyLabel || 'Client Secret / Chave Privada / Token'}{' '}
                      {!isEditing && <span className="text-red-500">*</span>}
                    </label>
                    {isEditing && gateway?.hasPrivateKey && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Configurada no servidor
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
                      placeholder={
                        isEditing
                          ? removePrivateKey
                            ? 'Chave será removida ao salvar'
                            : '(Deixe em branco para manter a chave atual)'
                          : currentPreset?.privateKeyPlaceholder || 'Cole aqui a chave secreta ou token'
                      }
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-xs ${
                        removePrivateKey ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-300'
                      }`}
                      required={!isEditing && !removePrivateKey}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                        className={`font-medium ${
                          removePrivateKey ? 'text-gray-600 hover:underline' : 'text-red-600 hover:text-red-700'
                        }`}
                      >
                        {removePrivateKey ? 'Cancelar remoção' : 'Remover chave privada'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Seção 3: Resposta & Extração de PIX */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('response')}
              className="w-full flex items-center justify-between p-3.5 bg-gray-50/80 hover:bg-gray-100 transition-colors"
            >
              <span className="font-semibold text-gray-800 text-sm">3. Formato de Valor & Extração do PIX</span>
              {expandedSections.response ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.response && (
              <div className="p-4 space-y-3.5 bg-white">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Formato do Valor Enviado à API
                  </label>
                  <select
                    value={form.valueFormat}
                    onChange={(e) => handleChange('valueFormat', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="reais">Reais (Ex: 25.00 ou 10.50)</option>
                    <option value="centavos">Centavos (Ex: 2500 para R$ 25,00)</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Caminho do Código PIX (Copia e Cola)
                    </label>
                    <input
                      type="text"
                      value={form.responsePixCodePath}
                      onChange={(e) => handleChange('responsePixCodePath', e.target.value)}
                      placeholder="transaction.qr_code ou pix.copy_paste"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Caminho do QR Code Base64
                    </label>
                    <input
                      type="text"
                      value={form.responseQrCodePath}
                      onChange={(e) => handleChange('responseQrCodePath', e.target.value)}
                      placeholder="transaction.qr_code_base64"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Caminho do ID da Transação
                  </label>
                  <input
                    type="text"
                    value={form.responseTransactionId}
                    onChange={(e) => handleChange('responseTransactionId', e.target.value)}
                    placeholder="transaction.id ou id"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono text-xs"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Dica: Nosso sistema possui scanner automático inteligente de código PIX (000201...). Se não tiver certeza dos caminhos, o sistema auto-detecta!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Seção 4: Template de Payload (Avançado) */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('payload')}
              className="w-full flex items-center justify-between p-3.5 bg-gray-50/80 hover:bg-gray-100 transition-colors"
            >
              <span className="font-semibold text-gray-800 text-sm">4. Template JSON de Envio (Opcional / Avançado)</span>
              {expandedSections.payload ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.payload && (
              <div className="p-4 space-y-2 bg-white">
                <p className="text-xs text-gray-500">
                  Variáveis suportadas:
                </p>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {[
                    '{{total_reais_number}}',
                    '{{total_cents}}',
                    '{{customer_name}}',
                    '{{customer_cpf}}',
                    '{{customer_email}}',
                    '{{customer_phone}}',
                    '{{order_id}}',
                    '{{product_name}}',
                    '{{site_url}}',
                  ].map((tag) => (
                    <span
                      key={tag}
                      onClick={() => {
                        navigator.clipboard.writeText(tag);
                        toast.success(`Copiado: ${tag}`);
                      }}
                      className="cursor-pointer px-2 py-0.5 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 text-[11px] font-mono rounded border transition-colors"
                      title="Clique para copiar"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <textarea
                  value={form.payloadTemplate}
                  onChange={(e) => handleChange('payloadTemplate', e.target.value)}
                  placeholder="Se deixar em branco, o sistema usará o payload otimizado padrão do modelo escolhido."
                  rows={7}
                  className={`w-full px-3 py-2 border rounded-lg font-mono text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    jsonError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {jsonError && <p className="text-xs text-red-500">{jsonError}</p>}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 px-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || isLoading}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                Testando Conexão...
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
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !!jsonError}
              className="px-5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Gateway'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
