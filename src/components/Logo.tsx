import logoMain from '../assets/logo-main.png';
import logoSmall from '../assets/logo-small.png';

interface LogoProps {
  className?: string;
  variant?: 'main' | 'small';
}

export function Logo({ className = "w-8 h-8", variant = 'main' }: LogoProps) {
  const logoSrc = variant === 'main' ? logoMain : logoSmall;
  
  return (
    <img 
      src={logoSrc}
      className={className}
      alt="Pulse Logo"
    />
  );
}