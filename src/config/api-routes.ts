export const API_ROUTES = {
  users: {
    crud: {
      get: (id: string) => `/api/users/${id}`,
      delete: (id: string) => `/api/users/delete/${id}`,
      create: "/api/users/create",
      update: (id: string) => `/api/users/edit/${id}`,
    },
    stats: "/api/users/stats", // Nueva ruta
    followStatus: (ids: string[]) => `/api/users/follow-status?ids=${ids.join(",")}`,
    suggestions: (query: string) => `/api/users/suggestions?query=${encodeURIComponent(query)}`
  },
  activity: {
    following: (page: number, limit: number) => 
      `/api/activity/following?page=${page}&limit=${limit}` // Nueva ruta
  },
  categories: {
    list: "/api/categories" // Nueva ruta
  },
  articles: {
    featured: "/api/articles/featured" // Nueva ruta (asumiendo que existe)
  },
  sources: {
    byCategory: (category: string) => 
      `/api/sources/categories/${encodeURIComponent(category)}`,
    details: "/api/sources/details"
  },
  favorites: {
    list: "/api/favorites/list"
  },
  trends: {
    list: "/api/trends"
  }
};
