function requiredEnv(name, value) {
  if (!value || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const BACKEND_URL = requiredEnv(
  'EXPO_PUBLIC_BACKEND_URL',
  process.env.EXPO_PUBLIC_BACKEND_URL,
);

export const SOCKET_URL = requiredEnv(
  'EXPO_PUBLIC_SOCKET_URL',
  process.env.EXPO_PUBLIC_SOCKET_URL,
);
