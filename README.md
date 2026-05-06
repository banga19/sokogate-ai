# Sokogate AI

## Project Overview

Sokogate AI is a comprehensive AI-powered application featuring both web and mobile clients. The web application is built with React Router, providing a modern web experience with features like authentication, chat, dashboard, and settings. The mobile application uses Expo and React Native, offering native mobile capabilities including in-app purchases, location services, camera access, and more. The project integrates with Anything AI services for core AI functionality, along with integrations for payments (Stripe), authentication (@auth), and database (Neon).

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js**: Version 18 or higher (required for both web and mobile apps)
- **npm**: Version 8 or higher (comes with Node.js)
- **Expo CLI**: Install globally with `npm install -g @expo/cli` (for mobile development)
- **Git**: For version control (optional but recommended)

### Mobile-Specific Prerequisites
- **Android Studio**: For Android development (with Android SDK)
- **Xcode**: For iOS development (macOS only)
- **Java Development Kit (JDK)**: Version 11 or higher

### Optional Dependencies
- **Yarn**: Alternative package manager
- **Bun**: Alternative runtime (if preferred for web development)

## Installation Steps

1. **Extract the Archive**
   ```
   unzip "sokogate AI.zip"
   cd sokogate-ai
   ```

2. **Install Web Dependencies**
   ```
   cd apps/web
   npm install
   cd ..
   ```

3. **Install Mobile Dependencies**
   ```
   cd apps/mobile
   npm install
   cd ..
   ```

4. **Post-Installation Setup**
   - The mobile app uses `patch-package` for dependency patches, which runs automatically after npm install.

## Configuration

### Environment Variables

Copy the provided `.env` files and configure the necessary API keys and settings.

#### Web Configuration (`apps/web/.env`)
- `ANYTHING_PROJECT_TOKEN`: JWT token for Anything AI project authentication (already configured)

#### Mobile Configuration (`apps/mobile/.env`)
- `EXPO_PUBLIC_APP_URL`: Production app URL
- `EXPO_PUBLIC_BASE_URL`: Base API URL
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API key (obtain from Google Cloud Console)
- `EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY`: Uploadcare public key for file uploads
- Other EXPO_PUBLIC variables are pre-configured for production

### API Keys Setup
1. **Google Maps API**: Enable Maps SDK for Android/iOS and Web in Google Cloud Console
2. **Uploadcare**: Sign up at uploadcare.com and get your public key
3. **Stripe**: If implementing payments, configure Stripe keys
4. **Neon Database**: Database connection is configured via Neon serverless

## Usage Instructions

### Web Application
1. Navigate to the web directory:
   ```
   cd apps/web
   ```
2. Start the development server:
   ```
   npm run dev
   ```
3. Open your browser to `http://localhost:3000` (or the port shown in the console)

### Mobile Application
1. Navigate to the mobile directory:
   ```
   cd apps/mobile
   ```
2. Start the Expo development server:
   ```
   npx expo start
   ```
3. Use the Expo Go app on your device or simulator:
   - Scan the QR code with Expo Go
   - Or press 'a' for Android emulator, 'i' for iOS simulator

### Available Scripts
- **Web**:
  - `npm run dev`: Start development server
  - `npm run typecheck`: Run TypeScript type checking
- **Mobile**:
  - `npx expo start`: Start Expo development server
  - `npx expo run:android`: Build and run on Android
  - `npx expo run:ios`: Build and run on iOS

## Troubleshooting

### Common Issues

1. **Metro Bundler Issues (Mobile)**
   - Clear Metro cache: `npx expo start --clear`
   - Reset Expo: `npx expo r -c`

2. **Dependency Conflicts**
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`
   - For mobile, also delete patches: `rm -rf node_modules && npm install` (patch-package will reapply)

3. **Android Build Failures**
   - Ensure Android SDK is properly configured
   - Check JAVA_HOME environment variable
   - Update Gradle wrapper: `./gradlew wrapper --gradle-version 8.0`

4. **iOS Build Failures**
   - Ensure Xcode is up to date
   - Run `cd ios && pod install` if using CocoaPods
   - Check provisioning profiles and certificates

5. **API Connection Issues**
   - Verify `.env` file configurations
   - Check network connectivity to configured endpoints
   - Ensure API keys are valid and have proper permissions

6. **Expo Updates**
   - Clear Expo cache: `npx expo start -c`
   - Update Expo CLI: `npm install -g @expo/cli`

### Getting Help
- Check Expo documentation: https://docs.expo.dev
- React Router docs: https://reactrouter.com
- Anything AI documentation (if available)

### Logs and Debugging
- Web: Check browser console for errors
- Mobile: Use `console.log` or Expo's logging features
- Run with verbose logging: `EXPO_DEBUG=true npx expo start`</content>
<parameter name="filePath">anything/README.md# sokogate-ai
