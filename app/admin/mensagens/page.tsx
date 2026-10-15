'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newText, setNewText] = useState('');
  useEffect(() => { fetchMessages(); }, []);
  const fetchMessages = async () => { try { const res = await fetch('/api/admin/banner-messages'); const data = await res.json(); setMessages(data.messages || []); } catch (e) { console.error(e); } };
  const handleAdd = async () => { if (!newText.trim()) return; try { await fetch('/api/admin/banner-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newText }) }); setNewText(''); toast.success('Mensagem adicionada'); fetchMessages(); } catch (e) { toast.error('Erro'); } };
  const handleDelete = async (id: string) => { try { await fetch(`/api/admin/banner-messages/${id}`, { method: 'DELETE' }); toast.success('Mensagem removida'); fetchMessages(); } catch (e) { toast.error('Erro'); } };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mensagens do Banner</h1>
      <div className="bg-white rounded-2xl shadow-md p-6 max-w-2xl space-y-4">
        <div className="flex gap-2"><input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Nova mensagem..." className="flex-1 px-4 py-3 rounded-xl border" /><button onClick={handleAdd} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl"><Plus className="w-5 h-5" /></button></div>
        <div className="space-y-2">{messages.map(m => (<div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"><p>{m.text}</p><button onClick={() => handleDelete(m.id)} className="text-red-500"><Trash2 className="w-5 h-5" /></button></div>))}</div>
        {messages.length === 0 && <p className="text-gray-500 text-center">Nenhuma mensagem</p>}
      </div>
    </div>
  );
}
