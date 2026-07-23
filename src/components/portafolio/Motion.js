'use client'

import { motion, useReducedMotion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1]

export function FadeUp({
    children,
    className = '',
    delay = 0,
    y = 28,
    once = true,
    as: Tag = motion.div,
}) {
    const reduce = useReducedMotion()

    if (reduce) {
        return <div className={className}>{children}</div>
    }

    return (
        <Tag
            className={className}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once, margin: '-8% 0px' }}
            transition={{ duration: 0.75, delay, ease }}>
            {children}
        </Tag>
    )
}

export function Stagger({ children, className = '', delay = 0 }) {
    const reduce = useReducedMotion()

    if (reduce) {
        return <div className={className}>{children}</div>
    }

    return (
        <motion.div
            className={className}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-6% 0px' }}
            variants={{
                hidden: {},
                show: {
                    transition: { staggerChildren: 0.09, delayChildren: delay },
                },
            }}>
            {children}
        </motion.div>
    )
}

export function StaggerItem({ children, className = '', as: Tag = motion.div }) {
    return (
        <Tag
            className={className}
            variants={{
                hidden: { opacity: 0, y: 18 },
                show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.55, ease },
                },
            }}>
            {children}
        </Tag>
    )
}
