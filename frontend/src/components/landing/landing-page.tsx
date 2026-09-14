'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronDown,
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
  Receipt,
  ShieldCheck,
  Sprout,
  Sparkles,
  User,
  Users,
  Wallet,
  X,
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
  ['01', 'Contact us', 'Via WhatsApp or social media.', MessageCircle],
  ['02', 'Share your details', 'We guide you through the required information and documents.', User],
  ['03', 'Verification', 'Our team reviews and verifies your details.', BadgeCheck],
  ['04', 'Eligibility assessment', 'We assess your request against applicable criteria.', BarChart3],
  ['05', 'Approval & disbursement', 'Funds move to your verified bank account.', Wallet],
  ['06', 'Repayment', 'Repay according to your agreed schedule.', Coins],
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
  return <a href="#top" className={`flex items-center gap-2.5 font-sans text-lg font-extrabold tracking-[-0.04em] ${light ? 'text-white' : 'text-primary'}`} aria-label="RupayAid home"><span className={`grid size-8 place-items-center rounded-xl ${light ? 'bg-white/15 text-white' : 'bg-primary text-white'}`}><Landmark className="size-4" /></span><span>Rupay<span className={light ? 'text-emerald-300' : 'text-emerald-600'}>Aid</span></span></a>
}

function SectionHeading({ eyebrow, title, body, align = 'left' }: { eyebrow: string; title: string; body?: string; align?: 'left' | 'center' }) {
  return <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}><p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p><h2 className="font-sans text-3xl font-extrabold leading-tight tracking-[-0.045em] text-primary sm:text-5xl">{title}</h2>{body && <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">{body}</p>}</div>
}

function ButtonLink({ children, href = '#contact', secondary = false }: { children: React.ReactNode; href?: string; secondary?: boolean }) {
  return <a href={href} className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-3 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${secondary ? 'border border-border bg-white/70 text-primary hover:bg-white' : 'bg-accent text-accent-foreground shadow-[0_10px_25px_-12px_rgba(224,104,69,.7)] hover:bg-accent/90'}`}>{children}</a>
}

const stories = [
  { image: '/rupayaid-community.png', label: 'Community first', title: 'Support that feels human.' },
  { image: '/rupayaid-journey.png', label: 'Your next step', title: 'A clearer way forward.' },
  { image: '/rupayaid-support.png', label: 'Here to help', title: 'Guidance when it matters.' },
]

function StoryCarousel() {
  const [active, setActive] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % stories.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [isPaused])

  return <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-2 shadow-[0_24px_70px_-35px_rgba(15,76,129,.55)] sm:p-3" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} onFocus={() => setIsPaused(true)} onBlur={() => setIsPaused(false)}>
    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-muted sm:aspect-[16/10]">
      <AnimatePresence mode="wait">
        <motion.img key={stories[active].image} src={stories[active].image} alt={stories[active].title} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: .45 }} className="absolute inset-0 size-full object-cover" />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7"><p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-emerald-200">{stories[active].label}</p><p className="mt-2 max-w-xs text-2xl font-bold leading-tight tracking-[-.04em] sm:text-3xl">{stories[active].title}</p></div>
    </div>
    <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3 sm:px-3"><div className="flex gap-1.5" role="tablist" aria-label="RupayAid stories">{stories.map((story, index) => <button key={story.image} type="button" role="tab" aria-label={`Show ${story.label}`} aria-selected={active === index} onClick={() => setActive(index)} className={`h-1.5 rounded-full transition-all ${active === index ? 'w-8 bg-emerald-600' : 'w-2 bg-border hover:bg-emerald-300'}`} />)}</div><span className="text-xs font-semibold text-muted-foreground">0{active + 1} / 0{stories.length}</span></div>
  </div>
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return <div className="landing-root"><main id="top" className="overflow-hidden">
    <nav className="fixed inset-x-0 top-0 z-50 px-2 pt-2 sm:px-6 sm:pt-4"><div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-background/80 px-3 py-2 sm:px-5 sm:py-2.5 shadow-[0_10px_40px_-25px_rgba(15,76,129,.45)] backdrop-blur-xl sm:px-5"><Logo /><div className="hidden items-center gap-5 lg:flex">{navItems.map(([label, href]) => <a key={href} href={href} className="text-xs font-semibold text-muted-foreground transition hover:text-primary">{label}</a>)}</div><div className="flex items-center gap-2"><Link href="/login" className="hidden text-xs font-semibold text-muted-foreground transition hover:text-primary sm:inline">Sign in</Link><span className="hidden sm:inline-flex"><ButtonLink href="/login">Get started <ArrowRight className="size-4" /></ButtonLink></span><button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-full border border-border text-primary lg:hidden"><Menu className="size-5" /></button></div></div></nav>

    <AnimatePresence>{menuOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-primary/30 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}><motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26 }} onClick={e => e.stopPropagation()} className="ml-auto flex h-full w-[min(88%,380px)] flex-col bg-background p-6 shadow-2xl"><div className="flex items-center justify-between"><Logo /><button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-full border border-border"><X className="size-5" /></button></div><div className="mt-12 flex flex-col gap-2">{navItems.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-4 text-lg font-semibold text-primary hover:bg-muted">{label}</a>)}<Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-4 text-lg font-semibold text-primary hover:bg-muted">Sign in</Link></div><div className="mt-auto rounded-3xl bg-primary p-6 text-white"><p className="text-sm text-white/70">Need a little support?</p><p className="mt-2 text-xl font-bold">We are here to help you take the next step.</p><a href={whatsapp} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-300">Chat on WhatsApp <ArrowRight className="size-4" /></a></div></motion.aside></motion.div>}</AnimatePresence>

    <section className="relative px-4 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-44 lg:pb-32"><div className="hero-mesh absolute inset-x-0 top-0 -z-10 h-[720px]" /><div className="mx-auto grid min-w-0 max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-20"><div className="min-w-0 w-full"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800"><Sparkles className="size-3.5" /> Financial support, made human</div><h1 className="w-[calc(100vw-2rem)] max-w-full font-sans text-[2.65rem] font-extrabold leading-[1.02] tracking-[-0.065em] text-primary sm:text-7xl">Simple, transparent financial support <span className="text-emerald-700">when you need it.</span></h1><p className="mt-7 w-[calc(100vw-2rem)] max-w-full text-lg leading-8 text-muted-foreground">RupayAid helps you navigate temporary financial needs through a simple and transparent process.</p><div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"><ButtonLink href="/login">Get in touch <ArrowRight className="size-4" /></ButtonLink><ButtonLink href="#how-it-works" secondary>See how it works</ButtonLink></div><div className="mt-7 flex flex-col gap-3 text-xs sm:flex-row sm:flex-wrap font-semibold text-muted-foreground"><span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3.5 py-2"><ShieldCheck className="size-4 text-emerald-600" /> Simple verification process</span><span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3.5 py-2"><MessageCircle className="size-4 text-primary" /> Stay informed at every step</span></div></div><div className="relative mx-auto w-full max-w-xl"><div className="hero-card group relative rounded-[2rem] p-4 shadow-[0_30px_80px_-30px_rgba(15,76,129,.35)] transition duration-500 hover:-translate-y-2 hover:shadow-[0_38px_90px_-28px_rgba(15,76,129,.48)] sm:p-6"><div className="relative mb-4 h-44 overflow-hidden rounded-[1.5rem] sm:h-52"><img src="/rupayaid-support.png" alt="A RupayAid customer reviewing her next financial step" className="size-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent" /><div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/30 bg-primary/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md"><span className="size-2 rounded-full bg-emerald-300 motion-pulse" /> A calmer next step</div></div><div className="rounded-[1.5rem] bg-primary p-6 text-white transition duration-500 group-hover:bg-[#123f68] sm:p-8"><div className="flex items-center justify-between text-xs text-white/60"><span>RupayAid / your next step</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-300" /> Protected</span></div><div className="mt-14 max-w-xs"><p className="text-sm text-white/60">A little support</p><p className="mt-2 text-4xl font-bold leading-tight tracking-[-0.05em]">can make a big difference.</p></div><div className="mt-16 flex items-end justify-between"><div><p className="text-xs text-white/50">Your journey</p><div className="mt-2 flex gap-1.5">{[1, 2, 3, 4, 5].map(i => <span key={i} className={`h-1.5 w-8 rounded-full ${i < 3 ? 'bg-emerald-300' : 'bg-white/20'}`} />)}</div></div><div className="grid size-12 place-items-center rounded-2xl bg-white/10"><ArrowDownRight className="size-5 text-emerald-300" /></div></div></div></div><div className="absolute -bottom-5 -left-3 rounded-2xl border border-white bg-white p-4 shadow-[0_18px_35px_-20px_rgba(15,76,129,.55)] sm:-left-8"><div className="flex items-center gap-2 text-xs font-bold text-primary"><span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><BadgeCheck className="size-4" /></span> Trusted & transparent</div><p className="mt-2 pl-9 text-[11px] text-muted-foreground">Clear updates. No guesswork.</p></div></div></div></section>

    <section aria-label="RupayAid stories" className="px-5 pb-4 pt-2 sm:px-8 sm:pb-10"><div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[.72fr_1.28fr]"><div><p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-emerald-700">A human approach</p><h2 className="mt-3 max-w-md font-sans text-3xl font-extrabold leading-tight tracking-[-.05em] text-primary sm:text-4xl">Real people. Real moments. One step at a time.</h2><p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">Explore the values behind a simpler, more thoughtful financial support experience.</p></div><StoryCarousel /></div></section>

    <section id="about" className="border-y border-border/70 bg-white px-5 py-24 sm:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><SectionHeading eyebrow="Why RupayAid" title="A little support can make a big difference." /><div><p className="max-w-2xl text-lg leading-8 text-muted-foreground">Real life does not always follow a plan. We are building a respectful, straightforward way to move through temporary financial needs — with clear communication at every step.</p><a href="#how-it-works" className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary">Learn how we can help <ArrowRight className="size-4 transition group-hover:translate-x-1" /></a></div></div></section>

    <section className="px-5 py-24 sm:px-8"><div className="mx-auto max-w-7xl"><SectionHeading eyebrow="The RupayAid difference" title="Designed to feel simple, safe and human." body="No confusing jargon. No disappearing acts. Just thoughtful support for the moments that need it." /><div className="mt-12 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, text, tone }) => <motion.article whileHover={{ y: -5 }} key={title} className="rounded-3xl border border-border bg-white p-7 shadow-[0_16px_45px_-32px_rgba(15,76,129,.5)]"><div className={`mb-7 grid size-12 place-items-center rounded-2xl ${tone === 'mint' ? 'bg-emerald-100 text-emerald-700' : tone === 'peach' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-primary'}`}><Icon className="size-5" /></div><h3 className="text-xl font-bold text-primary">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p></motion.article>)}</div></div></section>

    <section id="how-it-works" className="bg-[#eef5f4] px-5 py-24 sm:px-8"><div className="mx-auto max-w-7xl"><SectionHeading eyebrow="How it works" title="A clear path from need to next step." body="Our team keeps you informed and supported through every stage." /><div className="relative mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{steps.map(([number, title, text, StepIcon]) => <div key={number} className="relative flex gap-4 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-white"><StepIcon className="size-5" /></div><div><div className="flex items-center gap-2"><span className="font-mono text-[10px] font-bold text-emerald-700">{number}</span><h3 className="font-bold text-primary">{title}</h3></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div></div>)}</div><div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-7 text-white sm:flex-row sm:items-center sm:p-9"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Currently onboarding manually</p><p className="mt-3 max-w-2xl text-lg font-semibold leading-7">Our digital application is being developed. For now, our team will guide you through the process personally.</p></div><div className="flex shrink-0 flex-wrap gap-2"><ButtonLink href={whatsapp}><MessageCircle className="size-4" /> Chat on WhatsApp</ButtonLink><ButtonLink href={instagram} secondary><Camera className="size-4" /> Instagram</ButtonLink></div></div></div></section>

    <section id="lending" className="px-5 py-24 sm:px-8"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2"><div className="lending-visual group rounded-[2rem] p-6 transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_70px_-28px_rgba(15,76,129,.65)] sm:p-10"><img src="/rupayaid-lending.png" alt="Community members planning a brighter financial future" className="absolute inset-0 size-full object-cover opacity-25 mix-blend-screen transition duration-700 group-hover:scale-105 group-hover:opacity-35" /><div className="absolute inset-0 bg-primary/55" /><div className="relative"><div className="flex items-center justify-between"><span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Coming soon</span><Users className="size-5 text-white/70" /></div><div className="mt-24 max-w-xs text-white"><p className="text-sm text-white/60">Community Lending</p><p className="mt-2 text-4xl font-bold leading-tight tracking-[-0.05em]">Together, we can create more room to move.</p></div><div className="mt-16 flex gap-2"><span className="h-1.5 w-20 rounded-full bg-emerald-300" /><span className="h-1.5 w-8 rounded-full bg-white/20" /><span className="h-1.5 w-8 rounded-full bg-white/20" /></div></div></div><div><SectionHeading eyebrow="For the community" title="Become a Lending Partner." body="We are shaping a structured lending model for eligible contributors who want to participate responsibly and transparently." /><ul className="mt-8 grid gap-4">{['Structured and guided', 'Built for eligible contributors', 'Clear repayment tracking'].map(item => <li key={item} className="flex items-center gap-3 text-sm font-semibold text-primary"><span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-4" /></span>{item}</li>)}</ul><ButtonLink href="#contact"><span>Express your interest</span><ArrowRight className="size-4" /></ButtonLink></div></div></section>

    <section id="referrals" className="bg-primary px-5 py-24 text-white sm:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><SectionHeading eyebrow="Referral programme" title="Good support is worth passing on." body="Know someone who could use a little room to move? Help them take the next step." /><ButtonLink href="#contact">Contact us <ArrowRight className="size-4" /></ButtonLink></div><div className="mt-14 grid gap-3 md:grid-cols-4">{['Refer someone', 'They apply', 'They complete the process', 'Eligible benefit applies'].map((item, i) => <div key={item} className="relative rounded-3xl border border-white/10 bg-white/[.07] p-6"><span className="font-mono text-xs text-emerald-300">0{i + 1}</span><div className="mt-10 text-lg font-bold">{item}</div>{i < 3 && <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden size-5 text-emerald-300 md:block" />}</div>)}</div></div></section>

    <section className="bg-[#f2f7f3] px-5 py-24 sm:px-8"><div className="mx-auto max-w-5xl text-center"><SectionHeading align="center" eyebrow="What matters" title="More clarity. More confidence. More room to move." /><div className="mt-12 grid gap-4 text-left sm:grid-cols-2">{[['Feel supported', 'Get thoughtful guidance instead of figuring everything out alone.'], ['Keep moving forward', 'Make space for the next practical step with a process you can understand.']].map(([title, text]) => <div key={title} className="rounded-3xl bg-white p-7 shadow-[0_15px_40px_-35px_rgba(15,76,129,.6)]"><div className="grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-5" /></div><h3 className="mt-8 text-xl font-bold text-primary">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p></div>)}</div></div></section>

    <section id="faq" className="px-5 py-24 sm:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.72fr_1.28fr]"><SectionHeading eyebrow="FAQ" title="Questions are a good place to start." body="We believe clarity builds confidence. Here are a few things people ask us most." /><div className="divide-y divide-border rounded-3xl border border-border bg-white px-5 sm:px-7">{faqs.map(([question, answer], i) => <div key={question}><button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-expanded={openFaq === i}><span>{question}</span><ChevronDown className={`size-4 shrink-0 text-muted-foreground transition ${openFaq === i ? 'rotate-180 text-emerald-600' : ''}`} /></button><AnimatePresence initial={false}>{openFaq === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="pb-5 pr-8 text-sm leading-7 text-muted-foreground">{answer}</p></motion.div>}</AnimatePresence></div>)}</div></div></section>

    <section className="px-5 py-6 sm:px-8"><div className="mx-auto max-w-7xl rounded-[2rem] bg-accent px-6 py-16 text-center sm:px-10"><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent-foreground/60">A little room goes a long way</p><h2 className="mx-auto mt-5 max-w-3xl font-sans text-4xl font-extrabold tracking-[-0.06em] text-accent-foreground sm:text-6xl">From &quot;I need help&quot; to &quot;I&apos;ve got this.&quot;</h2><div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold text-accent-foreground/75"><a href={`tel:${phone.replaceAll(' ', '')}`} className="inline-flex items-center gap-2"><Phone className="size-4" /> {phone}</a><a href={instagram} className="inline-flex items-center gap-2"><Camera className="size-4" /> @rupayaid</a></div></div></section>

    <section className="px-5 py-24 sm:px-8"><div className="mx-auto max-w-7xl"><SectionHeading align="center" eyebrow="Who is RupayAid for?" title="Support for the moments life doesn&apos;t schedule." /><div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{audiences.map(([AudienceIcon, label]) => <div key={label} className="rounded-3xl border border-border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"><AudienceIcon className="size-5 text-emerald-600" /><p className="mt-10 text-sm font-bold leading-6 text-primary">{label}</p></div>)}</div></div></section>

    <section id="contact" className="bg-[#eef5f4] px-5 py-24 sm:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_.8fr]"><div><SectionHeading eyebrow="Contact us" title="Let&apos;s take the next step together." body="Tell us a little about what you need. A member of our team will get back to you with clarity and care." /><form className="mt-10 grid gap-4 rounded-3xl border border-border bg-white p-6 shadow-[0_20px_55px_-38px_rgba(15,76,129,.6)] sm:grid-cols-2 sm:p-8"><label className="grid gap-2 text-xs font-bold text-primary">Name<input required name="name" placeholder="Your name" className="rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-normal outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label><label className="grid gap-2 text-xs font-bold text-primary">Email<input required type="email" name="email" placeholder="you@example.com" className="rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-normal outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label><label className="grid gap-2 text-xs font-bold text-primary sm:col-span-2">Subject<input name="subject" placeholder="How can we help?" className="rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-normal outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label><label className="grid gap-2 text-xs font-bold text-primary sm:col-span-2">Message<textarea required name="message" rows={4} placeholder="Share a little context..." className="resize-none rounded-2xl border border-input bg-background px-4 py-3.5 text-sm font-normal outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-primary/90 sm:col-span-2">Send message <ArrowRight className="size-4" /></button></form></div><div className="flex flex-col justify-end"><div className="contact-visual rounded-[2rem] p-7 text-white sm:p-10"><Lock className="size-7 text-emerald-300" /><p className="mt-24 max-w-xs text-3xl font-bold leading-tight tracking-[-0.05em]">Your questions deserve a safe place.</p></div><div className="mt-4 grid gap-2 rounded-3xl border border-border bg-white p-5"><a href={whatsapp} className="flex items-center gap-3 rounded-2xl p-3 text-sm font-bold text-primary hover:bg-muted"><MessageCircle className="size-5 text-emerald-600" /> Chat on WhatsApp <ExternalLink className="ml-auto size-4 text-muted-foreground" /></a><a href={`tel:${phone.replaceAll(' ', '')}`} className="flex items-center gap-3 rounded-2xl p-3 text-sm font-bold text-primary hover:bg-muted"><Phone className="size-5 text-emerald-600" /> {phone}</a><a href="mailto:hello@rupayaid.com" className="flex items-center gap-3 rounded-2xl p-3 text-sm font-bold text-primary hover:bg-muted"><Mail className="size-5 text-emerald-600" /> hello@rupayaid.com</a></div></div></div></section>

    <footer className="bg-primary px-5 pb-8 pt-16 text-white sm:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr_1fr]"><div><Logo light /><p className="mt-5 max-w-xs text-sm leading-6 text-white/55">Simple, transparent financial support when you need it.</p><a href={instagram} className="mt-6 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="RupayAid on Instagram"><Camera className="size-4" /></a></div><div><h3 className="text-xs font-bold uppercase tracking-[.15em] text-emerald-300">Explore</h3><div className="mt-5 grid gap-3 text-sm text-white/60">{navItems.slice(0, 4).map(([label, href]) => <a key={href} href={href} className="hover:text-white">{label}</a>)}</div></div><div><h3 className="text-xs font-bold uppercase tracking-[.15em] text-emerald-300">Legal</h3><div className="mt-5 grid gap-3 text-sm text-white/60"><a href="#">Terms & conditions</a><a href="#">Privacy policy</a><a href="#">Fees / cancellation / refund</a><a href="#">Financial services disclaimer</a><a href="#">Grievance redressal policy</a></div></div><div><h3 className="text-xs font-bold uppercase tracking-[.15em] text-emerald-300">Contact</h3><div className="mt-5 grid gap-3 text-sm text-white/60"><a href={whatsapp}>WhatsApp us</a><a href="mailto:hello@rupayaid.com">hello@rupayaid.com</a><p>Puducherry, India</p></div></div></div><div className="mt-14 rounded-2xl border border-orange-300/20 bg-orange-300/10 px-4 py-3 text-center text-xs leading-5 text-orange-100"><strong>Security reminder:</strong> RupayAid will never ask for your OTP, PIN or CVV. Report suspicious contact: {phone}.</div><div className="mt-8 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row"><p>© {new Date().getFullYear()} RupayAid. All rights reserved.</p><p>Built around clarity, care and community.</p></div></div></footer>
  </main></div>
}
