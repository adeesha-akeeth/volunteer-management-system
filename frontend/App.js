import 'react-native-gesture-handler';
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ToastProvider } from './components/Toast';

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

// Impact Screens
import ImpactScreen from './screens/impact/ImpactScreen';
import OngoingOpportunitiesScreen from './screens/impact/OngoingOpportunitiesScreen';
import PastVolunteeringScreen from './screens/impact/PastVolunteeringScreen';

// Profile Extra Screens
import MyLikesCommentsScreen from './screens/profile/MyLikesCommentsScreen';

// Notifications Screen
import NotificationsScreen from './screens/notifications/NotificationsScreen';

// Donation Screens
import MyDonationsScreen from './screens/donation/MyDonationsScreen';
import FundraiserListScreen from './screens/donation/FundraiserListScreen';
import DonateScreen from './screens/donation/DonateScreen';

// Favourites Screens
import FavouritesScreen from './screens/favourites/FavouritesScreen';
import FavouriteDetailScreen from './screens/favourites/FavouriteDetailScreen';

// Publisher Screens
import PublisherProfileScreen from './screens/publisher/PublisherProfileScreen';
import FindPublishersScreen from './screens/publisher/FindPublishersScreen';

// Contribution Screens
import AllContributionsScreen from './screens/contribution/AllContributionsScreen';

// Profile Extra Screens (new)
import EditProfileScreen from './screens/profile/EditProfileScreen';
import ChangePasswordScreen from './screens/profile/ChangePasswordScreen';

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
        else if (route.name === 'Favourites') iconName = focused ? 'heart' : 'heart-outline';
        else if (route.name === 'Donations') iconName = focused ? 'cash' : 'cash-outline';
        else if (route.name === 'Impact') iconName = focused ? 'trophy' : 'trophy-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      }
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Favourites" component={FavouritesStack} />
    <Tab.Screen name="Donations" component={DonationsStack} />
    <Tab.Screen name="Impact" component={ImpactStack} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

const ImpactStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ImpactMain" component={ImpactScreen} options={{ title: 'My Impact' }} />
    <Stack.Screen name="OngoingOpportunities" component={OngoingOpportunitiesScreen} options={{ title: 'Active Volunteering' }} />
    <Stack.Screen name="PastVolunteering" component={PastVolunteeringScreen} options={{ title: 'Past Volunteering' }} />
  </Stack.Navigator>
);

const DonationsStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MyDonations" component={MyDonationsScreen} options={{ title: 'My Donations' }} />
    <Stack.Screen name="FundraiserList" component={FundraiserListScreen} options={{ title: 'Support a Cause' }} />
    <Stack.Screen name="OpportunityDetailFromDonations" component={OpportunityDetailScreen} options={{ title: 'Details' }} />
    <Stack.Screen name="Donate" component={DonateScreen} options={{ title: 'Make a Donation' }} />
  </Stack.Navigator>
);

const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="OpportunityList" component={OpportunityListScreen} options={{ title: 'Opportunities' }} />
    <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ title: 'Details' }} />
    <Stack.Screen name="CreateOpportunity" component={CreateOpportunityScreen} options={{ title: 'Post Opportunity' }} />
    <Stack.Screen name="Apply" component={ApplyScreen} options={{ title: 'Apply' }} />
    <Stack.Screen name="CreatorOpportunityDetail" component={CreatorOpportunityDetailScreen} options={{ title: 'Manage Opportunity' }} />
    <Stack.Screen name="SubmitFeedback" component={SubmitFeedbackScreen} options={{ title: 'Submit Feedback' }} />
    <Stack.Screen name="Donate" component={DonateScreen} options={{ title: 'Make a Donation' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    <Stack.Screen name="PublisherProfile" component={PublisherProfileScreen} options={{ title: 'Publisher Profile' }} />
  </Stack.Navigator>
);

const FavouritesStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="FavouritesList" component={FavouritesScreen} options={{ title: 'My Favourites' }} />
    <Stack.Screen name="FavouriteDetail" component={FavouriteDetailScreen} options={{ title: 'Favourites' }} />
    <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ title: 'Details' }} />
    <Stack.Screen name="Donate" component={DonateScreen} options={{ title: 'Make a Donation' }} />
    <Stack.Screen name="PublisherProfile" component={PublisherProfileScreen} options={{ title: 'Publisher Profile' }} />
    <Stack.Screen name="FindPublishers" component={FindPublishersScreen} options={({ route }) => ({ title: route.params?.followedOnly ? 'Following' : 'Find Publishers' })} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'My Profile' }} />
    <Stack.Screen name="MyApplications" component={MyApplicationsScreen} options={{ title: 'My Applications' }} />
    <Stack.Screen name="MyCreatedOpportunities" component={MyCreatedOpportunitiesScreen} options={{ title: 'My Created Opportunities' }} />
    <Stack.Screen name="CreatorOpportunityDetail" component={CreatorOpportunityDetailScreen} options={{ title: 'Manage Opportunity' }} />
    <Stack.Screen name="SubmitFeedback" component={SubmitFeedbackScreen} options={{ title: 'Submit Feedback' }} />
    <Stack.Screen name="FavouritesList" component={FavouritesScreen} options={{ title: 'My Favourites' }} />
    <Stack.Screen name="FavouriteDetail" component={FavouriteDetailScreen} options={{ title: 'Favourites' }} />
    <Stack.Screen name="MyLikesComments" component={MyLikesCommentsScreen} options={{ title: 'My Likes & Comments' }} />
    <Stack.Screen name="PublisherProfile" component={PublisherProfileScreen} options={{ title: 'Publisher Profile' }} />
    <Stack.Screen name="AllContributions" component={AllContributionsScreen} options={{ title: 'Verify Contributions' }} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
    <Stack.Screen name="OpportunityDetail" component={OpportunityDetailScreen} options={{ title: 'Details' }} />
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
      <ToastProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ToastProvider>
    </AuthProvider>
  );
}
