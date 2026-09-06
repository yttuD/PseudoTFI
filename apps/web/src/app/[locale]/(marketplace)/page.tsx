import { SearchWizard } from '@/components/marketplace/SearchWizard';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="w-full relative py-24 md:py-32 lg:py-40 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="container mx-auto px-4 md:px-6 relative z-10 flex flex-col items-center">
          <div className="max-w-3xl text-center space-y-4 mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-gray-900">
              Encontrá el espacio perfecto para vos
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Alquileres temporarios y de largo plazo gestionados directamente por sus dueños.
            </p>
          </div>
          
          <div className="w-full">
            <SearchWizard />
          </div>
        </div>
      </section>
    </main>
  );
}
