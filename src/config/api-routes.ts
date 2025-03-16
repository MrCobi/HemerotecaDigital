export const API_ROUTES = {
  auth: {
    signIn: "/api/auth/signin",
    signUp: "/api/auth/signup",
    signOut: "/api/auth/signout"
  },
  users: {
    crud: {
      get: (id: string) => `/api/users/${id}`,
      delete: (id: string) => `/api/users/${id}`,
      create: "/api/users",
      update: (id: string) => `/api/users/${id}`,
      list: (page: number, limit: number, search?: string) =>
        `/api/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    },
    stats: "/api/users/stats",
    byUsername: (username: string) => `/api/users/by-username/${username}`,
    suggestions: (query: string) => `/api/users/suggestions?query=${encodeURIComponent(query)}`,
    followStatus: (ids: string[]) => `/api/users/follow-status?ids=${ids.join(",")}`,
  },
  relationships: {
    follow: "/api/relationships",
    unfollow: (targetUserId: string) => `/api/relationships?targetUserId=${targetUserId}`,
    checkFollowing: (targetUserId: string) => `/api/relationships/check?targetUserId=${targetUserId}`,
    followers: (userId: string, page: number = 1, limit: number = 10) =>
      `/api/relationships/followers/${userId}?page=${page}&limit=${limit}`,
    following: (userId: string, page: number = 1, limit: number = 10) =>
      `/api/relationships/following/${userId}?page=${page}&limit=${limit}`
  },
  activities: {
    user: (userId: string, page: number = 1, limit: number = 10) =>
      `/api/activities/${userId}?page=${page}&limit=${limit}`,
    following: (page: number = 1, limit: number = 10) =>
      `/api/activities/following?page=${page}&limit=${limit}`,
    global: (page: number = 1, limit: number = 10) =>
      `/api/activities?page=${page}&limit=${limit}`
  },
  categories: {
    list: "/api/categories"
  },
  articles: {
    featured: "/api/articles/featured"
  },
  sources: {
    list: (page: number = 1, limit: number = 10, category?: string, search?: string) =>
      `/api/sources?page=${page}&limit=${limit}${category ? `&categoryId=${category}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    get: (id: string) => `/api/sources/${id}`,
    byCategory: (category: string) => `/api/sources?category=${encodeURIComponent(category)}`,
    details: "/api/sources/details",
    getDetails: (_sourceIds: string[]) => `/api/sources/details`,
    ratings: {
      add: "/api/sources/ratings",
      average: (sourceId: string) => `/api/sources/ratings/average?sourceId=${sourceId}`
    }
  },
  favorites: {
    add: "/api/favorites",
    remove: (sourceId: string) => `/api/favorites?sourceId=${sourceId}`,
    check: (sourceId: string) => `/api/favorites/check/${sourceId}`,
    user: (userId: string, page: number = 1, limit: number = 10) =>
      `/api/favorites/${userId}?page=${page}&limit=${limit}`,
    list: "/api/favorites"
  },
  comments: {
    create: "/api/comments",
    delete: (commentId: string) => `/api/comments/${commentId}`,
    list: (sourceId: string, page: number = 1, limit: number = 5) =>
      `/api/comments/list/${sourceId}?page=${page}&limit=${limit}`,
    count: (sourceId: string) => `/api/comments/count/${sourceId}`,
    byUser: (userId: string) => `/api/comments/user/${userId}`,
    replies: (commentId: string) => `/api/comments/${commentId}/replies`
  },
  media: {
    upload: "/api/media/upload"
  },
  trends: {
    list: "/api/trends"
  }
};