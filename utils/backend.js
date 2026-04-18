const DEFAULT_BACKEND_URL =
  'https://raymond-uncommensurate-unerringly.ngrok-free.dev';

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;

export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || BACKEND_URL;
