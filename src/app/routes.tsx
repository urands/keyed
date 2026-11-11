import { Navigate, type RouteObject } from 'react-router';

import { AppLayout } from '../ui/layout/AppLayout';
import { HomeScreen } from '../ui/screens/HomeScreen';
import { PracticeScreen } from '../ui/screens/PracticeScreen';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'practice', element: <PracticeScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
