import { memo } from "react";
import CustomCursor from "@/components/landing/CustomCursor";

interface FrameShellProps {
  children: React.ReactNode;
  /** Landing uses custom cursor; app pages too for consistency */
  cursor?: boolean;
}

/** Global cinematic shell: film grain + optional custom cursor */
const FrameShell = memo(function FrameShell({ children, cursor = true }: FrameShellProps) {
  return (
    <div className="frame-shell min-h-screen bg-frame-black text-frame-white font-frame-body">
      {cursor && <CustomCursor />}
      {children}
    </div>
  );
});

export default FrameShell;
