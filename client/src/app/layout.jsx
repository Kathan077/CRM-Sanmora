import '@fontsource/metropolis/300.css';
import '@fontsource/metropolis/400.css';
import '@fontsource/metropolis/500.css';
import '@fontsource/metropolis/600.css';
import '@fontsource/metropolis/700.css';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

export const metadata = {
  title: 'CRM Sanmora - Pro Level Customer Relationship Management',
  description: 'Enterprise CRM System with Granular RBAC, Lead Pipelines, and Team Management'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <div className="god-ambient-container">
          <div className="god-orb god-orb-1"></div>
          <div className="god-orb god-orb-2"></div>
          <div className="god-orb god-orb-3"></div>
          <div className="god-orb god-orb-4"></div>
        </div>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}



