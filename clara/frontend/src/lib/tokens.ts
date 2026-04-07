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
