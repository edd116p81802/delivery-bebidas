'use client';

import { useState, useRef } from 'react';
import { Upload, X, Link, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import Image from 'next/image';

// Resultado da análise de imagem
export interface ImageAnalysisResult {
  title: string | null;
  brand: string | null;
  volume: string | null;
  alcoholContent: string | null;
  price: string | null;
  description: string | null;
  category: string | null;
  isCombo: boolean;
  comboItems: string[];
  rawOcrText: string | null;
  confidence: { [key: string]: number };
  sources: { [key: string]: string };
  needsReview: string[];
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onNameExtracted?: (name: string) => void;
  onImageAnalyzed?: (result: ImageAnalysisResult) => void;
  label?: string;
  compact?: boolean;
  enableSmartAnalysis?: boolean;
}

// Verifica se o nome do arquivo tem o padrão estruturado (MODO 1)
function hasStructuredFilename(filename: string): boolean {
  // Padrão: contém " - " seguido de valor OU contém "__D="
  return filename.includes('__D=') || /\s+-\s+\d+[,.]?\d*\s*/.test(filename);
}

export function ImageUpload({ 
  value, 
  onChange, 
  onNameExtracted, 
  onImageAnalyzed,
  label = 'Imagem', 
  compact = false,
  enableSmartAnalysis = true
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsUploading(true);
    setIsAnalyzing(false);

    const filename = file.name;
    const isStructured = hasStructuredFilename(filename);

    // MODO 1: Se tem padrão estruturado, usar extração do nome do arquivo
    if (isStructured && onNameExtracted) {
      onNameExtracted(filename);
    }

    try {
      // Upload da imagem primeiro
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer upload');
      }

      onChange(data.url);
      setIsUploading(false);

      // MODO 2 e 3: Se NÃO tem padrão estruturado, analisar imagem com IA
      if (!isStructured && enableSmartAnalysis && onImageAnalyzed) {
        setIsAnalyzing(true);
        
        try {
          const analysisForm = new FormData();
          analysisForm.append('image', file);
          analysisForm.append('filename', filename);
          
          const analysisResponse = await fetch('/api/products/parse-image', {
            method: 'POST',
            body: analysisForm,
          });
          
          if (analysisResponse.ok) {
            const analysisResult = await analysisResponse.json();
            onImageAnalyzed(analysisResult);
          } else {
            // Se análise falhar, tentar extrair do nome mesmo assim
            if (onNameExtracted) {
              onNameExtracted(filename);
            }
          }
        } catch (analysisError) {
          console.error('Erro na análise de imagem:', analysisError);
          // Fallback para extração do nome
          if (onNameExtracted) {
            onNameExtracted(filename);
          }
        } finally {
          setIsAnalyzing(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const clearImage = () => {
    onChange('');
    setError(null);
  };

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {label && <label className="block text-sm font-medium text-zinc-700">{label}</label>}
      
      {value ? (
        <div className="relative">
          <div className={`relative w-full bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200 ${compact ? 'h-28' : 'h-48'}`}>
            <Image
              src={value}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {isAnalyzing ? (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs rounded-full animate-pulse">
              <Sparkles className="w-3 h-3" />
              Analisando...
            </div>
          ) : !compact && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
              <CheckCircle className="w-3 h-3" />
              Imagem salva
            </div>
          )}
        </div>
      ) : (
        <div className={compact ? "space-y-2" : "space-y-3"}>
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-lg text-center cursor-pointer transition-all
              ${compact ? 'p-3' : 'p-6'}
              ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'}
              ${isUploading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleInputChange}
              className="hidden"
            />
            
            {isUploading ? (
              <div className="flex flex-col items-center gap-1">
                <Loader2 className={`text-blue-500 animate-spin ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
                <span className="text-sm text-zinc-600">Enviando...</span>
              </div>
            ) : isAnalyzing ? (
              <div className="flex flex-col items-center gap-1">
                <Sparkles className={`text-orange-500 animate-pulse ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
                <span className="text-sm text-orange-600">Analisando imagem...</span>
                {!compact && <span className="text-xs text-zinc-400">Extraindo informações do produto</span>}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className={`text-zinc-400 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
                <span className={`text-zinc-600 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {compact ? 'Clique ou arraste' : 'Clique ou arraste uma imagem'}
                </span>
                {!compact && (
                  <span className="text-xs text-zinc-400">
                    JPG, PNG, GIF ou WebP (máx. 10MB)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* URL Input Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-200" />
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1"
            >
              <Link className="w-3 h-3" />
              ou colar URL
            </button>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          {/* URL Input Field */}
          {showUrlInput && (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://user-images.githubusercontent.com/11049488/92468872-25eef700-f1d4-11ea-99bd-9b45b526c94a.png"
                className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Usar
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
