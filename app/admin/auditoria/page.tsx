'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertTriangle, CheckCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface AuditResult {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  detectedName: string;
  detectedBrand: string;
  confidence: string;
  match: boolean;
  problem: string | null;
}

export default function AuditoriaPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [stats, setStats] = useState<{ total: number; analyzed: number; problems: number } | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/audit-images?limit=${limit}&offset=${offset}`);
      const data = await res.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }
      
      setResults(data.results);
      setStats({ total: data.total, analyzed: data.analyzed, problems: data.problems });
      
      if (data.problems === 0) {
        toast.success(`Analisados ${data.analyzed} produtos - Nenhum problema encontrado!`);
      } else {
        toast.error(`Encontrados ${data.problems} produtos com imagens incorretas`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao executar auditoria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoria de Imagens</h1>
          <p className="text-gray-600 mt-1">Verifica se as imagens dos produtos correspondem aos nomes cadastrados</p>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400"
            >
              <option value={10}>10 produtos</option>
              <option value={20}>20 produtos</option>
              <option value={50}>50 produtos</option>
              <option value={100}>100 produtos</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pular</label>
            <input
              type="number"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400"
              min={0}
            />
          </div>
          
          <div className="flex-1" />
          
          <button
            onClick={runAudit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analisando... (pode demorar)
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Iniciar Auditoria
              </>
            )}
          </button>
        </div>
        
        {stats && (
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-gray-600">Total: <strong>{stats.total}</strong></span>
            <span className="text-gray-600">Analisados: <strong>{stats.analyzed}</strong></span>
            <span className={stats.problems > 0 ? 'text-red-600' : 'text-green-600'}>
              Problemas: <strong>{stats.problems}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Produtos com Imagens Incorretas ({results.length})
          </h2>
          
          <div className="grid gap-4">
            {results.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-red-200 p-4"
              >
                <div className="flex gap-4">
                  {/* Imagem */}
                  <div className="relative w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0">
                    <Image
                      src={result.imageUrl}
                      alt={result.name}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{result.name}</h3>
                        <p className="text-sm text-gray-500">{result.category}</p>
                      </div>
                      <Link
                        href={`/admin/produtos/${result.id}/editar`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-gray-900 text-sm font-medium rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Editar
                      </Link>
                    </div>
                    
                    <div className="mt-2 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700">
                        <strong>Problema:</strong> A imagem mostra <strong>"{result.detectedBrand} {result.detectedName}"</strong>
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Confiança: {result.confidence}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {stats && results.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800">Tudo certo!</h3>
          <p className="text-green-600">Nenhum problema encontrado nos {stats.analyzed} produtos analisados.</p>
        </div>
      )}

      {/* Instruções */}
      {!stats && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Como funciona:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Clique em "Iniciar Auditoria" para analisar os produtos</li>
            <li>O sistema usará IA para ler cada imagem e identificar o produto</li>
            <li>Compara o que está na imagem com o nome cadastrado</li>
            <li>Lista os produtos onde a imagem não corresponde</li>
            <li>Clique em "Editar" para corrigir cada produto</li>
          </ol>
          <p className="mt-4 text-sm text-amber-600">
            ⚠️ A análise pode demorar alguns minutos dependendo da quantidade de produtos.
          </p>
        </div>
      )}
    </div>
  );
}
