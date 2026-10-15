import Link from 'next/link';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';

interface CategoryCardProps {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  imageUrl?: string;
}

export function CategoryCard({ name, slug, icon, color, imageUrl }: CategoryCardProps) {
  const IconComponent = icon && (LucideIcons as any)[icon] ? (LucideIcons as any)[icon] : LucideIcons.Box;
  
  return (
    <Link href={`/categoria/${slug}`} className="flex flex-col items-center gap-1.5 cursor-pointer group">
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 overflow-hidden" style={{ backgroundColor: imageUrl ? 'transparent' : (color || '#F3F4F6') }}>
        {imageUrl ? (
          <div className="relative w-full h-full">
            <Image src={imageUrl} alt={name} fill className="object-cover" sizes="56px" />
          </div>
        ) : (
          <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-gray-700" />
        )}
      </div>
      <span className="text-[10px] md:text-xs font-medium text-gray-800 text-center leading-tight">{name}</span>
    </Link>
  );
}
