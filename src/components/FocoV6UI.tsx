import React, { useEffect, useRef, useState } from 'react';
import { BatteryFull, Signal, Wifi, Dumbbell, CalendarDays, ArrowLeft, Menu, UserRound, ChartNoAxesColumnIncreasing, House } from 'lucide-react';

/** Full-resolution photographic image — never stretch the tiny 3 KB preview
 * formerly embedded in focoReferencePortrait. */
const ATHLETE_HERO_QUALITY='https://images.unsplash.com/photo-1637651684506-07e16fcf7b06?auto=format&fit=crop&w=2400&q=90';
export const V6_IMAGES = {
  portrait: ATHLETE_HERO_QUALITY,
  athlete: ATHLETE_HERO_QUALITY,
  login: ATHLETE_HERO_QUALITY,
  bench: 'https://images.unsplash.com/photo-1690731033723-ad718c6e585a?auto=format&fit=crop&w=1800&q=88',
  muscle: 'https://images.unsplash.com/photo-1601113329251-0aebe217bdbe?auto=format&fit=crop&w=1000&q=88',
  training: 'https://images.unsplash.com/photo-1704223523325-f4e3257d6fca?auto=format&fit=crop&w=1000&q=88',
};

export const FocoV6Mark: React.FC<{ size?: number; className?: string; light?: boolean }> = ({ size=48, className='',light=false }) => (
  <svg aria-label="Símbolo FOCO" role="img" className={className} width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 47L19 17H35L22 47H7Z" fill={light ? '#F5F5F2' : '#D5FF40'}/>
    <path d="M28 69L53 6H69L44 69H28Z" fill={light ? '#F5F5F2' : '#D5FF40'}/>
    <path d="M57 43L65 23H78L70 43H57Z" fill={light ? '#F5F5F2' : '#D5FF40'}/>
  </svg>
);

export const FocoV6Lockup: React.FC<{ compact?: boolean; className?: string }> = ({ compact = false, className = '' }) => (
  <span className={'foco-v6-brand '+(compact?'compact ':'')+className}>
    <img src={import.meta.env.BASE_URL+'assets/brand/foco-v6-reference-vector.svg'} alt="FOCO" width={compact?132:215} height={compact?34:52} />
  </span>
);

// The operating system owns the status bar; never draw a duplicate inside FOCO.
export const FocoV6Status: React.FC = () => null;

export const FocoV6MobileTitle: React.FC<{
  title:string; subtitle?:string; onBack?:()=>void; action?:React.ReactNode
}> = ({title,subtitle,onBack,action}) => <header className="foco-v6-mobile-title">
  <div className="foco-v6-title-left">
    {onBack && <button type="button" className="foco-v6-icon-button" onClick={onBack} aria-label="Voltar"><ArrowLeft size={19}/></button>}
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
  </div>
  {action}
</header>;

export const FocoV6WeekStrip: React.FC<{
  labels:{short:string;day:string;label?:string;selected?:boolean;done?:boolean;active?:boolean}[];
  onSelect?:(day:string)=>void
}> = ({labels,onSelect}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const activeDay = labels.find(item=>item.active)?.day;
  const revealDay = (button: HTMLButtonElement) => {
    const element = scroller.current;
    if (!element) return;
    const viewport = element.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    const inset = 6;
    const delta = target.left < viewport.left + inset ? target.left - viewport.left - inset
      : target.right > viewport.right - inset ? target.right - viewport.right + inset : 0;
    // Scroll this row only. Revealing Sunday on load must never move the page
    // down past the workout action, and physical deltas also work in RTL.
    if (delta) element.scrollBy({left:delta,behavior:'auto'});
  };
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const measure = () => {
      setScrollable(element.scrollWidth > element.clientWidth + 1);
      const active = element.querySelector<HTMLButtonElement>('[aria-current="date"]');
      if (active) revealDay(active);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [labels.length, activeDay]);
  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const element = scroller.current;
    if (!element) return;
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const rtl = window.getComputedStyle(element).direction === 'rtl';
    let next = current;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else if (event.key === 'ArrowRight') next = current + (rtl ? -1 : 1);
    else if (event.key === 'ArrowLeft') next = current + (rtl ? 1 : -1);
    else return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus({ preventScroll: true });
  };
  return <div className="foco-v6-week-navigation">
    <div ref={scroller} className="foco-v6-week-scroller" role="group" aria-label="Treinos desta semana" onKeyDown={moveFocus}>
      <div className="foco-v6-week-strip">
        {labels.map(item=><button type="button" key={item.day} data-training-day={item.day}
          onClick={()=>onSelect?.(item.day)} disabled={!onSelect}
          onFocus={event=>revealDay(event.currentTarget)}
          className={'foco-v6-week-day '+(item.done?'is-done ':'')+(item.selected||item.active?'is-current':'')}
          aria-current={item.active?'date':undefined}
          aria-label={(item.label||item.short)+(item.done?', treino concluído':'')+(item.active?', hoje':'')}>
          <span>{item.short}</span>
          {item.active ? <span className="foco-v6-week-today">{item.done?'✓ Hoje':'Hoje'}</span>
            : item.done ? <span className="foco-v6-week-check">✓</span> : <span className="foco-v6-week-dash">—</span>}
        </button>)}
      </div>
    </div>
    {scrollable && <p className="foco-v6-week-scroll-hint">Deslize para ver os 7 dias</p>}
  </div>;
};

export const FocoV6Segment: React.FC<{options:{value:string;label:string}[];value:string;onChange:(value:string)=>void;label?:string}> = ({options,value,onChange,label='Selecionar'}) => (
  <div role="group" aria-label={label} className="foco-v6-segments">
    {options.map(option=><button type="button" key={option.value} aria-pressed={value===option.value}
    className={'foco-v6-segment '+(value===option.value?'is-active':'')} onClick={()=>onChange(option.value)}>{option.label}</button>)}
  </div>
);

export const FocoV6GlassButton: React.FC<{children:React.ReactNode;onClick?:()=>void;className?:string;disabled?:boolean}> = ({children,onClick,className='',disabled=false})=>
  <button type="button" className={'foco-v6-glass-button '+className} onClick={onClick} disabled={disabled}>{children}</button>;

export const V6NavIcons = { Dumbbell,CalendarDays,Menu,House,ChartNoAxesColumnIncreasing,UserRound };
