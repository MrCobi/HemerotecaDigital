"use client";

import { Button } from "@/src/app/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

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

const StatItem = (props: {
  value: number;
  label: string;
  isVisible: boolean;
}) => {
  const count = useCounter(props.isVisible ? props.value : 0, 2000);

  return (
    <div className="transform transition-all duration-500 hover:scale-105 p-4 bg-white/10 dark:bg-blue-900/30 rounded-lg backdrop-blur-sm">
      <div className="text-3xl font-bold text-white mb-2">
        {count}+
      </div>
      <div className="text-base text-blue-100">{props.label}</div>
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

  const [activeSlide, setActiveSlide] = useState(0);
  const totalSlides = 3;

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToSlide = useCallback((index: number) => {
    setActiveSlide(index);
  }, []);

  useEffect(() => {
    if (session) {
      router.push("/home");
    }
  }, [session, router]);

  useEffect(() => {
    setIsLoaded(true);

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;

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

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => clearInterval(interval);
  }, [nextSlide]);

  const slideContent = [
    {
      title: "Descubre el Mundo de las Noticias Actuales",
      description:
        "Explora nuestra colección de artículos, reportajes y documentos informativos que cubren los acontecimientos más relevantes de nuestro tiempo.",
    },
    {
      title: "Navega por Temas de Interés Contemporáneo",
      description:
        "Accede a contenidos organizados por categorías, descubriendo las noticias y tendencias que definen nuestra actualidad.",
    },
    {
      title: "Comparte y Conecta con la Comunidad",
      description:
        "Únete a otros lectores interesados, comparte descubrimientos y participa en discusiones sobre temas de actualidad.",
    },
  ];

  return (
    <main className="min-h-screen dark:bg-blue-950">
      <section className="relative min-h-[85vh] sm:min-h-[75vh] w-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-900 dark:from-blue-900 dark:to-indigo-950">
        <div className="absolute inset-0 overflow-hidden">
          {decorativeElements.map((element, i) => (
            <div
              key={i}
              className="absolute opacity-30 sm:opacity-100"
              style={{
                left: element.left,
                top: element.top,
                width: element.width,
                height: element.height,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: "50%",
              }}
            />
          ))}
          <div className="absolute top-10 sm:top-1/4 right-[10%] w-12 h-12 sm:w-24 sm:h-24 md:w-40 md:h-40 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full opacity-30 sm:opacity-40 blur-lg animate-pulse"></div>
          <div className="absolute top-20 sm:bottom-1/3 left-[15%] w-16 h-16 sm:w-32 sm:h-32 md:w-48 md:h-48 bg-gradient-to-br from-blue-300/20 to-cyan-400/20 rounded-full opacity-30 sm:opacity-40 blur-lg animate-pulse"></div>
        </div>

        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center pt-20 pb-10 sm:pt-28 md:pt-36 lg:pt-32 sm:pb-0">
          <div
            className={`max-w-3xl mx-auto sm:mx-0 transition-all duration-1000 ease-out ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <p className="text-blue-300 dark:text-blue-200 font-medium mb-3 sm:mb-3 tracking-wider uppercase text-xs sm:text-sm md:text-base">
              Hemeroteca Digital
            </p>

            <div className="relative w-full overflow-hidden">
              <div
                className="flex w-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {slideContent.map((slide, index) => (
                  <div key={index} className="w-full min-w-full flex-shrink-0 flex flex-col">
                    <h1 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-2 xs:mb-3 sm:mb-6 leading-tight">
                      {slide.title.split(" ").length > 3 ? (
                        <>
                          <span className="block">{slide.title.split(" ").slice(0, 3).join(" ")}</span>
                          <span className="block mt-0 sm:mt-2">{slide.title.split(" ").slice(3).join(" ")}</span>
                        </>
                      ) : (
                        <span>{slide.title}</span>
                      )}
                    </h1>
                    <p className="text-xs xs:text-sm sm:text-base text-gray-200 dark:text-blue-200 mb-4 xs:mb-5 sm:mb-8 max-w-2xl">
                      {slide.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white dark:bg-blue-100 text-blue-600 dark:text-blue-900 hover:bg-gray-100 dark:hover:bg-blue-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 text-xs xs:text-sm sm:text-base py-2 xs:py-3"
                onClick={() => router.push("/api/auth/signin")}
              >
                Iniciar Sesión
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-white dark:text-blue-200 text-blue-600 border-white dark:border-blue-200 hover:bg-white/10 dark:hover:bg-blue-800/30 text-xs xs:text-sm sm:text-base py-2 xs:py-3"
                onClick={() => router.push("/api/auth/signup")}
              >
                Registrarse
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 xs:bottom-4 sm:bottom-8 left-0 right-0 w-full flex justify-center items-center">
          <div className="flex space-x-1 xs:space-x-2 sm:space-x-3">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className="focus:outline-none transition-all duration-300 py-1 xs:py-2 px-1 flex items-center justify-center"
                aria-label={`Ir a slide ${i + 1}`}
              >
                <div
                  className={`h-1 xs:h-1.5 sm:h-3 rounded-full transition-all duration-500 ${
                    i === activeSlide
                      ? "w-3 xs:w-5 sm:w-10 bg-blue-400 animate-pulse"
                      : "w-1 xs:w-1.5 sm:w-3 bg-white/60 dark:bg-blue-800/60 hover:bg-white/80 dark:hover:bg-blue-700/70"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="stats-section" className="py-8 sm:py-12 bg-gradient-to-r from-blue-600 to-indigo-900 dark:from-blue-900 dark:to-indigo-950 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-500/20 dark:bg-blue-400/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-indigo-500/20 dark:bg-indigo-400/10 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 lg:gap-8">
            {[{ value: 10000, label: "Artículos" }, { value: 7, label: "Categorías" }, { value: 100, label: "Fuentes" }, { value: 100, label: "Usuarios" }].map((stat, i) => (
              <StatItem key={i} value={stat.value} label={stat.label} isVisible={isVisible.stats} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-blue-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Cómo Funciona Nuestra Hemeroteca
            </h2>
            <p className="text-base text-gray-600 dark:text-blue-200 max-w-3xl mx-auto">
              Descubre el proceso que seguimos para organizar y hacer accesible la información a través de nuestro sistema digital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[{ number: "01", title: "Recopilación", description: "Seleccionamos cuidadosamente fuentes de noticias relevantes y actuales." }, { number: "02", title: "Procesamiento", description: "Utilizamos tecnología avanzada para analizar y clasificar los contenidos." }, { number: "03", title: "Categorización", description: "Organizamos los artículos por temas, relevancia y tendencias actuales." }, { number: "04", title: "Acceso", description: "Ponemos a tu disposición todo el contenido para consulta inmediata." }].map((step, i) => (
              <div
                key={i}
                className="bg-white dark:bg-blue-900 p-6 rounded-xl border border-gray-100 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-500 transform hover:-translate-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 flex items-center justify-center text-white font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-base text-gray-600 dark:text-blue-200">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="timeline-section" className="py-20 bg-gray-50 dark:bg-blue-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Explora Nuestras Categorías
            </h2>
            <p className="text-base text-gray-600 dark:text-blue-200 max-w-3xl mx-auto">
              Navega por nuestros artículos organizados por temas de interés.
            </p>
          </div>

          <div className="space-y-12">
            {[{ year: "Tecnología", title: "Avances Tecnológicos", description: "Descubre las últimas tendencias en tecnología, IA, gadgets y transformación digital." }, { year: "Deportes", title: "Actualidad Deportiva", description: "Mantente al día con las noticias deportivas más relevantes sobre fútbol, baloncesto y otros deportes." }, { year: "Cultura", title: "Expresiones Culturales", description: "Explora artículos sobre cine, música, literatura y otras manifestaciones culturales contemporáneas." }, { year: "Sociedad", title: "Temas Sociales", description: "Análisis y reportajes sobre temas que afectan a nuestra sociedad actual y sus desafíos." }].map((event, i) => (
              <div
                key={i}
                className={`relative pl-10 border-l-4 border-blue-500 dark:border-blue-400 transform transition-all duration-500 ${
                  isVisible.timeline ? "opacity-100" : "opacity-0"
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="absolute left-0 top-0 transform -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-blue-950 border-4 border-blue-500 dark:border-blue-400" />
                <div className="bg-white dark:bg-blue-900 p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 dark:border-blue-800">
                  <div className="text-base font-bold text-blue-600 dark:text-blue-300 mb-2">
                    {event.year}
                  </div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-white mb-2">
                    {event.title}
                  </h3>
                  <p className="text-base text-gray-600 dark:text-blue-200">{event.description}</p>
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

      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-900 dark:from-blue-900 dark:to-indigo-950">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Comienza a Explorar las Noticias Hoy
          </h2>
          <p className="text-base mb-8 text-gray-200 dark:text-blue-200">
            Únete a miles de lectores interesados para descubrir contenidos relevantes sobre temas de actualidad.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white dark:bg-blue-100 text-blue-600 dark:text-blue-900 hover:bg-gray-100 dark:hover:bg-blue-200"
              onClick={() => router.push("/api/auth/signin")}
            >
              Iniciar Sesión
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-blue-800 dark:text-blue-200 border-white dark:border-blue-200 hover:bg-white/10 dark:hover:bg-blue-800/30"
              onClick={() => router.push("/api/auth/signup")}
            >
              Registrarse <ArrowRight className="ml-2" size={16} />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}