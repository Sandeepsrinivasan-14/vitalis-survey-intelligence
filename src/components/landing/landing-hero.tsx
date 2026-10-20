'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { HeroVisual } from '@/components/landing/hero-visual';
import { hwcSummaryMockData } from '@/data/mock-data';

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export function LandingHero() {
  const { totalValidRecords, numPhcs, numStates } = hwcSummaryMockData;
  return (
    <section aria-labelledby="hero-title" className="grid items-center gap-10 py-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:py-10">
      <motion.div
        className="space-y-7"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.09 } } }}
      >
        <motion.p
          variants={item}
          className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground"
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Survey intelligence for health &amp; wellness centres
        </motion.p>

        <motion.h1
          id="hero-title"
          variants={item}
          className="text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl"
        >
          Every health centre, <span className="text-gradient">one clear view.</span>
        </motion.h1>

        <motion.p variants={item} className="max-w-xl text-lg text-muted-foreground">
          Follow fieldwork against plan, catch data-quality problems while there is still time to fix them, and see how
          salt intake and blood pressure vary across districts, with role-based dashboards for the teams who act on it.
        </motion.p>

        <motion.div variants={item} className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/roles">
              Open my dashboard
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/explore">
              <BarChart3 aria-hidden="true" />
              Explore survey data
            </Link>
          </Button>
        </motion.div>

        <motion.dl variants={item} className="flex flex-wrap gap-x-10 gap-y-4 pt-2">
          {[
            { label: 'Valid records', value: totalValidRecords },
            { label: 'Primary health centres', value: numPhcs },
            { label: 'States', value: numStates },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="tabular text-3xl font-semibold tracking-tight">
                <AnimatedNumber value={stat.value} />
              </dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      <motion.div
        className="relative mx-auto aspect-square w-full max-w-[520px]"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      >
        <div className="absolute inset-[8%] rounded-full bg-brand-gradient opacity-20 blur-3xl" aria-hidden="true" />
        <HeroVisual className="absolute inset-0" />
        <div className="glass absolute bottom-[8%] left-0 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm shadow-xl sm:-left-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="font-medium">Role-secured access</span>
        </div>
      </motion.div>
    </section>
  );
}
