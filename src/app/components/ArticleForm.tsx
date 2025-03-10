import React, { useState, useEffect } from "react";
import { Source } from "../../interface/source";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import { fetchSources } from "../services/SourcesbyLanguageService";
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
    fetchSources(searchParams.language, setLoadingSources, setAvailableSources);
  }, [searchParams.language]);

  

  return (
    <form
    onSubmit={handleSearch}
    className="p-8 bg-gradient-to-r from-white-100 to-blue-200 shadow-lg rounded-xl max-w-6xl mx-auto space-y-8 mb-10"
  >
    {/* Título */}
    <h2 className="text-4xl font-bold text-center text-gray-800">
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
          className="w-full p-4 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
        <div className="absolute top-4 left-3 text-gray-500">
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
          className="block mb-2 text-sm font-medium text-gray-700"
        ></label>
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
  
    {/* Idioma y Orden */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
      <div>
        <label
          htmlFor="language"
          className="block mb-2 text-sm font-medium text-gray-700"
        >
          Idioma:
        </label>
        <select
          id="language"
          name="language"
          value={searchParams.language}
          onChange={handleInputChange}
          className="w-full p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="pt">Portugués</option>
          <option value="it">Italiano</option>
          <option value="de">Alemán</option>
          <option value="ar">Árabe</option>
          <option value="zh">Chino</option>
          <option value="ru">Ruso</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="sortBy"
          className="block mb-2 text-sm font-medium text-gray-700"
        >
          Ordenar por:
        </label>
        <select
          id="sortBy"
          name="sortBy"
          value={searchParams.sortBy}
          onChange={handleInputChange}
          className="w-full p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
          className="block mb-2 text-sm font-medium text-gray-700"
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
          className="w-full p-4 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
        <div className="absolute top-12 left-3 text-gray-500">
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
          className="block mb-2 text-sm font-medium text-gray-700"
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
          className="w-full p-4 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
        <div className="absolute top-12 left-3 text-gray-500">
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
        className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      >
        Buscar
      </button>
    </div>
  </form>
  
  );
};

export default SearchForm;
