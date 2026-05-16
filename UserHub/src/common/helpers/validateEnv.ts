/**
 * List of required environment variables for the application.
 * These values are mandatory for server startup and core functionality.
 */
const REQUIRED_ENV_VARS = [
    "PORT",
    "JWT_SECRET",
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "DB_PORT",
    "FRONTEND_URL"
]; 

/**
 * Validates that all required environment variables are present before app startup.
 *
 * If any variable is missing or empty:
 * - Logs an error with missing keys
 * - Terminates the process immediately
 *
 * Ensures the application does not start in an invalid configuration state.
 */
export const validateEnvVariables = () => {
  const missingEnvVars = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || process.env[key]?.trim() === ""
  );

  if (missingEnvVars.length > 0) {
    console.error(
      `❌ Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
    process.exit(1);
  }

  console.log("✅ All required environment variables are set");
};

