import React from 'react';
import { Text as RNText } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import DashboardScreen from '../screens/DashboardScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji }) {
  return <RNText style={{ fontSize: 22 }}>{emoji}</RNText>;
}

export default function AppNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceVariant,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.placeholder,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Workout"
        component={ActiveWorkoutScreen}
        options={{
          tabBarLabel: 'Workout',
          tabBarIcon: () => <TabIcon emoji="🏋️" />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: () => <TabIcon emoji="📊" />,
        }}
      />
    </Tab.Navigator>
  );
}
