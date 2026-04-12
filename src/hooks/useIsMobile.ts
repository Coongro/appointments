import { getHostReact } from '@coongro/plugin-sdk';

export function useIsMobile(breakpoint = 640): boolean {
  const React = getHostReact();
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < breakpoint);

  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);

  return isMobile;
}
