import 'react-native-gesture-handler';
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Auth Screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';

// Main Screens
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

// Opportunity Stack
const OpportunityStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="OpportunityList" component={OpportunityListScreen} options={{ title: 'Opportunities' }} />
    <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ title: 'Details' }} />
    <Stack.Screen name="CreateOpportunity" component={CreateOpportunityScreen} options={{ title: 'Create Opportunity' }} />
  </Stack.Navigator>
);

// Bottom Tab Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#2e86de',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: { paddingBottom: 5, height: 60 }
    }}
  >
    <Tab.Screen name="Opportunities" component={OpportunityStack} />
    <Tab.Screen name="Applications" component={MyApplicationsScreen} />
    <Tab.Screen name="Hours" component={MyHoursScreen} />
    <Tab.Screen name="Feedback" component={MyFeedbackScreen} />
    <Tab.Screen name="Donations" component={MyDonationsScreen} />
    <Tab.Screen name="Certificates" component={MyCertificatesScreen} />
  </Tab.Navigator>
);

// Root Navigator
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
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}