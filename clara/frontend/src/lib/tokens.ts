const CLARA_JWT_KEY = "clara_jwt_token";

export const getJWT = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLARA_JWT_KEY);
};

export const setJWT = (token: string) => {
  localStorage.setItem(CLARA_JWT_KEY, token);
};

export const clearJWT = () => {
  localStorage.removeItem(CLARA_JWT_KEY);
};

export const decodeJWT = () => {
  const token = getJWT();
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

/**
 * Returns true only when a JWT exists AND has not yet expired.
 * Any auth guard that currently does `if (!getJWT())` should use this instead
 * so that an expired token doesn't pass the client-side check.
 */
export const isJWTValid = (): boolean => {
  const payload = decodeJWT();
  if (!payload) return false;
  // `exp` is seconds since epoch; Date.now() is milliseconds
  if (payload.exp && payload.exp < Date.now() / 1000) {
    clearJWT();
    return false;
  }
  return true;
};
