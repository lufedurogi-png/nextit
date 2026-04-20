'use client'

import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export default function AnimatedInteger({ value, className = '' }) {
    const [display, setDisplay] = useState(() => value)
    const fromRef = useRef(value)

    useEffect(() => {
        const from = fromRef.current
        if (from === value) return
        const controls = animate(from, value, {
            duration: 0.65,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => setDisplay(Math.round(v)),
            onComplete: () => {
                fromRef.current = value
            },
        })
        return () => controls.stop()
    }, [value])

    return <span className={className}>{display}</span>
}
