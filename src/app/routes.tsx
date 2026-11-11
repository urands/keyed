import { Navigate, type RouteObject } from 'react-router';

import { AppLayout } from '../ui/layout/AppLayout';
import { HomeScreen } from '../ui/screens/HomeScreen';
import { PracticeScreen } from '../ui/screens/PracticeScreen';
import { StatsScreen } from '../ui/screens/StatsScreen';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'practice', element: <PracticeScreen /> },
      { path: 'stats', element: <StatsScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
