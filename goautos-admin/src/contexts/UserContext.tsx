import { supabase } from "@/integrations/supabase/client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  avatarUrl: string;
}

interface UserContextProps {
  userData: UserData | null;
  isLoadingProfile: boolean;
  refreshUserData: () => Promise<void>;
}

const DEFAULT_USER_DATA: UserData = {
  id: "",
  email: "",
  firstName: "",
  lastName: "",
  name: "",
  avatarUrl: "",
};

const UserContext = createContext<UserContextProps>({
  userData: null,
  isLoadingProfile: false,
  refreshUserData: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  const fetchUserData = async () => {
    if (!user || !user.id) return;

    setIsLoadingProfile(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name, email, auth_id")
        .eq("auth_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
        return;
      }

      if (data) {
        const fullName =
          `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
          "Usuario";

        setUserData({
          id: data.auth_id || "",
          email: data.email || user.email || "",
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          name: fullName,
          avatarUrl: "",
        });
      }
    } catch (error) {
      console.error("Error in fetchUserData:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Initial fetch when component mounts or user changes
  useEffect(() => {
    if (user && !userData) {
      fetchUserData();
    }
  }, [user]);

  const refreshUserData = async () => {
    await fetchUserData();
  };

  return (
    <UserContext.Provider
      value={{ userData, isLoadingProfile, refreshUserData }}
    >
      {children}
    </UserContext.Provider>
  );
};
