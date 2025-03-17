/**
 * Utility functions for environment-specific code
 */

/**
 * Check if we're running in a production environment 
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if we're running in a development environment
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
};

/**
 * Get the base URL for the application
 */
export const getBaseUrl = (): string => {
  return process.env.NEXTAUTH_URL || (
    isProduction() 
      ? 'https://yourproductiondomain.com' // Update this with your production domain
      : 'http://localhost:3000'
  );
};
