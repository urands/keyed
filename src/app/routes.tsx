import { Navigate, type RouteObject } from 'react-router';

import { AppLayout } from '../ui/layout/AppLayout';
import { AchievementsScreen } from '../ui/screens/AchievementsScreen';
import { CourseScreen } from '../ui/screens/CourseScreen';
import { HomeScreen } from '../ui/screens/HomeScreen';
import { PracticeScreen } from '../ui/screens/PracticeScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { StatsScreen } from '../ui/screens/StatsScreen';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'practice', element: <PracticeScreen /> },
      { path: 'course', element: <CourseScreen /> },
      { path: 'stats', element: <StatsScreen /> },
      { path: 'achievements', element: <AchievementsScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
