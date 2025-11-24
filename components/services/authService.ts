
import { UserRole } from "../types";

// The Master Key for you (The Owner)
const MASTER_KEY = "NEWAGE-ADMIN";

// A simple seeded random number generator to ensure the code is consistent 
// for the entire hour across different devices if needed, or just for the admin to regenerate.
const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export const generateEmployeeToken = (): string => {
    const now = new Date();
    // Create a unique seed for the current hour: YYYYMMDDHH
    // e.g., 2023102714 (Oct 27, 2023, 2pm)
    const seedString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}`;
    const seed = parseInt(seedString);
    
    // Generate a secure-looking 6-digit code based on this hour's seed
    // This ensures the code is fixed for the current hour.
    const rand = seededRandom(seed);
    const code = Math.floor(rand * 900000) + 100000; // Range: 100000 - 999999
    
    return code.toString();
};

export const verifyCredentials = (input: string): { success: boolean, role: UserRole } => {
    // 1. Check if it is the Master Admin
    if (input === MASTER_KEY) {
        return { success: true, role: 'admin' };
    }

    // 2. Check if it is the current hour's Employee Token
    const currentToken = generateEmployeeToken();
    if (input === currentToken) {
        return { success: true, role: 'employee' };
    }

    // Failed
    return { success: false, role: null };
};
