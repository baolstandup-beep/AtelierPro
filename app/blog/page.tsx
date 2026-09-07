'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Scissors,
  Search,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Filter,
  ArrowLeft,
  Share2,
  Bookmark,
} from 'lucide-react';
import { BLOG_ARTICLES, BlogArticle } from '@/lib/blog-data';
import { ArticleReaderModal } from '@/components/blog/article-reader-modal';

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Toutes');
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  const categories = ['Toutes', 'Tendances & Styles', 'Savoir-faire Atelier', 'Cérémonie & Mariage', 'Business & Digital'];

  const filteredArticles = useMemo(() => {
    return BLOG_ARTICLES.filter((article) => {
      const matchesCategory =
        selectedCategory === 'Toutes' || article.category === selectedCategory;
      const matchesSearch =
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const featuredArticle = BLOG_ARTICLES.find((a) => a.featured) || BLOG_ARTICLES[0];

  const handleOpenArticle = (article: BlogArticle) => {
    setSelectedArticle(article);
    setIsReaderOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#111827] font-sans antialiased selection:bg-[#0F3B32] selection:text-[#FBF9F5]">
      {/* ─── HEADER BAR ─── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#EBE7DF] px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A7A65] hover:text-[#0F3B32] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour Accueil
            </Link>
            <div className="h-4 w-px bg-[#EBE7DF] hidden sm:block" />
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0F3B32] flex items-center justify-center text-white shadow-sm">
                <Scissors className="w-4 h-4 text-[#D97706]" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[#0F3B32] font-serif-luxury">
                Atelier<span className="text-[#D97706]">Pro</span> <span className="text-xs uppercase font-sans font-bold text-[#8A7A65] tracking-widest ml-1">Magazine</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              Essai Gratuit <ArrowRight className="w-3.5 h-3.5 text-[#D97706]" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO MAGAZINE SECTION ─── */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EBF7F1] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border border-[#0F3B32]/15 mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            Le Journal de la Haute Couture & des Ateliers
          </motion.div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111827] font-serif-luxury leading-tight mb-4">
            Actualités, Tendances Mode & Savoir-faire
          </h1>
          <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
            Inspirations Bazin & Wax, techniques de coupe de grands maîtres tailleurs et conseils pour développer votre atelier en Afrique.
          </p>
        </div>

        {/* ─── FEATURED ARTICLE HERO CARD ─── */}
        {featuredArticle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => handleOpenArticle(featuredArticle)}
            className="group cursor-pointer rounded-3xl bg-white border border-[#EBE7DF] overflow-hidden shadow-[0_10px_35px_rgba(15,59,50,0.06)] hover:shadow-xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 mb-12"
          >
            <div className="relative lg:col-span-7 aspect-[16/10] lg:aspect-auto overflow-hidden">
              <Image
                src={featuredArticle.image}
                alt={featuredArticle.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0F3B32] text-white shadow-md">
                  À la Une
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${featuredArticle.categoryColor}`}>
                    {featuredArticle.category}
                  </span>
                  <span className="text-xs text-[#8A7A65] flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {featuredArticle.readTime}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827] font-serif-luxury group-hover:text-[#0F3B32] transition-colors leading-snug mb-3">
                  {featuredArticle.title}
                </h2>

                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed line-clamp-3 mb-6">
                  {featuredArticle.excerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-[#EBE7DF] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#0F3B32] text-white flex items-center justify-center font-bold text-xs">
                    {featuredArticle.author.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#111827]">{featuredArticle.author.name}</p>
                    <p className="text-[10px] text-[#8A7A65]">{featuredArticle.publishedAt}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0F3B32] group-hover:translate-x-1 transition-transform">
                  Lire l&apos;article <ChevronRight className="w-4 h-4 text-[#D97706]" />
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── SEARCH & FILTER BAR ─── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-4 rounded-2xl border border-[#EBE7DF] shadow-sm">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#0F3B32] text-white shadow-sm'
                    : 'bg-[#FBF9F5] text-[#4B5563] hover:text-[#0F3B32] border border-[#EBE7DF]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#8A7A65] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un sujet, tissu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#FBF9F5] border border-[#EBE7DF] rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-[#0F3B32] text-[#111827]"
            />
          </div>
        </div>

        {/* ─── ARTICLES GRID ─── */}
        {filteredArticles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EBE7DF] p-8">
            <BookOpen className="w-12 h-12 text-[#8A7A65] mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-bold text-[#111827] mb-1 font-serif-luxury">
              Aucun article trouvé
            </h3>
            <p className="text-xs text-[#4B5563]">
              Essayez un autre mot-clé ou sélectionnez une catégorie différente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <motion.article
                key={article.id}
                whileHover={{ y: -5 }}
                onClick={() => handleOpenArticle(article)}
                className="group cursor-pointer rounded-3xl bg-white border border-[#EBE7DF] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md bg-white/90 ${article.categoryColor}`}>
                        {article.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-[11px] text-[#8A7A65] mb-2 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{article.readTime}</span>
                      <span>•</span>
                      <span>{article.publishedAt}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-[#111827] font-serif-luxury group-hover:text-[#0F3B32] transition-colors leading-snug mb-2 line-clamp-2">
                      {article.title}
                    </h3>

                    <p className="text-xs text-[#4B5563] leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>
                </div>

                <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-[#EBE7DF] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0F3B32] text-white flex items-center justify-center font-bold text-[10px]">
                      {article.author.avatar}
                    </div>
                    <span className="text-xs font-semibold text-[#111827]">
                      {article.author.name}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0F3B32] group-hover:translate-x-1 transition-transform">
                    Lire <ChevronRight className="w-3.5 h-3.5 text-[#D97706]" />
                  </span>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* ─── NEWSLETTER / WHATSAPP VIP ATELIER ─── */}
        <div className="mt-16 rounded-3xl bg-gradient-to-br from-[#0F3B32] to-[#185c4e] text-white p-8 sm:p-12 text-center shadow-xl relative overflow-hidden">
          <div className="max-w-xl mx-auto relative z-10">
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-white font-bold text-xs uppercase tracking-wider mb-4 inline-block border border-white/20">
              Cercle des Maîtres Tailleurs
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif-luxury mb-3">
              Recevez les nouvelles tendances de la mode africaine
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mb-6 leading-relaxed">
              Inspirations coupes, arrivages de tissus Bazin & Wax et conseils de gestion d&apos;atelier directement sur votre WhatsApp ou par email.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
              <input
                type="text"
                placeholder="Votre numéro WhatsApp ou Email"
                className="w-full sm:flex-1 px-4 py-3 rounded-full bg-white text-[#111827] text-xs focus:outline-none focus:ring-2 focus:ring-[#D97706]"
              />
              <button
                onClick={() => alert('Merci pour votre inscription au Journal AtelierPro !')}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#D97706] hover:bg-[#b46305] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all whitespace-nowrap"
              >
                S&apos;abonner
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Reader Modal */}
      <ArticleReaderModal
        article={selectedArticle}
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
      />

      {/* ─── FOOTER ─── */}
      <footer className="bg-white border-t border-[#EBE7DF] py-8 px-4 text-center text-xs text-[#8A7A65]">
        <p>© {new Date().getFullYear()} AtelierPro Magazine • Haute Confection & Tendances Africaines</p>
      </footer>
    </div>
  );
}
