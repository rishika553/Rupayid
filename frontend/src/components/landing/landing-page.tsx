'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  GraduationCap,
  Coins,
  Home,
  Camera,
  Landmark,
  Lock,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  Plane,
  Play,
  Receipt,
  Shield,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  User,
  Users,
  UsersRound,
  Wallet,
  X,
  Zap,
  Download,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const phone = '+91 93849 46499'
const whatsapp = 'https://wa.me/919384946499'
const instagram = 'https://instagram.com/rupayaid'

const navItems = [
  ['About', '#about'],
  ['How it works', '#how-it-works'],
  ['Community lending', '#lending'],
  ['Referral program', '#referrals'],
  ['FAQ', '#faq'],
  ['Contact us', '#contact'],
]

const features = [
  { icon: ShieldCheck, title: 'Protected by design', text: 'Thoughtful KYC and onboarding keeps your journey protected and easy to follow.', tone: 'mint' },
  { icon: Clock3, title: 'Built for real life', text: 'Simple steps and clear updates help you spend less time wondering what comes next.', tone: 'peach' },
  { icon: Sprout, title: 'A way forward', text: 'Practical financial assistance to help you handle today while planning for tomorrow.', tone: 'blue' },
]

const steps: Array<[string, string, string, LucideIcon]> = [
  ['01', 'Create your account', 'Sign in with email or Google to start.', User],
  ['02', 'Complete KYC', 'Share identity and bank details through a guided checklist.', BadgeCheck],
  ['03', 'Apply for a loan', 'Choose an amount and tenure that fits your need.', Wallet],
  ['04', 'Eligibility check', 'We assess your request against published criteria.', BarChart3],
  ['05', 'Approval & disbursement', 'If approved, funds move to your verified bank account.', Landmark],
  ['06', 'Repayment', 'Pay EMIs from the app on the agreed schedule.', Coins],
]

const faqs = [
  ['What is RupayAid?', 'RupayAid is a simple, transparent way to navigate temporary financial needs with respectful human guidance and clear next steps.'],
  ['Who can apply?', 'Indian residents with a genuine short-term financial need can contact our team to understand whether the process may be suitable for them.'],
  ['How does the process work?', 'Start by contacting us. We will guide you through sharing details, verification, assessment, approval, disbursement and repayment.'],
  ['What documents are required?', 'Requirements vary by request, but may include identity, address, income and bank account information. Our team will share the exact list.'],
  ['How is my application assessed?', 'We review the information you provide against our applicable eligibility and verification criteria.'],
  ['How are funds disbursed?', 'Once approved, funds are sent only to the verified bank account shared during the process.'],
  ['How does repayment work?', 'Repayment follows the schedule and terms agreed with you before disbursement.'],
  ['What fees apply?', 'The first 100 customers have no platform fee. Our planned pricing is a ₹365 platform fee plus a ₹999 verification fee, subject to applicable terms.'],
  ['What is Community Lending?', 'Community Lending is our upcoming structured model for eligible contributors who want to participate responsibly in lending opportunities.'],
  ['Who can become a Lending Partner?', 'Eligible contributors who meet our verification and participation criteria can express interest as the programme develops.'],
]

const audiences: Array<[LucideIcon, string]> = [
  [Home, 'Unexpected household expenses'],
  [Receipt, 'Urgent bills'],
  [GraduationCap, 'Education-related expenses'],
  [Plane, 'Travel / transportation needs'],
  [Clock3, 'Temporary financial gaps'],
]

function Logo({ light = false }: { light?: boolean }) {
  return <a href="#top" className={`flex items-center gap-2.5 font-sans text-lg font-extrabold tracking-[-0.04em] ${light ? 'text-white' : 'text-[#082E61]'}`} aria-label="RupayAid home"><span className={`grid size-8 place-items-center rounded-xl ${light ? 'bg-white/15 text-white' : 'bg-[#082E61] text-white'}`}><Landmark className="size-4" /></span><span>Rupay<span className={light ? 'text-emerald-300' : 'text-emerald-600'}>Aid</span></span></a>
}

function SectionHeading({ eyebrow, title, body, align = 'left', light = false }: { eyebrow: string; title: string; body?: string; align?: 'left' | 'center'; light?: boolean }) {
  return <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}><p className={`mb-4 font-mono text-xs font-semibold uppercase tracking-[0.18em] ${light ? 'text-emerald-300' : 'text-emerald-700'}`}>{eyebrow}</p><h2 className={`font-sans text-3xl font-extrabold leading-tight tracking-[-0.045em] sm:text-5xl ${light ? 'text-white' : 'text-primary'}`}>{title}</h2>{body && <p className={`mt-5 text-base leading-7 sm:text-lg ${light ? 'text-white/70' : 'text-muted-foreground'}`}>{body}</p>}</div>
}

function ButtonLink({ children, href = '#contact', secondary = false }: { children: React.ReactNode; href?: string; secondary?: boolean }) {
  return <a href={href} className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-3 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${secondary ? 'border border-border bg-white/70 text-primary hover:bg-white' : 'bg-accent text-accent-foreground shadow-[0_10px_25px_-12px_rgba(224,104,69,.7)] hover:bg-accent/90'}`}>{children}</a>
}

const stories = [
  { image: '/rupayaid-community.png', label: 'Community first', title: 'Support that feels human.', desc: 'Building a financial ecosystem rooted in trust and transparency.' },
  { image: '/rupayaid-journey.png', label: 'Your next step', title: 'A clearer way forward.', desc: 'Navigate your financial journey with confidence and clarity.' },
  { image: '/rupayaid-support.png', label: 'Here to help', title: 'Guidance when it matters.', desc: 'Real people ready to help you take the next step.' },
  { image: '/rupayaid-lending.png', label: 'Together', title: 'Strength in community.', desc: 'Community lending that creates opportunity for everyone.' },
]

function ImageCarousel() {
  const [active, setActive] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (isPaused) return
    const timer = window.setInterval(() => {
      setDirection(1)
      setActive((c) => (c + 1) % stories.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [isPaused])

  function goTo(index: number) {
    setDirection(index > active ? 1 : -1)
    setActive(index)
  }

  function next() {
    setDirection(1)
    setActive((c) => (c + 1) % stories.length)
  }

  function prev() {
    setDirection(-1)
    setActive((c) => (c - 1 + stories.length) % stories.length)
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0, scale: 0.95 }),
  }

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative overflow-hidden rounded-[2rem] shadow-[0_30px_80px_-30px_rgba(15,76,129,.4)]">
        <div className="relative aspect-[16/9] sm:aspect-[2/1] lg:aspect-[2.2/1]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={active}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              <img
                src={stories[active].image}
                alt={stories[active].title}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#082E61]/90 via-[#082E61]/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#082E61]/40 to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Content overlay */}
          <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200 backdrop-blur-sm">
                  <Sparkles className="size-3" /> {stories[active].label}
                </span>
                <h3 className="mt-3 max-w-md font-sans text-2xl font-bold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
                  {stories[active].title}
                </h3>
                <p className="mt-2 max-w-md text-sm text-white/70 sm:text-base">
                  {stories[active].desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 sm:left-5 sm:size-12"
            aria-label="Previous slide"
          >
            <ChevronRight className="size-5 rotate-180" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 sm:right-5 sm:size-12"
            aria-label="Next slide"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Dot indicators + counter */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <div className="flex gap-2" role="tablist" aria-label="Image carousel">
          {stories.map((story, index) => (
            <button
              key={story.image}
              type="button"
              role="tab"
              aria-label={`Show ${story.label}`}
              aria-selected={active === index}
              onClick={() => goTo(index)}
              className="group relative h-2 overflow-hidden rounded-full transition-all"
              style={{ width: active === index ? 32 : 8 }}
            >
              <span className={`absolute inset-0 rounded-full transition-colors ${active === index ? 'bg-emerald-500' : 'bg-[#082E61]/20 group-hover:bg-emerald-300'}`} />
              {active === index && (
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald-600"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: isPaused ? 99999 : 5, ease: 'linear' }}
                />
              )}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-[#71819A]">{String(active + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}</span>
      </div>
    </div>
  )
}

const floatingCardVariants = {
  float: (i: number) => ({
    y: [0, -4, 0],
    transition: {
      y: { duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' },
    },
  }),
}

function SmartphoneMockup() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    function onScroll() { setScrollY(window.scrollY) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const parallaxY = scrollY * -0.08

  return (
    <div ref={wrapperRef} className="hero-phone-wrapper">
      <div className="hero-phone-gradient" />
      {/* Dot pattern overlay */}
      <div className="hero-dot-pattern" />

      {/* Decorative strokes top-right */}
      <svg className="hero-decor-strokes" width="40" height="50" viewBox="0 0 40 50" fill="none">
        <path d="M8 5 C12 2, 20 1, 28 4" stroke="#008A76" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M5 18 C10 14, 22 13, 32 17" stroke="#008A76" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M10 30 C15 27, 24 26, 30 30" stroke="#008A76" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>

      {/* Decorative arrow bottom-left */}
      <svg className="hero-decor-arrow" width="60" height="50" viewBox="0 0 60 50" fill="none">
        <path d="M5 5 C15 35, 40 42, 55 38" stroke="#008A76" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M48 32 L55 38 L47 42" stroke="#008A76" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>

      {/* Floating cards - left side */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        whileInView="float"
        custom={0}
        variants={floatingCardVariants}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="hero-float-card hero-float-card-1"
        whileHover={{ scale: 1.05, boxShadow: '0 16px 40px -10px rgba(15,76,129,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Wallet className="size-5" /></span>
          <div>
            <p className="text-xs text-[#71819A]">Flexible loan amounts</p>
            <p className="text-sm font-bold text-[#082E61]">₹10,000 – ₹5,00,000</p>
          </div>
        </div>
        <ChevronRight className="ml-auto size-4 shrink-0 text-[#71819A]" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        whileInView="float"
        custom={1}
        variants={floatingCardVariants}
        transition={{ delay: 0.65, duration: 0.6 }}
        className="hero-float-card hero-float-card-2"
        whileHover={{ scale: 1.05, boxShadow: '0 16px 40px -10px rgba(15,76,129,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600"><Zap className="size-5" /></span>
          <div>
            <p className="text-xs text-[#71819A]">Quick process</p>
            <p className="text-sm font-bold text-[#082E61]">100% online</p>
          </div>
        </div>
        <ChevronRight className="ml-auto size-4 shrink-0 text-[#71819A]" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        whileInView="float"
        custom={2}
        variants={floatingCardVariants}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="hero-float-card hero-float-card-3"
        whileHover={{ scale: 1.05, boxShadow: '0 16px 40px -10px rgba(15,76,129,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-600"><UsersRound className="size-5" /></span>
          <div>
            <p className="text-xs text-[#71819A]">Human support</p>
            <p className="text-sm font-bold text-[#082E61]">Real people, real help</p>
          </div>
        </div>
        <ChevronRight className="ml-auto size-4 shrink-0 text-[#71819A]" />
      </motion.div>

      {/* Floating cards - right side */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        whileInView="float"
        custom={3}
        variants={floatingCardVariants}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="hero-float-card hero-float-card-4"
        whileHover={{ scale: 1.05, boxShadow: '0 16px 40px -10px rgba(15,76,129,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600"><Calendar className="size-5" /></span>
          <div>
            <p className="text-xs text-[#71819A]">Easy repayments</p>
            <p className="text-sm font-bold text-[#082E61]">Flexible EMIs</p>
          </div>
        </div>
        <ChevronRight className="ml-auto size-4 shrink-0 text-[#71819A]" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        whileInView="float"
        custom={4}
        variants={floatingCardVariants}
        transition={{ delay: 0.85, duration: 0.6 }}
        className="hero-float-card hero-float-card-5"
        whileHover={{ scale: 1.05, boxShadow: '0 16px 40px -10px rgba(15,76,129,0.3)' }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Shield className="size-5" /></span>
          <div>
            <p className="text-xs text-[#71819A]">Safe & secure</p>
            <p className="text-sm font-bold text-[#082E61]">Bank-grade security</p>
          </div>
        </div>
        <ChevronRight className="ml-auto size-4 shrink-0 text-[#71819A]" />
      </motion.div>

      {/* Phone frame with parallax */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
        className="hero-phone"
        style={{ transform: `perspective(1200px) rotateY(-4deg) rotateX(2deg) translateY(${parallaxY}px)` }}
      >
        {/* Glass reflection overlay */}
        <div className="hero-phone-reflection" />
        {/* Side buttons */}
        <div className="hero-phone-btn-right hero-phone-btn-power" />
        <div className="hero-phone-btn-left hero-phone-btn-vol-up" />
        <div className="hero-phone-btn-left hero-phone-btn-vol-down" />
        <div className="hero-phone-btn-left hero-phone-btn-silent" />

        <div className="hero-phone-notch">
          <div className="hero-phone-camera" />
        </div>
        <div className="hero-phone-screen">
          {/* Skeleton shimmer that fades out */}
          <motion.div
            className="hero-phone-skeleton"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <div className="hero-skeleton-bar w-1/3" style={{ marginTop: 40 }} />
            <div className="hero-skeleton-bar w-2/3" style={{ marginTop: 8 }} />
            <div className="hero-skeleton-block" style={{ marginTop: 16 }} />
            <div className="hero-skeleton-bar w-1/2" style={{ marginTop: 16 }} />
            <div className="hero-skeleton-bar w-3/4" style={{ marginTop: 8 }} />
            <div className="hero-skeleton-bar w-2/5" style={{ marginTop: 8 }} />
            <div className="hero-skeleton-bar w-3/5" style={{ marginTop: 8 }} />
          </motion.div>

          {/* Actual screen content fades in */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="h-full"
          >
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[9px] font-semibold text-[#082E61]">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><rect x="0" y="6" width="2.5" height="4" rx="0.5" fill="#082E61"/><rect x="3.5" y="4" width="2.5" height="6" rx="0.5" fill="#082E61"/><rect x="7" y="2" width="2.5" height="8" rx="0.5" fill="#082E61"/><rect x="10.5" y="0" width="2.5" height="10" rx="0.5" fill="#082E61" opacity="0.3"/></svg>
                <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1.5 3.5C3.8 1.3 6.2 1.3 8.5 3.5" stroke="#082E61" strokeWidth="1.2" strokeLinecap="round" fill="none"/><path d="M3 5.5C4.3 4.2 5.7 4.2 7 5.5" stroke="#082E61" strokeWidth="1.2" strokeLinecap="round" fill="none"/><circle cx="5" cy="7.5" r="1" fill="#082E61"/></svg>
                <svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0" y="1" width="18" height="8" rx="2" stroke="#082E61" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="13" height="5" rx="1" fill="#082E61"/><rect x="19" y="3" width="2" height="4" rx="0.5" fill="#082E61" opacity="0.4"/></svg>
              </div>
            </div>

            {/* App header */}
            <div className="flex items-center justify-between px-4 py-2">
              <Menu className="size-4 text-[#082E61]" />
              <span className="text-xs font-bold text-[#082E61]">Rupay<span className="text-emerald-600">Aid</span></span>
              <div className="flex items-center gap-2">
                <Bell className="size-3.5 text-[#082E61]" />
                <div className="grid size-6 place-items-center rounded-full bg-orange-500 text-[9px] font-bold text-white">A</div>
              </div>
            </div>

            {/* Greeting */}
            <div className="px-4 pt-2">
              <p className="text-sm font-bold text-[#082E61]">Hi Amit,</p>
              <p className="text-[10px] text-[#71819A]">Here&apos;s your financial journey</p>
            </div>

            {/* Loan card */}
            <div className="mx-4 mt-3 rounded-xl bg-[#07396B] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-white/80">Loan Application</span>
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[8px] font-bold text-white">In Review</span>
              </div>
              <p className="mt-1 text-xl font-bold text-white">₹1,50,000</p>
              {/* Progress tracker */}
              <div className="mt-3 flex items-center justify-between">
                {['Applied', 'Verification', 'Approval', 'Disbursement'].map((step, i) => (
                  <div key={step} className="flex flex-col items-center gap-1">
                    <div className="relative">
                      <div className={`size-2.5 rounded-full ${i < 2 ? 'bg-emerald-400' : 'bg-white/30'}`} />
                      {i === 1 && <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-40" />}
                    </div>
                    <span className="text-[6px] text-white/70">{step}</span>
                    <span className="text-[5px] text-white/50">{i === 0 ? '12 Aug' : i === 1 ? 'In progress' : 'Pending'}</span>
                  </div>
                ))}
              </div>
              {/* Progress connector line */}
              <div className="relative mx-auto mt-[-22px] mb-[14px] flex w-[85%] items-center">
                <div className="h-[1px] flex-1 bg-emerald-400/60" />
                <div className="h-[1px] flex-1 bg-emerald-400/40" />
                <div className="h-[1px] flex-1 bg-white/15" />
              </div>
            </div>

            {/* Recent activity */}
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#082E61]">Recent Activity</span>
                <span className="text-[9px] text-[#247CFF]">View all</span>
              </div>
              <div className="mt-2 space-y-2">
                {[
                  { label: 'Application submitted', sub: '12 Aug 2026', color: 'bg-emerald-500' },
                  { label: 'KYC verification', sub: 'In progress', color: 'bg-blue-500' },
                  { label: 'Loan approval', sub: 'Pending', color: 'bg-gray-300' },
                  { label: 'Disbursement', sub: 'Pending', color: 'bg-gray-300' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`size-4 shrink-0 rounded-full ${item.color} grid place-items-center`}>
                      {item.color !== 'bg-gray-300' && <Check className="size-2 text-white" />}
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-[#082E61]">{item.label}</p>
                      <p className="text-[7px] text-[#71819A]">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom nav */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-gray-100 bg-white px-2 py-2">
              {[
                { icon: Home, label: 'Home', active: true },
                { icon: Landmark, label: 'Loans', active: false },
                { icon: Coins, label: 'Repayments', active: false },
                { icon: User, label: 'Profile', active: false },
              ].map(item => (
                <div key={item.label} className="flex flex-col items-center gap-0.5">
                  <item.icon className={`size-3.5 ${item.active ? 'text-[#247CFF]' : 'text-[#71819A]'}`} />
                  <span className={`text-[7px] ${item.active ? 'font-bold text-[#247CFF]' : 'text-[#71819A]'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function onContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setContactStatus('sending')
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
      const response = await fetch(`${base}/health/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          subject: String(data.get('subject') || ''),
          message: String(data.get('message') || ''),
        }),
      })
      if (!response.ok) {
        throw new Error('failed')
      }
      form.reset()
      setContactStatus('sent')
    } catch {
      setContactStatus('error')
    }
  }

  return <div className="landing-root"><main id="top" className="overflow-hidden">
    {/* ─── NAVBAR ─── */}
    <nav className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6 sm:pt-5">
      <div className="mx-auto flex max-w-[1460px] items-center justify-between rounded-full border border-white/60 bg-white/85 px-5 py-3 shadow-[0_8px_32px_-12px_rgba(15,76,129,.18)] backdrop-blur-xl sm:px-7 sm:py-4">
        <Logo />
        <div className="hidden items-center gap-7 lg:flex">
          {navItems.map(([label, href]) => (
            <a key={href} href={href} className="text-[13px] font-medium text-[#4A5568] transition hover:text-[#082E61]">{label}</a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-[13px] font-semibold text-[#4A5568] transition hover:text-[#082E61] sm:inline">Sign in</Link>
          <Link href="/login" className="hidden items-center gap-2 rounded-full bg-[#FF8B37] px-5 py-2.5 text-[13px] font-bold text-[#1a1a1a] shadow-[0_4px_14px_-4px_rgba(255,139,55,.5)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_-4px_rgba(255,139,55,.6)] sm:inline-flex">
            Get started <ArrowRight className="size-4" />
          </Link>
          <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-full border border-gray-200 text-[#082E61] lg:hidden"><Menu className="size-5" /></button>
        </div>
      </div>
    </nav>

    {/* ─── MOBILE MENU ─── */}
    <AnimatePresence>{menuOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-[#082E61]/30 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}><motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26 }} onClick={e => e.stopPropagation()} className="ml-auto flex h-full w-[min(88%,380px)] flex-col bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><Logo /><button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-full border border-gray-200"><X className="size-5" /></button></div><div className="mt-12 flex flex-col gap-2">{navItems.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-4 text-lg font-semibold text-[#082E61] hover:bg-gray-50">{label}</a>)}<Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-4 text-lg font-semibold text-[#082E61] hover:bg-gray-50">Sign in</Link></div><div className="mt-auto rounded-3xl bg-[#082E61] p-6 text-white"><p className="text-sm text-white/70">Need a little support?</p><p className="mt-2 text-xl font-bold">We are here to help you take the next step.</p><a href={whatsapp} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-300">Chat on WhatsApp <ArrowRight className="size-4" /></a></div></motion.aside></motion.div>}</AnimatePresence>

    {/* ─── HERO SECTION ─── */}
    <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-8 sm:pb-24 sm:pt-40 lg:pb-32 lg:pt-44">
      <div className="mx-auto grid max-w-[1460px] items-center gap-12 lg:grid-cols-[43%_57%] lg:gap-8">
        {/* Left column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          {/* Badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#b8ede0] bg-[#E5FAF3] px-4 py-2 text-sm font-semibold text-[#0d6b5a]">
            <Sparkles className="size-4" /> Financial support, made human
          </div>

          {/* Headline */}
          <h1 className="font-sans text-[44px] font-extrabold leading-[1.04] tracking-[-0.055em] text-[#082E61] sm:text-[56px] lg:text-[72px]">
            Financial support{' '}
            <br className="hidden sm:block" />
            that gets you{' '}
            <br className="hidden sm:block" />
            <span className="hero-green-underline text-[#008A76]">back on track.</span>
          </h1>

          {/* Description */}
          <p className="mt-7 max-w-[560px] text-lg leading-[1.6] text-[#71819A] sm:text-xl">
            Simple, transparent and trustworthy financial support when you need it. Apply online, track your progress, and move forward with confidence.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <Link href="/login" className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#247CFF] px-8 py-4 text-base font-bold text-white shadow-[0_8px_24px_-8px_rgba(36,124,255,.5)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(36,124,255,.6)] sm:px-10 sm:py-5">
              Get started <ArrowRight className="size-5" />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#d0d8e4] bg-white px-7 py-4 text-base font-bold text-[#082E61] transition hover:-translate-y-0.5 hover:border-[#b0bdd0] hover:shadow-md sm:py-5">
              <Play className="size-4 fill-[#247CFF] text-[#247CFF]" /> See how it works
            </a>
          </div>

          {/* Stats */}
          <div className="mt-12 flex flex-wrap items-center gap-8 sm:gap-12">
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-full bg-emerald-50">
                <Users className="size-6 text-emerald-600" />
              </span>
              <div>
                <p className="text-xl font-bold text-[#082E61]">50K +</p>
                <p className="text-sm text-[#71819A]">People supported</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-full bg-blue-50">
                <Download className="size-6 text-blue-600" />
              </span>
              <div>
                <p className="text-xl font-bold text-[#082E61]">₹200 Cr+</p>
                <p className="text-sm text-[#71819A]">Loans facilitated</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-full bg-orange-50">
                <Star className="size-6 text-orange-500" />
              </span>
              <div>
                <p className="text-xl font-bold text-[#082E61]">4.8/5</p>
                <p className="text-sm text-[#71819A]">User satisfaction</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right column - Smartphone */}
        <div className="relative flex items-center justify-center lg:justify-end">
          <SmartphoneMockup />
        </div>
      </div>
    </section>

    {/* ─── IMAGE CAROUSEL ─── */}
    <section aria-label="RupayAid stories" className="section-bg-warm px-5 pb-10 pt-8 sm:px-8 sm:pb-16 sm:pt-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 grid items-end gap-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-emerald-700">A human approach</p>
            <h2 className="mt-3 max-w-md font-sans text-3xl font-extrabold leading-tight tracking-[-.05em] text-primary sm:text-4xl">Real people. Real moments. One step at a time.</h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-muted-foreground lg:text-right">Explore the values behind a simpler, more thoughtful financial support experience.</p>
        </div>
        <ImageCarousel />
      </div>
    </section>

    {/* ─── ABOUT ─── */}
    <section id="about" className="section-bg-white px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
        <SectionHeading eyebrow="Why RupayAid" title="A little support can make a big difference." />
        <div>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">Real life does not always follow a plan. We are building a respectful, straightforward way to move through temporary financial needs — with clear communication at every step.</p>
          <a href="#how-it-works" className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary">Learn how we can help <ArrowRight className="size-4 transition group-hover:translate-x-1" /></a>
        </div>
      </div>
    </section>

    {/* ─── FEATURES ─── */}
    <section className="section-bg-mint px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="The RupayAid difference" title="Designed to feel simple, safe and human." body="No confusing jargon. No disappearing acts. Just thoughtful support for the moments that need it." />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text, tone }) => (
            <motion.article whileHover={{ y: -6, boxShadow: '0 24px 55px -25px rgba(15,76,129,.45)' }} key={title} className="rounded-3xl border border-white/80 bg-white p-8 shadow-[0_16px_45px_-32px_rgba(15,76,129,.35)] transition-shadow">
              <div className={`mb-7 grid size-14 place-items-center rounded-2xl ${tone === 'mint' ? 'bg-emerald-100 text-emerald-700' : tone === 'peach' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-primary'}`}>
                <Icon className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-primary">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>

    {/* ─── HOW IT WORKS ─── */}
    <section id="how-it-works" className="section-bg-blue px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="How it works" title="A clear path from need to next step." body="Our team keeps you informed and supported through every stage." />
        <div className="relative mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(([number, title, text, StepIcon]) => (
            <motion.div whileHover={{ y: -4 }} key={number} className="relative flex gap-4 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#082E61] text-white">
                <StepIcon className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-emerald-700">{number}</span>
                  <h3 className="font-bold text-primary">{title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-br from-[#082E61] to-[#0a4a8a] p-7 text-white shadow-[0_20px_50px_-20px_rgba(8,46,97,.5)] sm:flex-row sm:items-center sm:p-9">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Apply online</p>
            <p className="mt-3 max-w-2xl text-lg font-semibold leading-7">Create an account, complete KYC, and submit a loan application from the RupayAid portal.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <ButtonLink href="/login">Apply now <ArrowRight className="size-4" /></ButtonLink>
            <ButtonLink href={whatsapp} secondary><MessageCircle className="size-4" /> WhatsApp</ButtonLink>
          </div>
        </div>
      </div>
    </section>

    {/* ─── COMMUNITY LENDING ─── */}
    <section id="lending" className="section-bg-warm px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div className="lending-visual group rounded-[2rem] p-6 transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_70px_-28px_rgba(15,76,129,.65)] sm:p-10">
          <img src="/rupayaid-lending.png" alt="Community members planning a brighter financial future" className="absolute inset-0 size-full object-cover opacity-25 mix-blend-screen transition duration-700 group-hover:scale-105 group-hover:opacity-35" />
          <div className="absolute inset-0 bg-primary/55" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Coming soon</span>
              <Users className="size-5 text-white/70" />
            </div>
            <div className="mt-24 max-w-xs text-white">
              <p className="text-sm text-white/60">Community Lending</p>
              <p className="mt-2 text-4xl font-bold leading-tight tracking-[-0.05em]">Together, we can create more room to move.</p>
            </div>
            <div className="mt-16 flex gap-2">
              <span className="h-1.5 w-20 rounded-full bg-emerald-300" />
              <span className="h-1.5 w-8 rounded-full bg-white/20" />
              <span className="h-1.5 w-8 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="For the community" title="Become a Lending Partner." body="We are shaping a structured lending model for eligible contributors who want to participate responsibly and transparently." />
          <ul className="mt-8 grid gap-4">
            {['Structured and guided', 'Built for eligible contributors', 'Clear repayment tracking'].map(item => (
              <li key={item} className="flex items-center gap-3 text-sm font-semibold text-primary">
                <span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-4" /></span>{item}
              </li>
            ))}
          </ul>
          <ButtonLink href="#contact"><span>Express your interest</span><ArrowRight className="size-4" /></ButtonLink>
        </div>
      </div>
    </section>

    {/* ─── REFERRALS ─── */}
    <section id="referrals" className="section-bg-navy px-5 py-24 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading light eyebrow="Referral programme" title="Good support is worth passing on." body="Know someone who could use a little room to move? Help them take the next step." />
          <ButtonLink href="/login">Share your code <ArrowRight className="size-4" /></ButtonLink>
        </div>
        <div className="mt-14 grid gap-3 md:grid-cols-4">
          {['Refer someone', 'They apply', 'They complete the process', 'Eligible benefit applies'].map((item, i) => (
            <motion.div whileHover={{ y: -4, backgroundColor: 'rgba(255,255,255,0.12)' }} key={item} className="relative rounded-3xl border border-white/10 bg-white/[.07] p-6 transition-colors">
              <span className="font-mono text-xs text-emerald-300">0{i + 1}</span>
              <div className="mt-10 text-lg font-bold">{item}</div>
              {i < 3 && <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden size-5 text-emerald-300 md:block" />}
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ─── WHAT MATTERS ─── */}
    <section className="section-bg-mint px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <SectionHeading align="center" eyebrow="What matters" title="More clarity. More confidence. More room to move." />
        <div className="mt-12 grid gap-5 text-left sm:grid-cols-2">
          {[['Feel supported', 'Get thoughtful guidance instead of figuring everything out alone.'], ['Keep moving forward', 'Make space for the next practical step with a process you can understand.']].map(([title, text]) => (
            <motion.div whileHover={{ y: -5 }} key={title} className="rounded-3xl bg-white p-8 shadow-[0_15px_40px_-35px_rgba(15,76,129,.5)] transition-shadow hover:shadow-[0_22px_55px_-30px_rgba(15,76,129,.45)]">
              <div className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-5" />
              </div>
              <h3 className="mt-8 text-xl font-bold text-primary">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ─── FAQ ─── */}
    <section id="faq" className="section-bg-white px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.72fr_1.28fr]">
        <SectionHeading eyebrow="FAQ" title="Questions are a good place to start." body="We believe clarity builds confidence. Here are a few things people ask us most." />
        <div className="divide-y divide-border rounded-3xl border border-border bg-white px-5 shadow-[0_8px_30px_-20px_rgba(15,76,129,.15)] sm:px-7">
          {faqs.map(([question, answer], i) => (
            <div key={question}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-expanded={openFaq === i}>
                <span>{question}</span>
                <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition ${openFaq === i ? 'rotate-180 text-emerald-600' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="pb-5 pr-8 text-sm leading-7 text-muted-foreground">{answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ─── CTA BANNER ─── */}
    <section className="section-bg-gradient px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#082E61] via-[#0a4a8a] to-[#082E61] px-6 py-16 text-center shadow-[0_24px_60px_-20px_rgba(8,46,97,.5)] sm:px-10">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/70">A little room goes a long way</p>
        <h2 className="mx-auto mt-5 max-w-3xl font-sans text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-6xl">From &quot;I need help&quot; to &quot;I&apos;ve got this.&quot;</h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-[#247CFF] px-7 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(36,124,255,.5)] transition hover:-translate-y-0.5">
            Get started <ArrowRight className="size-4" />
          </Link>
          <a href={`tel:${phone.replaceAll(' ', '')}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
            <Phone className="size-4" /> {phone}
          </a>
        </div>
      </div>
    </section>

    {/* ─── AUDIENCES ─── */}
    <section className="section-bg-warm px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading align="center" eyebrow="Who is RupayAid for?" title="Support for the moments life doesn&apos;t schedule." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {audiences.map(([AudienceIcon, label]) => (
            <motion.div whileHover={{ y: -5, boxShadow: '0 18px 40px -18px rgba(15,76,129,.35)' }} key={label} className="rounded-3xl border border-white/70 bg-white p-6 shadow-sm transition-shadow">
              <div className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <AudienceIcon className="size-5" />
              </div>
              <p className="mt-10 text-sm font-bold leading-6 text-primary">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ─── CONTACT ─── */}
    <section id="contact" className="section-bg-blue px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_.8fr]">
        <div>
          <SectionHeading eyebrow="Contact us" title="Let&apos;s take the next step together." body="Tell us a little about what you need. A member of our team will get back to you with clarity and care." />
          <form onSubmit={onContact} className="mt-10 grid gap-4 rounded-3xl border border-white/70 bg-white p-6 shadow-[0_20px_55px_-38px_rgba(15,76,129,.5)] sm:grid-cols-2 sm:p-8">
            <label className="grid gap-2 text-xs font-bold text-primary">Name<input required name="name" placeholder="Your name" className="rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-normal outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="grid gap-2 text-xs font-bold text-primary">Email<input required type="email" name="email" placeholder="you@example.com" className="rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-normal outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="grid gap-2 text-xs font-bold text-primary sm:col-span-2">Subject<input name="subject" placeholder="How can we help?" className="rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-normal outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
            <label className="grid gap-2 text-xs font-bold text-primary sm:col-span-2">Message<textarea required name="message" rows={4} placeholder="Share a little context..." className="resize-none rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-normal outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
            {contactStatus === 'sent' ? <p className="text-sm font-semibold text-emerald-700 sm:col-span-2">Thanks. We received your message.</p> : null}
            {contactStatus === 'error' ? <p className="text-sm font-semibold text-destructive sm:col-span-2">Could not send. Try WhatsApp or email instead.</p> : null}
            <button type="submit" disabled={contactStatus === 'sending'} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#082E61] px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0a3d7a] sm:col-span-2">{contactStatus === 'sending' ? 'Sending…' : 'Send message'} <ArrowRight className="size-4" /></button>
          </form>
        </div>
        <div className="flex flex-col justify-end">
          <div className="contact-visual rounded-[2rem] p-7 text-white sm:p-10">
            <Lock className="size-7 text-emerald-300" />
            <p className="mt-24 max-w-xs text-3xl font-bold leading-tight tracking-[-0.05em]">Your questions deserve a safe place.</p>
          </div>
          <div className="mt-4 grid gap-2 rounded-3xl border border-white/70 bg-white p-5">
            <a href={whatsapp} className="flex items-center gap-3 rounded-2xl p-3 text-sm font-bold text-primary hover:bg-emerald-50"><MessageCircle className="size-5 text-emerald-600" /> Chat on WhatsApp <ExternalLink className="ml-auto size-4 text-muted-foreground" /></a>
            <a href={`tel:${phone.replaceAll(' ', '')}`} className="flex items-center gap-3 rounded-2xl p-3 text-sm font-bold text-primary hover:bg-emerald-50"><Phone className="size-5 text-emerald-600" /> {phone}</a>
            <a href="mailto:hello@rupayaid.com" className="flex items-center gap-3 rounded-2xl p-3 text-sm font-bold text-primary hover:bg-emerald-50"><Mail className="size-5 text-emerald-600" /> hello@rupayaid.com</a>
          </div>
        </div>
      </div>
    </section>

    <footer className="bg-primary px-5 pb-8 pt-16 text-white sm:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr_1fr]"><div><Logo light /><p className="mt-5 max-w-xs text-sm leading-6 text-white/55">Simple, transparent financial support when you need it.</p><a href={instagram} className="mt-6 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="RupayAid on Instagram"><Camera className="size-4" /></a></div><div><h3 className="text-xs font-bold uppercase tracking-[.15em] text-emerald-300">Explore</h3><div className="mt-5 grid gap-3 text-sm text-white/60">{navItems.slice(0, 4).map(([label, href]) => <a key={href} href={href} className="hover:text-white">{label}</a>)}</div></div><div><h3 className="text-xs font-bold uppercase tracking-[.15em] text-emerald-300">Legal</h3><div className="mt-5 grid gap-3 text-sm text-white/60"><a href="/legal/terms" className="hover:text-white">Terms & conditions</a><a href="/legal/privacy" className="hover:text-white">Privacy policy</a><a href="/legal/fees" className="hover:text-white">Fees / cancellation / refund</a><a href="/legal/disclaimer" className="hover:text-white">Financial services disclaimer</a><a href="/legal/grievance" className="hover:text-white">Grievance redressal policy</a></div></div><div><h3 className="text-xs font-bold uppercase tracking-[.15em] text-emerald-300">Contact</h3><div className="mt-5 grid gap-3 text-sm text-white/60"><a href={whatsapp}>WhatsApp us</a><a href="mailto:hello@rupayaid.com">hello@rupayaid.com</a><p>Puducherry, India</p></div></div></div><div className="mt-14 rounded-2xl border border-orange-300/20 bg-orange-300/10 px-4 py-3 text-center text-xs leading-5 text-orange-100"><strong>Security reminder:</strong> RupayAid will never ask for your OTP, PIN or CVV. Report suspicious contact: {phone}.</div><div className="mt-8 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row"><p>© {new Date().getFullYear()} RupayAid. All rights reserved.</p><p>Built around clarity, care and community.</p></div></div></footer>
  </main></div>
}
