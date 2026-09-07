'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Scissors,
  Ruler,
  ShoppingBag,
  CreditCard,
  Kanban,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  MessageCircle,
  Award,
  ChevronRight,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Check,
  Search,
  Calendar,
  Layers,
  Zap,
  Building2,
  AlertTriangle,
  FileText,
  Activity,
  ArrowUpRight,
  Shield,
  ThumbsUp,
  Send,
  HelpCircle,
  Play,
  Calculator,
  Percent,
} from 'lucide-react';

import { BLOG_ARTICLES, BlogArticle } from '@/lib/blog-data';
import { ArticleReaderModal } from '@/components/blog/article-reader-modal';
import { AppDownloadButtons } from '@/components/landing/app-download-buttons';

export default function AtelierProOfficialLandingPage() {
  const { isAuthenticated, isOnboardingDone } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'mesures' | 'kanban' | 'paiements' | 'whatsapp'>('mesures');
  
  // Blog Reader Modal State
  const [selectedBlogArticle, setSelectedBlogArticle] = useState<BlogArticle | null>(null);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  
  // Interactive ROI Simulator State
  const [monthlyOrders, setMonthlyOrders] = useState<number>(50);
  const [averagePrice, setAveragePrice] = useState<number>(25000);

  const dashboardHref = isAuthenticated
    ? isOnboardingDone
      ? '/dashboard'
      : '/onboarding'
    : '/auth/login';

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  // ROI calculations
  const hoursSaved = Math.round(monthlyOrders * 0.8);
  const daysSaved = (hoursSaved / 8).toFixed(1);
  const lostRevenuePrevented = Math.round(monthlyOrders * (averagePrice * 0.12));
  const annualGain = lostRevenuePrevented * 12;
  const roiMultiplier = Math.max(1, Math.round(lostRevenuePrevented / 2900));

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#111827] font-sans antialiased selection:bg-[#0F3B32] selection:text-[#FBF9F5] overflow-x-hidden">
      {/* ─── 1. TOP FLOATING PILL NAVBAR (Haute Confection Luxury Style) ─── */}
      <div className="sticky top-4 z-50 px-4 sm:px-6 max-w-5xl mx-auto">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-full border border-[#E7E2D8] bg-white/92 backdrop-blur-xl px-5 sm:px-7 py-2.5 sm:py-3 shadow-[0_8px_30px_rgba(15,59,50,0.07)] flex items-center justify-between transition-all"
        >
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.06 }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0F3B32] to-[#185c4e] flex items-center justify-center text-[#FBF9F5] shadow-sm"
            >
              <Scissors className="w-4 h-4 text-[#D97706]" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-[#0F3B32] font-serif-luxury leading-none">
                Atelier<span className="text-[#D97706]">Pro</span>
              </span>
              <span className="text-[8px] uppercase tracking-widest font-bold text-[#8A7A65] mt-0.5">
                Haute Confection
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Clean, Marketing-Focused & Well-Spaced) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs sm:text-sm font-semibold text-[#4B5563]">
            <a
              href="#fonctionnalites"
              className="hover:text-[#0F3B32] transition-colors py-1 relative group"
            >
              Fonctionnalités
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0F3B32] transition-all group-hover:w-full rounded-full" />
            </a>
            <a
              href="#simulateur"
              className="hover:text-[#0F3B32] transition-colors py-1 relative group"
            >
              Simulateur
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0F3B32] transition-all group-hover:w-full rounded-full" />
            </a>
            <a
              href="#tarifs"
              className="hover:text-[#0F3B32] transition-colors py-1 relative group"
            >
              Tarifs
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0F3B32] transition-all group-hover:w-full rounded-full" />
            </a>
            <a
              href="#blog"
              className="hover:text-[#0F3B32] transition-colors py-1 flex items-center gap-1.5 relative group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
              <span>Blog & Mode</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D97706] transition-all group-hover:w-full rounded-full" />
            </a>
          </nav>

          {/* Header Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {isAuthenticated ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(15,59,50,0.22)] transition-all hover:scale-105"
              >
                <span>Mon Atelier</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#D97706]" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex text-xs font-bold uppercase tracking-wider text-[#4B5563] hover:text-[#0F3B32] px-3 py-2 transition-colors"
                >
                  Connexion
                </Link>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-[#0F3B32] to-[#185c4e] hover:from-[#185c4e] hover:to-[#0F3B32] text-white font-bold text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(15,59,50,0.22)] border border-[#0F3B32]/20"
                  >
                    <span>Essai Gratuit</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D97706]" />
                  </Link>
                </motion.div>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full text-[#0F3B32] hover:bg-[#EBF7F1] transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </motion.header>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 p-5 rounded-3xl bg-white/95 backdrop-blur-xl border border-[#E7E2D8] shadow-2xl flex flex-col gap-3 text-sm font-semibold text-[#111827]"
            >
              <a href="#fonctionnalites" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-[#0F3B32]">
                Fonctionnalités
              </a>
              <a href="#simulateur" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-[#0F3B32]">
                Simulateur de Gain
              </a>
              <a href="#tarifs" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-[#0F3B32]">
                Tarifs
              </a>
              <a
                href="#blog"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#0F3B32] flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                  Blog & Mode
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30">
                  News
                </span>
              </a>
              <hr className="border-[#E7E2D8] my-1" />
              <Link
                href="/auth/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-full bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Essai Gratuit
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── 2. HERO SECTION (Haute-Confection Palette & 2-Column Desktop with African Couple) ─── */}
      <section id="hero" className="relative pt-8 pb-12 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-0 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[400px] bg-[#0F3B32]/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-12 w-[450px] h-[450px] bg-[#D97706]/8 rounded-full blur-[110px] pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-end">
          {/* Left Column: 58% (7 cols in 12-col grid) */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left z-10 pt-4 sm:pt-8 pb-4 lg:pb-16">
            {/* 1. Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#EBE7DF] text-[#0F3B32] text-xs sm:text-sm font-semibold shadow-xs mb-5 self-center lg:self-start"
            >
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              <span>La plateforme N°1 de gestion d&apos;ateliers de couture en Afrique</span>
            </motion.div>

            {/* 2. Titre */}
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-[54px] font-extrabold tracking-tight text-[#111827] leading-[1.15] mb-5 font-serif-luxury max-w-2xl"
            >
              Un seul outil pour{' '}
              <span className="text-[#0F3B32] underline decoration-[#D97706]/40 decoration-wavy decoration-2">
                gérer votre atelier,
              </span>{' '}
              <span className="text-[#D97706]">vos acomptes</span> et vos confections.
            </motion.h1>

            {/* 3. Description existante */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm sm:text-base lg:text-lg text-[#4B5563] max-w-2xl mb-7 leading-relaxed"
            >
              Fini les carnets perdus, les contestations de mesures et les retards de livraison. AtelierPro
              digitalise vos mensurations avec gabarits africains, sécurise vos paiements Wave & Orange Money
              et organise le travail de vos couturiers.
            </motion.p>

            {/* 4. Boutons App Store, Google Play et "Commencer sur le web" */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.3 }}
              className="mb-6 w-full flex justify-center lg:justify-start"
            >
              <AppDownloadButtons />
            </motion.div>

            {/* 5. Boutons d'Action Principaux */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.35 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 mb-8 w-full sm:w-auto"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-xs uppercase tracking-wider shadow-[0_10px_25px_rgba(15,59,50,0.25)] transition-all"
                >
                  Inscrire mon atelier gratuitement <ArrowRight className="w-4 h-4 text-[#D97706]" />
                </Link>
              </motion.div>

              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                href="#fonctionnalites"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-[#FBF9F5] text-[#0F3B32] font-bold text-xs border border-[#EBE7DF] shadow-xs transition-all"
              >
                <Play className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]" />
                Découvrir l&apos;application
              </motion.a>
            </motion.div>

            {/* On Mobile Only: Couple Photo appears between CTA and Trust Badges */}
            <div className="lg:hidden w-full flex justify-center mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[#D97706]/15 via-[#F5E6D3]/40 to-transparent rounded-full blur-2xl -z-10 transform scale-90" />
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative max-w-[340px] sm:max-w-[420px] w-full flex justify-center"
              >
                <Image
                  src="/images/couple-atelierpro.png"
                  alt="Couple africain en tenues traditionnelles, clients AtelierPro"
                  width={888}
                  height={1378}
                  priority
                  sizes="(max-width: 768px) 90vw, 420px"
                  className="w-full h-auto object-contain drop-shadow-[0_15px_30px_rgba(15,59,50,0.18)]"
                />
              </motion.div>
            </div>

            {/* 6. Les quatre arguments de confiance */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-6 text-xs sm:text-sm font-semibold text-[#4B5563] pt-2 border-t border-[#EBE7DF]/80 w-full"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>100% sécurisé (Cloud)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>Mobile, Tablette & PC</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>Wave & Orange Money</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>Sans carte bancaire</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: 42% (5 cols in 12-col grid) */}
          <div className="hidden lg:flex lg:col-span-5 relative self-end items-end justify-center z-10">
            {/* Soft Ambient Radial Halo behind Couple */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[380px] h-[480px] bg-gradient-to-t from-[#D97706]/18 via-[#F5E6D3]/40 to-transparent rounded-full blur-3xl -z-10" />

            {/* Floating Micro-Badge Top Left: Gabarits Africains */}
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.5, ease: 'easeOut' }}
              className="absolute top-16 -left-4 xl:-left-8 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#EBE7DF] shadow-[0_12px_28px_rgba(15,59,50,0.12)] flex items-center gap-2.5 animate-float-1"
            >
              <div className="w-7 h-7 rounded-xl bg-[#0F3B32] text-white flex items-center justify-center shrink-0">
                <Ruler className="w-3.5 h-3.5 text-[#D97706]" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#8A7A65]">Gabarits Africains</p>
                <p className="text-xs font-black text-[#111827]">Boubou & Kaftan Sur-Mesure</p>
              </div>
            </motion.div>

            {/* Floating Micro-Badge Bottom Right: Acomptes Wave */}
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.65, ease: 'easeOut' }}
              className="absolute bottom-24 -right-2 xl:-right-6 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#EBE7DF] shadow-[0_12px_28px_rgba(15,59,50,0.12)] flex items-center gap-2.5 animate-float-2"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#1BA8E9] to-[#0F3B32] text-white flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700">Acomptes Sécurisés</p>
                <p className="text-xs font-black text-[#111827]">Wave & Orange Money</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-[480px] xl:max-w-[540px] flex items-end justify-center"
            >
              <Image
                src="/images/couple-atelierpro.png"
                alt="Couple africain en tenues traditionnelles, clients AtelierPro"
                width={888}
                height={1378}
                priority
                sizes="(max-width: 1200px) 45vw, 540px"
                className="w-auto max-h-[640px] xl:max-h-[720px] object-contain object-bottom drop-shadow-[0_25px_45px_rgba(15,59,50,0.22)]"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 3. STATS STRIP (Mon Atelier Luxury Green Ribbon) ─── */}
      <section className="bg-[#0F3B32] text-white py-5 px-4 sm:px-6 shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-grain opacity-10 pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-around gap-6 text-center sm:text-left relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#185c4e] flex items-center justify-center text-[#D97706]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">Ateliers & Tailleurs</p>
              <p className="text-base font-bold text-white font-serif-luxury">+500 Ateliers Actifs</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-white/10" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#185c4e] flex items-center justify-center text-[#D97706]">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">Mensurations enregistrées</p>
              <p className="text-base font-bold text-white font-serif-luxury">+48 000 Mesures</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-white/10" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#185c4e] flex items-center justify-center text-[#D97706]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">Paiements Mobile Money</p>
              <p className="text-base font-bold text-white font-serif-luxury">Wave & Orange Money</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-white/10" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#185c4e] flex items-center justify-center text-[#D97706]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">Sécurité & Sauvegarde</p>
              <p className="text-base font-bold text-white font-serif-luxury">Zéro Perte de Données</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. INTERACTIVE LIVE FEATURE SHOWCASE (Tabs + Animated Mockup) ─── */}
      <section id="fonctionnalites" className="py-16 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="px-4 py-1.5 rounded-full bg-[#EBF7F1] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border border-[#0F3B32]/15">
            Module Haute Précision
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#111827] mt-4 mb-4 font-serif-luxury">
            Conçu spécialement pour les maîtres tailleurs
          </h2>
          <p className="text-[#4B5563] text-sm sm:text-base">
            Explorez les outils clés qui font d&apos;AtelierPro le compagnon quotidien de votre atelier.
          </p>

          {/* Interactive Feature Switcher Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-full bg-white border border-[#EBE7DF] shadow-sm max-w-2xl mx-auto">
            {[
              { id: 'mesures', label: 'Carnet & Gabarits', icon: Ruler },
              { id: 'kanban', label: 'Suivi Couturiers', icon: Kanban },
              { id: 'paiements', label: 'Acomptes & Caisse', icon: CreditCard },
              { id: 'whatsapp', label: 'Reçus WhatsApp', icon: MessageCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFeatureTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0F3B32] text-white shadow-md'
                      : 'text-[#4B5563] hover:text-[#0F3B32] hover:bg-[#FBF9F5]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D97706]' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Display based on active tab */}
        <div className="rounded-3xl sm:rounded-[2.5rem] border border-[#EBE7DF] bg-white p-4 sm:p-7 shadow-[0_20px_50px_rgba(15,59,50,0.06)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Visual Photo Card */}
            <div className="lg:col-span-7 relative h-[380px] sm:h-[460px] rounded-2xl overflow-hidden shadow-lg border border-[#EBE7DF]">
              <Image
                src="/images/carnet-mesures-gabarits.jpg"
                alt="Carnet de Mesures AtelierPro"
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F3B32]/90 via-[#0F3B32]/30 to-transparent" />
              
              {/* Floating Animated UI Pills on top of photo */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute top-5 left-5 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-[#EBE7DF] shadow-lg flex items-center gap-3 text-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-[#EBF7F1] text-[#0F3B32] flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <p className="font-bold text-[#111827]">Grand Boubou Bazin</p>
                  <p className="text-[11px] text-[#16A34A] font-semibold">Acompte Wave 35 000 FCFA reçu</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="absolute bottom-6 left-6 right-6 text-white"
              >
                <span className="inline-block px-3 py-1 rounded-full bg-[#D97706] text-white text-[11px] font-bold uppercase tracking-wider mb-2">
                  Précision Millimétrique
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-serif-luxury text-white">
                  Gabarits spécialisés pour coupes africaines & modernes
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 mt-1">
                  Boubou 3 pièces, Robe Marinière, Costume, Veste Sénégalaise, Kaftan.
                </p>
              </motion.div>
            </div>

            {/* Feature Description & Live Indicators */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="p-5 rounded-2xl bg-[#FBF9F5] border border-[#EBE7DF] hover:border-[#0F3B32] transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF7F1] text-[#0F3B32] flex items-center justify-center font-bold">
                    <Ruler className="w-5 h-5 text-[#0F3B32]" />
                  </div>
                  <h4 className="text-base font-bold text-[#0F3B32] font-serif-luxury">
                    Mensurations Complètes
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Enregistrez en un clin d&apos;œil : Carrure, Longueur Bras, Tour de Cou, Poitrine, Ceinture,
                  Longueur Pantalon, Tour de Cuisses et Bas.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FBF9F5] border border-[#EBE7DF] hover:border-[#D97706] transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <h4 className="text-base font-bold text-[#0F3B32] font-serif-luxury">
                    Gestion des Acomptes & Soldes
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Total devis calculé automatiquement. Indiquez le versement d&apos;acompte et AtelierPro génère
                  le solde restant avec reçu immédiat.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FBF9F5] border border-[#EBE7DF] hover:border-[#0F3B32] transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF7F1] text-[#0F3B32] flex items-center justify-center font-bold">
                    <Kanban className="w-5 h-5 text-[#0F3B32]" />
                  </div>
                  <h4 className="text-base font-bold text-[#0F3B32] font-serif-luxury">
                    Assignation aux Employés
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  Assignez chaque tissu à vos tailleurs ou apprentis. Visualisez les tenues en coupe,
                  en assemblage et celles prêtes pour essayage.
                </p>
              </div>

              <div className="mt-2">
                <Link
                  href="/auth/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
                >
                  Essayer cette interface gratuitement <ArrowRight className="w-4 h-4 text-[#D97706]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. SECTION "POURQUOI ABANDONNER LES CAHIERS" (Mon Atelier Comparison Cards) ─── */}
      <section id="comparatif" className="py-16 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="px-4 py-1.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-bold text-xs uppercase tracking-wider border border-[#D97706]/20">
            Comparatif d&apos;Atelier
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#111827] mt-4 mb-4 font-serif-luxury">
            Pourquoi abandonner le cahier papier et Excel ?
          </h2>
          <p className="text-[#4B5563] text-sm sm:text-base">
            Découvrez la différence concrète constatée par les maîtres tailleurs après seulement 1 mois.
          </p>
        </div>

        {/* 4 Comparison Cards Aligned on a Single Horizontal Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          
          {/* Card 1: Mesures */}
          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-3xl bg-white border border-[#EBE7DF] p-6 shadow-[0_4px_20px_rgba(15,59,50,0.04)] hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[#EBF7F1] text-[#0F3B32] flex items-center justify-center mb-5 shadow-sm">
                <Ruler className="w-5 h-5 text-[#0F3B32]" />
              </div>
              <h3 className="text-base font-bold text-[#0F3B32] mb-2 font-serif-luxury">
                Zéro perte de mesures
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed mb-5">
                Fini les cahiers tachés ou égarés. Toutes vos mensurations sont sécurisées et accessibles en 1 clic.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-[#EBE7DF] text-[11px] font-semibold">
              <div className="flex items-start gap-1.5 text-red-600">
                <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Cahier : Perte, taches & illisible.</span>
              </div>
              <div className="flex items-start gap-1.5 text-[#16A34A]">
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>AtelierPro : Cloud sécurisé 24h/24.</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Paiements */}
          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-3xl bg-white border border-[#EBE7DF] p-6 shadow-[0_4px_20px_rgba(15,59,50,0.04)] hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-5 shadow-sm">
                <CreditCard className="w-5 h-5 text-[#D97706]" />
              </div>
              <h3 className="text-base font-bold text-[#0F3B32] mb-2 font-serif-luxury">
                Paiements incontestables
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed mb-5">
                Acomptes Wave/OM et solde restant calculés automatiquement avec reçus WhatsApp officiels.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-[#EBE7DF] text-[11px] font-semibold">
              <div className="flex items-start gap-1.5 text-red-600">
                <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Mémoire : Litiges & impayés.</span>
              </div>
              <div className="flex items-start gap-1.5 text-[#16A34A]">
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>AtelierPro : Reçu WhatsApp certifié.</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Production */}
          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-3xl bg-white border border-[#EBE7DF] p-6 shadow-[0_4px_20px_rgba(15,59,50,0.04)] hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[#EBF7F1] text-[#0F3B32] flex items-center justify-center mb-5 shadow-sm">
                <Kanban className="w-5 h-5 text-[#0F3B32]" />
              </div>
              <h3 className="text-base font-bold text-[#0F3B32] mb-2 font-serif-luxury">
                Zéro retard de livraison
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed mb-5">
                Sachez quelle tenue est chez quel couturier. Ne manquez plus jamais une date de fête ou mariage.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-[#EBE7DF] text-[11px] font-semibold">
              <div className="flex items-start gap-1.5 text-red-600">
                <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Manuel : Retards chroniques.</span>
              </div>
              <div className="flex items-start gap-1.5 text-[#16A34A]">
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>AtelierPro : Kanban & alertes délais.</span>
              </div>
            </div>
          </motion.div>

          {/* Card 4: Caisse & Rentabilité */}
          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-3xl bg-white border border-[#EBE7DF] p-6 shadow-[0_4px_20px_rgba(15,59,50,0.04)] hover:shadow-xl transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-5 shadow-sm">
                <TrendingUp className="w-5 h-5 text-[#D97706]" />
              </div>
              <h3 className="text-base font-bold text-[#0F3B32] mb-2 font-serif-luxury">
                Caisse & Bénéfices nets
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed mb-5">
                Visualisez vos entrées d&apos;argent, vos achats de tissu et votre bénéfice réel en FCFA.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-[#EBE7DF] text-[11px] font-semibold">
              <div className="flex items-start gap-1.5 text-red-600">
                <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Excel : Visibilité floue & complexe.</span>
              </div>
              <div className="flex items-start gap-1.5 text-[#16A34A]">
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>AtelierPro : Bilan net en direct.</span>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ─── 6. INTERACTIVE SIMULATOR (Calculateur de Rentabilité & Gain de Temps Haute-Confection) ─── */}
      <section id="simulateur" className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-[#FBF9F5] via-white to-[#FBF9F5] border-y border-[#EBE7DF]">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="px-4 py-1.5 rounded-full bg-[#EBF7F1] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border border-[#0F3B32]/15 inline-flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-[#D97706]" />
              Simulateur de Gain & Rentabilité
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] mt-4 mb-4 font-serif-luxury leading-tight">
              Combien votre atelier va-t-il réellement gagner ?
            </h2>
            <p className="text-[#4B5563] text-sm sm:text-base leading-relaxed">
              Estimez les impayés sécurisés grâce aux reçus WhatsApp et les heures de coupe & couture libérées chaque mois.
            </p>
          </div>

          {/* Interactive Simulator 2-Column Cockpit */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Interactive Param Controls */}
            <div className="lg:col-span-7 bg-white border border-[#EBE7DF] rounded-3xl p-6 sm:p-8 shadow-sm">
              <div>
                {/* Section Header */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#EBE7DF]">
                  <h3 className="text-base font-bold text-[#0F3B32] font-serif-luxury flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-[#D97706]" />
                    Paramètres de votre atelier
                  </h3>
                  <span className="text-xs text-[#8A7A65] font-medium">Ajustement en direct</span>
                </div>

                {/* Preset Quick Chips */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2.5">
                    Sélection rapide par profil :
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Solo', count: 20, desc: 'Couturier Indépendant' },
                      { label: 'Atelier', count: 50, desc: '3 à 5 couturiers' },
                      { label: 'Maison', count: 100, desc: 'Haute Confection' },
                      { label: 'Grande', count: 200, desc: 'Multi-ateliers' },
                    ].map((preset) => (
                      <button
                        key={preset.count}
                        type="button"
                        onClick={() => setMonthlyOrders(preset.count)}
                        className={`p-2.5 rounded-2xl text-left border transition-all ${
                          monthlyOrders === preset.count
                            ? 'bg-[#0F3B32] text-white border-[#0F3B32] shadow-sm'
                            : 'bg-[#FBF9F5] text-[#111827] border-[#EBE7DF] hover:border-[#0F3B32]/40'
                        }`}
                      >
                        <p className="text-xs font-bold">{preset.count} tenues</p>
                        <p className={`text-[10px] ${monthlyOrders === preset.count ? 'text-slate-200' : 'text-[#8A7A65]'}`}>
                          {preset.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider: Volume de commandes */}
                <div className="mb-8 p-4 rounded-2xl bg-[#FBF9F5] border border-[#EBE7DF]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs sm:text-sm font-bold text-[#111827]">
                      Volume moyen confectionné par mois :
                    </span>
                    <span className="text-2xl font-extrabold text-[#D97706] font-serif-luxury bg-white px-3 py-1 rounded-xl border border-[#EBE7DF] shadow-sm">
                      {monthlyOrders} tenues
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="250"
                    step="5"
                    value={monthlyOrders}
                    onChange={(e) => setMonthlyOrders(parseInt(e.target.value))}
                    className="w-full h-2.5 bg-[#EBE7DF] rounded-lg appearance-none cursor-pointer accent-[#0F3B32]"
                  />
                  <div className="flex justify-between text-[11px] text-[#8A7A65] mt-2 font-medium">
                    <span>10 commandes</span>
                    <span>100 commandes</span>
                    <span>250+ commandes</span>
                  </div>
                </div>

                {/* Price per Garment Toggle */}
                <div>
                  <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-2.5">
                    Tarif moyen par confection dans votre atelier :
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { price: 15000, label: '15 000 FCFA', desc: 'Tenue Simple / Chemise' },
                      { price: 25000, label: '25 000 FCFA', desc: 'Boubou Brodé / Robe' },
                      { price: 50000, label: '50 000 FCFA', desc: 'Luxe / Mariage / 3 pièces' },
                    ].map((item) => (
                      <button
                        key={item.price}
                        type="button"
                        onClick={() => setAveragePrice(item.price)}
                        className={`p-3 rounded-2xl text-left border transition-all ${
                          averagePrice === item.price
                            ? 'bg-[#EBF7F1] border-[#0F3B32] text-[#0F3B32] ring-1 ring-[#0F3B32]'
                            : 'bg-white border-[#EBE7DF] text-[#4B5563] hover:border-[#0F3B32]/30'
                        }`}
                      >
                        <p className="text-xs font-bold text-[#111827]">{item.label}</p>
                        <p className="text-[10px] text-[#8A7A65] mt-0.5">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Benchmark Note */}
              <div className="mt-6 pt-4 border-t border-[#EBE7DF] flex items-center gap-2 text-xs text-[#8A7A65]">
                <Sparkles className="w-4 h-4 text-[#D97706] shrink-0" />
                <span>Basé sur les données réelles de plus de 500 ateliers partenaires.</span>
              </div>
            </div>

            {/* Right Column: Realistic iPhone Smartphone Mockup matching Image 2 */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="w-[310px] sm:w-[328px] shrink-0 rounded-[44px] bg-[#1a1c20] p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.38)] border-[6px] border-[#2d3037] ring-1 ring-black/80 relative"
              >
                {/* Subtle side button notches */}
                <div className="absolute -left-[8px] top-20 w-[3px] h-7 bg-[#2d3037] rounded-l" />
                <div className="absolute -left-[8px] top-30 w-[3px] h-10 bg-[#2d3037] rounded-l" />
                <div className="absolute -left-[8px] top-43 w-[3px] h-10 bg-[#2d3037] rounded-l" />
                <div className="absolute -right-[8px] top-28 w-[3px] h-14 bg-[#2d3037] rounded-r" />

                {/* Inner Screen */}
                <div className="rounded-[36px] bg-gradient-to-b from-[#05221B] via-[#0E3A30] to-[#041B15] text-white p-4 sm:p-5 overflow-hidden relative border border-white/10 flex flex-col justify-between shadow-inner">
                  
                  {/* Top Status Bar + Dynamic Island */}
                  <div className="relative z-10 mb-3.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-white/90 px-1 pt-0.5">
                      <span>9:41</span>
                      {/* Dynamic Island */}
                      <div className="w-18 h-4 bg-black rounded-full mx-auto flex items-center justify-end px-1.5 gap-1 border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b]" />
                        <div className="w-1 h-1 rounded-full bg-[#0a1a24]" />
                      </div>
                      <div className="flex items-center gap-1 text-white/90">
                        <div className="flex items-end gap-0.5 h-2">
                          <span className="w-0.5 h-1 bg-white rounded-sm" />
                          <span className="w-0.5 h-1.5 bg-white rounded-sm" />
                          <span className="w-0.5 h-2 bg-white rounded-sm" />
                        </div>
                        <span className="text-[9px] font-bold">5G</span>
                        <div className="w-4 h-2 border border-white/80 rounded-2xs p-0.5 flex items-center">
                          <div className="w-full h-full bg-[#16A34A] rounded-2xs" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ambient Glows */}
                  <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#D97706]/20 blur-xl pointer-events-none" />
                  <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-[#16A34A]/20 blur-xl pointer-events-none" />

                  <div className="relative z-10">
                    {/* ROI Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40 text-[10px] font-bold mb-3.5">
                      <Star className="w-3 h-3 fill-[#D97706]" />
                      <span>Rentabilité Estimée : x{roiMultiplier} l&apos;abonnement</span>
                    </div>

                    {/* Big Metric: Recovered Revenue */}
                    <div className="mb-3.5">
                      <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">
                        IMPAYÉS ÉVITÉS & ACOMPTES SÉCURISÉS
                      </span>
                      <div className="text-2xl sm:text-3xl font-extrabold text-[#D97706] font-serif-luxury mt-0.5 mb-0.5 tracking-tight">
                        +{lostRevenuePrevented.toLocaleString()} <span className="text-xs text-white font-sans font-bold">FCFA / mois</span>
                      </div>
                      <p className="text-[10px] text-[#16A34A] font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 shrink-0" />
                        <span>Soit +{annualGain.toLocaleString()} FCFA / an</span>
                      </p>
                    </div>

                    {/* Two Benefit Tiles */}
                    <div className="grid grid-cols-2 gap-2 mb-3.5">
                      <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Clock className="w-3 h-3 text-[#D97706]" />
                          <span className="text-[10px] font-bold text-white">Temps Gagné</span>
                        </div>
                        <p className="text-sm font-bold text-white font-serif-luxury">
                          ~{hoursSaved}h / mois
                        </p>
                        <p className="text-[8.5px] text-slate-300">
                          {daysSaved} jours libérés
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                        <div className="flex items-center gap-1 mb-0.5">
                          <ShieldCheck className="w-3 h-3 text-[#16A34A]" />
                          <span className="text-[10px] font-bold text-white">Reçus WhatsApp</span>
                        </div>
                        <p className="text-sm font-bold text-white font-serif-luxury">
                          98%
                        </p>
                        <p className="text-[8.5px] text-slate-300">
                          Soldes réglés à temps
                        </p>
                      </div>
                    </div>

                    {/* Subscription Comparison Message */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-slate-200 leading-snug mb-3.5">
                      💡 Pour un forfait <strong className="text-white">Starter à 2 900 FCFA</strong>, gain net de <strong className="text-[#D97706]">+{lostRevenuePrevented.toLocaleString()} FCFA</strong> dès le 1er mois !
                    </div>
                  </div>

                  {/* Action Button & Home Bar */}
                  <div className="relative z-10 pt-1">
                    <Link
                      href="/auth/register"
                      className="w-full text-center py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-[#D97706] to-[#ea580c] hover:from-[#ea580c] hover:to-[#D97706] text-white font-extrabold text-[10.5px] uppercase tracking-wider shadow-[0_4px_20px_rgba(217,119,6,0.5)] transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                    >
                      <span>Activer cette rentabilité</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <p className="text-[9px] text-slate-300 text-center mt-1.5">
                      14j d&apos;essai gratuit • Prise en main en 2 min
                    </p>

                    {/* Home Indicator Bar */}
                    <div className="w-24 h-1 bg-white/30 rounded-full mx-auto mt-2.5" />
                  </div>

                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 7. SECTION TÉMOIGNAGES (Avis des Maîtres Couturiers) ─── */}
      <section id="temoignages" className="py-16 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="px-4 py-1.5 rounded-full bg-[#EBF7F1] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border border-[#0F3B32]/15">
            Avis & Témoignages
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#111827] mt-4 mb-4 font-serif-luxury">
            Adopté par les plus grands ateliers
          </h2>
          <p className="text-[#4B5563] text-sm sm:text-base">
            Ce que disent les créateurs et stylistes qui ont digitalisé leur maison de confection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Review 1 */}
          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-3xl bg-white border border-[#EBE7DF] p-8 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1 text-[#D97706] mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D97706]" />
                ))}
              </div>
              <p className="text-[#111827] text-sm leading-relaxed italic mb-6">
                &ldquo;À chaque fête de Korité ou Tabaski, nous passions des nuits à chercher les mesures dans
                les vieux cahiers. Depuis AtelierPro, tout est classé et nos clients reçoivent leur reçu par
                WhatsApp instantanément.&rdquo;
              </p>
            </div>
            <div className="pt-4 border-t border-[#EBE7DF] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#0F3B32]">Maître Ousmane Ndiaye</h4>
                <p className="text-xs text-[#4B5563]">Atelier Haute Couture, Dakar</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FBF9F5] border border-[#EBE7DF] text-[#0F3B32]">
                🇸🇳 Sénégal
              </span>
            </div>
          </motion.div>

          {/* Review 2 */}
          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-3xl bg-white border-2 border-[#0F3B32] p-8 shadow-md flex flex-col justify-between relative"
          >
            <div className="absolute -top-3.5 right-6 bg-[#0F3B32] text-[#D97706] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Maison de Couture
            </div>
            <div>
              <div className="flex items-center gap-1 text-[#D97706] mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D97706]" />
                ))}
              </div>
              <p className="text-[#111827] text-sm leading-relaxed italic mb-6">
                &ldquo;La gestion des acomptes Wave et Orange Money a supprimé 100% des contestations. Mes
                clients VIP à Cocody adorent le professionnalisme des reçus électroniques.&rdquo;
              </p>
            </div>
            <div className="pt-4 border-t border-[#EBE7DF] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#0F3B32]">Awa Traoré</h4>
                <p className="text-xs text-[#4B5563]">Styliste & Créatrice, Abidjan</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FBF9F5] border border-[#EBE7DF] text-[#0F3B32]">
                🇨🇮 Côte d&apos;Ivoire
              </span>
            </div>
          </motion.div>

          {/* Review 3 */}
          <motion.div
            whileHover={{ y: -6 }}
            className="rounded-3xl bg-white border border-[#EBE7DF] p-8 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1 text-[#D97706] mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D97706]" />
                ))}
              </div>
              <p className="text-[#111827] text-sm leading-relaxed italic mb-6">
                &ldquo;Mes 6 employés savent exactement quelles commandes découper en priorité grâce au
                tableau Kanban. Nous avons augmenté notre production de 40% sans embaucher plus.&rdquo;
              </p>
            </div>
            <div className="pt-4 border-t border-[#EBE7DF] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#0F3B32]">Amadou Diallo</h4>
                <p className="text-xs text-[#4B5563]">Atelier Tailleur Moderne, Bamako</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FBF9F5] border border-[#EBE7DF] text-[#0F3B32]">
                🇲🇱 Mali
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 8. SECTION TARIFS (Formules en FCFA - Découverte, Starter, Pro, Business Évolutif) ─── */}
      <section id="tarifs" className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-white via-[#FBF9F5] to-white border-y border-[#EBE7DF]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="px-4 py-1.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-bold text-xs uppercase tracking-wider border border-[#D97706]/20 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              Tarifs Clairs & Sans Engagement
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] mt-4 mb-4 font-serif-luxury leading-tight">
              Investissez dans la réussite de votre atelier
            </h2>
            <p className="text-[#4B5563] text-sm sm:text-base leading-relaxed">
              Rentabilisé dès la première commande. Commencez gratuitement et faites évoluer votre formule selon vos besoins.
            </p>

            {/* Monthly / Annual Switcher */}
            <div className="mt-8 inline-flex items-center p-1.5 rounded-full bg-white border border-[#EBE7DF] shadow-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-[#0F3B32] text-white shadow-sm'
                    : 'text-[#4B5563] hover:text-[#0F3B32]'
                }`}
              >
                Paiement Mensuel
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-[#0F3B32] text-white shadow-sm'
                    : 'text-[#4B5563] hover:text-[#0F3B32]'
                }`}
              >
                <span>Paiement Annuel</span>
                <span className="px-2 py-0.5 rounded-full bg-[#D97706] text-white text-[10px] font-extrabold shadow-sm">
                  -20% (2 mois offerts)
                </span>
              </button>
            </div>
          </div>

          {/* 4-Column Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-12">
            
            {/* Plan 1: Découverte (0 FCFA) */}
            <div className="rounded-3xl bg-white border border-[#EBE7DF] p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_20px_rgba(15,59,50,0.03)] hover:shadow-lg transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF9F5] text-[#8A7A65] border border-[#EBE7DF]">
                    Gratuit à vie
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#0F3B32] font-serif-luxury">Découverte</h3>
                <p className="text-xs text-[#4B5563] mt-1 min-h-[32px]">
                  Pour les débutants et tailleurs indépendants
                </p>

                <div className="mt-5 mb-6 pb-5 border-b border-[#EBE7DF]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-[#111827] font-serif-luxury">0</span>
                    <span className="text-xs font-semibold text-[#8A7A65]">FCFA / mois</span>
                  </div>
                  <p className="text-[11px] text-[#8A7A65] mt-1">Sans carte bancaire</p>
                </div>

                <ul className="space-y-3 text-xs text-[#111827]">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Jusqu&apos;à <strong>15 clients</strong> enregistrés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Prise de mesures Homme / Femme / Enfant</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Calcul des acomptes & restant dû</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>1 compte utilisateur</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#9CA3AF]">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Photos des tissus & coupons</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#9CA3AF]">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Reçus automatiques WhatsApp</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/auth/register"
                className="mt-8 w-full text-center py-3 rounded-full bg-[#FBF9F5] hover:bg-[#EBE7DF] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border border-[#EBE7DF] shadow-sm transition-all"
              >
                Démarrer Gratuit
              </Link>
            </div>

            {/* Plan 2: Starter (2 900 FCFA) */}
            <div className="rounded-3xl bg-white border border-[#0F3B32]/30 p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_20px_rgba(15,59,50,0.05)] hover:shadow-xl transition-all relative">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF7F1] text-[#0F3B32] border border-[#0F3B32]/15">
                    Essentiel
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#0F3B32] font-serif-luxury">Starter</h3>
                <p className="text-xs text-[#4B5563] mt-1 min-h-[32px]">
                  Pour les couturiers et stylistes en pleine croissance
                </p>

                <div className="mt-5 mb-6 pb-5 border-b border-[#EBE7DF]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-[#0F3B32] font-serif-luxury">
                      {billingCycle === 'annual' ? '2 300' : '2 900'}
                    </span>
                    <span className="text-xs font-semibold text-[#8A7A65]">FCFA / mois</span>
                  </div>
                  <p className="text-[11px] text-[#8A7A65] mt-1">
                    {billingCycle === 'annual' ? 'Facturé 27 600 FCFA / an' : 'Sans engagement mensuel'}
                  </p>
                </div>

                <ul className="space-y-3 text-xs text-[#111827]">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Jusqu&apos;à <strong>80 clients</strong> actifs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span><strong>Photos des tissus & coupons</strong> (Caméra & Fichier)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Reçus & rappels WhatsApp en 1 clic</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Suivi des commandes & dates de livraison</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Calcul d&apos;acompte Wave & Orange Money</span>
                  </li>
                  <li className="flex items-start gap-2 text-[#9CA3AF]">
                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Tableau Kanban de production</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/auth/register"
                className="mt-8 w-full text-center py-3 rounded-full bg-white hover:bg-[#EBF7F1] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border-2 border-[#0F3B32] shadow-sm transition-all hover:scale-105"
              >
                Essayer 14 jours
              </Link>
            </div>

            {/* Plan 3: Pro Atelier (5 900 FCFA) - FEATURED / BEST VALUE */}
            <div className="rounded-3xl bg-gradient-to-b from-white via-[#F8FAF9] to-white border-2 border-[#D97706] p-6 sm:p-7 flex flex-col justify-between shadow-[0_12px_40px_rgba(217,119,6,0.18)] relative scale-105 z-10">
              {/* Featured Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#D97706] to-[#b46305] text-white text-[10px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" />
                Le Plus Choisi • Recommandé
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30">
                    Meilleur Rapport Qualité / Prix
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-[#0F3B32] font-serif-luxury">Pro Atelier</h3>
                <p className="text-xs text-[#4B5563] mt-1 min-h-[32px]">
                  Pour les ateliers actifs avec équipe & couturiers
                </p>

                <div className="mt-5 mb-6 pb-5 border-b border-[#D97706]/20">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-[#0F3B32] font-serif-luxury">
                      {billingCycle === 'annual' ? '4 900' : '5 900'}
                    </span>
                    <span className="text-xs font-semibold text-[#8A7A65]">FCFA / mois</span>
                  </div>
                  <p className="text-[11px] text-[#D97706] font-semibold mt-1">
                    {billingCycle === 'annual' ? 'Facturé 58 800 FCFA / an' : 'Sans engagement mensuel'}
                  </p>
                </div>

                <ul className="space-y-3 text-xs text-[#111827]">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span><strong>Clients & Mesures ILLIMITÉS</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span><strong>Toutes les notifications WhatsApp</strong> (Solde, livraison, commande prête)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span><strong>Tableau Kanban de production</strong> complet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Jusqu&apos;à <strong>5 couturiers / employés</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Galerie de modèles (Homme, Femme, Enfant)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Rapports de caisse & bénéfices nets</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/auth/register"
                className="mt-8 w-full text-center py-3.5 rounded-full bg-gradient-to-r from-[#0F3B32] to-[#185c4e] hover:from-[#185c4e] hover:to-[#0F3B32] text-white font-bold text-xs uppercase tracking-wider shadow-[0_6px_20px_rgba(15,59,50,0.35)] transition-all hover:scale-105 border border-[#D97706]/40"
              >
                Démarrer avec Pro Atelier
              </Link>
            </div>

            {/* Plan 4: Business Évolutif (18 900 FCFA) */}
            <div className="rounded-3xl bg-white border border-[#EBE7DF] p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_20px_rgba(15,59,50,0.05)] hover:shadow-xl transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#9333EA]/10 text-[#9333EA] border border-[#9333EA]/20">
                    Grand Atelier & Franchise
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#0F3B32] font-serif-luxury">Business Évolutif</h3>
                <p className="text-xs text-[#4B5563] mt-1 min-h-[32px]">
                  Pour les maisons de couture & multi-succursales
                </p>

                <div className="mt-5 mb-6 pb-5 border-b border-[#EBE7DF]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-[#111827] font-serif-luxury">
                      {billingCycle === 'annual' ? '15 900' : '18 900'}
                    </span>
                    <span className="text-xs font-semibold text-[#8A7A65]">FCFA / mois</span>
                  </div>
                  <p className="text-[11px] text-[#8A7A65] mt-1">
                    {billingCycle === 'annual' ? 'Facturé 190 800 FCFA / an' : 'Sans engagement mensuel'}
                  </p>
                </div>

                <ul className="space-y-3 text-xs text-[#111827]">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span><strong>Tout ce qui est dans Pro Atelier</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span><strong>Employés & Couturiers ILLIMITÉS</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span><strong>Multi-ateliers & succursales</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Logo & personnalisation de marque sur reçus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Export comptable Excel / PDF</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>Support VIP prioritaire 7j/7 sur WhatsApp</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/auth/register"
                className="mt-8 w-full text-center py-3 rounded-full bg-[#0F3B32] hover:bg-[#185c4e] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all hover:scale-105"
              >
                Passer au Business Évolutif
              </Link>
            </div>

          </div>

          {/* ─── PAYMENT METHODS & GUARANTEE TRUST BAR ─── */}
          <div className="rounded-3xl bg-white border border-[#EBE7DF] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF7F1] text-[#0F3B32] flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#111827] font-serif-luxury">
                  Paiements Africains 100% Sécurisés
                </h4>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Réglez en toute sérénité par Mobile Money ou Carte Bancaire.
                </p>
              </div>
            </div>

            {/* Mobile Money Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span className="px-3 py-1 rounded-full bg-[#1DC3EC]/10 text-[#0F85A8] border border-[#1DC3EC]/30 text-xs font-bold">
                Wave
              </span>
              <span className="px-3 py-1 rounded-full bg-[#FF7900]/10 text-[#CC6100] border border-[#FF7900]/30 text-xs font-bold">
                Orange Money
              </span>
              <span className="px-3 py-1 rounded-full bg-[#ED1C24]/10 text-[#B8141A] border border-[#ED1C24]/30 text-xs font-bold">
                Free Money
              </span>
              <span className="px-3 py-1 rounded-full bg-[#004F9F]/10 text-[#004F9F] border border-[#004F9F]/30 text-xs font-bold">
                Moov Money
              </span>
              <span className="px-3 py-1 rounded-full bg-[#FFCC00]/15 text-[#997A00] border border-[#FFCC00]/40 text-xs font-bold">
                MTN Money
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                Visa / Mastercard
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. SECTION BLOG & ACTUALITÉS MODE (Mon Atelier Magazine) ─── */}
      <section id="blog" className="py-16 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <span className="px-4 py-1.5 rounded-full bg-[#EBF7F1] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border border-[#0F3B32]/15 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              Blog & Actualités Mode
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#111827] mt-4 mb-3 font-serif-luxury leading-tight">
              Le Journal de la Couture & Tendances Africaines
            </h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Découvrez les dernières tendances Bazin, Wax, coupes traditionnelles et conseils de maîtres tailleurs pour valoriser votre art.
            </p>
          </div>

          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#FBF9F5] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border border-[#EBE7DF] shadow-sm transition-all hover:scale-105 shrink-0 self-start md:self-auto"
          >
            <span>Voir tout le magazine</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#D97706]" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BLOG_ARTICLES.slice(0, 3).map((article) => (
            <motion.article
              key={article.id}
              whileHover={{ y: -6 }}
              onClick={() => {
                setSelectedBlogArticle(article);
                setIsBlogModalOpen(true);
              }}
              className="group cursor-pointer rounded-3xl bg-white border border-[#EBE7DF] overflow-hidden shadow-[0_4px_20px_rgba(15,59,50,0.04)] hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
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
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md bg-white/90 shadow-sm ${article.categoryColor}`}>
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
      </section>

      {/* ─── 10. SECTION FAQ (Questions Fréquentes Accordéon) ─── */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="px-4 py-1.5 rounded-full bg-[#EBF7F1] text-[#0F3B32] font-bold text-xs uppercase tracking-wider border border-[#0F3B32]/15">
            FAQ AtelierPro
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#111827] mt-4 mb-4 font-serif-luxury">
            Questions Fréquentes
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'Est-ce utilisable sur un simple smartphone sans rien installer ?',
              a: "Oui ! AtelierPro est conçu pour fonctionner directement dans votre navigateur sur n'importe quel smartphone Android, iPhone, tablette ou ordinateur. Vous pouvez l'ajouter à votre écran d'accueil comme une application en 1 clic.",
            },
            {
              q: 'Comment mes clients reçoivent-ils leurs reçus ?',
              a: "Dès l'enregistrement de la commande ou du versement de l'acompte, vous pouvez cliquer sur le bouton WhatsApp : le reçu contenant le modèle, la date d'essayage, les mesures et le solde restant est envoyé directement.",
            },
            {
              q: 'Que se passe-t-il si je perds ou casse mon téléphone ?',
              a: "Vos données sont totalement en sécurité dans le Cloud sécurisé d'AtelierPro. Connectez-vous simplement depuis votre nouveau téléphone ou un ordinateur avec votre email et mot de passe pour retrouver l'intégralité de vos clients et mesures.",
            },
            {
              q: 'Quels sont les moyens de paiement acceptés pour les formules Pro ?',
              a: 'Vous pouvez payer en toute simplicité avec Wave, Orange Money, Free Money, Moov Money, MTN Mobile Money ou par Carte Bancaire.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white border border-[#EBE7DF] overflow-hidden transition-all shadow-sm"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left p-5 font-bold text-sm sm:text-base text-[#111827] flex items-center justify-between gap-4"
              >
                <span className="font-serif-luxury">{item.q}</span>
                <span
                  className={`text-[#0F3B32] transition-transform duration-200 ${
                    activeFaq === idx ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-[#4B5563] leading-relaxed border-t border-[#EBE7DF] pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* WhatsApp Direct Support Callout */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 rounded-3xl bg-gradient-to-br from-[#EBF7F1] via-white to-[#EBF7F1] border-2 border-[#25D366]/40 p-6 sm:p-8 shadow-[0_8px_30px_rgba(37,211,102,0.12)] flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(37,211,102,0.35)]">
              <MessageCircle className="w-7 h-7 fill-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F3B32] font-serif-luxury">
                Vous avez une question spécifique non traitée ici ?
              </h3>
              <p className="text-xs sm:text-sm text-[#4B5563] mt-1 leading-relaxed">
                Notre équipe d&apos;assistance est disponible par WhatsApp et message pour vous guider pas à pas.
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/221770000000?text=Bonjour%20AtelierPro%2C%20j%27aimerais%20avoir%20plus%20d%27informations%20sur%20l%27application%20pour%20mon%20atelier."
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold text-xs uppercase tracking-wider shadow-[0_8px_25px_rgba(37,211,102,0.35)] transition-all hover:scale-105"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Assistance WhatsApp Directe</span>
          </a>
        </motion.div>
      </section>

      {/* ─── 10. FINAL CTA BANNER (Mon Atelier Emerald Luxury) ─── */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-[#0F3B32] via-[#185c4e] to-[#07221c] text-white p-8 sm:p-16 text-center relative overflow-hidden shadow-2xl border border-[#0F3B32]">
          {/* Subtle Ambient Decorative Circles */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#D97706]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#16A34A]/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white font-bold text-xs uppercase tracking-wider mb-6 border border-white/20">
              Modernisez votre atelier dès aujourd&apos;hui
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-serif-luxury mb-6 leading-tight">
              Rejoignez plus de 500 ateliers de couture en Afrique.
            </h2>
            <p className="text-slate-200 text-sm sm:text-base mb-10 leading-relaxed">
              Inscription en 2 minutes. Vos premières mensurations et fiches clients enregistrées dès aujourd&apos;hui.
            </p>
            <div className="mb-6">
              <AppDownloadButtons />
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2.5 px-9 py-3.5 rounded-full bg-[#D97706] hover:bg-[#b46305] text-white font-bold text-xs uppercase tracking-wider shadow-[0_10px_35px_rgba(217,119,6,0.45)] transition-all"
              >
                Inscrire mon atelier gratuitement <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <p className="text-xs text-slate-300 mt-4">
              Gratuit • Sans carte bancaire • Prise en main instantanée
            </p>
          </div>
        </div>
      </section>

      {/* ─── 11. FOOTER (Mon Atelier Style) ─── */}
      <footer className="bg-white border-t border-[#EBE7DF] pt-16 pb-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#0F3B32] flex items-center justify-center text-white">
                <Scissors className="w-5 h-5 text-[#D97706]" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-[#0F3B32] font-serif-luxury">
                Atelier<span className="text-[#D97706]">Pro</span>
              </span>
            </Link>
            <p className="text-xs text-[#4B5563] leading-relaxed mb-4">
              La solution digitale complète de haute confection pour tailleurs, stylistes et ateliers de couture.
            </p>
            <p className="text-xs font-semibold text-[#0F3B32]">
              Dakar • Abidjan • Bamako • Cotonou • Paris
            </p>
          </div>

          {/* Col 1 */}
          <div>
            <h4 className="text-xs font-bold text-[#0F3B32] uppercase tracking-wider mb-4">
              Fonctionnalités
            </h4>
            <ul className="space-y-2 text-xs text-[#4B5563]">
              <li>
                <a href="#fonctionnalites" className="hover:text-[#0F3B32]">
                  Carnet de Mesures & Gabarits
                </a>
              </li>
              <li>
                <a href="#fonctionnalites" className="hover:text-[#0F3B32]">
                  Suivi de Production Kanban
                </a>
              </li>
              <li>
                <a href="#fonctionnalites" className="hover:text-[#0F3B32]">
                  Acomptes Wave & Orange Money
                </a>
              </li>
              <li>
                <a href="#fonctionnalites" className="hover:text-[#0F3B32]">
                  Reçus WhatsApp Automatisés
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-xs font-bold text-[#0F3B32] uppercase tracking-wider mb-4">
              AtelierPro
            </h4>
            <ul className="space-y-2 text-xs text-[#4B5563]">
              <li>
                <a href="#comparatif" className="hover:text-[#0F3B32]">
                  Pourquoi AtelierPro ?
                </a>
              </li>
              <li>
                <a href="#simulateur" className="hover:text-[#0F3B32]">
                  Simulateur de Rentabilité
                </a>
              </li>
              <li>
                <a href="#temoignages" className="hover:text-[#0F3B32]">
                  Avis des Ateliers
                </a>
              </li>
              <li>
                <a href="#tarifs" className="hover:text-[#0F3B32]">
                  Grille Tarifaire (FCFA)
                </a>
              </li>
              <li>
                <Link href="/blog" className="hover:text-[#0F3B32] font-semibold text-[#0F3B32] inline-flex items-center gap-1">
                  <span>Magazine & Blog Mode</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-[#D97706]/15 text-[#D97706] rounded-full font-bold">New</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold text-[#0F3B32] uppercase tracking-wider mb-4">
              Contact & Assistance
            </h4>
            <div className="space-y-2.5 text-xs text-[#4B5563]">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#0F3B32]" />
                <span>+221 77 000 00 00</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#0F3B32]" />
                <span>support@atelierpro.app</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0F3B32]" />
                <span>Espace chiffré & sauvegardé</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-8 border-t border-[#EBE7DF] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} AtelierPro. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <Link href="/blog" className="hover:text-[#0F3B32]">
              Blog Mode
            </Link>
            <Link href="/auth/login" className="hover:text-[#0F3B32]">
              Espace Client
            </Link>
            <Link href="/auth/login" className="hover:text-[#0F3B32]">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/auth/login" className="hover:text-[#0F3B32]">
              Confidentialité
            </Link>
          </div>
        </div>
      </footer>

      {/* Reader Modal for Blog Articles */}
      <ArticleReaderModal
        article={selectedBlogArticle}
        isOpen={isBlogModalOpen}
        onClose={() => setIsBlogModalOpen(false)}
      />
    </div>
  );
}
