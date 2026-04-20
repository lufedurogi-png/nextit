'use client'

import TradingCard from '@/components/coleccionador/TradingCard'

export default function CartaItem({ card, obtained, onToggle }) {
    return (
        <TradingCard
            imageUrl={card.imageUrl}
            idLabel={String(card.id).padStart(3, '0')}
            obtained={obtained}
            onToggleObtained={onToggle}
        />
    )
}
