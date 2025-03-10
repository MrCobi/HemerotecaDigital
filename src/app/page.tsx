"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Pre-calculated positions for decorative elements
const decorativeElements = [
  { left: "10%", top: "20%", width: "8px", height: "8px", duration: "2s" },
  { left: "20%", top: "40%", width: "12px", height: "12px", duration: "2.5s" },
  { left: "30%", top: "60%", width: "6px", height: "6px", duration: "3s" },
  { left: "40%", top: "25%", width: "10px", height: "10px", duration: "2.2s" },
  { left: "50%", top: "45%", width: "7px", height: "7px", duration: "2.8s" },
  { left: "60%", top: "65%", width: "9px", height: "9px", duration: "2.4s" },
  { left: "70%", top: "30%", width: "11px", height: "11px", duration: "2.6s" },
  { left: "80%", top: "50%", width: "8px", height: "8px", duration: "2.3s" },
  { left: "90%", top: "70%", width: "10px", height: "10px", duration: "2.7s" },
  { left: "15%", top: "35%", width: "6px", height: "6px", duration: "2.9s" },
];

// Animated counter hook
const useCounter = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};

const StatItem = ({
  value,
  label,
  isVisible,
}: {
  value: number;
  label: string;
  isVisible: boolean;
}) => {
  const count = useCounter(isVisible ? value : 0, 2000);

  return (
    <div className="transform transition-all duration-500 hover:scale-105 p-4 sm:p-6 bg-white/10 rounded-lg backdrop-blur-sm">
      <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
        {count}+
      </div>
      <div className="text-sm sm:text-base text-blue-100">{label}</div>
    </div>
  );
};

export default function HomePage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState({
    stats: false,
    features: false,
    timeline: false,
  });
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      router.push("/home");
    }
  }, [session, router]);

  useEffect(() => {
    setIsLoaded(true);

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;

      // Check if sections are visible
      const statsSection = document.getElementById("stats-section");
      const featuresSection = document.getElementById("features-section");
      const timelineSection = document.getElementById("timeline-section");

      if (statsSection && scrollPosition > statsSection.offsetTop + 100) {
        setIsVisible((prev) => ({ ...prev, stats: true }));
      }
      if (featuresSection && scrollPosition > featuresSection.offsetTop + 100) {
        setIsVisible((prev) => ({ ...prev, features: true }));
      }
      if (timelineSection && scrollPosition > timelineSection.offsetTop + 100) {
        setIsVisible((prev) => ({ ...prev, timeline: true }));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] sm:min-h-[70vh] w-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-900">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {decorativeElements.map((element, i) => (
            <div
              key={i}
              className="absolute animate-pulse hidden sm:block"
              style={{
                left: element.left,
                top: element.top,
                width: element.width,
                height: element.height,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "50%",
                animation: `pulse ${element.duration} infinite`,
              }}
            />
          ))}
          {/* Additional depth circles - Responsive sizes */}
          <div className="absolute top-8 sm:top-1/4 right-[10%] w-16 h-16 sm:w-24 sm:h-24 md:w-40 md:h-40 bg-gradient-to-tr from-purple-400/10 to-pink-500/10 rounded-full opacity-40 blur-lg animate-pulse"></div>
          <div className="absolute top-16 sm:bottom-1/3 left-[15%] w-20 h-20 sm:w-32 sm:h-32 md:w-48 md:h-48 bg-gradient-to-br from-blue-300/10 to-cyan-400/10 rounded-full opacity-40 blur-lg animate-pulse"></div>
        </div>

        {/* Hero content */}
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center pt-16 sm:pt-0">
          <div
            className={`max-w-3xl mx-auto sm:mx-0 transition-all duration-1000 ease-out ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <p className="text-blue-300 font-medium mb-2 sm:mb-3 tracking-wider uppercase text-sm sm:text-base mt-5">
              Archivo histórico digital
            </p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Descubre el Mundo{" "}
              <span className="block mt-1 sm:mt-2">
                de las Noticias Históricas
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-200 mb-6 sm:mb-8 max-w-2xl">
              Explora nuestra vasta colección de artículos, periódicos y documentos
              históricos digitalizados que abarcan más de cinco décadas de
              historia.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
                onClick={() => router.push("/api/auth/signin")}
              >
                Iniciar Sesión
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-blue-800 border-white hover:bg-white/10 text-sm sm:text-base"
                onClick={() => router.push("/api/auth/signup")}
              >
                Registrarse
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicators */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 animate-bounce">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                i === 0
                  ? "w-6 sm:w-8 bg-blue-500"
                  : "w-1.5 sm:w-2 bg-gray-400/60"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section
        id="stats-section"
        className="py-12 sm:py-16 bg-gradient-to-r from-blue-600 to-indigo-900 text-white relative overflow-hidden"
      >
        {/* Background blur effects for depth */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-indigo-500/10 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats grid - Responsive layout */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[
              { value: 10000, label: "Artículos" },
              { value: 50, label: "Años de historia" },
              { value: 200, label: "Fuentes" },
              { value: 5000, label: "Usuarios" },
            ].map((stat, i) => (
              <StatItem
                key={i}
                value={stat.value}
                label={stat.label}
                isVisible={isVisible.stats}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Cómo Funciona Nuestra Hemeroteca
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Descubre el proceso que seguimos para preservar y hacer accesible la
              historia a través de nuestros documentos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                number: "01",
                title: "Recopilación",
                description:
                  "Seleccionamos cuidadosamente fuentes históricas relevantes.",
              },
              {
                number: "02",
                title: "Digitalización",
                description:
                  "Utilizamos tecnología avanzada para digitalizar los documentos.",
              },
              {
                number: "03",
                title: "Catalogación",
                description: "Expertos clasifican y etiquetan cada documento.",
              },
              {
                number: "04",
                title: "Acceso",
                description:
                  "Ponemos a tu disposición todo el archivo para consulta.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl border border-gray-100 shadow-md hover:shadow-lg transition-all duration-500 transform hover:-translate-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section id="timeline-section" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Explora Nuestra Línea del Tiempo
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Navega por nuestros documentos organizados cronológicamente.
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                year: "2020",
                title: "Lanzamiento del Proyecto",
                description:
                  "Comenzamos con la visión de hacer que los periódicos históricos sean accesibles para todos.",
              },
              {
                year: "2021",
                title: "1M de Artículos",
                description:
                  "Alcanzamos nuestro primer hito de un millón de artículos digitalizados.",
              },
              {
                year: "2022",
                title: "Integración de IA",
                description:
                  "Implementamos capacidades avanzadas de búsqueda y OCR.",
              },
              {
                year: "2023",
                title: "Expansión Global",
                description:
                  "Ampliamos nuestro archivo para incluir publicaciones internacionales.",
              },
            ].map((event, i) => (
              <div
                key={i}
                className={`relative pl-10 border-l-4 border-blue-500 transform transition-all duration-500 ${
                  isVisible.timeline ? "opacity-100" : "opacity-0"
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="absolute left-0 top-0 transform -translate-x-1/2 w-6 h-6 rounded-full bg-white border-4 border-blue-500" />
                <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100">
                  <div className="text-xl font-bold text-blue-600 mb-2">
                    {event.year}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {event.title}
                  </h3>
                  <p className="text-gray-600">{event.description}</p>
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => router.push("/api/auth/signin")}
                  >
                    Explorar más
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-900">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Comienza a Explorar la Historia Hoy
          </h2>
          <p className="text-xl mb-8 text-gray-200">
            Únete a miles de investigadores, historiadores y mentes curiosas para
            descubrir el pasado a través de nuestro archivo.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => router.push("/api/auth/signin")}
            >
              Iniciar Sesión
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-blue-800 border-white hover:bg-white/10"
              onClick={() => router.push("/api/auth/signup")}
            >
              Registarse <ArrowRight className="ml-2" size={16} />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}