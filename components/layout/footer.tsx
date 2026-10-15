import { Facebook, Twitter, Youtube, Instagram } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-[#1a1a1a] py-8 mt-16 pb-safe md:pb-8 text-gray-300">
      <div className="container mx-auto px-4 pb-20 md:pb-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-800 pb-6">
          <div className="text-center md:text-left space-y-1">
            <h3 className="font-bold text-lg text-white">Bebidas Express</h3>
            <p className="font-semibold text-amber-400 text-sm">Bebidas Express 24h</p>
            <p className="text-xs md:text-sm text-gray-400 max-w-xl">
              Delivery de bebidas e conveniência na sua região. A venda, o estoque e a entrega são feitos pela operação local.
            </p>
            <p className="text-xs text-gray-400">
              Atendimento pelos canais oficiais da operação.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center hover:bg-amber-500 transition-colors" aria-label="Facebook">
              <Facebook className="w-5 h-5 text-gray-900" />
            </Link>
            <Link href="https://x.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center hover:bg-amber-500 transition-colors" aria-label="Twitter">
              <Twitter className="w-5 h-5 text-gray-900" />
            </Link>
            <Link href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center hover:bg-amber-500 transition-colors" aria-label="YouTube">
              <Youtube className="w-5 h-5 text-gray-900" />
            </Link>
            <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center hover:bg-amber-500 transition-colors" aria-label="Instagram">
              <Instagram className="w-5 h-5 text-gray-900" />
            </Link>
          </div>
        </div>

        <div className="pt-6 text-center text-xs text-gray-400 space-y-2">
          <div className="flex items-center justify-center gap-2 text-gray-300 font-medium">
            <span>Política de álcool</span>
            <span>·</span>
            <span>Privacidade</span>
            <span>·</span>
            <span>Termos</span>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            A venda e o consumo de bebidas alcoólicas são proibidos para menores de 18 anos (Lei 13.106/2015). Beba com moderação. Se for dirigir, não beba.
          </p>
        </div>
      </div>
    </footer>
  );
}
