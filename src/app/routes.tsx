import { Navigate, type RouteObject } from 'react-router';

import { AppLayout } from '../ui/layout/AppLayout';
import { HomeScreen } from '../ui/screens/HomeScreen';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
