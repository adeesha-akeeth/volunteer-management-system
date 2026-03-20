import { Ionicons } from '@expo/vector-icons';

import { ActivityIndicator, View, StatusBar } from 'react-native';

import 'react-native-gesture-handler';
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './context/AuthContext';


import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import OpportunityListScreen from './screens/opportunity/OpportunityListScreen';
import OpportunityDetailScreen from './screens/opportunity/OpportunityDetailScreen';
import CreateOpportunityScreen from './screens/opportunity/CreateOpportunityScreen';
import MyApplicationsScreen from './screens/application/MyApplicationsScreen';
import MyHoursScreen from './screens/hours/MyHoursScreen';
import MyFeedbackScreen from './screens/feedback/MyFeedbackScreen';
import MyDonationsScreen from './screens/donation/MyDonationsScreen';
import MyCertificatesScreen from './screens/certificate/MyCertificatesScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const OpportunityStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="OpportunityList" component={OpportunityListScreen} options={{ title: 'Opportunities' }} />
    <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ title: 'Details' }} />
    <Stack.Screen name="CreateOpportunity" component={CreateOpportunityScreen} options={{ title: 'Create Opportunity' }} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#2e86de',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: { paddingBottom: 5, height: 60 },
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Applications') iconName = focused ? 'document-text' : 'document-text-outline';
        else if (route.name === 'Hours') iconName = focused ? 'time' : 'time-outline';
        else if (route.name === 'Feedback') iconName = focused ? 'star' : 'star-outline';
        else if (route.name === 'Donations') iconName = focused ? 'heart' : 'heart-outline';
        else if (route.name === 'Certificates') iconName = focused ? 'ribbon' : 'ribbon-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      }
    })}
  >
    <Tab.Screen name="Home" component={OpportunityStack} />
    <Tab.Screen name="Applications" component={MyApplicationsScreen} />
    <Tab.Screen name="Hours" component={MyHoursScreen} />
    <Tab.Screen name="Feedback" component={MyFeedbackScreen} />
    <Tab.Screen name="Donations" component={MyDonationsScreen} />
    <Tab.Screen name="Certificates" component={MyCertificatesScreen} />
  </Tab.Navigator>
);

const RootNavigator = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2e86de" />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, paddingTop: StatusBar.currentHeight }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </View>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}