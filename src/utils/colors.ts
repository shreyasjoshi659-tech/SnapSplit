import type { Person } from '../types';

export const PERSON_COLOR_ORDER: Person['colorKey'][] = [
  'teal',
  'indigo',
  'amber',
  'rose',
  'sky',
  'violet',
];

export const PERSON_COLOR_STYLES: Record<
  Person['colorKey'],
  {
    activeBtn: string;
    inactiveBtn: string;
    avatar: string;
    bar: string;
  }
> = {
  teal: {
    activeBtn:
      'bg-teal-400/12 text-[#f5f5f5] border-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.32)] hover:bg-teal-400/20',
    inactiveBtn:
      'bg-transparent text-[#f5f5f5]/50 border-white/12 hover:border-teal-400/75 hover:text-[#f5f5f5]',
    avatar: 'bg-teal-400 text-[#0a0a0a]',
    bar: 'bg-[#f5f5f5]',
  },
  indigo: {
    activeBtn:
      'bg-indigo-400/12 text-[#f5f5f5] border-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.32)] hover:bg-indigo-400/20',
    inactiveBtn:
      'bg-transparent text-[#f5f5f5]/50 border-white/12 hover:border-indigo-400/75 hover:text-[#f5f5f5]',
    avatar: 'bg-indigo-400 text-[#0a0a0a]',
    bar: 'bg-neutral-400',
  },
  amber: {
    activeBtn:
      'bg-amber-400/12 text-[#f5f5f5] border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.30)] hover:bg-amber-400/20',
    inactiveBtn:
      'bg-transparent text-[#f5f5f5]/50 border-white/12 hover:border-amber-400/75 hover:text-[#f5f5f5]',
    avatar: 'bg-amber-400 text-[#0a0a0a]',
    bar: 'bg-neutral-500',
  },
  rose: {
    activeBtn:
      'bg-rose-400/12 text-[#f5f5f5] border-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.32)] hover:bg-rose-400/20',
    inactiveBtn:
      'bg-transparent text-[#f5f5f5]/50 border-white/12 hover:border-rose-400/75 hover:text-[#f5f5f5]',
    avatar: 'bg-rose-400 text-[#0a0a0a]',
    bar: 'bg-neutral-300',
  },
  sky: {
    activeBtn:
      'bg-sky-400/12 text-[#f5f5f5] border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.32)] hover:bg-sky-400/20',
    inactiveBtn:
      'bg-transparent text-[#f5f5f5]/50 border-white/12 hover:border-sky-400/75 hover:text-[#f5f5f5]',
    avatar: 'bg-sky-400 text-[#0a0a0a]',
    bar: 'bg-neutral-400',
  },
  violet: {
    activeBtn:
      'bg-violet-400/12 text-[#f5f5f5] border-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.32)] hover:bg-violet-400/20',
    inactiveBtn:
      'bg-transparent text-[#f5f5f5]/50 border-white/12 hover:border-violet-400/75 hover:text-[#f5f5f5]',
    avatar: 'bg-violet-400 text-[#0a0a0a]',
    bar: 'bg-neutral-600',
  },
};
