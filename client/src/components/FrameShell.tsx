import { memo } from "react";
import CustomCursor from "@/components/landing/CustomCursor";

interface FrameShellProps {
  children: React.ReactNode;
  /** Landing can opt into the cinematic cursor; app pages use the system cursor. */
  cursor?: boolean;
}

/** Global shell with optional custom cursor. */
const FrameShell = memo(function FrameShell({ children, cursor = false }: FrameShellProps) {
  return (
    <div className="frame-shell min-h-screen text-frame-white font-frame-body">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[1000] -translate-y-20 bg-frame-orange px-4 py-2 font-frame-mono text-xs uppercase text-black transition-transform focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      {cursor && <CustomCursor />}
      {children}
    </div>
  );
});

export default FrameShell;
