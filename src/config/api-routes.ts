// En tu archivo api-routes.ts
export const API_ROUTES = {
    users: {
      crud: {
        get: (id: string) => `/api/users/${id}`,
        delete: (id: string) => `/api/users/delete/${id}`,
        create: "/api/users/create",
        update: (id: string) => `/api/users/edit/${id}`,
      },
      followStatus: (ids: string[]) => 
        `/api/users/follow-status?ids=${ids.join(",")}`,
    },
    sources: {
      byCategory: (category: string) => 
        `/api/sources/categories/${encodeURIComponent(category)}`,
      // Puedes agregar más rutas relacionadas con sources
    },
  };