import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen flex items-center justify-center lg:justify-start lg:pl-32 overflow-hidden bg-bg-base font-sans">
      
      {/* Background Line-Art Schematic */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 flex items-center justify-center lg:justify-end lg:pr-10 mix-blend-screen">
        <Image 
          src="/blueprint-car.jpg" 
          alt="Magma Autospa Blueprint" 
          width={1200}
          height={800}
          className="object-cover md:object-contain w-full h-full lg:w-[120%] lg:h-[120%]"
          priority
        />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-20 w-full max-w-2xl px-6 mt-[-10%] lg:mt-0 flex flex-col items-start text-left">
        <div className="mb-12">
          <h1 className="font-serif text-5xl md:text-7xl text-text-primary tracking-tight mb-4 drop-shadow-lg">
            Magma Autospa
          </h1>
          <p className="font-sans text-text-secondary text-lg md:text-xl max-w-md uppercase tracking-widest text-sm">
            Technical Operations Platform
          </p>
        </div>
        
        {/* Portal Selection */}
        <div className="w-full flex flex-col gap-4">
          <h2 className="text-text-primary font-medium mb-2 text-sm uppercase tracking-[0.15em] opacity-70">
            System Access
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
            <Link 
              href="/branch/login" 
              className="panel flex flex-col p-6 hover:bg-bg-panel-elevated transition-colors border-l-[3px] border-l-accent-copper hover:-translate-y-0.5 active:translate-y-0 duration-200"
            >
              <span className="text-accent-copper font-mono text-[11px] uppercase tracking-[0.08em] font-bold mb-3">BRANCH ACCESS</span>
              <span className="text-text-primary font-medium text-lg">Branch Portal</span>
            </Link>
            
            <Link 
              href="/manager/login" 
              className="panel flex flex-col p-6 hover:bg-bg-panel-elevated transition-colors border-l-[3px] border-l-accent-gold hover:-translate-y-0.5 active:translate-y-0 duration-200"
            >
              <span className="text-accent-gold font-mono text-[11px] uppercase tracking-[0.08em] font-bold mb-3">MANAGER ACCESS</span>
              <span className="text-text-primary font-medium text-lg">Manager Portal</span>
            </Link>
            
            <Link 
              href="/admin/login" 
              className="panel flex flex-col p-6 hover:bg-bg-panel-elevated transition-colors border-l-[3px] border-l-accent-oxblood hover:-translate-y-0.5 active:translate-y-0 duration-200"
            >
              <span className="text-accent-oxblood font-mono text-[11px] uppercase tracking-[0.08em] font-bold mb-3">ADMIN ACCESS</span>
              <span className="text-text-primary font-medium text-lg">Admin Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
