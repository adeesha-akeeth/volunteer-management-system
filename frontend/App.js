import 'react-native-gesture-handler';
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Auth Screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';

// Opportunity Screens
import OpportunityListScreen from './screens/opportunity/OpportunityListScreen';
import OpportunityDetailScreen from './screens/opportunity/OpportunityDetailScreen';
import CreateOpportunityScreen from './screens/opportunity/CreateOpportunityScreen';
import CreatorOpportunityDetailScreen from './screens/opportunity/CreatorOpportunityDetailScreen';
import MyCreatedOpportunitiesScreen from './screens/opportunity/MyCreatedOpportunitiesScreen';

// Application Screens
import ApplyScreen from './screens/application/ApplyScreen';
import MyApplicationsScreen from './screens/application/MyApplicationsScreen';

// Feedback Screens
import SubmitFeedbackScreen from './screens/feedback/SubmitFeedbackScreen';

// Profile Screen
import ProfileScreen from './screens/profile/ProfileScreen';

// Certificate Screen
import MyCertificatesScreen from './screens/certificate/MyCertificatesScreen';

// Donation Screen
import MyDonationsScreen from './screens/donation/MyDonationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
        else if (route.name === 'Donations') iconName = focused ? 'heart' : 'heart-outline';
        else if (route.name === 'Certificates') iconName = focused ? 'ribbon' : 'ribbon-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      }
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Donations" component={MyDonationsScreen} />
    <Tab.Screen name="Certificates" component={MyCertificatesScreen} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="OpportunityList" component={OpportunityListScreen} options={{ title: 'Opportunities' }} />
    <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ title: 'Details' }} />
    <Stack.Screen name="CreateOpportunity" component={CreateOpportunityScreen} options={{ title: 'Post Opportunity' }} />
    <Stack.Screen name="Apply" component={ApplyScreen} options={{ title: 'Apply' }} />
    <Stack.Screen name="CreatorOpportunityDetail" component={CreatorOpportunityDetailScreen} options={{ title: 'Manage Applications' }} />
    <Stack.Screen name="SubmitFeedback" component={SubmitFeedbackScreen} options={{ title: 'Submit Feedback' }} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'My Profile' }} />
    <Stack.Screen name="MyApplications" component={MyApplicationsScreen} options={{ title: 'My Applications' }} />
    <Stack.Screen name="MyCreatedOpportunities" component={MyCreatedOpportunitiesScreen} options={{ title: 'My Created Opportunities' }} />
    <Stack.Screen name="CreatorOpportunityDetail" component={CreatorOpportunityDetailScreen} options={{ title: 'Manage Applications' }} />
    <Stack.Screen name="SubmitFeedback" component={SubmitFeedbackScreen} options={{ title: 'Submit Feedback' }} />
  </Stack.Navigator>
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