export const API_ROUTES = {
  auth: {
    signIn: "/api/auth/signin",
    signUp: "/api/auth/signup",
    signOut: "/api/auth/signout",
    resendVerification: "/api/auth/resend-verification",
    resetPassword: "/api/auth/reset-password",
    verifyEmail: "/api/auth/verify-email",
    tokenLogin: "/api/auth/token-login",
    resetPasswordVerify: (token: string) => `/api/auth/reset-password/${token}/verify`,
    resetPasswordReset: (token: string) => `/api/auth/reset-password/${token}/reset`,
    registerUpload: "/api/auth/register-upload"
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
    privacy: "/api/user/privacy"
  },
  relationships: {
    follow: "/api/relationships",
    unfollow: (targetUserId: string) => `/api/relationships?targetUserId=${targetUserId}`,
    checkFollowing: (targetUserId: string) => `/api/relationships/check?targetUserId=${targetUserId}`,
    followers: (userId: string, page: number = 1, limit: number = 10) =>
      `/api/relationships/followers/${userId}?page=${page}&limit=${limit}`,
    following: (userId: string, page: number = 1, limit: number = 10) =>
      `/api/relationships/following/${userId}?page=${page}&limit=${limit}`,
    mutual: "/api/relationships/mutual"
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
    featured: "/api/articles/featured",
    list: "/api/articulos"
  },
  sources: {
    list: (page: number = 1, limit: number = 10, language?: string, search?: string) =>
      `/api/sources?page=${page}&limit=${limit}${language && language !== 'all' ? `&language=${language}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    get: (id: string) => `/api/sources/${id}`,
    byCategory: (category: string) => `/api/sources/categories/${encodeURIComponent(category)}`,
    details: "/api/sources/details",
    getDetails: (_sourceIds: string[]) => `/api/sources/details`,
    ratings: {
      add: "/api/sources/ratings",
      delete: (_sourceId: string) => `/api/sources/ratings?sourceId=${_sourceId}`,
      get: (sourceId: string) => `/api/sources/ratings?sourceId=${sourceId}`,
      average: (sourceId: string) => `/api/sources/ratings/average?sourceId=${sourceId}`
    },
    articles: (sourceId: string, sortBy?: string, language?: string) => 
      `/api/sources/${sourceId}/articles${sortBy || language ? '?' : ''}${sortBy ? `sortBy=${sortBy}` : ''}${sortBy && language ? '&' : ''}${language ? `language=${language}` : ''}`,
  },
  favorites: {
    add: "/api/favorites/add",
    remove: (_sourceId: string) => `/api/favorites/remove`,
    removeByPost: "/api/favorites/remove",  // Para cuando se envía por POST
    check: (sourceId: string) => `/api/favorites/check/${sourceId}`,
    user: (userId: string, page: number = 1, limit: number = 10) =>
      `/api/favorites/${userId}?page=${page}&limit=${limit}`,
    list: "/api/favorites/list"
  },
  comments: {
    create: "/api/comments",
    delete: (commentId: string) => `/api/comments/${commentId}`,
    update: (commentId: string) => `/api/comments/${commentId}`,
    list: (sourceId: string, page: number = 1, limit: number = 5) =>
      `/api/comments/list/${sourceId}?page=${page}&limit=${limit}`,
    count: (sourceId: string) => `/api/comments/count/${sourceId}`,
    byUser: (userId: string) => `/api/comments/user/${userId}`,
    userCount: (userId: string) => `/api/comments/user/count/${userId}`,
    replies: (commentId: string) => `/api/comments/${commentId}/replies`
  },
  messages: {
    send: "/api/messages",
    get: (otherUserId: string) => `/api/messages?with=${otherUserId}`,
    list: "/api/messages",  // Para obtener todas las conversaciones
    conversations: "/api/messages/conversations",
    createConversation: "/api/messages/conversations/create",
    read: "/api/messages/read",
    unreadCount: "/api/messages/unread/count",
    sse: "/api/messages/sse",
    sseMessages: "/api/messages/sse-messages",
    globalSse: "/api/messages/global-sse",
    socket: "/api/messages/socket"
  },
  upload: "/api/upload",
  stats: "/api/stats",
  trends: {
    popular: "/api/trends/popular"
  },
  external: {
    news: "https://newsapi.org/v2/top-headlines?country=us&apiKey=da3db1fa448a49d9a84fbdd13e4d6098"
  }
};