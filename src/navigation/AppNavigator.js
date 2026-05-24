import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, useTheme } from 'react-native-paper';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import DashboardScreen from '../screens/DashboardScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ source, color }) {
  return <Icon source={source} size={22} color={color} />;
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
          height: 62,
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
          tabBarIcon: ({ color }) => <TabIcon source="dumbbell" color={color} />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: ({ color }) => <TabIcon source="chart-line" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
