'use client'

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { motion } from 'framer-motion'

function Chevron({ className }) {
    return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
            />
        </svg>
    )
}

const listButtonClass =
    'relative w-full cursor-pointer rounded-2xl border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] py-3 pl-4 pr-11 text-left text-sm font-bold text-slate-900 shadow-[0_10px_30px_rgba(2,6,23,0.06)] ring-[#c9a227] transition hover:border-[#c9a227]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227]/40 theme-dark:border-slate-600 theme-dark:bg-[linear-gradient(180deg,#0f172a_0%,#020617_100%)] theme-dark:text-slate-50'

const optionsPanelClass =
    'absolute z-[80] mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200/90 bg-white py-1.5 text-sm shadow-[0_22px_60px_rgba(2,6,23,0.18)] ring-1 ring-black/5 backdrop-blur theme-dark:border-slate-600 theme-dark:bg-slate-900 theme-dark:ring-white/10'

const optionClass = (active, selected) =>
    `relative cursor-pointer select-none py-2.5 pr-10 font-semibold transition ${
        active ? 'bg-[#c9a227]/15 text-[#0b1b3c] theme-dark:bg-[#c9a227]/20 theme-dark:text-slate-50' : 'text-slate-800 theme-dark:text-slate-200'
    } ${selected ? 'border-l-4 border-[#c9a227] pl-3' : 'pl-4'}`

export default function FiltroGrupoSelects({
    groups,
    activeGroup,
    activeTeam,
    teamsForGroup,
    onGroupChange,
    onTeamChange,
}) {
    return (
        <motion.div
            className="relative z-[90] grid grid-cols-1 gap-4 sm:grid-cols-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-3 shadow-sm backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/40">
                <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#8f6f11]">Grupo</p>
                <Listbox value={activeGroup} onChange={onGroupChange}>
                    <div className="relative">
                        <Listbox.Button className={listButtonClass}>
                            <span className="block truncate">Grupo {activeGroup}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                                <Chevron className="h-5 w-5" aria-hidden />
                            </span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                            <Listbox.Options className={optionsPanelClass}>
                                {groups.map((group) => (
                                    <Listbox.Option key={group} className={({ active, selected }) => optionClass(active, selected)} value={group}>
                                        {({ selected }) => (
                                            <>
                                                <span className="block truncate">Grupo {group}</span>
                                                {selected ? (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c9a227]">✓</span>
                                                ) : null}
                                            </>
                                        )}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-3 shadow-sm backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/40">
                <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#8f6f11]">País</p>
                <Listbox value={activeTeam} onChange={onTeamChange}>
                    <div className="relative">
                        <Listbox.Button className={listButtonClass}>
                            <span className="block truncate">{activeTeam || '—'}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                                <Chevron className="h-5 w-5" aria-hidden />
                            </span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                            <Listbox.Options className={optionsPanelClass}>
                                {teamsForGroup.map((team) => (
                                    <Listbox.Option
                                        key={team.name}
                                        className={({ active, selected }) => optionClass(active, selected)}
                                        value={team.name}
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span className="block truncate">{team.name}</span>
                                                {selected ? (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c9a227]">✓</span>
                                                ) : null}
                                            </>
                                        )}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
            </div>
        </motion.div>
    )
}
