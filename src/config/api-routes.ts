export const API_ROUTES = {
    users: {
      crud: {
        get: (id: string) => `/api/users/${id}`,
        delete: (id: string) => `/api/users/delete/${id}`,
        create: "/api/users/create",
        update: (id: string) => `/api/users/edit/${id}`,
      },
      followStatus: (ids: string[]) => `/api/users/follow-status?ids=${ids.join(",")}`,
      suggestions: (query: string) => `/api/users/suggestions?query=${encodeURIComponent(query)}`
    },
    sources: {
      byCategory: (category: string) => 
        `/api/sources/categories/${encodeURIComponent(category)}`,
      details: "/api/sources/details" // Nueva ruta añadida
    },
    favorites: {
      list: "/api/favorites/list" // Nueva ruta añadida
    }
  };