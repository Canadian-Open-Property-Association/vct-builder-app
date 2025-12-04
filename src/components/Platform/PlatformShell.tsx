import PlatformBar from './PlatformBar';

interface PlatformShellProps {
  children: React.ReactNode;
}

export default function PlatformShell({ children }: PlatformShellProps) {
  return (
    <div className="flex flex-col h-screen">
      <PlatformBar />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
