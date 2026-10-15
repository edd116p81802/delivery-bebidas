'use client';

import { useEffect, useState } from 'react';

interface BannerMessage {
  id: string;
  text: string;
  duration: number;
  isActive: boolean;
  order: number;
}

export function BannerMessages() {
  const [mounted, setMounted] = useState(false);
  const [bannerMessages, setBannerMessages] = useState<BannerMessage[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchBannerMessages = async () => {
      try {
        const response = await fetch('/api/banner-messages');
        if (response.ok) {
          const messages = await response.json();
          setBannerMessages(messages);
        }
      } catch (error) {
        console.error('Erro ao buscar mensagens do banner:', error);
      }
    };
    fetchBannerMessages();
  }, []);

  useEffect(() => {
    if (bannerMessages.length <= 1) return;

    const currentMessage = bannerMessages[currentMessageIndex];
    const duration = (currentMessage?.duration || 5) * 1000;

    const fadeOutTimer = setTimeout(() => {
      setIsVisible(false);
    }, duration - 500);

    const changeTimer = setTimeout(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % bannerMessages.length);
      setIsVisible(true);
    }, duration);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(changeTimer);
    };
  }, [currentMessageIndex, bannerMessages]);

  const currentBannerMessage = bannerMessages.length > 0 ? bannerMessages[currentMessageIndex]?.text || '' : '';

  if (!mounted || !currentBannerMessage) {
    return null;
  }

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 py-3 mb-8">
      <div className="text-center px-4">
        <p className={`text-base md:text-lg font-bold text-white max-w-4xl mx-auto leading-snug transition-opacity duration-500 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {currentBannerMessage}
        </p>
      </div>
    </div>
  );
}
