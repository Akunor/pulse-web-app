import logoMain from '../assets/logo-main.png';
import logoSmall from '../assets/logo-small.png';
import logoSmallGrey from '../assets/logo-small-grey.png';

interface LogoProps {
  className?: string;
  variant?: 'main' | 'small';
  color?: 'colored' | 'grey';
}

export function Logo({ 
  className = "w-8 h-8", 
  variant = 'main',
  color = 'colored'
}: LogoProps) {
  const logoSrc = variant === 'main' 
    ? logoMain 
    : (color === 'grey' ? logoSmallGrey : logoSmall);
  
  return (
    <img 
      src={logoSrc}
      className={className}
      alt="Pulse Logo"
    />
  );
}