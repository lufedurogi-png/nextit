'use client'

import { motion } from 'framer-motion'

export default function AppHero({ eyebrow, title, subtitle, children }) {
    return (
        <section className="hero-top relative overflow-hidden px-4 pb-8 pt-6">
            <div className="pointer-events-none absolute inset-0 opacity-90">
                <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#2563eb]/25 blur-3xl" />
                <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#c9a227]/20 blur-3xl" />
                <motion.div
                    className="absolute left-1/2 top-8 h-40 w-[120%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]"
                    animate={{ x: ['-20%', '20%'] }}
                    transition={{ duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                />
            </div>

            <div className="relative mx-auto max-w-2xl">
                {eyebrow ? (
                    <motion.p
                        className="text-sm font-semibold uppercase tracking-[0.22em] text-white/75"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                    >
                        {eyebrow}
                    </motion.p>
                ) : null}
                <motion.h1
                    className="font-playfair mt-2 text-4xl font-extrabold leading-tight text-white drop-shadow-sm sm:text-[2.6rem]"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.05 }}
                >
                    {title}
                </motion.h1>
                {subtitle ? (
                    <motion.p
                        className="mt-2 max-w-xl text-base text-white/80"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.12 }}
                    >
                        {subtitle}
                    </motion.p>
                ) : null}
                {children ? <div className="mt-5">{children}</div> : null}
            </div>
        </section>
    )
}
