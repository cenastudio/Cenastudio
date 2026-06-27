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
    <div className="frame-shell min-h-screen bg-frame-black text-frame-white font-frame-body">
      {cursor && <CustomCursor />}
      {children}
    </div>
  );
});

export default FrameShell;
