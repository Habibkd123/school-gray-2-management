import jwt, { SignOptions } from "jsonwebtoken";

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || "school_access_secret_key_2026";
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || "school_refresh_secret_key_2026";

export interface JWTPayload {
  user_id: string;
  school_id: string | null;
  role: string;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  const options: SignOptions = { expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m" } as SignOptions;
  return jwt.sign(payload, getAccessSecret(), options);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  const options: SignOptions = { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" } as SignOptions;
  return jwt.sign(payload, getRefreshSecret(), options);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, getAccessSecret()) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, getRefreshSecret()) as JWTPayload;
};
