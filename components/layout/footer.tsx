import { Facebook, Twitter, Youtube, Instagram } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-[#1a1a1a] py-6 mt-16 pb-safe md:pb-6">
      <div className="container mx-auto px-4 pb-20 md:pb-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-300 text-xs md:text-sm text-center md:text-left">
            <p className="font-semibold text-white">© Copyright 2025 - ZE EXPRESS - Todos os direitos reservados</p>
            <p className="mt-1">ZE EXPRESS Agencia de Delivery Online S.A</p>
            <p className="mt-1">CNPJ 14.380.200/0001-21 / Avenida dos Autonomistas, nº 1496, Vila Yara,</p>
            <p>Osasco/SP - CEP 06.020-902</p>
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
      </div>
    </footer>
  );
}
