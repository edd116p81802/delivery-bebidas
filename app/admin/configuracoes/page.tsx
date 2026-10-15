'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Image, CheckCircle, Key, Save, Trash2, AlertCircle, 
  Cloud, Brain, Loader2, Settings, Zap, Radio, Pause, Play, Plus, Tag, Pencil
} from 'lucide-react';

interface ApiConfigItem {
  value: string;
  masked: string;
  configured: boolean;
}

interface ApiConfigs {
  CLOUDINARY_CLOUD_NAME?: ApiConfigItem;
  CLOUDINARY_API_KEY?: ApiConfigItem;
  CLOUDINARY_API_SECRET?: ApiConfigItem;
  OPENAI_API_KEY?: ApiConfigItem;
  STORAGE_PROVIDER?: ApiConfigItem;
  LLM_PROVIDER?: ApiConfigItem;
}

interface GoogleAdsTag {
  id: string;
  name: string;
  awId: string;
  conversionLabel: string;
  isActive: boolean;
  order: number;
}

export default function SettingsPage() {
  const [geoMode, setGeoMode] = useState('DISABLED');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // API Configs
  const [apiConfigs, setApiConfigs] = useState<ApiConfigs>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Provedores ativos
  const [storageProvider, setStorageProvider] = useState<'abacus' | 'cloudinary'>('abacus');
  const [llmProvider, setLlmProvider] = useState<'abacus' | 'openai'>('abacus');

  // Google Ads Tags
  const [adsTags, setAdsTags] = useState<GoogleAdsTag[]>([]);
  const [adsLoading, setAdsLoading] = useState<string | null>(null);
  const [newTagAwId, setNewTagAwId] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [editingTagName, setEditingTagName] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [editingConvLabel, setEditingConvLabel] = useState<string | null>(null);
  const [editingConvLabelValue, setEditingConvLabelValue] = useState('');

  useEffect(() => {
    loadConfigs();
    loadAdsTags();
  }, []);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      // Carregar configurações gerais
      const settingsRes = await fetch('/api/admin/settings');
      const settings = await settingsRes.json();
      setGeoMode(settings.geolocationMode || 'DISABLED');

      // Carregar configs de API
      const apiRes = await fetch('/api/admin/api-config');
      const apiData = await apiRes.json();
      setApiConfigs(apiData);
      
      // Carregar preferências de provedor
      if (apiData.STORAGE_PROVIDER?.configured) {
        setStorageProvider((apiData.STORAGE_PROVIDER.value || apiData.STORAGE_PROVIDER.masked || 'abacus') as 'abacus' | 'cloudinary');
      }
      if (apiData.LLM_PROVIDER?.configured) {
        setLlmProvider((apiData.LLM_PROVIDER.value || apiData.LLM_PROVIDER.masked || 'abacus') as 'abacus' | 'openai');
      }
      
      // Inicializar valores de edição
      const editInit: Record<string, string> = {};
      Object.keys(apiData).forEach(key => {
        editInit[key] = '';
      });
      setEditValues(editInit);
    } catch (e) {
      console.error('Erro ao carregar configs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeo = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geolocationMode: geoMode })
      });
      toast.success('Configurações salvas!');
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveApiKey = async (key: string, value?: string) => {
    const val = value ?? editValues[key];
    if (!val?.trim()) {
      toast.error('Digite um valor');
      return;
    }

    setSavingKey(key);
    try {
      const res = await fetch('/api/admin/api-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: val.trim() })
      });

      if (res.ok) {
        toast.success('Configuração salva!');
        setEditValues(prev => ({ ...prev, [key]: '' }));
        loadConfigs();
      } else {
        toast.error('Erro ao salvar');
      }
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteApiKey = async (key: string) => {
    if (!confirm(`Tem certeza que deseja remover ${key}?`)) return;

    setSavingKey(key);
    try {
      const res = await fetch(`/api/admin/api-config?key=${key}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Configuração removida!');
        loadConfigs();
      } else {
        toast.error('Erro ao remover');
      }
    } catch (e) {
      toast.error('Erro ao remover');
    } finally {
      setSavingKey(null);
    }
  };

  const handleProviderChange = async (type: 'storage' | 'llm', provider: string) => {
    const key = type === 'storage' ? 'STORAGE_PROVIDER' : 'LLM_PROVIDER';
    
    if (type === 'storage') {
      setStorageProvider(provider as 'abacus' | 'cloudinary');
    } else {
      setLlmProvider(provider as 'abacus' | 'openai');
    }
    
    await handleSaveApiKey(key, provider);
  };

  // ========== Google Ads Tags ==========
  const loadAdsTags = async () => {
    try {
      const res = await fetch('/api/admin/google-ads-tags');
      if (res.ok) {
        const data = await res.json();
        setAdsTags(data);
      }
    } catch (e) {
      console.error('Erro ao carregar tags:', e);
    }
  };

  const handleAddTag = async () => {
    if (!newTagAwId.trim()) {
      toast.error('Digite o ID AW-');
      return;
    }
    if (adsTags.length >= 3) {
      toast.error('Limite máximo de 3 tags atingido');
      return;
    }
    setAdsLoading('add');
    try {
      const res = await fetch('/api/admin/google-ads-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awId: newTagAwId.trim(), name: newTagName.trim() }),
      });
      if (res.ok) {
        toast.success('Tag adicionada!');
        setNewTagAwId('');
        setNewTagName('');
        loadAdsTags();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao adicionar');
      }
    } catch (e) {
      toast.error('Erro ao adicionar tag');
    } finally {
      setAdsLoading(null);
    }
  };

  const handleToggleTag = async (tag: GoogleAdsTag) => {
    setAdsLoading(tag.id);
    try {
      await fetch(`/api/admin/google-ads-tags/${tag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tag.isActive }),
      });
      toast.success(tag.isActive ? 'Tag pausada' : 'Tag ativada');
      loadAdsTags();
    } catch (e) {
      toast.error('Erro ao alterar status');
    } finally {
      setAdsLoading(null);
    }
  };

  const handleDeleteTag = async (tag: GoogleAdsTag) => {
    if (!confirm(`Tem certeza que deseja excluir a tag "${tag.name || 'AW-' + tag.awId}"?`)) return;
    setAdsLoading(tag.id);
    try {
      await fetch(`/api/admin/google-ads-tags/${tag.id}`, { method: 'DELETE' });
      toast.success('Tag removida');
      loadAdsTags();
    } catch (e) {
      toast.error('Erro ao remover');
    } finally {
      setAdsLoading(null);
    }
  };

  const handleSaveTagName = async (tag: GoogleAdsTag) => {
    setAdsLoading(tag.id);
    try {
      await fetch(`/api/admin/google-ads-tags/${tag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingNameValue }),
      });
      toast.success('Nome atualizado');
      setEditingTagName(null);
      loadAdsTags();
    } catch (e) {
      toast.error('Erro ao salvar nome');
    } finally {
      setAdsLoading(null);
    }
  };

  const handleSaveConvLabel = async (tag: GoogleAdsTag) => {
    setAdsLoading(tag.id);
    try {
      await fetch(`/api/admin/google-ads-tags/${tag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversionLabel: editingConvLabelValue }),
      });
      toast.success('Label de conversão atualizado');
      setEditingConvLabel(null);
      loadAdsTags();
    } catch (e) {
      toast.error('Erro ao salvar label');
    } finally {
      setAdsLoading(null);
    }
  };

  const renderApiKeyField = (key: string, label: string, placeholder: string) => {
    const config = apiConfigs[key as keyof ApiConfigs];
    const isConfigured = config?.configured;
    const isSavingThis = savingKey === key;

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        
        {isConfigured ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 font-mono text-sm flex items-center justify-between">
              <span>{config.masked}</span>
            </div>
            <button
              onClick={() => handleDeleteApiKey(key)}
              disabled={isSavingThis}
              className="p-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSavingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder={placeholder}
              value={editValues[key] || ''}
              onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <button
              onClick={() => handleSaveApiKey(key)}
              disabled={isSavingThis || !editValues[key]?.trim()}
              className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    );
  };

  const cloudinaryConfigured = 
    apiConfigs.CLOUDINARY_CLOUD_NAME?.configured && 
    apiConfigs.CLOUDINARY_API_KEY?.configured && 
    apiConfigs.CLOUDINARY_API_SECRET?.configured;

  const openaiConfigured = apiConfigs.OPENAI_API_KEY?.configured;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Settings className="w-8 h-8 text-amber-500" />
        Configurações
      </h1>
      
      {/* Geolocalização */}
      <div className="bg-white rounded-2xl shadow-md p-6 max-w-2xl space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          🌍 Geolocalização
        </h2>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Modo de Geolocalização</label>
          <select 
            value={geoMode} 
            onChange={e => setGeoMode(e.target.value)} 
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-amber-500"
          >
            <option value="DISABLED">Desabilitado</option>
            <option value="PASSIVE">Passivo (só GeoIP, sem modal)</option>
            <option value="HYBRID">Híbrido (modal só no 4G)</option>
            <option value="GEOIP_MODAL">GeoIP + Modal (sempre pede confirmação)</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            • <strong>Passivo:</strong> Detecta localização automaticamente, sem interação<br/>
            • <strong>Híbrido:</strong> Modal de confirmação APENAS quando no 4G/rede móvel<br/>
            • <strong>GeoIP + Modal:</strong> Sempre pede confirmação (Wi-Fi e 4G)
          </p>
        </div>
        <button 
          onClick={handleSaveGeo} 
          disabled={isSaving}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {isSaving ? 'Salvando...' : 'Salvar Geolocalização'}
        </button>
      </div>

      {/* ========== GOOGLE ADS TAGS ========== */}
      <div className="bg-white rounded-2xl shadow-md p-6 max-w-2xl space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-500" />
          Google Ads — Tags de Conversão
        </h2>
        <p className="text-sm text-gray-500">
          Adicione até 3 tags AW- do Google Ads para medir conversões. Apenas as tags ativas serão carregadas no site.
        </p>

        {/* Tags existentes */}
        <div className="space-y-3">
          {adsTags.map((tag) => (
            <div
              key={tag.id}
              className={`border-2 rounded-xl p-4 transition-all ${
                tag.isActive ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Tag Name */}
                <div className="flex-1 min-w-0">
                  {editingTagName === tag.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTagName(tag)}
                        placeholder="Nome da conta"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveTagName(tag)}
                        className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingTagName(null)}
                        className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-800 truncate">
                        {tag.name || '(Sem nome)'}
                      </span>
                      <button
                        onClick={() => { setEditingTagName(tag.id); setEditingNameValue(tag.name); }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Editar nome"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs font-mono text-gray-500">AW-{tag.awId}</span>
                    {tag.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Pausada
                      </span>
                    )}
                  </div>
                  {/* Conversion Label */}
                  <div className="mt-2">
                    {editingConvLabel === tag.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingConvLabelValue}
                          onChange={(e) => setEditingConvLabelValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveConvLabel(tag)}
                          placeholder="Ex: AbCdEfGh_12345"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveConvLabel(tag)}
                          className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingConvLabel(null)}
                          className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Label:</span>
                        <span className="text-xs font-mono text-gray-600">
                          {tag.conversionLabel || '(não configurado)'}
                        </span>
                        <button
                          onClick={() => { setEditingConvLabel(tag.id); setEditingConvLabelValue(tag.conversionLabel || ''); }}
                          className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Editar label de conversão"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleTag(tag)}
                    disabled={adsLoading === tag.id}
                    title={tag.isActive ? 'Pausar tag' : 'Ativar tag'}
                    className={`p-2.5 rounded-xl transition-colors disabled:opacity-50 ${
                      tag.isActive
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                    }`}
                  >
                    {adsLoading === tag.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : tag.isActive ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    disabled={adsLoading === tag.id}
                    title="Excluir tag"
                    className="p-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {adsLoading === tag.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {adsTags.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Nenhuma tag configurada
            </div>
          )}
        </div>

        {/* Add new tag */}
        {adsTags.length < 3 && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-600">Adicionar Nova Tag</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nome da conta (ex: Conta Principal)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center flex-1 border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <span className="px-3 py-3 bg-gray-100 text-gray-500 text-sm font-mono border-r">AW-</span>
                <input
                  type="text"
                  placeholder="18014731112"
                  value={newTagAwId}
                  onChange={(e) => setNewTagAwId(e.target.value.replace(/[^0-9]/g, ''))}
                  className="flex-1 px-3 py-3 outline-none text-sm font-mono"
                />
              </div>
              <button
                onClick={handleAddTag}
                disabled={adsLoading === 'add' || !newTagAwId.trim()}
                className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold"
              >
                {adsLoading === 'add' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Adicionar
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">💡 Como funciona:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Cole apenas os números após <span className="font-mono">AW-</span> (ex: 18014731112)</li>
            <li>Dê um nome para identificar a conta (ex: &quot;Conta João&quot;, &quot;Conta Maria&quot;)</li>
            <li>Configure o <strong>Label de conversão</strong> de cada tag (encontre no Google Ads → Conversões → Snippet de evento)</li>
            <li>O evento de conversão é disparado automaticamente na página de pagamento PIX com o ID da transação e valor</li>
            <li>Use o botão <Pause className="w-3 h-3 inline" /> para pausar sem excluir</li>
            <li>Tags pausadas não são carregadas no site</li>
          </ul>
        </div>
      </div>

      {/* ========== STORAGE / UPLOAD DE IMAGENS ========== */}
      <div className="bg-white rounded-2xl shadow-md p-6 max-w-2xl space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Image className="w-5 h-5 text-blue-500" />
          Upload de Imagens
        </h2>
        
        {/* Seletor de Provedor */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Provedor Ativo:</label>
          <div className="flex gap-3">
            <button
              onClick={() => handleProviderChange('storage', 'abacus')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                storageProvider === 'abacus' 
                  ? 'border-amber-500 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Radio className={`w-5 h-5 ${storageProvider === 'abacus' ? 'text-amber-500' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-semibold">Abacus S3</p>
                  <p className="text-xs text-gray-500">Integrado • Gratuito</p>
                </div>
                {storageProvider === 'abacus' && (
                  <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                )}
              </div>
            </button>
            
            <button
              onClick={() => cloudinaryConfigured && handleProviderChange('storage', 'cloudinary')}
              disabled={!cloudinaryConfigured}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                storageProvider === 'cloudinary' 
                  ? 'border-blue-500 bg-blue-50' 
                  : cloudinaryConfigured 
                    ? 'border-gray-200 hover:border-gray-300' 
                    : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <Cloud className={`w-5 h-5 ${storageProvider === 'cloudinary' ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-semibold">Cloudinary</p>
                  <p className="text-xs text-gray-500">
                    {cloudinaryConfigured ? 'Configurado' : 'Não configurado'}
                  </p>
                </div>
                {storageProvider === 'cloudinary' && (
                  <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Cloudinary Config */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Configuração Cloudinary
          </h3>
          {renderApiKeyField('CLOUDINARY_CLOUD_NAME', 'Cloud Name', 'seu-cloud-name')}
          {renderApiKeyField('CLOUDINARY_API_KEY', 'API Key', 'sua-api-key')}
          {renderApiKeyField('CLOUDINARY_API_SECRET', 'API Secret', 'seu-api-secret')}
          
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Como obter:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse <a href="https://cloudinary.com" target="_blank" className="text-blue-600 hover:underline">cloudinary.com</a> e crie uma conta gratuita</li>
              <li>No Dashboard, copie Cloud Name, API Key e API Secret</li>
              <li>Cole os valores acima e selecione Cloudinary como provedor</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ========== LLM / OCR ========== */}
      <div className="bg-white rounded-2xl shadow-md p-6 max-w-2xl space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          OCR / Inteligência Artificial
        </h2>
        
        {/* Seletor de Provedor */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Provedor Ativo:</label>
          <div className="flex gap-3">
            <button
              onClick={() => handleProviderChange('llm', 'abacus')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                llmProvider === 'abacus' 
                  ? 'border-amber-500 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap className={`w-5 h-5 ${llmProvider === 'abacus' ? 'text-amber-500' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-semibold">Abacus AI</p>
                  <p className="text-xs text-gray-500">Integrado • Gratuito</p>
                </div>
                {llmProvider === 'abacus' && (
                  <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                )}
              </div>
            </button>
            
            <button
              onClick={() => openaiConfigured && handleProviderChange('llm', 'openai')}
              disabled={!openaiConfigured}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                llmProvider === 'openai' 
                  ? 'border-purple-500 bg-purple-50' 
                  : openaiConfigured 
                    ? 'border-gray-200 hover:border-gray-300' 
                    : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <Brain className={`w-5 h-5 ${llmProvider === 'openai' ? 'text-purple-500' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-semibold">OpenAI</p>
                  <p className="text-xs text-gray-500">
                    {openaiConfigured ? 'Configurado' : 'Não configurado'}
                  </p>
                </div>
                {llmProvider === 'openai' && (
                  <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* OpenAI Config */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Configuração OpenAI
          </h3>
          {renderApiKeyField('OPENAI_API_KEY', 'OpenAI API Key', 'sk-...')}
          
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Como obter:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse <a href="https://platform.openai.com" target="_blank" className="text-blue-600 hover:underline">platform.openai.com</a></li>
              <li>Vá em API Keys → Create new secret key</li>
              <li>Copie a chave (começa com "sk-") e cole acima</li>
            </ol>
            <p className="mt-2 text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              A OpenAI cobra por uso (~$0.01 por imagem analisada)
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-gray-100 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Atual</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${storageProvider === 'abacus' ? 'bg-amber-500' : 'bg-blue-500'}`} />
            <span className="text-gray-600">Storage:</span>
            <span className="font-medium">{storageProvider === 'abacus' ? 'Abacus S3' : 'Cloudinary'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${llmProvider === 'abacus' ? 'bg-amber-500' : 'bg-purple-500'}`} />
            <span className="text-gray-600">OCR/IA:</span>
            <span className="font-medium">{llmProvider === 'abacus' ? 'Abacus AI' : 'OpenAI'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
