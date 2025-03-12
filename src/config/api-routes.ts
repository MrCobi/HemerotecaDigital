export const API_ROUTES = {
  users: {
    crud: {
      get: (id: string) => `/api/users/${id}`,
      delete: (id: string) => `/api/users/delete/${id}`,
      create: "/api/users/create",
      update: (id: string) => `/api/users/edit/${id}`,
    },
    stats: "/api/users/stats",
    followStatus: (ids: string[]) => `/api/users/follow-status?ids=${ids.join(",")}`,
    suggestions: (query: string) => `/api/users/suggestions?query=${encodeURIComponent(query)}`,
    byUsername: (username: string) => `/api/users/by-username/${username}`, // Nueva ruta añadida
  },
  activity: {
    following: (page: number, limit: number) => 
      `/api/activity/following?page=${page}&limit=${limit}`
  },
  categories: {
    list: "/api/categories"
  },
  articles: {
    featured: "/api/articles/featured"
  },
  sources: {
    byCategory: (category: string) => 
      `/api/sources/categories/${encodeURIComponent(category)}`,
    details: "/api/sources/details"
  },
  favorites: {
    list: "/api/favorites/list",
    add: "/api/favorites/add",
    remove: (sourceId: string) => `/api/favorites/remove/${sourceId}`,
  },
  comments: {
    list: (sourceId: string, page: number) => 
      `/api/comments/list/${sourceId}?page=${page}`,
    count: (sourceId: string) => `/api/comments/count/${sourceId}`,
    byUser: (userId: string) => `/api/comments/user/${userId}`, // Nueva ruta añadida
  },
  trends: {
    list: "/api/trends"
  }
};