# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## AI Search Feature

The app includes an AI-powered search engine that allows users to describe lost items in natural language and find matching items using semantic search.

### Setup

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add the API key to your environment variables:
   - Create a `.env` file in the root directory (if it doesn't exist)
   - Add: `EXPO_PUBLIC_OPENAI_API_KEY=your_api_key_here`
   - Or add it to `app.json` in the `extra` section:
     ```json
     "extra": {
       "OPENAI_API_KEY": "your_api_key_here"
     }
     ```

### How it works

- Users can describe items in natural language (e.g., "red wallet with credit cards")
- The AI uses embeddings to understand the semantic meaning of the description
- It matches against all lost items and ranks them by similarity
- Results show a match score percentage indicating relevance
- Falls back to simple keyword matching if the API key is not configured

### Usage

1. Navigate to the "Lost Items" tab
2. Enter a description in the search bar
3. Tap "AI Search" or press Enter
4. View matching items sorted by relevance with match scores

# CEN4090L_Group25_Project
