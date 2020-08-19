import React, {
  createContext,
  useCallback,
  useState,
  useContext,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import api from '../provider/api';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

interface AuthStateDTO {
  token: string;
  user: User;
}

interface AuthCredentialsDTO {
  email: string;
  password: string;
}

interface AuthContextDTO {
  user: User;
  loading: boolean;
  signIn(credentials: AuthCredentialsDTO): Promise<void>;
  signOut(): void;
  updateUser(user: User): Promise<void>;
}

const AuthContext = createContext<AuthContextDTO>({} as AuthContextDTO);

export const AuthProvider: React.FC = ({ children }) => {
  const [dataAuth, setDataAuth] = useState<AuthStateDTO>({} as AuthStateDTO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [token, user] = await AsyncStorage.multiGet([
        '@GoBarber:token',
        '@GoBarber:user',
      ]);

      if (token[1] && user[1]) {
        api.defaults.headers.authorization = `Bearer ${token[1]}`;

        setDataAuth({ token: token[1], user: JSON.parse(user[1]) });
      }

      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { data } = await api.post('sessions', {
      email,
      password,
    });

    const { token, user } = data;
    await AsyncStorage.multiSet([
      ['@GoBarber:token', token],
      ['@GoBarber:user', JSON.stringify(user)],
    ]);

    api.defaults.headers.authorization = `Bearer ${token}`;

    setDataAuth({ token, user });
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove(['@GoBarber:token', '@GoBarber:user']);

    setDataAuth({} as AuthStateDTO);
  }, []);

  const updateUser = useCallback(
    async (user: User) => {
      await AsyncStorage.setItem('@GoBarber:user', JSON.stringify(user));

      setDataAuth({
        token: dataAuth.token,
        user,
      });
    },
    [dataAuth.token],
  );

  return (
    <AuthContext.Provider
      value={{ user: dataAuth.user, signIn, signOut, updateUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextDTO {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
