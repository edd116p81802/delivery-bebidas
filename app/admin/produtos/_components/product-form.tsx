"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Camera,
  Loader2,
  Sparkles,
  Package,
  Save,
} from "lucide-react";
import { toast } from "sonner";

interface ProductFormProps {
  product?: any;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl ?? null);

  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    imageUrl: product?.imageUrl ?? "",
    categoryId: product?.categoryId ?? "",
    price: product?.price?.toString() ?? "",
    discount: product?.discount?.toString() ?? "0",
    stock: product?.stock?.toString() ?? "100",
    volume: product?.volume ?? "",
    alcoholContent: product?.alcoholContent ?? "",
    brand: product?.brand ?? "",
    sku: product?.sku ?? "",
    featuredOffer: product?.featuredOffer ?? false,
    featuredCategory: product?.featuredCategory ?? false,
    hidden: product?.hidden ?? false,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/admin/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data ?? []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to S3
    try {
      const presignedResponse = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true,
        }),
      });

      if (!presignedResponse.ok) throw new Error("Failed to get presigned URL");

      const { uploadUrl, cloud_storage_path } = await presignedResponse.json();

      // Check if content-disposition is in signed headers
      const hasContentDisposition = uploadUrl.includes('content-disposition');
      
      const headers: HeadersInit = {
        'Content-Type': file.type,
      };
      
      if (hasContentDisposition) {
        headers['Content-Disposition'] = 'attachment';
      }

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers,
      });

      // Get the public URL
      const bucketName = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME ?? cloud_storage_path.split('/')[0];
      const region = "us-east-1";
      const publicUrl = `https://i.ytimg.com/vi/PxO8L9s3xOw/maxresdefault.jpg || 'bucket'}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
      
      // For now, use the upload URL's base to construct public URL
      const urlParts = uploadUrl.split('?')[0];
      setForm({ ...form, imageUrl: urlParts });
      toast.success("Imagem enviada!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    }
  };

  const handleOCR = async () => {
    if (!imagePreview) {
      toast.error("Primeiro faça upload de uma imagem");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch("/api/products/parse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imagePreview }),
      });

      if (!response.ok) throw new Error("OCR failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.status === 'completed' && parsed.result) {
                const result = parsed.result;
                setForm((prev) => ({
                  ...prev,
                  name: result.name ?? prev.name,
                  brand: result.brand ?? prev.brand,
                  volume: result.volume ?? prev.volume,
                  alcoholContent: result.alcoholContent ?? prev.alcoholContent,
                  description: result.description ?? prev.description,
                  price: result.suggestedPrice?.toString() ?? prev.price,
                }));

                // Try to match category
                if (result.category) {
                  const matchedCategory = categories.find(
                    (c) => c?.slug?.toLowerCase() === result.category?.toLowerCase()
                  );
                  if (matchedCategory) {
                    setForm((prev) => ({ ...prev, categoryId: matchedCategory.id }));
                  }
                }

                toast.success("Dados extraídos com sucesso!");
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Erro ao analisar imagem");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.categoryId || !form.price) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const url = product
        ? `/api/admin/products/${product.id}`
        : "/api/admin/products";
      const method = product ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          discount: parseFloat(form.discount),
          stock: parseInt(form.stock),
        }),
      });

      if (response.ok) {
        toast.success(product ? "Produto atualizado!" : "Produto criado!");
        router.push("/admin/produtos");
      } else {
        toast.error("Erro ao salvar produto");
      }
    } catch (error) {
      toast.error("Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {product ? "Editar Produto" : "Novo Produto"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image upload with OCR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagem do Produto
              </label>
              <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-green-500 transition-colors">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-gray-500">Clique para fazer upload</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* OCR button */}
              <button
                type="button"
                onClick={handleOCR}
                disabled={!imagePreview || analyzing}
                className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {analyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                {analyzing ? "Analisando..." : "Extrair Dados com IA"}
              </button>
            </div>

            {/* Basic info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  required
                >
                  <option value="">Selecione...</option>
                  {(categories ?? []).map((cat: any) => (
                    <option key={cat?.id} value={cat?.id}>
                      {cat?.icon} {cat?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desconto (%)
                  </label>
                  <input
                    type="number"
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Volume
                  </label>
                  <input
                    type="text"
                    value={form.volume}
                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                    placeholder="350ml"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
            />
          </div>

          {/* Additional fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teor Alcoólico
              </label>
              <input
                type="text"
                value={form.alcoholContent}
                onChange={(e) => setForm({ ...form, alcoholContent: e.target.value })}
                placeholder="5%"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estoque
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featuredOffer}
                onChange={(e) => setForm({ ...form, featuredOffer: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-gray-700">Destaque em Ofertas</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featuredCategory}
                onChange={(e) => setForm({ ...form, featuredCategory: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-gray-700">Destaque na Categoria</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hidden}
                onChange={(e) => setForm({ ...form, hidden: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-gray-700">Ocultar Produto</span>
            </label>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              {product ? "Salvar Alterações" : "Criar Produto"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
