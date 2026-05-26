/**
 * app/index.tsx — Entry point
 * Redirects the root route "/" to the splash screen.
 * Required by Expo Router: without this file, opening the app shows "Unmatched Route".
 */
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/screens/splash" />;
}
