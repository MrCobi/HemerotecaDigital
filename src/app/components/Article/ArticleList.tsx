import React, { useEffect, useState } from "react";
import { Article } from "../../../interface/article";
import Image from "next/image";
import Link from "next/link";
import { Calendar, User, ArrowRight } from "lucide-react";

interface Props {
  articles: Article[];
}

export default function ArticleList({ articles }: Props) {
  const [showArticles, setShowArticles] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowArticles(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [articles]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString("es-ES", options);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {articles && articles.length > 0 ? (
          articles.map((article, index) => (
            <article
              key={index}
              className={`group relative bg-white rounded-lg shadow-md overflow-hidden 
                         transform transition-all duration-700 ease-in-out hover:-translate-y-2 hover:shadow-xl 
                         ${showArticles ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="relative h-56 sm:h-64">
                <Image
                  src={article.urlToImage || "/images/default_periodico.jpg"}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30"></div>
                <div className="absolute inset-0 flex items-end p-4 sm:p-6">
                  <h2 className="text-white text-xl sm:text-2xl font-bold leading-tight">
                    {article.title}
                  </h2>
                </div>
              </div>

              <div className="p-4 sm:p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/90 to-indigo-900/95 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out z-10"></div>
                
                <div className="relative z-20 group-hover:opacity-0 transition-opacity duration-500">
                  <p className="text-gray-600 mb-4 line-clamp-3 text-sm sm:text-base">
                    {article.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      <span className="truncate max-w-[120px]">
                        {article.author || 'Anónimo'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{formatDate(article.publishedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <Link 
                      href={`/sources/${article.source.id}`}
                      className="text-sm text-gray-500 hover:text-blue-600"
                      aria-label={`Ver más noticias de ${article.source.name}`}
                    >
                      {article.source.name || 'El Mundo'}
                    </Link>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Leer más
                      <ArrowRight className="ml-1 w-4 h-4" />
                    </a>
                  </div>
                </div>
                
                <div className="absolute inset-0 p-4 sm:p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out z-20 flex flex-col">
                  <div className="flex-grow overflow-hidden mb-4">
                    <div className="animate-scrollText">
                      <p className="text-white/90 mb-4">
                        {article.description}
                      </p>
                      {article.source.name === "EL MUNDO" && (
                        <div className="mb-4">
                          <p className="text-white/90 mb-2 text-sm">
                            Disponible en Orbyt desde las 23:30h. y cada día en tu quiosco, 
                            la mejor información siempre con EL MUNDO.
                          </p>
                          <p className="text-white/90 text-sm">
                            Suscríbete aquí a PREMIUM y tendrás acceso ilimitado a todo el contenido.
                          </p>
                        </div>
                      )}
                      <p className="text-white/90 mb-4 mt-8">
                        {article.description}
                      </p>
                      {article.source.name === "EL MUNDO" && (
                        <div className="mb-4">
                          <p className="text-white/90 mb-2 text-sm">
                            Disponible en Orbyt desde las 23:30h. y cada día en tu quiosco, 
                            la mejor información siempre con EL MUNDO.
                          </p>
                          <p className="text-white/90 text-sm">
                            Suscríbete aquí a PREMIUM y tendrás acceso ilimitado a todo el contenido.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative z-30">
                    <div className="flex items-center justify-between text-sm text-blue-100 mb-4">
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        <span className="truncate max-w-[120px]">
                          {article.author || article.source.name}
                        </span>
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(article.publishedAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-blue-300/20">
                      <Link 
                        href={`/sources/${article.source.id}`}
                        className="text-sm text-blue-200 hover:text-white transition-colors duration-300 pointer-events-auto"
                        aria-label={`Ver más noticias de ${article.source.name}`}
                      >
                        {article.source.name || 'El Mundo'}
                      </Link>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-white font-medium hover:text-blue-200 transition-colors duration-300 pointer-events-auto"
                      >
                        Leer más
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No hay artículos disponibles.</p>
          </div>
        )}
      </div>
    </div>
  );
}