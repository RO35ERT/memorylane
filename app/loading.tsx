import { LoaderIcon } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-[#d4af37] space-y-4">
      <LoaderIcon className="w-8 h-8 animate-spin" />
      <p className="font-serif tracking-widest uppercase text-sm">
        Loading Memories..
      </p>
    </div>
  );
}
