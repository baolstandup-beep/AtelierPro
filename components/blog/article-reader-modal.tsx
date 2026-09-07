'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, Tag, Share2, Sparkles, CheckCircle, ArrowRight, Scissors } from 'lucide-react';
import type { BlogArticle } from '@/lib/blog-data';
import Link from 'next/link';

interface ArticleReaderModalProps {
  article: BlogArticle | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArticleReaderModal({ article, isOpen, onClose }: ArticleReaderModalProps) {
  if (!isOpen || !article) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papier !');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#EBE7DF] max-h-[90vh] flex flex-col z-10 my-auto"
        >
          {/* Header Bar */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#EBE7DF] px-6 py-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${article.categoryColor}`}>
                {article.category}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[#8A7A65] font-medium">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 text-[#4B5563] hover:text-[#0F3B32] hover:bg-[#EBF7F1] rounded-full transition-colors"
                title="Partager l'article"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-[#4B5563] hover:text-[#111827] hover:bg-slate-100 rounded-full transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* Title & Metadata */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] font-serif-luxury leading-tight mb-4">
                {article.title}
              </h1>

              <div className="flex items-center gap-3 py-3 border-y border-[#EBE7DF]">
                <div className="w-10 h-10 rounded-full bg-[#0F3B32] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {article.author.avatar}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#111827]">{article.author.name}</p>
                  <p className="text-[11px] text-[#4B5563]">{article.author.role} • {article.publishedAt}</p>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-md border border-[#EBE7DF]">
              <Image
                src={article.image}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>

            {/* Intro Lead */}
            <p className="text-base sm:text-lg text-[#0F3B32] font-serif-luxury italic leading-relaxed bg-[#EBF7F1]/50 p-4 rounded-2xl border border-[#0F3B32]/10">
              « {article.content.intro} »
            </p>

            {/* Article Sections */}
            <div className="space-y-6 text-[#111827] text-sm sm:text-base leading-relaxed">
              {article.content.sections.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-[#0F3B32] font-serif-luxury">
                    {section.subtitle}
                  </h3>
                  <p className="text-[#4B5563] leading-relaxed">
                    {section.paragraph}
                  </p>
                  {section.bulletPoints && (
                    <ul className="space-y-2 mt-2 pl-2">
                      {section.bulletPoints.map((point, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-xs sm:text-sm text-[#111827]">
                          <CheckCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Pro Tip Box */}
            <div className="rounded-2xl bg-gradient-to-br from-[#0F3B32] to-[#185c4e] text-white p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-bold text-[#D97706] mb-1">
                    Astuce Pro Atelier
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                    {article.content.proTip}
                  </p>
                </div>
              </div>
            </div>

            {/* Conclusion */}
            <p className="text-sm text-[#4B5563] italic border-t border-[#EBE7DF] pt-4">
              {article.content.conclusion}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Tag className="w-3.5 h-3.5 text-[#8A7A65]" />
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FBF9F5] text-[#4B5563] border border-[#EBE7DF]"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Bottom CTA to Register */}
            <div className="rounded-2xl bg-[#EBF7F1] border border-[#0F3B32]/15 p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-[#0F3B32] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                <Scissors className="w-5 h-5 text-[#D97706]" />
              </div>
              <h4 className="text-base font-bold text-[#0F3B32] font-serif-luxury mb-1">
                Gérez votre atelier avec les meilleurs outils
              </h4>
              <p className="text-xs text-[#4B5563] max-w-md mx-auto mb-4">
                Mesures numériques, photos des tissus, calcul automatique des acomptes et notifications WhatsApp.
              </p>
              <Link
                href="/auth/register"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Tester AtelierPro Gratuitement <ArrowRight className="w-3.5 h-3.5 text-[#D97706]" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
