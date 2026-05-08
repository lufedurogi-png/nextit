'use client'

import { motion } from 'framer-motion'

import CartaItem from './CartaItem'

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.045 },
    },
}

const item = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 26 } },
}

export default function EquipoSection({ team, obtainedSet, onToggle }) {
    return (
        <motion.section
            layout
            className="rounded-2xl border border-slate-200/90 bg-white/80 p-3 shadow-[0_14px_40px_rgba(2,6,23,0.08)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/70"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="mb-3 flex items-end justify-between gap-3">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{team.name}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {team.cards.length} cartas
                </span>
            </div>
            <motion.div className="grid grid-cols-2 gap-3" variants={container} initial="hidden" animate="show" key={team.name}>
                {team.cards.map((card) => (
                    <motion.div key={card.key} variants={item}>
                        <CartaItem card={card} obtained={obtainedSet.has(card.key)} onToggle={() => onToggle(card.key)} />
                    </motion.div>
                ))}
            </motion.div>
        </motion.section>
    )
}
