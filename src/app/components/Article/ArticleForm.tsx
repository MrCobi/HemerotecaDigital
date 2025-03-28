import { useState, useEffect } from "react";
import { Source } from "../../../interface/source";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import { fetchSources } from "../../services/SourcesbyLanguageService";

interface SearchFormProps {
  searchParams: {
    q: string;
    sources?: string;
    from?: string;
    to?: string;
    language: string;
    sortBy: string;
    pageSize: number;
  };
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handleSearch: (e: React.FormEvent) => void;
}

const SearchForm: React.FC<SearchFormProps> = ({
  searchParams,
  handleInputChange,
  handleSearch,
}) => {
  const [availableSources, setAvailableSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);

  useEffect(() => {
    if (searchParams.language === "") {
      handleInputChange({
        target: { name: "sources", value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
    }
    fetchSources(searchParams.language, setLoadingSources, setAvailableSources);
    console.log(`Cargando fuentes para idioma: ${searchParams.language}`);
  }, [searchParams.language, handleInputChange, searchParams.sources]);

  return (
    <form
      onSubmit={handleSearch}
      className="p-8 bg-gradient-to-r from-white-100 to-blue-200 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl max-w-6xl mx-auto space-y-8 mb-10"
    >
      {/* Título */}
      <h2 className="text-4xl font-bold text-center text-gray-800 dark:text-white">
        Buscar Artículos 📰
      </h2>

      {/* Búsqueda básica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="relative flex flex-col justify-center">
          <input
            type="text"
            name="q"
            value={searchParams.q}
            onChange={handleInputChange}
            placeholder="Palabras clave o frases"
            className="w-full p-4 pl-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:placeholder-gray-400 transition-all"
          />
          <div className="absolute top-4 left-3 text-gray-500 dark:text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Selector de fuente */}
        <div className="relative flex flex-col justify-center">
          <label
            htmlFor="sources"
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          ></label>
          <div className="w-full">
            <style jsx global>{`
              .MuiAutocomplete-root .MuiOutlinedInput-root {
                background-color: white;
                border-radius: 0.75rem;
                padding: 0.5rem 0.75rem;
              }
              .dark .MuiAutocomplete-root .MuiOutlinedInput-root {
                background-color: rgb(55, 65, 81);
                color: white;
                border-color: rgb(75, 85, 99);
              }
              .MuiAutocomplete-root .MuiOutlinedInput-notchedOutline {
                border-color: rgb(209, 213, 219);
                border-width: 2px;
                border-radius: 0.75rem;
              }
              .dark .MuiAutocomplete-root .MuiOutlinedInput-notchedOutline {
                border-color: rgb(75, 85, 99);
              }
              .MuiAutocomplete-root:hover .MuiOutlinedInput-notchedOutline {
                border-color: rgb(156, 163, 175);
              }
              .dark .MuiAutocomplete-root:hover .MuiOutlinedInput-notchedOutline {
                border-color: rgb(107, 114, 128);
              }
              .MuiAutocomplete-root .Mui-focused .MuiOutlinedInput-notchedOutline {
                border-color: rgb(59, 130, 246) !important;
                border-width: 2px;
              }
              .MuiInputLabel-root {
                color: rgb(75, 85, 99);
                font-size: 0.875rem;
                line-height: 1.25rem;
                transform: translate(14px, 16px) scale(1);
              }
              .MuiInputLabel-root.Mui-focused,
              .MuiInputLabel-root.MuiFormLabel-filled {
                transform: translate(14px, -9px) scale(0.75);
                background-color: white;
                padding: 0 5px;
              }
              .dark .MuiInputLabel-root.Mui-focused,
              .dark .MuiInputLabel-root.MuiFormLabel-filled {
                background-color: rgb(55, 65, 81);
              }
              .dark .MuiInputLabel-root {
                color: rgb(156, 163, 175);
              }
              .MuiInputLabel-root.Mui-focused {
                color: rgb(59, 130, 246);
              }
              .MuiAutocomplete-endAdornment {
                right: 9px !important;
              }
              .dark .MuiAutocomplete-clearIndicator, 
              .dark .MuiAutocomplete-popupIndicator {
                color: white;
              }
              .MuiAutocomplete-popupIndicatorOpen {
                transform: rotate(180deg);
              }
              /* Forzar alineación del texto dentro del input */
              .MuiAutocomplete-input {
                padding-right: 60px !important; /* Espacio para iconos */
              }
              /* Estilo responsivo */
              @media (max-width: 640px) {
                .MuiInputLabel-root {
                  transform: translate(14px, 14px) scale(1);
                  font-size: 0.8125rem;
                }
                .MuiInputLabel-root.Mui-focused,
                .MuiInputLabel-root.MuiFormLabel-filled {
                  transform: translate(14px, -9px) scale(0.75);
                }
                .MuiAutocomplete-root .MuiOutlinedInput-root {
                  padding: 0.375rem 0.5rem;
                }
                /* Ajustes específicos para evitar solapamiento en móviles */
                .MuiAutocomplete-endAdornment {
                  right: 5px !important;
                }
                .MuiAutocomplete-clearIndicator,
                .MuiAutocomplete-popupIndicator {
                  padding: 2px !important;
                }
                .MuiAutocomplete-clearIndicator svg,
                .MuiAutocomplete-popupIndicator svg {
                  width: 18px !important;
                  height: 18px !important;
                }
                .MuiAutocomplete-input {
                  padding-right: 55px !important;
                  font-size: 0.875rem !important;
                }
                /* Truncar texto demasiado largo */
                .MuiAutocomplete-input,
                .MuiInputBase-input {
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  overflow: hidden;
                }
              }
            `}</style>
            <Autocomplete
              id="sources"
              options={availableSources}
              getOptionLabel={(option) => option.name}
              value={
                availableSources.find(
                  (source) => source.id === searchParams.sources
                ) || null
              }
              onChange={(_, newValue) => {
                handleInputChange({
                  target: { name: "sources", value: newValue?.id || "" },
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              loading={loadingSources}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Selecciona una fuente"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingSources ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Idioma y Orden */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="relative flex flex-col w-full">
          <label
            htmlFor="language"
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Idioma
          </label>
          <select
            id="language"
            name="language"
            value={searchParams.language}
            onChange={(e) => {
              handleInputChange(e);
            }}
            className="block w-full px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="fr">Francés</option>
            <option value="de">Alemán</option>
            <option value="it">Italiano</option>
            <option value="pt">Portugués</option>
            <option value="ru">Ruso</option>
            <option value="ar">Árabe</option>
            <option value="zh">Chino</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="sortBy"
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Ordenar por:
          </label>
          <select
            id="sortBy"
            name="sortBy"
            value={searchParams.sortBy}
            onChange={handleInputChange}
            className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
          >
            <option value="relevancy">Relevancia</option>
            <option value="popularity">Popularidad</option>
            <option value="publishedAt">Fecha</option>
          </select>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="relative">
          <label
            htmlFor="from"
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Fecha desde:
          </label>
          <input
            type="date"
            id="from"
            name="from"
            value={searchParams.from || ""}
            onChange={handleInputChange}
            min="2024-12-25"
            max={new Date().toISOString().split("T")[0]}
            className="w-full p-4 pl-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
          />
          <div className="absolute top-12 left-3 text-gray-500 dark:text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h8m-4 8h.01M6 4h12M5 12h14M4 4v16M20 4v16"
              />
            </svg>
          </div>
        </div>
        <div className="relative">
          <label
            htmlFor="to"
            className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Fecha hasta:
          </label>
          <input
            type="date"
            id="to"
            name="to"
            value={searchParams.to || ""}
            onChange={handleInputChange}
            placeholder="dd-mm-yyyy"
            min="2024-12-25"
            max={new Date().toISOString().split("T")[0]}
            className="w-full p-4 pl-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
          />
          <div className="absolute top-12 left-3 text-gray-500 dark:text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h8m-4 8h.01M6 4h12M5 12h14M4 4v16M20 4v16"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Botón de búsqueda */}
      <div className="flex justify-center">
        <button
          type="submit"
          className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
        >
          Buscar
        </button>
      </div>
    </form>
  );
};

export default SearchForm;
