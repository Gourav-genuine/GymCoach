# IronAgent

IronAgent is an AI-powered fitness coach that builds adaptive daily workouts around your goal, experience, equipment, time, and recovery signals.

## What It Does

- Generates a personalized workout for today from your profile and recent training history
- Adapts plans through chat-style feedback like low energy, soreness, limited time, or missing equipment
- Tracks exercise completion in real time with progress, status, and session closeout
- Summarizes completed workouts with planned volume and trainer-style notes
- Shows recent training insights, volume trends, and next-session bias
- Uses Firebase Auth, Firestore, and Cloud Functions to keep coaching data tied to each user
- Delivers a polished dark mobile experience built with Expo and React Native

## Tech Stack

Expo, React Native, React Navigation, React Native Paper, Firebase Auth, Firestore, Firebase Functions, and Gemini-backed agent logic.

## Run on Android

1. Install dependencies:

   ```sh
   npm install
   ```

2. Start an Android emulator or connect an Android device with USB debugging enabled.

3. Run the app:

   ```sh
   npm run android
   ```

You can also run `npm start` and press `a` in the Expo terminal to open the app on Android.

## Product Vision

IronAgent is built to feel less like a static workout tracker and more like a focused training partner: it plans, listens, adjusts, and learns from every session.
