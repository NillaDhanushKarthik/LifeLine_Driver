import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './src/AuthContext';
import { DriverProvider } from './src/DriverContext';
import OfferModal from './src/components/OfferModal';
import SirenPlayer from './src/components/SirenPlayer';
import Login from './src/screens/Login'; import Register from './src/screens/Register'; import Pending from './src/screens/Pending'; import Forgot from './src/screens/Forgot';
import Home from './src/screens/Home'; import History from './src/screens/History'; import Profile from './src/screens/Profile';
import { C } from './src/theme';


const Stack = createNativeStackNavigator();
const head = { headerTintColor: C.navy, headerTitleStyle: { fontWeight: '800' }, headerShadowVisible: false };

function Root() {
  const { loading, token } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.navy }}><ActivityIndicator color="#fff" size="large" /></View>;
  return token ? (
    <Stack.Navigator screenOptions={head}>
      <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <Stack.Screen name="History" component={History} options={{ title: 'Trip history' }} />
      <Stack.Screen name="Profile" component={Profile} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  ) : (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} /><Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="Pending" component={Pending} /><Stack.Screen name="Forgot" component={Forgot} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider><AuthProvider><DriverProvider>
      <NavigationContainer><StatusBar style="dark" /><Root /></NavigationContainer>
      <OfferModal />{/* rendered above every screen so an emergency can never be missed */}
      <SirenPlayer />
    </DriverProvider></AuthProvider></SafeAreaProvider>
  );
}

