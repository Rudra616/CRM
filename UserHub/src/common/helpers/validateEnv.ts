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

