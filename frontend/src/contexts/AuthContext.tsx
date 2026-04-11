import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type UserRole = "admin" | "user";

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institution?: string;
  avatar?: string;
  createdAt: string;
}

interface AuthContextType {
  user: MockUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { email: string; password: string; name: string; institution?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const MOCK_USERS: MockUser[] = [
  {
    id: "admin-001",
    email: "admin@memoprint.com",
    name: "Dr. Admin",
    role: "admin",
    institution: "University of Buea",
    createdAt: "2025-01-15",
  },
  {
    id: "user-001",
    email: "user@memoprint.com",
    name: "Regina Ebai",
    role: "user",
    institution: "Faculty of Engineering",
    createdAt: "2025-06-01",
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, _password: string) => {
    setIsLoading(true);
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 800));
    const found = MOCK_USERS.find((u) => u.email === email);
    if (found) {
      setUser(found);
      setIsLoading(false);
      return { success: true };
    }
    // Allow any email — default to "user" role
    const newUser: MockUser = {
      id: `user-${Date.now()}`,
      email,
      name: email.split("@")[0],
      role: "user",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setUser(newUser);
    setIsLoading(false);
    return { success: true };
  }, []);

  const signup = useCallback(async (data: { email: string; password: string; name: string; institution?: string }) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const exists = MOCK_USERS.find((u) => u.email === data.email);
    if (exists) {
      setIsLoading(false);
      return { success: false, error: "Email already registered" };
    }
    const newUser: MockUser = {
      id: `user-${Date.now()}`,
      email: data.email,
      name: data.name,
      role: "user",
      institution: data.institution,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setUser(newUser);
    setIsLoading(false);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
